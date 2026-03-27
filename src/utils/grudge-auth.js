/**
 * grudge-auth.js — Grudge Auth Gateway integration
 * Gateway: https://auth-gateway-otb8qmmyd-grudgenexus.vercel.app
 */
export const GRUDGE_GATEWAY_URL = 'https://auth-gateway-otb8qmmyd-grudgenexus.vercel.app';
export function getGrudgeToken() { return localStorage.getItem('grudge_auth_token') || null; }
export function getGrudgeUser() { const t = getGrudgeToken(); if (!t) return null; return { token: t, userId: localStorage.getItem('grudge_user_id')||null, grudgeId: localStorage.getItem('grudge_id')||null, username: localStorage.getItem('grudge_username')||'Player' }; }
export function isGrudgeAuthenticated() { return !!getGrudgeToken(); }
export function redirectToGrudgeGateway(r) { window.location.href = `${GRUDGE_GATEWAY_URL}?return=${encodeURIComponent(r||window.location.href)}`; }
export function requireGrudgeAuth(r) { if (!isGrudgeAuthenticated()) redirectToGrudgeGateway(r); }
export function grudgeSignOut() { ['grudge_auth_token','grudge_user_id','grudge_id','grudge_username','grudge_session_token','grudge-session'].forEach(k=>localStorage.removeItem(k)); }
export function grudgeAuthHeaders() { const t=getGrudgeToken(); return t?{Authorization:`Bearer ${t}`,'Content-Type':'application/json'}:{'Content-Type':'application/json'}; }
