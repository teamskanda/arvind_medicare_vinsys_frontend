import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";

export function backendUrl(path: string): string {
  const base = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return base.replace(/\/$/, "") + path;
}

/**
 * The visitor's address, for the backend's per-IP login/signup limit.
 *
 * Server-to-server calls from this app otherwise reach FastAPI from the
 * hosting platform's own address, so every visitor would share one limit.
 * The platform (Vercel, or a reverse proxy) sets `X-Forwarded-For` on the
 * request it hands us; only its first, client-most entry is passed on, and
 * only if it looks like an IP address.
 */
export function clientIpHeaders(headers: Headers): Record<string, string> {
  const ip =
    (headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    (headers.get("x-real-ip") ?? "").trim();
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? { "X-Forwarded-For": ip } : {};
}

export const getCurrentUser = cache(async (): Promise<{
  id: string; email: string; full_name: string | null;
} | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(backendUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
});
