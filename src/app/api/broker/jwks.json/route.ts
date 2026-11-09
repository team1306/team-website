import { createPublicKey } from "node:crypto";

export async function GET() {
  const privateKey = process.env.BROKER_PRIVATE_KEY;
  const kid = process.env.BROKER_KID;

  if (!privateKey || !kid) {
    return Response.json({ error: "server_error" }, { status: 503 });
  }

  try {
    const publicKey = createPublicKey(privateKey.replace(/\\n/g, "\n"));
    return Response.json({
      keys: [{ ...publicKey.export({ format: "jwk" }), kid, use: "sig", alg: "RS256" }],
    });
  } catch {
    console.error("Broker JWKS signing key configuration is invalid");
    return Response.json({ error: "server_error" }, { status: 503 });
  }
}
