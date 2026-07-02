#!/usr/bin/env node
/**
 * HEAD-check canonical fleet assets on assets.grudge-studio.com.
 * Used in CI after CDN/R2 changes. Exit 1 if any required key is missing.
 */
const CDN = process.env.FLEET_ASSETS_CDN || 'https://assets.grudge-studio.com';

const REQUIRED = [
  '/sprites/gbux-token.png',
  '/icons/tomes/fire.png',
  '/icons/tomes/frost.png',
  '/icons/tomes/nature.png',
  '/icons/pack/weapons/Sword_01.png',
  '/sprites/GrudgeRPGAssets2d/Characters(100x100)/Swordsman/Swordsman/Swordsman-Idle.png',
  '/models/grudge6/races/WK_Characters.fbx',
  '/gruda-armada/grudge-warlords/videos/intro.mp4',
];

const failures = [];

for (const key of REQUIRED) {
  const url = `${CDN}${key}`;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(12000) });
    const ct = res.headers.get('content-type') || '';
    const cache = res.headers.get('cache-control') || '';
    if (!res.ok) {
      failures.push(`${key} → HTTP ${res.status}`);
      continue;
    }
    if (key.endsWith('.mp4') && !ct.includes('video/')) {
      failures.push(`${key} → wrong Content-Type: ${ct} (expected video/*)`);
    }
    if (key.endsWith('.png') && !ct.includes('image/')) {
      failures.push(`${key} → wrong Content-Type: ${ct}`);
    }
    if (!cache.includes('immutable') && !cache.includes('31536000')) {
      console.warn(`warn: ${key} Cache-Control=${cache} (expected immutable 1yr after CDN worker deploy)`);
    }
    console.log(`ok ${key} (${ct})`);
  } catch (e) {
    failures.push(`${key} → ${e instanceof Error ? e.message : 'error'}`);
  }
}

// Video catalog API (Railway)
const catalogUrl =
  process.env.FLEET_VIDEO_CATALOG_API ||
  'https://grudge-api-production-0d46.up.railway.app/api/videos/catalog';
try {
  const res = await fetch(catalogUrl, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) {
    failures.push(`video catalog → HTTP ${res.status}`);
  } else {
    const data = await res.json();
    if (!data.catalog?.warlordsIntro?.r2_url) {
      failures.push('video catalog → missing warlordsIntro');
    } else {
      console.log('ok /api/videos/catalog');
    }
  }
} catch (e) {
  failures.push(`video catalog → ${e instanceof Error ? e.message : 'error'}`);
}

if (failures.length) {
  console.error('\nFleet asset verify FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nFleet asset verify passed');