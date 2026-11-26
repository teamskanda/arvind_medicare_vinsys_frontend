import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** "12,480 characters" -> "12.5k characters" */
export function formatCharacters(count: number): string {
  if (count < 1000) return `${count} characters`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k characters`;
  return `${(count / 1_000_000).toFixed(1)}M characters`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Display a URL without the scheme, trimmed to a sensible length. */
export function prettyUrl(url: string, maxLength = 48): string {
  const stripped = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return stripped.length > maxLength ? `${stripped.slice(0, maxLength - 1)}…` : stripped;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Path portion of a page URL, for the knowledge-base table. */
export function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}
