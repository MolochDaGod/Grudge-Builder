/**
 * Colyseus WebSocket endpoint resolver.
 *
 * Single source of truth — imported by use-colyseus.ts, tutorial.tsx, home-island.tsx.
 * Production: uses VITE_API_URL (wss://api.grudge-studio.com)
 * Dev: same host, port 5000
 */

export function getColyseusEndpoint(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/^http/, 'ws');
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:5000`;
}
