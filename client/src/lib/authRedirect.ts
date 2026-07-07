/**
 * Auth Redirect — canonical Grudge ID login via id.grudge-studio.com/login
 *
 * After login, id returns ?grudge_token= or ?sso_token= on the callback URL.
 * grudgeBackend.ts / grudge-game-bootstrap.js pickup handles tokens automatically.
 */

import { AUTH_GATEWAY, buildSsoLoginUrl } from "./grudgeConfig";

/**
 * Redirect to the Grudge ID sign-in page.
 * @param returnPath — path after login (defaults to /auth/callback)
 */
export function redirectToGrudgeAuth(returnPath = "/auth/callback"): void {
  window.location.href = buildSsoLoginUrl(window.location.origin, returnPath);
}

export { AUTH_GATEWAY };
