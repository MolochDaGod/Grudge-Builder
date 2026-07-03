/**
 * Inject fleet auth proxy rewrites into satellite game vercel.json files.
 * All auth → id.grudge-studio.com; optional game-data paths for character sync.
 *
 * Usage: npx tsx scripts/sync-fleet-auth.mjs [path/to/vercel.json ...]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { FLEET_SATELLITE_VERCEL_REWRITES } = await import('../shared/fleet/manifest.ts');

const DEFAULT_TARGETS = [
  path.resolve(__dirname, '../../grudge-three-port-remote-check/vercel.json'),
  path.resolve(__dirname, '../../grudge-three-port/vercel.json'),
];

const targets = process.argv.length > 2
  ? process.argv.slice(2).map((p) => path.resolve(p))
  : DEFAULT_TARGETS.filter((p) => fs.existsSync(p));

const SPA_FALLBACK = { source: '/((?!.*\\.html$).*)', destination: '/index.html' };

for (const vercelPath of targets) {
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const existing = vercel.rewrites || [];
  const withoutAuth = existing.filter((r) => {
    const s = r.source || '';
    return !s.startsWith('/api/auth') && !s.startsWith('/auth/') && s !== '/login' && !s.startsWith('/api/characters') && !s.startsWith('/api/account') && s !== '/api/health';
  });
  const hasSpa = withoutAuth.some((r) => r.destination === '/index.html' || r.destination?.includes('index.html'));
  vercel.rewrites = [...FLEET_SATELLITE_VERCEL_REWRITES, ...withoutAuth.filter((r) => !(hasSpa && r.destination?.includes('index.html'))), ...(hasSpa ? [] : [SPA_FALLBACK])];
  fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
  console.log(`[sync-fleet-auth] ${path.basename(path.dirname(vercelPath))}: ${FLEET_SATELLITE_VERCEL_REWRITES.length} auth rewrites`);
}

if (!targets.length) console.warn('[sync-fleet-auth] No vercel.json targets found');