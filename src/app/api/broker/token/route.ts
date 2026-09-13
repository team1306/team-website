import { NextRequest, NextResponse } from "next/server";
import { brokerDb } from "@/lib/broker-db";
import { SignJWT, importPKCS8 } from "jose";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();

    const grantType = body.get("grant_type");
    const code = body.get("code");
    const redirectUri = body.get("redirect_uri");

    const authorization = request.headers.get("authorization");

    let clientId: string | null = null;
    let clientSecret: string | null = null;

    if (authorization?.startsWith("Basic ")) {
      try {
        const encoded = authorization.slice("Basic ".length);
        const decoded = Buffer.from(encoded, "base64").toString("utf8");

        const separator = decoded.indexOf(":");

        if (separator !== -1) {
          clientId = decoded.slice(0, separator);
          clientSecret = decoded.slice(separator + 1);
        }
      } catch {
      }
    }

    if (!clientId && typeof body.get("client_id") === "string") {
      clientId = body.get("client_id") as string;
    }

    if (
      !clientSecret &&
      typeof body.get("client_secret") === "string"
    ) {
      clientSecret = body.get("client_secret") as string;
    }

    console.log("Token request:", {
      grantType,
      clientIdPresent:
        typeof clientId === "string" && clientId.length > 0,
      clientIdMatches:
        clientId === process.env.BROKER_CLIENT_ID,
      clientSecretPresent:
        typeof clientSecret === "string" &&
        clientSecret.length > 0,
      clientSecretMatches:
        clientSecret === process.env.BROKER_CLIENT_SECRET,
    });

    if (grantType !== "authorization_code") {
      return NextResponse.json(
        {
          error: "unsupported_grant_type",
        },
        { status: 400 }
      );
    }

    if (
      clientId !== process.env.BROKER_CLIENT_ID ||
      clientSecret !== process.env.BROKER_CLIENT_SECRET
    ) {
      return NextResponse.json(
        {
          error: "invalid_client",
        },
        { status: 401 }
      );
    }

    if (typeof code !== "string" || !code) {
      return NextResponse.json(
        {
          error: "invalid_grant",
        },
        { status: 400 }
      );
    }

    if (
      typeof redirectUri === "string" &&
      redirectUri !== process.env.BROKER_ALLOWED_REDIRECT_URI
    ) {
      return NextResponse.json(
        {
          error: "invalid_grant",
        },
        { status: 400 }
      );
    }

    const { data: claims, error } = await brokerDb.rpc(
      "consume_oauth_transaction",
      {
        transaction_key: `code:${code}`,
        expected_kind: "code",
      }
    );

    if (error) {
      console.error(
        "Failed to consume broker authorization code:",
        error
      );

      return NextResponse.json(
        {
          error: "server_error",
        },
        { status: 500 }
      );
    }

    if (!claims || typeof claims.sub !== "string") {
      return NextResponse.json(
        {
          error: "invalid_grant",
        },
        { status: 400 }
      );
    }

    const privateKey = await importPKCS8(
      process.env.BROKER_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      "RS256"
    );

    const issuer =
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/broker`;

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 60 * 60;

    const idToken = await new SignJWT({
      sub: claims.sub,
      ...(claims.name ? { name: claims.name } : {}),
      ...(claims.given_name
        ? { given_name: claims.given_name }
        : {}),
      ...(claims.family_name
        ? { family_name: claims.family_name }
        : {}),
      ...(claims.picture
        ? { picture: claims.picture }
        : {}),
    })
      .setProtectedHeader({
        alg: "RS256",
        kid: process.env.BROKER_KID!,
        typ: "JWT",
      })
      .setIssuer(issuer)
      .setAudience(process.env.BROKER_CLIENT_ID!)
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .setJti(randomUUID())
      .sign(privateKey);

    const accessToken = await new SignJWT({
      sub: claims.sub,
      ...(claims.name ? { name: claims.name } : {}),
      ...(claims.given_name
        ? { given_name: claims.given_name }
        : {}),
      ...(claims.family_name
        ? { family_name: claims.family_name }
        : {}),
      ...(claims.picture
        ? { picture: claims.picture }
        : {}),
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT",
      })
      .setIssuer(issuer)
      .setAudience("broker-userinfo")
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .setJti(randomUUID())
      .sign(
        new TextEncoder().encode(
          process.env.BROKER_TOKEN_SECRET!
        )
      );

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      id_token: idToken,
    });
  } catch (error) {
    console.error(
      "Broker token endpoint error:",
      error
    );

    return NextResponse.json(
      {
        error: "server_error",
      },
      { status: 500 }
    );
  }
}