/**
 * Cave Dungeon Contract — access points, layers, water exclusion, respawn.
 *
 * Source GLBs (local → R2 CDN):
 *   public/models/caves/2cave.glb
 *   public/models/caves/old_cave_lethal_ape_redux.glb
 *
 * Rules:
 *  1. Every cave has ≥1 access point (mouth) for enter/exit.
 *  2. Navmesh is baked from walkable floor meshes inside the shell.
 *  3. Water never fills cave interiors — even if world Y < ocean waterLevel
 *     (interior disables swim; ocean mesh does not render/collide inside).
 *  4. Usable as on-island dungeons and respawnable dungeon instances.
 */

export const CAVE_CONTRACT_VERSION = '1.0.0';

/** Three.js layers — bit index for Object3D.layers */
export const CAVE_LAYERS = {
  /** Outdoor world (terrain, ocean, props) */
  world: 0,
  /** Cave shell + floor + props — camera + character when inside */
  caveInterior: 1,
  /** Ocean / Gerstner / water column probes — never active in interior */
  water: 2,
  /** Access portal FX (visible from world + interior) */
  portal: 3,
} as const;

export type CavePrefabId = 'cave_dual' | 'cave_lethal_ape';

export interface CaveAccessPoint {
  id: string;
  /** Local space relative to cave root (meters, SI) */
  localPos: [number, number, number];
  /** Interaction radius (m) */
  radius: number;
  /** Suggested facing when exiting (radians, Y) */
  exitYaw: number;
  label: string;
}

export interface CavePrefabDef {
  id: CavePrefabId;
  name: string;
  /** Client-relative path (also CDN via assetUrl) */
  glbPath: string;
  /** Fallback CDN path after R2 upload */
  cdnKey: string;
  /** Uniform scale so mouth fits ~2–3 m character */
  scale: number;
  accessPoints: CaveAccessPoint[];
  /** Floor mesh name hints for navmesh sample */
  floorNamePatterns: string[];
  /** Ceiling / shell patterns (block water, collision) */
  shellNamePatterns: string[];
  /** Default dungeon instance template */
  dungeonKind: 'island_cave' | 'respawn_dungeon';
  /** Full respawn cycle for respawnable dungeons (ms) */
  respawnMs: number;
  /** Max concurrent players in instance */
  maxPlayers: number;
  /** Min level recommendation */
  minLevel: number;
}

/** 4h regen aligned with harvest ecosystem */
export const CAVE_DUNGEON_RESPAWN_MS = 4 * 60 * 60 * 1000;

export const CAVE_PREFABS: Record<CavePrefabId, CavePrefabDef> = {
  cave_dual: {
    id: 'cave_dual',
    name: 'Twin Mouth Cave',
    glbPath: '/models/caves/2cave.glb',
    cdnKey: 'models/caves/2cave.glb',
    scale: 1,
    // Dual mouths — entry front + secondary (tweak after art QA)
    accessPoints: [
      {
        id: 'mouth_a',
        localPos: [0, 1.2, 8],
        radius: 3.5,
        exitYaw: Math.PI,
        label: 'Main mouth',
      },
      {
        id: 'mouth_b',
        localPos: [6, 1.2, -4],
        radius: 3.0,
        exitYaw: 0,
        label: 'Side mouth',
      },
    ],
    floorNamePatterns: ['floor', 'ground', 'walk', 'path', 'terrain'],
    shellNamePatterns: ['rock', 'wall', 'ceiling', 'cave', 'mesh'],
    dungeonKind: 'island_cave',
    respawnMs: CAVE_DUNGEON_RESPAWN_MS,
    maxPlayers: 4,
    minLevel: 1,
  },
  cave_lethal_ape: {
    id: 'cave_lethal_ape',
    name: 'Lethal Ape Redux Cave',
    glbPath: '/models/caves/old_cave_lethal_ape_redux.glb',
    cdnKey: 'models/caves/old_cave_lethal_ape_redux.glb',
    scale: 1,
    accessPoints: [
      {
        id: 'mouth_main',
        localPos: [0, 1.0, 10],
        radius: 4.0,
        exitYaw: Math.PI,
        label: 'Cave entrance',
      },
    ],
    floorNamePatterns: ['floor', 'ground', 'walk', 'dirt', 'stone'],
    shellNamePatterns: ['rock', 'wall', 'cliff', 'cave'],
    dungeonKind: 'respawn_dungeon',
    respawnMs: CAVE_DUNGEON_RESPAWN_MS,
    maxPlayers: 5,
    minLevel: 3,
  },
};

export function listCavePrefabs(): CavePrefabDef[] {
  return Object.values(CAVE_PREFABS);
}

export function getCavePrefab(id: string): CavePrefabDef | null {
  return CAVE_PREFABS[id as CavePrefabId] ?? null;
}

/**
 * Water / swim rule for interiors.
 * When true, CharacterController must not use ocean waterLevel for swim.
 */
export function caveInteriorSuppressesWater(_worldY: number): boolean {
  return true; // always suppress while in any cave interior session
}

/** Instance state for respawnable dungeon (server + client overlay). */
export interface CaveDungeonInstanceState {
  instanceId: string;
  prefabId: CavePrefabId;
  islandId: string | null;
  sectorId: string | null;
  worldPos: [number, number, number];
  /** active | clearing | depleted | respawning */
  state: 'active' | 'clearing' | 'depleted' | 'respawning';
  respawnAt: number;
  seed: string;
}
