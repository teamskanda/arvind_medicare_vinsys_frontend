import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Presence is an early UX guard. The dashboard layout verifies the session
// with FastAPI before rendering; every protected API verifies it again.
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/embed/")) {
    const publicId = request.nextUrl.pathname.split("/")[2];
    let policy = "'none'";
    if (publicId && /^[a-zA-Z0-9_-]{8,100}$/.test(publicId)) {
      try {
        const base = (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
        const upstream = await fetch(`${base}/api/public/bots/${encodeURIComponent(publicId)}/frame-policy`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
        if (upstream.ok) {
          const data = await upstream.json();
          if (typeof data.frame_ancestors === "string" && /^(?:\*|'self'|'none'|https?:\/\/[a-zA-Z0-9.*:_-]+)(?: (?:'self'|https?:\/\/[a-zA-Z0-9.*:_-]+))*$/.test(data.frame_ancestors)) policy = data.frame_ancestors;
        }
      } catch { /* Fail closed if publication or policy cannot be checked. */ }
    }
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", `frame-ancestors ${policy}`);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const target = new URL("/login", request.url);
    target.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(target);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*", "/embed/:path*"] };
