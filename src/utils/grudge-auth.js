/**
 * grudge-auth.js — Grudge Auth Gateway client
 * Identity provider: https://id.grudge-studio.com (canonical Grudge ID)
 *
 * Note: The old auth-gateway-otb8qmmyd-grudgenexus.vercel.app deployment
 * has been retired. All auth now goes through id.grudge-studio.com.
 */
export const GRUDGE_GATEWAY_URL = 'https://id.grudge-studio.com';

export function getGrudgeToken() { return localStorage.getItem('grudge_auth_token') || null; }

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

export function isGrudgeAuthenticated() { return !!getGrudgeToken(); }

export function redirectToGrudgeGateway(r) {
  const ret = r || window.location.href;
  window.location.href = `${GRUDGE_GATEWAY_URL}/auth/sso-check?return=${encodeURIComponent(ret)}`;
}

export function requireGrudgeAuth(r) { if (!isGrudgeAuthenticated()) redirectToGrudgeGateway(r); }

export function grudgeSignOut() {
  const t = getGrudgeToken();
  if (t) fetch(`${GRUDGE_GATEWAY_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
  ['grudge_auth_token','grudge_user_id','grudge_id','grudge_username','grudge_session_token','grudge-session'].forEach(k => localStorage.removeItem(k));
}

export function grudgeAuthHeaders() {
  const t = getGrudgeToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}
