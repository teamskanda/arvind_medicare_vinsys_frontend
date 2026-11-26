/**
 * Name of the session cookie.
 *
 * Renamed from `skanda-demo-session`: the product now issues real
 * per-customer accounts, and the cookie name is visible to anyone who opens
 * devtools. Existing sessions carrying the old name are simply not
 * recognised, so everyone signs in once more after this ships — there is no
 * migration to do beyond that.
 */
export const SESSION_COOKIE = "skanda-session";
