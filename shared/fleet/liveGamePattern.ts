/**
 * Direct Railway game-server origin for GRUDOX arcade probes.
 * Vercel-hosted shells proxy /api/*; upstream health is /api/health (not /health).
 */
import { FLEET_URLS } from "./manifest";

export const LIVE_GAME_SERVER_ORIGIN = FLEET_URLS.gameData;
export const LIVE_GAME_SERVER_HEALTH = `${LIVE_GAME_SERVER_ORIGIN}/api/health` as const;