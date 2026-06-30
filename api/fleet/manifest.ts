import {
  FLEET_URLS,
  FLEET_SERVICES,
  FLEET_VERCEL_REWRITES,
  FLEET_GAME_DATA_API_PREFIXES,
  FLEET_STORAGE,
  FLEET_CLIENT_ENV,
  CROSSMINT_COLLECTIONS,
} from "../../shared/fleet";

export const config = { runtime: "edge" };

export default function handler() {
  return Response.json(
    {
      version: 1,
      generated: "shared/fleet/manifest.ts",
      urls: FLEET_URLS,
      services: FLEET_SERVICES,
      storage: FLEET_STORAGE,
      clientEnv: FLEET_CLIENT_ENV,
      gameDataApiPrefixes: FLEET_GAME_DATA_API_PREFIXES,
      crossmint: CROSSMINT_COLLECTIONS,
      rewrites: FLEET_VERCEL_REWRITES,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}