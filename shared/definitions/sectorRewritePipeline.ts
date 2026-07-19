/**
 * Sector Rewrite Pipeline — one sector at a time.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NEVER bulk-rewrite all 9 sectors without this gate sequence.
 *
 * For each sector:
 *   1. DESCRIBE  — dossier (lore, locals, tone, hazards, what belongs)
 *   2. INFO      — publish to grudge.studio lore/info pages + JSON
 *   3. BUILD SPEC — approve assets, animals, NPCs, monsters, harvest, landmarks
 *   4. BUILD     — implement against sectorProductionContent + zone systems
 *   5. PROOF     — live zone flyby video + snapshots (animals, npcs, harvest…)
 *   6. COMPLETE  — mark dossier status complete; next sector only then
 *
 * Shared dependencies (do not fork):
 *   • sectorProductionContent.ts — seeds, harvest, wildlife, monsters, landmarks
 *   • worldMapSectors.ts         — terrain3d, colors, hazards, ambientFx
 *   • biomeEcosystemCatalog.ts   — trees, rocks, animals, ground PBR
 *   • zoneServerNodes.ts         — population generator (islands, patrols, camps)
 *   • sectorDossiers.ts          — lore + locals + rewrite plan (this pipeline’s voice)
 *   • Island3DEngine zone mode   — client deploy
 *   • SectorRoom Colyseus        — server parity
 *
 * Package / publish:
 *   npm run production:publish-sectors
 *   npm run production:publish-dossiers   (when added)
 *   GET /api/production/sectors
 *   GET /api/production/dossiers
 *   GET /api/production/dossiers/:sectorId
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const SECTOR_REWRITE_PIPELINE_VERSION = '1.0.0';

export type SectorRewriteStage =
  | 'queued'
  | 'describe'
  | 'info_published'
  | 'build_spec'
  | 'building'
  | 'proof'
  | 'complete';

/** Canonical order — one at a time, top-left → bottom-right */
export const SECTOR_REWRITE_ORDER = [
  'ethereal_falls',
  'frostbite_expanse',
  'thornwood_wilds',
  'stormbreak_reef',
  'convergence_nexus',
  'ashen_wastes',
  'abyssal_trench',
  'haven_shore',
  'ember_depths',
] as const;

export type PipelineSectorId = (typeof SECTOR_REWRITE_ORDER)[number];

export const SECTOR_REWRITE_PRINCIPLES = [
  'Describe lore and locals before any mesh / density / gameplay rewrite.',
  'Publish dossier to /lore/sectors and /production/dossiers-content.json before build.',
  'Build only what is right for that sector’s biome, tone, and difficulty.',
  'Reuse sectorProductionContent + biome ecosystem — no one-off spawn tables.',
  'Prove live deploy with flyby video + snapshots: animals, NPCs, monsters, harvestables, captains, travelers, nodes, landmarks.',
  'Complete one sector fully before starting the next in SECTOR_REWRITE_ORDER.',
  'Client and Colyseus must share the same worldSeed + sectorId seed namespaces.',
] as const;

export const SECTOR_REWRITE_DEPENDENCIES = {
  ssot: [
    'shared/definitions/sectorDossiers.ts',
    'shared/definitions/sectorProductionContent.ts',
    'shared/definitions/worldMapSectors.ts',
    'shared/definitions/biomeEcosystemCatalog.ts',
    'shared/definitions/zoneServerNodes.ts',
  ],
  client: [
    'client/src/island3d/engine/Island3DEngine.ts',
    'client/src/island3d/engine/ZoneSceneBuilder.ts',
    'client/src/island3d/zone/*',
    'client/src/island3d/cinematic/ZoneFlyby.ts',
  ],
  server: [
    'server/colyseus/rooms/SectorRoom.ts',
    'server/routes/productionMapPublish.ts',
  ],
  publish: [
    'scripts/publish-sector-production-content.mjs',
    'scripts/publish-sector-dossiers.mjs',
    'client/public/production/sectors-content.json',
    'client/public/production/dossiers-content.json',
  ],
  loreUi: [
    'client/src/pages/lore/sectors.tsx',
    'client/src/pages/lore/sector-detail.tsx',
    'client/src/pages/lore/world.tsx',
  ],
} as const;

/** Proof checklist — flyby / snapshots must show each category when present */
export const SECTOR_PROOF_CHECKLIST = [
  { id: 'islands', label: 'Islands / land mass' },
  { id: 'animals', label: 'Land wildlife' },
  { id: 'fish', label: 'Fish / water life' },
  { id: 'npcs', label: 'NPC camps / wanderers' },
  { id: 'monsters', label: 'Monsters / hostiles' },
  { id: 'harvestables', label: 'Harvest nodes (wood / stone / herb / fish)' },
  { id: 'docks', label: 'Docks / berths' },
  { id: 'enemy_boats', label: 'Enemy / faction ship patrols' },
  { id: 'captains', label: 'Captains / commanders (if capital)' },
  { id: 'travelers', label: 'Travelers / quest NPCs' },
  { id: 'landmarks', label: 'Sector landmarks (event falls, mountain city, etc.)' },
  { id: 'nodes', label: 'POIs / settlements / portals' },
] as const;

export function nextPipelineSector(
  statuses: Record<string, SectorRewriteStage>,
): PipelineSectorId | null {
  for (const id of SECTOR_REWRITE_ORDER) {
    const st = statuses[id] ?? 'queued';
    if (st !== 'complete') return id;
  }
  return null;
}

export function canAdvanceStage(
  current: SectorRewriteStage,
  target: SectorRewriteStage,
): boolean {
  const order: SectorRewriteStage[] = [
    'queued',
    'describe',
    'info_published',
    'build_spec',
    'building',
    'proof',
    'complete',
  ];
  return order.indexOf(target) === order.indexOf(current) + 1;
}
