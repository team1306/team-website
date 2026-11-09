import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as jose from 'jose';

async function loadRoute(name, env, dependencies = {}) {
  const source = await readFile(new URL(`../src/app/api/broker/${name}/route.ts`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Buffer, TextEncoder,
    process: { env },
    console: { log() {}, error() {} },
    require(name) {
      if (name === 'jose') return jose;
      if (name === 'crypto') return { randomUUID };
      if (name === 'next/server') return {
        NextResponse: { json: (body, init) => Response.json(body, init) },
      };
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

test('userinfo accepts tokens issued by the broker and rejects invalid tokens', async () => {
  const { privateKey } = await jose.generateKeyPair('RS256', { extractable: true });
  const env = {
    NEXT_PUBLIC_SITE_URL: 'https://broker-dev.example',
    BROKER_PRIVATE_KEY: await jose.exportPKCS8(privateKey),
    BROKER_TOKEN_SECRET: randomBytes(32).toString('hex'),
    BROKER_CLIENT_ID: 'dev-client',
    BROKER_CLIENT_SECRET: randomBytes(32).toString('hex'),
    BROKER_KID: randomUUID(),
    BROKER_ALLOWED_REDIRECT_URI: 'https://auth-dev.example/auth/v1/callback',
  };
  const profile = { sub: 'slack-user-123', name: 'Dev User', picture: 'https://example.com/avatar.png' };
  const tokenRoute = await loadRoute('token', env, {
    '@/lib/broker-db': { brokerDb: { rpc: async (name, args) => {
      assert.equal(name, 'consume_oauth_transaction');
      assert.equal(args.transaction_key, 'code:dev-code');
      return { data: profile, error: null };
    } } },
  });
  const response = await tokenRoute.POST(new Request('https://broker-dev.example/api/broker/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code', code: 'dev-code',
      client_id: env.BROKER_CLIENT_ID, client_secret: env.BROKER_CLIENT_SECRET,
      redirect_uri: env.BROKER_ALLOWED_REDIRECT_URI,
    }),
  }));
  assert.equal(response.status, 200);
  const { access_token } = await response.json();
  const { GET } = await loadRoute('userinfo', env);
  const request = token => new Request('https://broker-dev.example/api/broker/userinfo', {
    headers: { authorization: `Bearer ${token}` },
  });
  const userinfo = await GET(request(access_token));
  assert.equal(userinfo.status, 200);
  assert.deepEqual(await userinfo.json(), profile);

  for (const overrides of [
    { issuer: env.NEXT_PUBLIC_SITE_URL },
    { audience: 'wrong-audience' },
    { secret: randomBytes(32).toString('hex') },
  ]) {
    const invalid = await new jose.SignJWT(profile)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(overrides.issuer ?? `${env.NEXT_PUBLIC_SITE_URL}/api/broker`)
      .setAudience(overrides.audience ?? 'broker-userinfo')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(overrides.secret ?? env.BROKER_TOKEN_SECRET));
    const rejected = await GET(request(invalid));
    assert.equal(rejected.status, 401);
    assert.equal(rejected.headers.get('www-authenticate'), 'Bearer error="invalid_token"');
  }
});
