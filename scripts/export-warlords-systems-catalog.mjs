/**
 * Export Warlords systems + CDN map JSON for ObjectStore / info hub.
 *
 *   npx tsx scripts/export-warlords-systems-catalog.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportWarlordsSystemsCatalogJson } from '../shared/definitions/warlordsSystemsCatalog.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../shared/definitions/published');
const out = join(outDir, 'warlords-systems-catalog.json');
mkdirSync(outDir, { recursive: true });
const payload = exportWarlordsSystemsCatalogJson();
writeFileSync(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Wrote systems=${payload.systems.length} batches=${payload.uploadBatches.length} → ${out}`);
const by = { live: 0, partial: 0, planned: 0 };
for (const s of payload.systems) by[s.status] = (by[s.status] || 0) + 1;
console.log('status', by);
