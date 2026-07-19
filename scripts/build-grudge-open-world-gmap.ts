/**
 * Build production map package for grudge-open-world.
 *
 * Outputs:
 *   public/maps/grudge-open-world/grudge-open-world.gmap.json
 *   public/maps/grudge-open-world/grudge-open-world.studio.json
 *   public/maps/grudge-open-world/AGENT_BRIEF.md
 *
 * Usage: npx tsx scripts/build-grudge-open-world-gmap.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildGrudgeOpenWorldPackage,
  exportStudioProjectFromGmap,
  productionMapAgentBrief,
} from '../shared/definitions/productionMapPackage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'maps', 'grudge-open-world');

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const pkg = buildGrudgeOpenWorldPackage();
  const studio = exportStudioProjectFromGmap(pkg);

  const gmapPath = path.join(outDir, 'grudge-open-world.gmap.json');
  const studioPath = path.join(outDir, 'grudge-open-world.studio.json');
  const briefPath = path.join(outDir, 'AGENT_BRIEF.md');
  const manifestPath = path.join(outDir, 'manifest.json');

  fs.writeFileSync(gmapPath, JSON.stringify(pkg, null, 2));
  fs.writeFileSync(studioPath, JSON.stringify(studio, null, 2));
  fs.writeFileSync(briefPath, productionMapAgentBrief());
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        id: pkg.id,
        version: pkg.version,
        schema: pkg.schema,
        name: pkg.name,
        geometry: pkg.geometry,
        forge: pkg.forge,
        files: {
          gmap: 'grudge-open-world.gmap.json',
          studio: 'grudge-open-world.studio.json',
          agentBrief: 'AGENT_BRIEF.md',
        },
        systems: pkg.systems,
        entityCount: pkg.entities.length,
        islandCount: pkg.islands.length,
        aiBrainCount: pkg.aiBrains.length,
        builtAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log(`[gmap] wrote ${gmapPath}`);
  console.log(`[gmap] wrote ${studioPath}`);
  console.log(`[gmap] entities=${pkg.entities.length} islands=${pkg.islands.length} brains=${pkg.aiBrains.length}`);
  console.log(`[gmap] geometry gltf=${pkg.geometry.gltfPath}`);
  console.log(`[gmap] geometry glb (preferred)=${pkg.geometry.glbPath}`);
  console.log(`[gmap] forge=${pkg.forge.editorUrl}`);
}

main();
