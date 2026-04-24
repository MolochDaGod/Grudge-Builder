/**
 * grudge-auth.js — Grudge Auth Gateway integration
 * Identity provider: https://id.grudge-studio.com (canonical Grudge ID)
 *
 * All auth goes through id.grudge-studio.com. Legacy Vercel deployments
 * are retired and no longer valid origins.
 */
export const GRUDGE_GATEWAY_URL = 'https://id.grudge-studio.com';

export function getGrudgeToken() {
  return localStorage.getItem('grudge_auth_token') || null;
}

export function getGrudgeUser() {
  const t = getGrudgeToken();
  if (!t) return null;
  return {
    token: t,
    userId: localStorage.getItem('grudge_user_id') || null,
    grudgeId: localStorage.getItem('grudge_id') || null,
    username: localStorage.getItem('grudge_username') || 'Player',
  };
}

export function isGrudgeAuthenticated() {
  return !!getGrudgeToken();
}

/** Redirect to Grudge ID SSO. Returns to returnUrl after auth. */
export function redirectToGrudgeGateway(returnUrl) {
  const ret = returnUrl || window.location.href;
  window.location.href = `${GRUDGE_GATEWAY_URL}/auth/sso-check?return=${encodeURIComponent(ret)}`;
}

export function requireGrudgeAuth(returnUrl) {
  if (!isGrudgeAuthenticated()) redirectToGrudgeGateway(returnUrl);
}

/** Sign out — invalidates JWT server-side then clears local state. */
export function grudgeSignOut() {
  const token = getGrudgeToken();
  if (token) {
    fetch(`${GRUDGE_GATEWAY_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).catch(() => {}); // best-effort
  }
  ['grudge_auth_token', 'grudge_user_id', 'grudge_id', 'grudge_username',
   'grudge_session_token', 'grudge-session'].forEach(k => localStorage.removeItem(k));
}

export function grudgeAuthHeaders() {
  const t = getGrudgeToken();
  return t
    ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

/**
 * Call on app boot. Checks URL for SSO return token, stores it.
 * Returns user object if authenticated, null otherwise.
 */
export function checkGrudgeAuthOnBoot({ autoRedirect = false } = {}) {
  const params = new URLSearchParams(window.location.search);
  const returnedToken = params.get('token') || params.get('sso_token');
  if (returnedToken) {
    localStorage.setItem('grudge_auth_token', returnedToken);
    const grudgeId = params.get('grudge_id') || '';
    const username = params.get('username') || '';
    if (grudgeId) localStorage.setItem('grudge_id', grudgeId);
    if (username) localStorage.setItem('grudge_username', username);
    // Clean URL
    const url = new URL(window.location.href);
    ['token', 'sso_token', 'grudge_id', 'username', 'provider'].forEach(k => url.searchParams.delete(k));
    window.history.replaceState({}, '', url.toString());
  }
  const user = getGrudgeUser();
  if (user) return user;
  if (autoRedirect) { redirectToGrudgeGateway(); return null; }
  return null;
}
