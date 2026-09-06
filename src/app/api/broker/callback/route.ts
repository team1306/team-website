import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { pendingRequests } from '../authorize/route';

export const issuedCodes = new Map<string, { claims: Record<string, unknown>; expiresAt: number }>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const brokerState = searchParams.get('state');

  if (!code || !brokerState) {
    return NextResponse.json({ error: 'missing code or state' }, { status: 400 });
  }

  const pending = pendingRequests.get(brokerState);
  if (!pending) {
    return NextResponse.json({ error: 'unknown or expired state' }, { status: 400 });
  }
  pendingRequests.delete(brokerState);

  const tokenRes = await fetch('https://slack.com/api/openid.connect.token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/broker/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.ok) {
    return NextResponse.json({ error: 'slack_token_exchange_failed', detail: tokenData }, { status: 502 });
  }

  const idTokenParts = tokenData.id_token.split('.');
  const slackClaims = JSON.parse(Buffer.from(idTokenParts[1], 'base64').toString('utf8'));
  console.log('Slack claims:', slackClaims);

  const { email, email_verified, date_email_verified, ...safeClaims } = slackClaims;

  const brokerCode = randomBytes(16).toString('hex');
  issuedCodes.set(brokerCode, {
    claims: safeClaims,
    expiresAt: Date.now() + 60_000,
  });

  const redirectUrl = new URL(pending.supabaseRedirectUri);
  redirectUrl.searchParams.set('code', brokerCode);
  redirectUrl.searchParams.set('state', pending.supabaseState);

  return NextResponse.redirect(redirectUrl.toString());
}