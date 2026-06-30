/**
 * Emit shared/grudge-fleet.json from shared/fleet/manifest.ts
 * Usage: npx tsx scripts/gen-fleet-manifest.mjs [output-path]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const { FLEET_URLS, FLEET_SERVICES, FLEET_VERCEL_REWRITES, FLEET_GAME_DATA_API_PREFIXES, CROSSMINT_COLLECTIONS } =
  await import('../shared/fleet/manifest.ts');
const { FLEET_STORAGE, FLEET_CLIENT_ENV } = await import('../shared/fleet/storage.ts');

const outArg = process.argv[2];
const outPath = outArg
  ? path.resolve(outArg)
  : path.join(root, 'shared', 'grudge-fleet.json');

const payload = {
  _comment: 'Generated from shared/fleet/manifest.ts — run: npx tsx scripts/gen-fleet-manifest.mjs',
  version: 1,
  urls: FLEET_URLS,
  services: FLEET_SERVICES,
  storage: FLEET_STORAGE,
  clientEnv: FLEET_CLIENT_ENV,
  gameDataApiPrefixes: FLEET_GAME_DATA_API_PREFIXES,
  crossmint: CROSSMINT_COLLECTIONS,
  rewrites: FLEET_VERCEL_REWRITES,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outPath}`);