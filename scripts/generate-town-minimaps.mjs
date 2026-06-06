#!/usr/bin/env node
/**
 * generate-town-minimaps.mjs
 *
 * Renders top-down orthographic views of each faction town GLB
 * and saves them as PNG thumbnails for the world map UI.
 *
 * Uses node-canvas + Three.js headless rendering (via offscreen canvas).
 *
 * Since headless Three.js requires WebGL which isn't available in Node,
 * this script generates simplified placeholder minimaps from the
 * calibration manifest data — colored rectangles representing buildings
 * and faction-colored overlays.
 *
 * For full 3D renders, use the in-browser minimap capture (TownComposer
 * can render to an offscreen canvas at runtime).
 *
 * Output: public/assets/minimaps/town_{townId}.png
 *
 * Usage: node scripts/generate-town-minimaps.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'minimaps');
const MANIFEST_PATH = path.resolve(__dirname, '..', 'public', 'models', 'towns', 'town-asset-manifest.json');

// ── Town configs (from factionTowns.ts) ──────────────────────────────────────

const TOWNS = [
  {
    id: 'dried_basin_garrison',
    name: 'Dried Basin Garrison',
    faction: 'crusade',
    sectorId: 'NW',
    color: '#3b82f6',
    bgColor: '#c4956a',
    bounds: [-40, -45, 40, 50],
    buildings: [
      { x: 0, z: -20, w: 12, d: 10, label: 'Great Hall' },
      { x: -20, z: -25, w: 12, d: 16, label: 'Barracks' },
      { x: 20, z: -25, w: 12, d: 16, label: 'Armory' },
      { x: 0, z: -30, w: 8, d: 8, label: 'Shrine' },
      { x: -12, z: 5, w: 6, d: 6, label: 'Market' },
      { x: 12, z: 5, w: 6, d: 6, label: 'Market' },
    ],
  },
  {
    id: 'the_pit_foundry',
    name: 'The Pit Foundry',
    faction: 'legion',
    sectorId: 'S',
    color: '#ef4444',
    bgColor: '#2a1a10',
    bounds: [-45, -50, 45, 55],
    buildings: [
      { x: 0, z: -15, w: 14, d: 12, label: 'Forge' },
      { x: -20, z: -20, w: 16, d: 16, label: 'Orc Hall' },
      { x: 20, z: -20, w: 16, d: 16, label: 'Altar' },
      { x: 0, z: -35, w: 10, d: 10, label: 'Madra Shrine' },
      { x: -15, z: 10, w: 8, d: 8, label: 'War Forges' },
      { x: 15, z: 10, w: 8, d: 8, label: 'Reagents' },
    ],
    lavaChannels: [{ z: -5 }, { z: 5 }, { z: 15 }],
    graveyard: { x: 0, z: 0, radius: 12 },
  },
  {
    id: 'cathedral_sanctum',
    name: 'Cathedral Sanctum',
    faction: 'fabled',
    sectorId: 'N',
    color: '#22c55e',
    bgColor: '#6b8e6b',
    bounds: [-35, -40, 35, 50],
    buildings: [
      { x: 0, z: -18, w: 10, d: 10, label: 'Library' },
      { x: -16, z: -20, w: 12, d: 12, label: 'Tower' },
      { x: 16, z: -20, w: 12, d: 12, label: 'Crystal' },
      { x: 0, z: -28, w: 8, d: 8, label: 'Omni Shrine' },
      { x: -10, z: 8, w: 6, d: 6, label: 'Market' },
      { x: 10, z: 8, w: 6, d: 6, label: 'Market' },
      { x: 0, z: -3, w: 6, d: 6, label: 'Forge' },
    ],
    crystalSpires: [[-14, 12], [14, 12], [-8, -20], [8, -20], [0, -25]],
  },
];

const MAP_SIZE = 512; // px

// ── SVG Minimap Generator ────────────────────────────────────────────────────

function generateMinimapSVG(town) {
  const bounds = town.bounds;
  const worldW = bounds[2] - bounds[0];
  const worldH = bounds[3] - bounds[1];
  const scale = MAP_SIZE / Math.max(worldW, worldH);
  const offsetX = -bounds[0] * scale;
  const offsetY = -bounds[1] * scale;

  function toSVG(worldX, worldZ) {
    return [worldX * scale + offsetX, worldZ * scale + offsetY];
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_SIZE}" height="${MAP_SIZE}" viewBox="0 0 ${MAP_SIZE} ${MAP_SIZE}">`;

  // Background
  svg += `<rect width="${MAP_SIZE}" height="${MAP_SIZE}" fill="${town.bgColor}" />`;

  // Faction border glow
  svg += `<rect x="2" y="2" width="${MAP_SIZE - 4}" height="${MAP_SIZE - 4}" fill="none" stroke="${town.color}" stroke-width="4" rx="8" opacity="0.6" />`;

  // Lava channels (Legion)
  if (town.lavaChannels) {
    for (const ch of town.lavaChannels) {
      const [x1, y1] = toSVG(bounds[0], ch.z);
      const [x2, y2] = toSVG(bounds[2], ch.z);
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ff4400" stroke-width="3" opacity="0.7" />`;
    }
  }

  // Graveyard (Legion)
  if (town.graveyard) {
    const [cx, cy] = toSVG(town.graveyard.x, town.graveyard.z);
    svg += `<circle cx="${cx}" cy="${cy}" r="${town.graveyard.radius * scale}" fill="none" stroke="#666" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.5" />`;
  }

  // Crystal spires (Fabled)
  if (town.crystalSpires) {
    for (const [x, z] of town.crystalSpires) {
      const [cx, cy] = toSVG(x, z);
      svg += `<polygon points="${cx},${cy - 8} ${cx - 4},${cy + 4} ${cx + 4},${cy + 4}" fill="${town.color}" opacity="0.6" />`;
    }
  }

  // Buildings
  for (const b of town.buildings) {
    const [x, y] = toSVG(b.x - b.w / 2, b.z - b.d / 2);
    const w = b.w * scale;
    const h = b.d * scale;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${town.color}" opacity="0.4" rx="2" />`;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${town.color}" stroke-width="1.5" rx="2" />`;

    // Label
    const [lx, ly] = toSVG(b.x, b.z);
    svg += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="9" font-family="sans-serif" fill="white" opacity="0.8">${b.label}</text>`;
  }

  // Town name
  svg += `<text x="${MAP_SIZE / 2}" y="24" text-anchor="middle" font-size="16" font-weight="bold" font-family="sans-serif" fill="white">${town.name}</text>`;

  // Sector label
  svg += `<text x="${MAP_SIZE / 2}" y="${MAP_SIZE - 12}" text-anchor="middle" font-size="11" font-family="sans-serif" fill="white" opacity="0.6">Sector ${town.sectorId}</text>`;

  svg += `</svg>`;
  return svg;
}

// ── Main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const town of TOWNS) {
  const svg = generateMinimapSVG(town);
  const outPath = path.join(OUT_DIR, `town_${town.id}.svg`);
  fs.writeFileSync(outPath, svg);
  console.log(`Generated: ${outPath}`);
}

console.log(`\n${TOWNS.length} minimaps generated in ${OUT_DIR}`);
console.log('Note: These are SVG placeholders. For full 3D renders, use the in-browser TownComposer minimap capture.');
