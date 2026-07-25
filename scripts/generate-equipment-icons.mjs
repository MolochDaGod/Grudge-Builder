/**
 * Pre-bake equipment icons from actual GLB meshes (requires browser).
 *
 *   1. pnpm dev (or any static serve of client/public + this page)
 *   2. Open scripts/generate-equipment-icons.html
 *   3. Click Generate all → save PNGs into client/public/icons/weapons/generated/
 *
 * Or use Playwright if installed:
 *   node scripts/generate-equipment-icons.mjs --playwright
 *
 * Icons are product shots of the real weapon — cool assets OK.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'client/public/icons/weapons/generated');
const htmlPath = path.join(__dirname, 'generate-equipment-icons.html');

console.log(`
Equipment icons from mesh
=========================
1. Serve the repo client (pnpm --filter client dev or npx serve client/public)
2. Open: file://${htmlPath.replace(/\\/g, '/')}
   (or copy HTML under public/ and open /generate-equipment-icons.html)
3. Generate → download PNGs → place in:
   ${outDir}

Naming: {prefabId}.png  e.g. sword_style_copper.png, gun_style_gold.png

Runtime: if baked PNG missing, client generates from mesh via
  equipmentIconFromMesh.generateEquipmentIconFromUrl()
`);

fs.mkdirSync(outDir, { recursive: true });

// Copy HTML into public for easy dev-server access
const pubHtml = path.join(root, 'client/public/generate-equipment-icons.html');
fs.copyFileSync(htmlPath, pubHtml);
console.log('Copied helper to client/public/generate-equipment-icons.html');

if (process.argv.includes('--playwright')) {
  console.log('Playwright auto-bake not bundled — open the HTML page in Chrome for now.');
}
