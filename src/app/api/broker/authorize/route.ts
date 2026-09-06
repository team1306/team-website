import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
 
const pendingRequests = new Map<string, { supabaseRedirectUri: string; supabaseState: string }>();
 
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
 
  const supabaseRedirectUri = searchParams.get('redirect_uri');
  const supabaseState = searchParams.get('state') ?? '';
 
  if (!supabaseRedirectUri) {
    return NextResponse.json({ error: 'missing redirect_uri' }, { status: 400 });
  }
 
  const brokerState = randomBytes(16).toString('hex');
  pendingRequests.set(brokerState, { supabaseRedirectUri, supabaseState });
 
  const slackAuthorizeUrl = new URL('https://slack.com/openid/connect/authorize');
  slackAuthorizeUrl.searchParams.set('response_type', 'code');
  slackAuthorizeUrl.searchParams.set('client_id', process.env.SLACK_CLIENT_ID!);
  slackAuthorizeUrl.searchParams.set(
    'redirect_uri',
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/broker/callback`
  );
  slackAuthorizeUrl.searchParams.set('scope', 'openid profile');
  slackAuthorizeUrl.searchParams.set('state', brokerState);
 
  return NextResponse.redirect(slackAuthorizeUrl.toString());
}
 
export { pendingRequests };
