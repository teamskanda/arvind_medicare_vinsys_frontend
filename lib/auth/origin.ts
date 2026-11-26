/** Host is the browser-facing authority; Next standalone's URL can use an
 * internal bind host. Forwarded-Host is deliberately never trusted here. */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const host = headers.get("host");
  if (!origin || !host || headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const source = new URL(origin);
    if (!["http:", "https:"].includes(source.protocol) || source.username || source.password || source.origin !== origin) return false;
    return source.origin === new URL(`${source.protocol}//${host}`).origin;
  } catch { return false; }
}
