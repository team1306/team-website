import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          error: "invalid_token",
        },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Bearer error="invalid_token"',
          },
        }
      );
    }

    const [scheme, token] = authorization.split(" ");

    if (
      scheme?.toLowerCase() !== "bearer" ||
      !token
    ) {
      return NextResponse.json(
        {
          error: "invalid_token",
        },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Bearer error="invalid_token"',
          },
        }
      );
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(
        process.env.BROKER_TOKEN_SECRET!
      ),
      {
        issuer: process.env.NEXT_PUBLIC_SITE_URL!,
        audience: "broker-userinfo",
        algorithms: ["HS256"],
      }
    );

    if (typeof payload.sub !== "string") {
      return NextResponse.json(
        {
          error: "invalid_token",
        },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Bearer error="invalid_token"',
          },
        }
      );
    }

    return NextResponse.json({
      sub: payload.sub,

      ...(typeof payload.name === "string"
        ? { name: payload.name }
        : {}),

      ...(typeof payload.given_name === "string"
        ? { given_name: payload.given_name }
        : {}),

      ...(typeof payload.family_name === "string"
        ? { family_name: payload.family_name }
        : {}),

      ...(typeof payload.picture === "string"
        ? { picture: payload.picture }
        : {}),
    });
  } catch (error) {
    console.error(
      "Broker userinfo error:",
      error
    );

    return NextResponse.json(
      {
        error: "invalid_token",
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Bearer error="invalid_token"',
        },
      }
    );
  }
}