/**
 * Upload local public/models/lobby/pirate-islands/scene.glb → R2 grudge-assets
 *
 * Requires wrangler auth + bucket grudge-assets (see grudge-assets-sync skill).
 *
 *   node scripts/upload-pirate-islands-glb.mjs
 *   npm run map:pirate-glb:upload
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const glb = path.join(root, 'public', 'models', 'lobby', 'pirate-islands', 'scene.glb');
const key = 'models/lobby/pirate-islands/scene.glb';
const bucket = process.env.R2_BUCKET || 'grudge-assets';

if (!fs.existsSync(glb)) {
  console.error('[upload] missing', glb);
  console.error('  Run: npm run map:pirate-glb:download');
  process.exit(1);
}

const mb = (fs.statSync(glb).size / 1024 / 1024).toFixed(1);
console.log(`[upload] ${glb} (${mb} MB) → r2://${bucket}/${key}`);

const r = spawnSync(
  'npx',
  ['wrangler', 'r2', 'object', 'put', `${bucket}/${key}`, '--file', glb, '--remote'],
  { stdio: 'inherit', shell: true, cwd: root },
);

if (r.status !== 0) {
  console.error('[upload] wrangler failed — ensure you are logged in and bucket exists');
  console.error('  Manual: npx wrangler r2 object put grudge-assets/models/lobby/pirate-islands/scene.glb --file public/models/lobby/pirate-islands/scene.glb --remote');
  process.exit(r.status || 1);
}

console.log('[upload] done — verify: curl -sI https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.glb');
