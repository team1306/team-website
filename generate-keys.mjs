// generate-keys.mjs
// Run once with: node generate-keys.mjs
// Requires: npm install jose
//
// This generates the RSA keypair your broker will use to SIGN its own
// ID tokens (replacing Slack's). Supabase will verify signatures against
// the PUBLIC key (published via your JWKS endpoint) — the PRIVATE key
// never leaves your server.

import { generateKeyPair, exportJWK, exportPKCS8 } from 'jose';
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';

const { publicKey, privateKey } = await generateKeyPair('RS256', {
  modulusLength: 2048,
  extractable: true,
});

const kid = randomUUID(); // key ID — lets you rotate keys later without breaking old tokens

// Private key: PKCS8 PEM format — keep this SECRET, server-side only.
const privatePem = await exportPKCS8(privateKey);

// Public key: JWK format — this is what your /jwks.json endpoint serves.
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = kid;
publicJwk.use = 'sig';
publicJwk.alg = 'RS256';

writeFileSync('broker-private-key.pem', privatePem);
writeFileSync('broker-public-jwk.json', JSON.stringify({ keys: [publicJwk] }, null, 2));
writeFileSync('broker-kid.txt', kid);

console.log('Done. Generated:');
console.log('  broker-private-key.pem   <- keep SECRET, add to .env / secret manager, DO NOT COMMIT');
console.log('  broker-public-jwk.json   <- serve this as-is from your /jwks.json route');
console.log('  broker-kid.txt           <- key ID, reference when signing tokens');
