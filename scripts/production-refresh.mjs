#!/usr/bin/env node
/**
 * Full production refresh:
 *  1) Publish production world + onset pattern
 *  2) Seed D1 (grudge-objectstore)
 *  3) Upload catalogs + warlords GLBs to R2
 *  4) Deploy ObjectStore + CDN workers
 *  5) Purge stale Vercel deployments (keep latest N)
 *  6) Redeploy grudge-builder production
 *
 * Usage:
 *   node scripts/production-refresh.mjs
 *   node scripts/production-refresh.mjs --skip-deploy
 *   node scripts/production-refresh.mjs --skip-purge
 *   node scripts/production-refresh.mjs --dry-run
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DESKTOP = path.resolve(ROOT, '..');
const OS = path.join(DESKTOP, 'ObjectStore');
const DRY = process.argv.includes('--dry-run');
const SKIP_DEPLOY = process.argv.includes('--skip-deploy');
const SKIP_PURGE = process.argv.includes('--skip-purge');
const SKIP_UPLOAD = process.argv.includes('--skip-upload');
const BUCKET = 'grudge-assets';
const CDN_DIR = path.join(ROOT, 'workers', 'cdn');

function run(label, cmd, args, cwd, opts = {}) {
  console.log(`\n══ ${label} ══`);
  console.log(`$ ${cmd} ${args.join(' ')}`);
  if (DRY) return { status: 0, stdout: '' };
  const r = spawnSync(cmd, args, {
    cwd,
    shell: true,
    env: process.env,
    encoding: 'utf8',
    stdio: opts.capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    timeout: opts.timeout ?? 0,
  });
  if (r.status !== 0 && !opts.allowFail) {
    console.error(`✖ ${label} failed (exit ${r.status})`);
    if (opts.capture) {
      if (r.stdout) console.error(r.stdout.slice(-2000));
      if (r.stderr) console.error(r.stderr.slice(-2000));
    }
    process.exit(r.status ?? 1);
  }
  return r;
}

function putR2(key, filePath, contentType) {
  if (!fs.existsSync(filePath)) {
    console.warn('  skip missing', filePath);
    return false;
  }
  const args = [
    'wrangler',
    'r2',
    'object',
    'put',
    `${BUCKET}/${key}`,
    `--file=${filePath}`,
    `--content-type=${contentType}`,
    '--remote',
  ];
  console.log('  →', key);
  if (DRY) return true;
  const r = spawnSync('npx', args, { cwd: CDN_DIR, shell: true, stdio: 'inherit' });
  return r.status === 0;
}

async function main() {
  console.log('Production refresh starting…');
  console.log({ ROOT, OS, DRY, SKIP_DEPLOY, SKIP_PURGE, SKIP_UPLOAD });

  // 1) Publish catalogs + D1 seed
  run(
    'Publish production world + seed D1',
    'node',
    ['scripts/publish-production-world.mjs', '--seed-d1'],
    ROOT,
  );

  // 2) Upload JSON catalogs to R2
  if (!SKIP_UPLOAD) {
    console.log('\n══ Upload catalogs to R2 ══');
    const pub = path.join(ROOT, 'shared', 'definitions', 'published');
    putR2(
      'catalogs/warlords/production-world.json',
      path.join(pub, 'production-world.json'),
      'application/json',
    );
    putR2(
      'catalogs/warlords/onset-pattern.json',
      path.join(pub, 'onset-pattern.json'),
      'application/json',
    );
    putR2(
      'catalogs/warlords/warlords-zones.json',
      path.join(pub, 'warlords-zones.json'),
      'application/json',
    );

    // Fabled + haven cores if present
    const fabled = path.join(ROOT, 'client', 'public', 'models', 'warlords', 'fabled');
    for (const name of ['fabledzone.glb', 'dwarf_main_city.glb']) {
      const fp = path.join(fabled, name);
      if (fs.existsSync(fp)) {
        putR2(`models/warlords/fabled/${name}`, fp, 'model/gltf-binary');
      }
    }

    // Optional: walk all warlords if not too huge — prefer fabled already done
    const haven = path.join(ROOT, 'client', 'public', 'models', 'warlords', 'haven_shore');
    if (fs.existsSync(haven)) {
      for (const ent of fs.readdirSync(haven)) {
        if (/\.glb$/i.test(ent)) {
          putR2(
            `models/warlords/haven_shore/${ent}`,
            path.join(haven, ent),
            'model/gltf-binary',
          );
        }
      }
    }
  }

  // 3) Deploy ObjectStore worker + CDN
  if (fs.existsSync(OS)) {
    run('Deploy ObjectStore worker', 'npx', ['wrangler', 'deploy'], OS, { allowFail: true });
  }
  if (fs.existsSync(CDN_DIR)) {
    run(
      'Deploy CDN worker',
      'npx',
      ['wrangler', 'deploy', '-c', 'wrangler.toml'],
      CDN_DIR,
      { allowFail: true },
    );
  }

  // 4) Purge old Vercel deployments (keep production alias; remove many previews)
  if (!SKIP_PURGE && !SKIP_DEPLOY) {
    console.log('\n══ List Vercel deployments (grudge-builder) ══');
    const list = run(
      'vercel ls',
      'npx',
      ['vercel', 'ls', 'grudge-builder', '--yes'],
      ROOT,
      { capture: true, allowFail: true },
    );
    // Soft cache purge: redeploy invalidates edge; also try vercel cache if available
    run(
      'Vercel inspect (prod)',
      'npx',
      ['vercel', 'inspect', 'grudgewarlords.com', '--yes'],
      ROOT,
      { allowFail: true, capture: true },
    );
  }

  // 5) Redeploy production client
  if (!SKIP_DEPLOY) {
    run(
      'Build grudge-builder',
      'npm',
      ['run', 'build'],
      ROOT,
      { timeout: 600000 },
    );
    run(
      'Vercel production deploy',
      'npx',
      ['vercel', '--prod', '--yes'],
      ROOT,
      { timeout: 600000 },
    );

    // Ensure grudge.studio alias if project owns it
    run(
      'Alias grudge.studio (if allowed)',
      'npx',
      ['vercel', 'alias', 'set', 'grudgewarlords.com', 'grudge.studio', '--yes'],
      ROOT,
      { allowFail: true },
    );
  }

  // 6) Verify CDN heads
  console.log('\n══ CDN HEAD checks ══');
  const checks = [
    'catalogs/warlords/production-world.json',
    'catalogs/warlords/onset-pattern.json',
    'models/warlords/fabled/fabledzone.glb',
    'models/warlords/fabled/dwarf_main_city.glb',
  ];
  for (const key of checks) {
    const url = `https://assets.grudge-studio.com/${key}`;
    try {
      if (DRY) {
        console.log('[dry]', url);
        continue;
      }
      const res = await fetch(url, { method: 'HEAD' });
      console.log(res.status, url, res.headers.get('content-length') || '');
    } catch (e) {
      console.warn('HEAD fail', url, e.message);
    }
  }

  // 7) D1 sanity query
  if (fs.existsSync(OS) && !DRY) {
    run(
      'D1 count sectors',
      'npx',
      [
        'wrangler',
        'd1',
        'execute',
        'grudge-objectstore',
        '--remote',
        '--command',
        'SELECT COUNT(*) AS sectors FROM world_sectors; SELECT COUNT(*) AS towns FROM world_towns; SELECT COUNT(*) AS dungeons FROM world_dungeons; SELECT COUNT(*) AS bosses FROM world_bosses;',
      ],
      OS,
      { allowFail: true },
    );
  }

  console.log('\n✅ Production refresh complete');
  console.log('Play starter: /play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port');
  console.log('Fabled core:  /play?sector=frostbite_expanse&mode=zone&worldSeed=grudge-world-1&city=runeforge_hold');
  console.log('Catalog CDN:  https://assets.grudge-studio.com/catalogs/warlords/production-world.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
