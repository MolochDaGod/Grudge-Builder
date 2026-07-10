/**
 * Colyseus WebSocket endpoint resolver.
 *
 * Colyseus runs on the GrudgeBuilder Railway service (same process as /api/island).
 * Do NOT use VITE_API_URL (identity API) — use GAME_DATA_API / Railway game-data host.
 *
 * Client (colyseus.js) uses this base for:
 *   - HTTP matchmake:  POST {https}/matchmake/joinOrCreate/{room}
 *   - WebSocket room:  wss://… after matchmake returns roomId + processId
 */
import { GAME_DATA_API } from '@/lib/grudgeConfig';
import { FLEET_URLS } from '@shared/fleet';

function toWsUrl(httpOrWs: string): string {
  return httpOrWs
    .replace(/\/$/, '')
    .replace(/^http:\/\//i, 'ws://')
    .replace(/^https:\/\//i, 'wss://');
}

export function getColyseusEndpoint(): string {
  const dedicated = (import.meta as any).env?.VITE_COLYSEUS_URL as string | undefined;
  if (dedicated) return toWsUrl(dedicated);

  // Prefer fleet canonical Colyseus URL (Railway game-data host)
  if (FLEET_URLS.colyseus) return toWsUrl(FLEET_URLS.colyseus);

  const gameData = (import.meta as any).env?.VITE_GAME_DATA_API || GAME_DATA_API;
  if (gameData) return toWsUrl(gameData);

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.hostname}:5000`;
  }

  // Last resort: same host (only works if this origin proxies /matchmake + WS)
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}`;
  }

  return toWsUrl(FLEET_URLS.gameData);
}
