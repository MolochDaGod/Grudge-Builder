#!/usr/bin/env node
/**
 * Publish sector dossiers → static JSON for lore/info + production server.
 *
 * Writes:
 *   client/public/production/dossiers-content.json
 *   public/production/dossiers-content.json
 *   shared/definitions/published/dossiers-content.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATHS = [
  path.join(ROOT, 'client', 'public', 'production', 'dossiers-content.json'),
  path.join(ROOT, 'public', 'production', 'dossiers-content.json'),
  path.join(ROOT, 'shared', 'definitions', 'published', 'dossiers-content.json'),
];

async function loadManifest() {
  const tsEntry = path.join(ROOT, 'shared', 'definitions', 'sectorDossiers.ts');
  const helper = path.join(ROOT, 'scripts', '_export-dossiers-tmp.mjs');
  const code = `
    import { buildDossiersManifest } from ${JSON.stringify(pathToFileURL(tsEntry).href)};
    process.stdout.write(JSON.stringify(buildDossiersManifest(), null, 2));
  `;
  fs.writeFileSync(helper, code, 'utf8');
  try {
    const r = spawnSync('npx', ['--yes', 'tsx', helper], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
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
  console.log('[publish-dossiers] Building from SSOT…');
  const manifest = await loadManifest();
  const json = JSON.stringify(manifest, null, 2);
  for (const p of OUT_PATHS) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, json, 'utf8');
    console.log(`  wrote ${path.relative(ROOT, p)} (${(json.length / 1024).toFixed(1)} KB)`);
  }

  const prodManifest = path.join(ROOT, 'client', 'public', 'production', 'manifest.json');
  if (fs.existsSync(prodManifest)) {
    try {
      const m = JSON.parse(fs.readFileSync(prodManifest, 'utf8'));
      m.files = { ...(m.files || {}), dossiers: 'dossiers-content.json' };
      m.dossiersVersion = manifest.version;
      m.activeSector = manifest.activeSector;
      m.builtAt = new Date().toISOString();
      const out = JSON.stringify(m, null, 2);
      fs.writeFileSync(prodManifest, out, 'utf8');
      fs.mkdirSync(path.join(ROOT, 'public', 'production'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, 'public', 'production', 'manifest.json'), out, 'utf8');
      console.log('  updated production/manifest.json');
    } catch (e) {
      console.warn('  manifest patch failed', e.message);
    }
  }

  console.log(
    `[publish-dossiers] OK — active=${manifest.activeSector} stages=`,
    JSON.stringify(manifest.statuses),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
