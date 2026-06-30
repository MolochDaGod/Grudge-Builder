/**
 * Merge FLEET_VERCEL_REWRITES from shared/fleet/manifest.ts into vercel.json.
 * Preserves app-specific rewrites (polyhaven, models, SPA fallback).
 *
 * Usage: npx tsx scripts/sync-vercel-fleet.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const { FLEET_VERCEL_REWRITES } = await import('../shared/fleet/manifest.ts');
const { FLEET_CLIENT_ENV: clientEnv } = await import('../shared/fleet/storage.ts');

const vercelPath = path.join(root, 'vercel.json');
const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

/** Rewrites that stay app-local (not in fleet manifest). */
const LOCAL_REWRITES = [
  { source: '/api/polyhaven/:path*', destination: 'https://api.polyhaven.com/:path*' },
  { source: '/api/polyhaven-dl/:path*', destination: 'https://dl.polyhaven.org/:path*' },
  { source: '/models/lobby/pirate-islands/:path*', destination: 'https://assets.grudge-studio.com/models/lobby/pirate-islands/:path*' },
  { source: '/skill-tree.html', destination: '/skill-tree.html' },
  { source: '/map/:mapId', destination: 'https://world.grudge-studio.com/map/:mapId' },
  { source: '/models/lobby/:mapId/scene.glb', destination: 'https://world.grudge-studio.com/models/lobby/:mapId/scene.glb' },
  { source: '/models/:path*', destination: 'https://assets.grudge-studio.com/models/:path*' },
  { source: '/((?!.*\\.html$).*)', destination: '/index.html' },
];

vercel.rewrites = [...FLEET_VERCEL_REWRITES, ...LOCAL_REWRITES];
vercel.env = {
  ...vercel.env,
  ...clientEnv,
};

fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
console.log(`[sync-vercel-fleet] ${FLEET_VERCEL_REWRITES.length} fleet rewrites + ${LOCAL_REWRITES.length} local → vercel.json`);
console.log(`[sync-vercel-fleet] client env keys: ${Object.keys(clientEnv).join(', ')}`);