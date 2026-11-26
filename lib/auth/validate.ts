/**
 * Client-side mirrors of the backend's own rules (models/user.py), so a
 * customer sees a specific, immediate message instead of waiting on a round
 * trip for the generic "please check the field you entered" the API returns.
 * The backend re-validates everything regardless — this is UX, not the
 * security boundary.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** The dashboard path to send someone to after signing in, validated so an
 * attacker cannot use `?next=` to redirect through an open redirect. */
export function safeNextPath(nextParam: string | null): string {
  if (nextParam && /^\/dashboard(?:\/|$)/.test(nextParam) && !nextParam.includes("\\")) {
    return nextParam;
  }
  return "/dashboard";
}
