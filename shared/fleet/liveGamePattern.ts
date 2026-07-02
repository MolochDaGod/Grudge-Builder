/**
 * Direct Railway game-server origin for GRUDOX arcade probes.
 * Vercel-hosted shells proxy /api/*; this is the upstream health target.
 */
import { FLEET_URLS } from "./manifest";

export const LIVE_GAME_SERVER_ORIGIN = FLEET_URLS.gameData;