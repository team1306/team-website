import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { brokerDb } from "@/lib/broker-db";

const slackJWKS = createRemoteJWKSet(
  new URL("https://slack.com/openid/connect/keys")
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const brokerState = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("Slack OAuth error:", error);

    return new NextResponse(
      `Slack authentication failed: ${error}`,
      { status: 400 }
    );
  }

  if (!code || !brokerState) {
    return new NextResponse(
      "Missing code or state",
      { status: 400 }
    );
  }

  const cookieState = request.cookies.get("broker_state")?.value;

  if (!cookieState || cookieState !== brokerState) {
    return new NextResponse(
      "Invalid state",
      { status: 400 }
    );
  }

  const { data: pending, error: consumeError } = await brokerDb.rpc(
    "consume_oauth_transaction",
    {
      transaction_key: `state:${brokerState}`,
      expected_kind: "state",
    }
  );

  if (consumeError) {
    console.error("Failed to consume OAuth state:", consumeError);

    return new NextResponse(
      "Database error",
      { status: 500 }
    );
  }

  if (!pending) {
    return new NextResponse(
      "Invalid or expired state",
      { status: 400 }
    );
  }

  const tokenResponse = await fetch(
    "https://slack.com/api/openid.connect.token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri:
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/broker/callback`,
      }),
    }
  );

  if (!tokenResponse.ok) {
    console.error(
      "Slack token endpoint returned:",
      tokenResponse.status,
      await tokenResponse.text()
    );

    return new NextResponse(
      "Failed to exchange Slack authorization code",
      { status: 502 }
    );
  }

  const slackTokens = await tokenResponse.json();

  if (!slackTokens.ok && slackTokens.error) {
    console.error("Slack token error:", slackTokens);

    return new NextResponse(
      "Failed to exchange Slack authorization code",
      { status: 400 }
    );
  }

  const idToken = slackTokens.id_token;

  if (!idToken) {
    return new NextResponse(
      "Slack did not return an ID token",
      { status: 400 }
    );
  }

  let slackClaims;

  try {
    const verified = await jwtVerify(
      idToken,
      slackJWKS,
      {
        issuer: "https://slack.com",
        audience: process.env.SLACK_CLIENT_ID!,
        algorithms: ["RS256"],
      }
    );

    slackClaims = verified.payload;
  } catch (err) {
    console.error("Invalid Slack ID token:", err);

    return new NextResponse(
      "Invalid Slack ID token",
      { status: 401 }
    );
  }

  if (
    !pending.nonce ||
    slackClaims.nonce !== pending.nonce
  ) {
    return new NextResponse(
      "Invalid nonce",
      { status: 400 }
    );
  }

  const claims = {
    sub: String(slackClaims.sub),

    ...(typeof slackClaims.name === "string"
      ? { name: slackClaims.name }
      : {}),

    ...(typeof slackClaims.given_name === "string"
      ? { given_name: slackClaims.given_name }
      : {}),

    ...(typeof slackClaims.family_name === "string"
      ? { family_name: slackClaims.family_name }
      : {}),

    ...(typeof slackClaims.picture === "string"
      ? { picture: slackClaims.picture }
      : {}),
  };

  /*
   * Generate a short-lived authorization code for Supabase.
   *
   * This is NOT the Slack authorization code.
   */
  const brokerCode = randomBytes(32).toString("hex");

  const { error: insertError } = await brokerDb
    .from("oauth_broker_transactions")
    .insert({
      key: `code:${brokerCode}`,
      kind: "code",
      payload: claims,
      expires_at: new Date(
        Date.now() + 60 * 1000
      ).toISOString(),
    });

  if (insertError) {
    console.error(
      "Failed to store broker authorization code:",
      insertError
    );

    return new NextResponse(
      "Database error",
      { status: 500 }
    );
  }

  const redirectUrl = new URL(
    pending.supabaseRedirectUri
  );

  redirectUrl.searchParams.set(
    "code",
    brokerCode
  );

  redirectUrl.searchParams.set(
    "state",
    pending.supabaseState
  );


  const response = NextResponse.redirect(
    redirectUrl
  );

  response.cookies.set("broker_state", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/broker",
    maxAge: 0,
  });

  return response;
}