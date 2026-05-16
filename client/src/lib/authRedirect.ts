/**
 * Auth Redirect — sends unauthenticated users to id.grudge-studio.com
 *
 * After login, id.grudge-studio.com redirects back with ?sso_token=...&grudge_id=...
 * which grudgeBackend.ts pickupSsoToken() handles automatically.
 */

const GRUDGE_AUTH_URL = "https://id.grudge-studio.com";

/**
 * Redirect to the Grudge SSO login page.
 * @param returnPath — path to come back to after login (defaults to /home)
 */
export function redirectToGrudgeAuth(returnPath?: string): void {
  const returnTo = returnPath || "/home";
  const origin = window.location.origin;
  const redirectUrl = `${origin}${returnTo}`;
  window.location.href = `${GRUDGE_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
}
