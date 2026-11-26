import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/auth/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { isSameOrigin } from "@/lib/auth/origin";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers)) {
    return NextResponse.json({ error: { message: "That request is not allowed." } }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Please check the details you entered." } }, { status: 400 });
  }

  try {
    const upstream = await fetch(backendUrl("/api/auth/login"), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await upstream.json();
    if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });
    if (typeof data.access_token !== "string" || !Number.isInteger(data.expires_in)) {
      throw new Error("Invalid login response");
    }
    const response = NextResponse.json({ user: data.user }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, data.access_token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: data.expires_in,
    });
    return response;
  } catch {
    return NextResponse.json({ error: { message: "The server could not be reached. Please try again." } }, { status: 503 });
  }
}
