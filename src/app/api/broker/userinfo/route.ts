import { NextRequest, NextResponse } from 'next/server';
import { activeAccessTokens } from '../token/route';
 
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
 
  if (!token) {
    return NextResponse.json({ error: 'missing bearer token' }, { status: 401 });
  }
 
  const claims = activeAccessTokens.get(token);
  if (!claims) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }
 
  return NextResponse.json({
    sub: claims.sub,
    name: claims.name,
    given_name: claims.given_name,
    family_name: claims.family_name,
    picture: claims.picture,
  });
}