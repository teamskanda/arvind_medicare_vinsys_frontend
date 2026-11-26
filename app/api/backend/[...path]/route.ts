import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/auth/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { isSameOrigin } from "@/lib/auth/origin";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some((part) => !/^[A-Za-z0-9_-]+$/.test(part)) || path[0] !== "api" ||
      !(path[1] === "chatbots" || (path.length === 3 && path[1] === "auth" && path[2] === "me"))) {
    return NextResponse.json({ error: { code: "not_found", message: "Not found." } }, { status: 404 });
  }
  if (!["GET", "HEAD"].includes(request.method) && !isSameOrigin(request.headers)) {
    return NextResponse.json({ error: { code: "forbidden", message: "That request is not allowed." } }, { status: 403 });
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: { code: "unauthenticated", message: "Please sign in to continue." } }, { status: 401 });
  try {
    const response = await fetch(backendUrl("/" + path.map(encodeURIComponent).join("/") + request.nextUrl.search), {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: "no-store", redirect: "manual", signal: request.signal,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
    });
  } catch {
    return NextResponse.json({ error: { code: "network_error", message: "The server could not be reached. Please try again.", retryable: true } }, { status: 503 });
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
