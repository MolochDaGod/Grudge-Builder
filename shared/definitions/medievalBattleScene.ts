/**
 * Huge Medieval Battle Scene — asset classification + war-unit bake SSOT.
 *
 * Source GLB (~517MB, static flatten from Maya):
 *   D:\Games\grudge-game-engine\huge_medieval_battle_scene.glb
 *
 * Inventory (glTF JSON header):
 *   298 nodes · 291 meshes · 0 skins · 0 animations · 68 materials
 *
 * Naming (Italian Maya export polySurface1315_*):
 *   PG_Mat##  → personaggi / combatants (113) — spawn animated units here
 *   Mura / TileMura / Passerella → walls & walkways (static)
 *   Roccia → rock (static)
 *   Legno / Ferro / Gold → wood / iron / gold props (static)
 *   Stendardi → banners (static, light wind shader optional)
 *   Erba / Zolla → grass / terrain bands
 *   Fire / Smoke → VFX planes (keep as additive emissive)
 *
 * Strategy for an *active* war:
 *   1. Load full GLB as environment (static scene graph)
 *   2. Detect PG_* meshes → record world poses → hide static proxies
 *   3. Spawn grudge6 skinned race models at those poses
 *   4. Attach GOAP-lite AI + Mixamo weapon skills + simple physics
 */

export const MEDIEVAL_BATTLE_SCENE_VERSION = '1.0.0';

/** Local authoring path (dev). Production: R2 after upload. */
export const MEDIEVAL_BATTLE_LOCAL_PATH =
  'D:/Games/grudge-game-engine/huge_medieval_battle_scene.glb';

/** CDN target after `npm run upload:war-scene` */
export const MEDIEVAL_BATTLE_CDN_PATH =
  '/models/war/huge_medieval_battle_scene.glb';

export type BattleSceneLayer =
  | 'unit_proxy'
  | 'wall'
  | 'terrain'
  | 'prop'
  | 'banner'
  | 'vfx_fire'
  | 'vfx_smoke'
  | 'other';

export type WarFactionId = 'crimson' | 'azure' | 'gold' | 'neutral';

export type WarRole =
  | 'infantry'
  | 'archer'
  | 'cavalry'
  | 'captain'
  | 'banner'
  | 'support';

export interface WarUnitArchetype {
  id: string;
  label: string;
  faction: WarFactionId;
  role: WarRole;
  /** grudge6 race for skinned bake */
  raceId: string;
  weaponType: string;
  /** PG_Mat material group from scene */
  pgMatId: number;
  maxHp: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  moveSpeed: number;
  aggroRadius: number;
  /** Skill ids from weapon mastery / skill tree */
  skills: string[];
}

/**
 * Map PG_Mat materials → opposing armies.
 * Mat counts from scene analysis — Mat07 is largest cohort (main line).
 */
export const PG_MAT_TO_ARCHETYPE: Record<number, Omit<WarUnitArchetype, 'id' | 'pgMatId'>> = {
  1: {
    label: 'Crimson Infantry',
    faction: 'crimson',
    role: 'infantry',
    raceId: 'human',
    weaponType: 'sword-shield',
    maxHp: 100,
    damage: 12,
    attackRange: 2.2,
    attackCooldown: 1.1,
    moveSpeed: 4.5,
    aggroRadius: 18,
    skills: ['slash', 'block', 'charge'],
  },
  2: {
    label: 'Crimson Archer',
    faction: 'crimson',
    role: 'archer',
    raceId: 'elf',
    weaponType: 'bow',
    maxHp: 70,
    damage: 10,
    attackRange: 22,
    attackCooldown: 1.4,
    moveSpeed: 4.2,
    aggroRadius: 28,
    skills: ['aimed_shot', 'volley'],
  },
  3: {
    label: 'Crimson Captain',
    faction: 'crimson',
    role: 'captain',
    raceId: 'barbarian',
    weaponType: 'greatsword',
    maxHp: 160,
    damage: 20,
    attackRange: 2.8,
    attackCooldown: 1.3,
    moveSpeed: 4.0,
    aggroRadius: 24,
    skills: ['cleave', 'warcry', 'charge'],
  },
  4: {
    label: 'Azure Infantry',
    faction: 'azure',
    role: 'infantry',
    raceId: 'human',
    weaponType: 'sword',
    maxHp: 100,
    damage: 12,
    attackRange: 2.2,
    attackCooldown: 1.1,
    moveSpeed: 4.5,
    aggroRadius: 18,
    skills: ['slash', 'riposte'],
  },
  7: {
    label: 'Azure Line Troop',
    faction: 'azure',
    role: 'infantry',
    raceId: 'orc',
    weaponType: 'axe',
    maxHp: 120,
    damage: 14,
    attackRange: 2.4,
    attackCooldown: 1.15,
    moveSpeed: 4.3,
    aggroRadius: 20,
    skills: ['cleave', 'roar'],
  },
  8: {
    label: 'Azure Archer',
    faction: 'azure',
    role: 'archer',
    raceId: 'elf',
    weaponType: 'bow',
    maxHp: 70,
    damage: 10,
    attackRange: 22,
    attackCooldown: 1.4,
    moveSpeed: 4.2,
    aggroRadius: 28,
    skills: ['aimed_shot', 'retreat_shot'],
  },
  9: {
    label: 'Gold Guard',
    faction: 'gold',
    role: 'support',
    raceId: 'dwarf',
    weaponType: 'hammer1h',
    maxHp: 130,
    damage: 13,
    attackRange: 2.3,
    attackCooldown: 1.2,
    moveSpeed: 3.8,
    aggroRadius: 16,
    skills: ['bash', 'shield_wall'],
  },
  10: {
    label: 'Gold Mage',
    faction: 'gold',
    role: 'support',
    raceId: 'human',
    weaponType: 'arcane-staff',
    maxHp: 60,
    damage: 16,
    attackRange: 16,
    attackCooldown: 1.6,
    moveSpeed: 3.6,
    aggroRadius: 22,
    skills: ['firebolt', 'heal_pulse'],
  },
  11: {
    label: 'Undead Raider',
    faction: 'crimson',
    role: 'infantry',
    raceId: 'undead',
    weaponType: 'sword',
    maxHp: 90,
    damage: 11,
    attackRange: 2.1,
    attackCooldown: 1.05,
    moveSpeed: 4.6,
    aggroRadius: 19,
    skills: ['slash', 'drain'],
  },
};

export function archetypeForPgMat(matId: number): WarUnitArchetype {
  const base = PG_MAT_TO_ARCHETYPE[matId] ?? PG_MAT_TO_ARCHETYPE[1]!;
  return {
    id: `war_pg_${matId}`,
    pgMatId: matId,
    ...base,
  };
}

/** Classify a glTF node name from the battle scene */
export function classifyBattleNodeName(name: string): BattleSceneLayer {
  const n = name || '';
  if (/PG_Mat/i.test(n)) return 'unit_proxy';
  if (/Mura|TileMura|Passerella|Tegola/i.test(n)) return 'wall';
  if (/Erba|Zolla|Bordo|Roccia/i.test(n)) return 'terrain';
  if (/Stendardi/i.test(n)) return 'banner';
  if (/Fire/i.test(n)) return 'vfx_fire';
  if (/Smoke/i.test(n)) return 'vfx_smoke';
  if (/Legno|Ferro|Gold|Corda|lambert/i.test(n)) return 'prop';
  return 'other';
}

export function parsePgMatId(name: string): number | null {
  const m = name.match(/PG_Mat(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** Factions that are hostile to each other */
export function areFactionsHostile(a: WarFactionId, b: WarFactionId): boolean {
  if (a === 'neutral' || b === 'neutral') return false;
  if (a === b) return false;
  // Crimson vs Azure is main war; Gold is third force hostile to both
  return true;
}

export const WAR_SCENE_DEFAULTS = {
  /** Cap animated units for performance (scene has 113 proxies) */
  maxAnimatedUnits: 80,
  /** Hide static PG proxies after spawn */
  hideUnitProxies: true,
  /** Bake Mixamo idle/walk/run/attack on every unit */
  bakeAnimations: true,
  /** Separation force between units */
  separationRadius: 1.4,
  groundRayMax: 80,
  /** AI goal arbitration Hz */
  goalHz: 4,
  visionHz: 5,
  attackHz: 8,
  /**
   * Walls: pair largest Mura/RocciaMura as repaired (collider+HP),
   * hide nearby rubble as broken until HP=0.
   */
  wallClusterRadiusM: 14,
  wallDefaultMaxHp: 220,
} as const;
