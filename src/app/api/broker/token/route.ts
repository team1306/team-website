import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';
import { randomBytes, timingSafeEqual } from 'crypto';
import { issuedCodes } from '../callback/route';

export const activeAccessTokens = new Map<string, Record<string, unknown>>();

function safeCompare(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const clientId = form.get('client_id');
  const clientSecret = form.get('client_secret');
  const code = form.get('code');

  if (
    typeof clientId !== 'string' ||
    typeof clientSecret !== 'string' ||
    !safeCompare(clientId, process.env.BROKER_CLIENT_ID!) ||
    !safeCompare(clientSecret, process.env.BROKER_CLIENT_SECRET!)
  ) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 });
  }

  const issued = code ? issuedCodes.get(code.toString()) : undefined;
  if (!issued || issued.expiresAt < Date.now()) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
  }
  issuedCodes.delete(code!.toString());

  const claims = issued.claims;
  const issuer = `${process.env.NEXT_PUBLIC_SITE_URL}/api/broker`;
  const privateKeyPem = process.env.BROKER_PRIVATE_KEY!;
  const privateKey = await importPKCS8(privateKeyPem, 'RS256');

  const idToken = await new SignJWT({
    name: claims.name,
    given_name: claims.given_name,
    family_name: claims.family_name,
    picture: claims.picture,
  })
    .setProtectedHeader({ alg: 'RS256', kid: process.env.BROKER_KID })
    .setSubject(claims.sub as string)
    .setIssuer(issuer)
    .setAudience(process.env.BROKER_CLIENT_ID!)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const accessToken = randomBytes(24).toString('hex');
  activeAccessTokens.set(accessToken, claims);

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    id_token: idToken,
  });
}