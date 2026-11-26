import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";

export function backendUrl(path: string): string {
  const base = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return base.replace(/\/$/, "") + path;
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
