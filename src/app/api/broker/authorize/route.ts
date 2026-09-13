import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { brokerDb } from "@/lib/broker-db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  if (!redirectUri || !state) {
    return new NextResponse(
      "Missing redirect_uri or state",
      { status: 400 }
    );
  }

  if (
    redirectUri !==
    process.env.BROKER_ALLOWED_REDIRECT_URI
  ) {
    return new NextResponse(
      "Invalid redirect_uri",
      { status: 400 }
    );
  }

  const brokerState = randomBytes(32).toString("hex");
  const nonce = randomBytes(32).toString("hex");

  const { error } = await brokerDb
    .from("oauth_broker_transactions")
    .insert({
      key: `state:${brokerState}`,
      kind: "state",
      payload: {
        supabaseRedirectUri: redirectUri,
        supabaseState: state,
        nonce,
      },
      expires_at: new Date(
        Date.now() + 10 * 60 * 1000
      ).toISOString(),
    });

  if (error) {
    console.error(
      "Failed to store OAuth state:",
      error
    );

    return new NextResponse(
      "Database error",
      { status: 500 }
    );
  }

  const slackUrl = new URL(
    "https://slack.com/openid/connect/authorize"
  );

  slackUrl.searchParams.set(
    "client_id",
    process.env.SLACK_CLIENT_ID!
  );

  slackUrl.searchParams.set(
    "redirect_uri",
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/broker/callback`
  );

  slackUrl.searchParams.set(
    "response_type",
    "code"
  );

  slackUrl.searchParams.set(
    "scope",
    "openid profile"
  );

  slackUrl.searchParams.set(
    "state",
    brokerState
  );

  slackUrl.searchParams.set(
    "nonce",
    nonce
  );

  const response = NextResponse.redirect(
    slackUrl
  );

  response.cookies.set(
    "broker_state",
    brokerState,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/broker",
      maxAge: 10 * 60,
    }
  );

  return response;
}