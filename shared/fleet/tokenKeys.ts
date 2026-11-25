/**
 * Warlords / fleet JWT storage keys.
 * Write the five canonical keys. Read Open's key only as fallback.
 * Do not write grudge.open.token from Warlords or craft.
 */
export const FLEET_AUTH_TOKEN_KEYS = [
  "grudge_auth_token",
  "grudge_session_token",
  "grudge.token",
  "sso_token",
  "grudge_token",
] as const;

/** Open-only. Warlords must not write this key. */
export const FLEET_OPEN_TOKEN_KEY = "grudge.open.token";

export const FLEET_AUTH_TOKEN_READ_FALLBACK = [
  FLEET_OPEN_TOKEN_KEY,
  "grudge_studio_session",
  "access_token",
  "grudge_jwt",
] as const;
