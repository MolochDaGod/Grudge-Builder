/**
 * Sector Dossiers — lore-first rewrite voice for each Warlords zone.
 *
 * Write / approve a dossier BEFORE mesh density or gameplay rewrite.
 * Ethereal Falls is the pilot (stage: info_published → build_spec ready).
 * Remaining sectors are stubs until their turn in SECTOR_REWRITE_ORDER.
 */

import type { SectorRewriteStage } from './sectorRewritePipeline';
import { SECTOR_REWRITE_ORDER } from './sectorRewritePipeline';
import { getSectorProductionContent } from './sectorProductionContent';
import { getSectorById } from './worldMapSectors';
import { LEGACY_TO_ZONE_ID, type LegacySectorId } from './sectorBridge';

export const SECTOR_DOSSIERS_VERSION = '1.0.0';

export interface SectorLocal {
  id: string;
  name: string;
  role: 'faction' | 'merchant' | 'captain' | 'traveler' | 'villager' | 'hostile' | 'spirit' | 'beast';
  faction?: string;
  description: string;
  /** What they sell / give / guard */
  services?: string[];
}

export interface SectorBuildWant {
  id: string;
  title: string;
  whyItFits: string;
  dependsOn: string[];
  proofIds: string[];
}

export interface SectorDossier {
  sectorId: string;
  legacyId: string;
  name: string;
  subtitle: string;
  mapCorner: string;
  stage: SectorRewriteStage;
  /** Short blurb for cards */
  tagline: string;
  /** Full player-facing lore */
  lore: string;
  /** Tone / design intent */
  tone: string;
  /** Who lives here */
  locals: SectorLocal[];
  /** What players feel / do */
  gameplayPillars: string[];
  hazards: string[];
  resources: string[];
  /** Approved build list for this sector only */
  buildWants: SectorBuildWant[];
  /** Live proof URL (zone mode) */
  playUrl: string;
  flybyUrl: string;
  snapshotDir: string;
  /** Info / lore page path */
  lorePath: string;
  updated: string;
  notes?: string[];
}

function baseUrls(sectorId: string) {
  return {
    playUrl: `https://client.grudge-studio.com/island-3d?mode=zone&sector=${sectorId}&worldSeed=grudge-world-1`,
    flybyUrl: `https://client.grudge-studio.com/island-3d?mode=zone&sector=${sectorId}&worldSeed=grudge-world-1&flyby=1&proof=1`,
    snapshotDir: `/production/snapshots/${sectorId}/`,
    lorePath: `/lore/sectors/${sectorId}`,
  };
}

// ── Ethereal Falls (pilot — full dossier) ────────────────────────────────────

const ETHEREAL_FALLS: SectorDossier = {
  sectorId: 'ethereal_falls',
  legacyId: 'NW',
  name: 'Ethereal Falls',
  subtitle: 'Where the First God wept',
  mapCorner: 'top_left',
  stage: 'proof',
  tagline:
    'Rivers of liquid light climb into the sky; floating crystal isles hang over a spectral abyss.',
  lore:
    'When the First God wept during the Sundering, their tears became rivers of liquid light that flow upward, defying gravity. ' +
    'The falls shimmer between purple and cyan, illuminating islands of crystallized magic suspended in mid-air. ' +
    'The mist below is alive — phantoms of drowned sailors reach up from the luminous depths, and the water itself dissolves mortal flesh. ' +
    'Fabled seers claim the Event Falls are a scar left when Madra’s domain brushed the Worldboard; only the worthy harvest Ethereal Crystals where light meets shadow. ' +
    'Pirate scavengers and neutral crystal-cutters share the outer docks with Fabled pilgrim camps — uneasy truce under violet aurora.',
  tone:
    'Impossible beauty + lethal magic. Cool purple/cyan palette, low sun, high fog drama. Verticality (floating islands), soft danger (mist drain), rare harvest prestige. Not a starter zone — mid-high risk pilgrimage.',
  locals: [
    {
      id: 'fabled_seer_camp',
      name: 'Fabled Seer Circles',
      role: 'faction',
      faction: 'fabled',
      description:
        'Pilgrim camps under crystal canopies. Sell spectral essence, offer teleport whispers and shrine blessings.',
      services: ['vendor', 'quest_giver', 'shrine'],
    },
    {
      id: 'crystal_cutters',
      name: 'Crystal Cutters Guild',
      role: 'merchant',
      faction: 'neutral',
      description:
        'Neutral harvesters who teach ethereal crystal safety (wrong cut = overload explosion).',
      services: ['vendor', 'profession_trainer'],
    },
    {
      id: 'void_pirates',
      name: 'Voidwake Corsairs',
      role: 'hostile',
      faction: 'pirate',
      description:
        'Ship patrols hunting pilgrim freighters. Enemy boats in the luminous sea lanes.',
      services: ['pve_combat', 'salvage_drop'],
    },
    {
      id: 'phantom_choir',
      name: 'Phantom Choir',
      role: 'spirit',
      description:
        'Wisp processions in the mist. Not fully hostile — aggro if you mine crystals greedily.',
    },
    {
      id: 'falls_traveler',
      name: 'Falls Dock Traveler',
      role: 'traveler',
      faction: 'neutral',
      description:
        'Same Dock Traveler lineage as tutorial — here sells cascade maps and warns of gravity inversion pockets.',
      services: ['vendor', 'map_hints', 'teleport_rumors'],
    },
  ],
  gameplayPillars: [
    'Vertical crystal isles + Event Falls landmark as hero shot',
    'Rare ethereal harvest with risk (crystal_overload)',
    'Fabled / neutral camps + pirate ship patrols',
    'Phantom wildlife and mid-band undead/magic monsters',
    'Spectral mist and gravity FX as zone identity',
  ],
  hazards: [
    'spectral_mist_drain',
    'gravity_inversion',
    'phantom_grasp',
    'crystal_overload',
    'luminous_whirlpool',
    'reality_thin_zones',
  ],
  resources: [
    'ethereal_crystals',
    'spectral_essence',
    'luminous_pearl',
    'voidtouched_coral',
    'gravity_stone',
    'phantom_silk',
    'tear_of_the_first_god',
  ],
  buildWants: [
    {
      id: 'event_falls_hero',
      title: 'Event Falls + Starting Falls landmarks',
      whyItFits: 'Authoring GLBs define the sector’s vertical cascade identity.',
      dependsOn: ['event-falls.glb', 'starting-falls.glb', 'SectorEventLandmarks'],
      proofIds: ['landmarks', 'islands'],
    },
    {
      id: 'ethereal_ecosystem',
      title: 'Ethereal biome ecosystem (ground_8, stylized/pine, 5 animals)',
      whyItFits: 'Matches purple crystal ground and soft canopy tints.',
      dependsOn: ['biomeEcosystemCatalog.ethereal', 'sectorProductionContent'],
      proofIds: ['animals', 'harvestables'],
    },
    {
      id: 'dense_isles_ships',
      title: 'Dense archipelago + enemy boat patrols',
      whyItFits: 'Pilgrims need docks; corsairs need sea lanes.',
      dependsOn: ['zoneServerNodes', 'ZoneSceneBuilder ship markers'],
      proofIds: ['islands', 'enemy_boats', 'docks'],
    },
    {
      id: 'fabled_npc_camps',
      title: 'Fabled / neutral / pirate NPC camps',
      whyItFits: 'Locals from dossier — not generic crusade spam.',
      dependsOn: ['npcCamps', 'spawnZoneCamps factions'],
      proofIds: ['npcs', 'travelers'],
    },
    {
      id: 'mid_magic_monsters',
      title: 'Mid-band magic monsters + lich boss gate',
      whyItFits: 'Difficulty 6–9 pilgrimage, spectral combat fantasy.',
      dependsOn: ['monsters.ts', 'sectorProductionContent.monsters'],
      proofIds: ['monsters'],
    },
  ],
  ...baseUrls('ethereal_falls'),
  updated: '2026-07-18',
  notes: [
    'Pilot sector for rewrite pipeline — complete proof before Frostbite.',
    'Legacy SECTOR_LORE NW ("Dried Basin") is superseded for production by Ethereal Falls.',
    'Canonical play: island-3d?mode=zone&sector=ethereal_falls',
  ],
};

// ── Stubs for remaining sectors (queued until their turn) ────────────────────

function stub(
  sectorId: string,
  legacyId: string,
  mapCorner: string,
  subtitle: string,
  tagline: string,
): SectorDossier {
  const ws = getSectorById(sectorId);
  const prod = getSectorProductionContent(sectorId);
  return {
    sectorId,
    legacyId,
    name: ws?.name ?? sectorId,
    subtitle,
    mapCorner,
    stage: 'queued',
    tagline,
    lore: ws?.lore ?? 'Dossier pending — do not rewrite until this sector is next in SECTOR_REWRITE_ORDER.',
    tone: 'Pending describe stage.',
    locals: [],
    gameplayPillars: [],
    hazards: ws?.hazards ?? [],
    resources: ws?.resources ?? prod?.harvest.resources ?? [],
    buildWants: [],
    ...baseUrls(sectorId),
    updated: '2026-07-18',
    notes: ['Queued — complete Ethereal Falls proof before opening this dossier.'],
  };
}

export const SECTOR_DOSSIERS: Record<string, SectorDossier> = {
  ethereal_falls: ETHEREAL_FALLS,
  frostbite_expanse: stub(
    'frostbite_expanse',
    'N',
    'top_center',
    'Fabled forge under ice',
    'Snow pines, fabledzone core, ice kit props — next after Ethereal proof.',
  ),
  thornwood_wilds: stub(
    'thornwood_wilds',
    'NE',
    'top_right',
    'Worge canopy & mountain city',
    'Dense forest, hidden mountain city warden — after Frostbite.',
  ),
  stormbreak_reef: stub(
    'stormbreak_reef',
    'W',
    'mid_left',
    'Perpetual storms',
    'Reefs, lightning, heavy sailing combat.',
  ),
  convergence_nexus: stub(
    'convergence_nexus',
    'CENTER',
    'center',
    'Contested heart',
    'Faction clash, embassies, world events.',
  ),
  ashen_wastes: stub(
    'ashen_wastes',
    'E',
    'mid_right',
    'Glass desert',
    'Demon capital, heat, sandstorms.',
  ),
  abyssal_trench: stub(
    'abyssal_trench',
    'SW',
    'bottom_left',
    'Deep trench',
    'Leviathans, undead capital, crushing pressure.',
  ),
  haven_shore: stub(
    'haven_shore',
    'S',
    'bottom_center',
    'Safe tropical start',
    'Fruzer foundation, Haven Port — starter safe zone.',
  ),
  ember_depths: stub(
    'ember_depths',
    'SE',
    'bottom_right',
    'Volcanic birth of Legion',
    'Lava, ash, high-risk volcanic fantasy.',
  ),
};

export function getSectorDossier(sectorId: string | undefined | null): SectorDossier | null {
  if (!sectorId) return null;
  return SECTOR_DOSSIERS[sectorId] ?? null;
}

export function listSectorDossiers(): SectorDossier[] {
  return SECTOR_REWRITE_ORDER.map((id) => SECTOR_DOSSIERS[id]).filter(Boolean);
}

export function dossierStatuses(): Record<string, SectorRewriteStage> {
  const out: Record<string, SectorRewriteStage> = {};
  for (const id of SECTOR_REWRITE_ORDER) {
    out[id] = SECTOR_DOSSIERS[id]?.stage ?? 'queued';
  }
  return out;
}

/** JSON payload for info hub + production static publish */
export function buildDossiersManifest() {
  const statuses = dossierStatuses();
  return {
    version: SECTOR_DOSSIERS_VERSION,
    pipelineVersion: '1.0.0',
    updated: new Date().toISOString().slice(0, 10),
    principles: [
      'Describe lore and locals before rewrite',
      'Publish to lore/info before build',
      'Build only what fits the sector',
      'Prove with flyby + snapshots on live zone',
      'One sector at a time',
    ],
    order: [...SECTOR_REWRITE_ORDER],
    statuses,
    activeSector: SECTOR_REWRITE_ORDER.find((id) => statuses[id] !== 'complete') ?? null,
    dossiers: listSectorDossiers().map((d) => ({
      ...d,
      production: getSectorProductionContent(d.sectorId)
        ? {
            ecosystemId: getSectorProductionContent(d.sectorId)!.ecosystemId,
            groundPbr: getSectorProductionContent(d.sectorId)!.harvest.groundPbr,
            heightmapModifier: getSectorProductionContent(d.sectorId)!.terrain.heightmapModifier,
            animals: getSectorProductionContent(d.sectorId)!.wildlife.animals,
            monsters: getSectorProductionContent(d.sectorId)!.monsters,
            landmarks: getSectorProductionContent(d.sectorId)!.events.landmarks.map((l) => l.id),
          }
        : null,
    })),
    urls: {
      loreIndex: '/lore/sectors',
      api: '/api/production/dossiers',
      static: '/production/dossiers-content.json',
      sectorsPackage: '/production/sectors-content.json',
    },
    legacyBridge: Object.fromEntries(
      (Object.keys(LEGACY_TO_ZONE_ID) as LegacySectorId[]).map((k) => [k, LEGACY_TO_ZONE_ID[k]]),
    ),
  };
}
