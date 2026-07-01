/**
 * Colyseus WebSocket endpoint resolver.
 *
 * Colyseus runs on the GrudgeBuilder Railway service (same process as /api/island).
 * Do NOT use VITE_API_URL (identity API) — use GAME_DATA_API / Railway game-data host.
 */
import { GAME_DATA_API } from '@/lib/grudgeConfig';

export function getColyseusEndpoint(): string {
  const gameData = (import.meta as any).env?.VITE_GAME_DATA_API || GAME_DATA_API;
  if (gameData) {
    return gameData.replace(/^http/, 'ws');
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.hostname}:5000`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:5000`;
}
