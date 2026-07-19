/**
 * Export HERO_CODEX_WITH_LEGENDS → client/public/hero-codex/heroes-canonical.json
 *   npx tsx scripts/export-hero-codex.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modPath = path.join(ROOT, 'shared/definitions/heroCodex.ts');

const mod = await import(pathToFileURL(modPath).href);
const heroes = mod.HERO_CODEX_WITH_LEGENDS;
const assetBase = mod.HERO_CODEX_ASSET_BASE || '/hero-codex/';

const out = {
  version: '2.2.0',
  updated: new Date().toISOString().slice(0, 10),
  assetBase,
  canonicalSource: 'shared/definitions/lore.ts HERO_ROSTER + heroCodex.ts',
  total: heroes.length,
  heroes,
};

const dest = path.join(ROOT, 'client/public/hero-codex/heroes-canonical.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Wrote', dest, 'heroes=', heroes.length);
for (const id of ['morgash', 'lyra', 'dredge', 'helga', 'brenna', 'scourge_faithbearer', 'nazgrim', 'silvaine', 'durgin']) {
  const h = heroes.find((x) => x.id === id);
  console.log(id, '→', h?.portraitKey, h?.portrait);
}
