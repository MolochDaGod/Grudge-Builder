#!/usr/bin/env node
/**
 * Download Sketchfab "3 Evil Rock Mountains with Cave (Stylized)" GLB to public/models.
 * Requires SKETCHFAB_API_TOKEN env (never commit the token).
 *
 * Usage: SKETCHFAB_API_TOKEN=xxx node scripts/fetch-sketchfab-evil-mountains.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL_UID = 'c41cba36d5dd48b1a07241c353689709';
const OUT_NAME = 'evil_rock_mountains_triad.glb';
const token = process.env.SKETCHFAB_API_TOKEN;
if (!token) {
  console.error('Set SKETCHFAB_API_TOKEN');
  process.exit(1);
}

const metaRes = await fetch(`https://api.sketchfab.com/v3/models/${MODEL_UID}/download`, {
  headers: { Authorization: `Token ${token}` },
});
if (!metaRes.ok) {
  console.error('Download meta failed', metaRes.status, await metaRes.text());
  process.exit(1);
}
const meta = await metaRes.json();
const glbUrl = meta?.glb?.url;
if (!glbUrl) {
  console.error('No GLB URL in response');
  process.exit(1);
}

const glbRes = await fetch(glbUrl);
if (!glbRes.ok) {
  console.error('GLB fetch failed', glbRes.status);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'client', 'public', 'models');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, OUT_NAME);
const buf = Buffer.from(await glbRes.arrayBuffer());
fs.writeFileSync(outPath, buf);
console.log(`Wrote ${outPath} (${buf.length} bytes)`);