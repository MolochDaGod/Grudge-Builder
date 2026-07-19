#!/usr/bin/env node
/**
 * Publish sector production content SSOT → static JSON for production client + server.
 *
 * Writes:
 *   client/public/production/sectors-content.json
 *   public/production/sectors-content.json
 *   shared/definitions/published/sectors-content.json
 *
 * Usage:
 *   node scripts/publish-sector-production-content.mjs
 *   npx tsx scripts/publish-sector-production-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATHS = [
  path.join(ROOT, 'client', 'public', 'production', 'sectors-content.json'),
  path.join(ROOT, 'public', 'production', 'sectors-content.json'),
  path.join(ROOT, 'shared', 'definitions', 'published', 'sectors-content.json'),
];

async function loadManifest() {
  // Prefer tsx for TypeScript SSOT
  const tsEntry = path.join(ROOT, 'shared', 'definitions', 'sectorProductionContent.ts');
  const helper = path.join(ROOT, 'scripts', '_export-sector-content-tmp.mjs');
  // Use tsx to evaluate and print JSON
  const code = `
    import { buildSectorProductionManifest } from ${JSON.stringify(pathToFileURL(tsEntry).href)};
    const m = buildSectorProductionManifest(process.env.WORLD_SEED || 'grudge-world-1');
    process.stdout.write(JSON.stringify(m, null, 2));
  `;
  fs.writeFileSync(helper, code, 'utf8');
  try {
    const r = spawnSync('npx', ['--yes', 'tsx', helper], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      shell: true,
    });
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout);
      throw new Error(`tsx export failed (code ${r.status})`);
    }
    return JSON.parse(r.stdout);
  } finally {
    try {
      fs.unlinkSync(helper);
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  console.log('[publish-sector-production] Building manifest from SSOT…');
  const manifest = await loadManifest();
  const json = JSON.stringify(manifest, null, 2);
  for (const p of OUT_PATHS) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, json, 'utf8');
    console.log(`  wrote ${path.relative(ROOT, p)} (${(json.length / 1024).toFixed(1)} KB)`);
  }

  // Patch production manifest.json if present
  const prodManifest = path.join(ROOT, 'client', 'public', 'production', 'manifest.json');
  if (fs.existsSync(prodManifest)) {
    try {
      const m = JSON.parse(fs.readFileSync(prodManifest, 'utf8'));
      m.files = { ...(m.files || {}), sectors: 'sectors-content.json' };
      m.sectorsVersion = manifest.version;
      m.sectorCount = manifest.sectorCount;
      m.builtAt = new Date().toISOString();
      fs.writeFileSync(prodManifest, JSON.stringify(m, null, 2), 'utf8');
      // Mirror
      for (const dir of [
        path.join(ROOT, 'public', 'production'),
        path.join(ROOT, 'production'),
      ]) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2), 'utf8');
      }
      console.log('  updated production/manifest.json with sectors entry');
    } catch (e) {
      console.warn('  could not patch manifest.json:', e.message);
    }
  }

  console.log(
    `[publish-sector-production] OK — ${manifest.sectorCount} sectors, v${manifest.version}`,
  );
  console.log('  API: GET /api/production/sectors');
  console.log('  Static: /production/sectors-content.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
