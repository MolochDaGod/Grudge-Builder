/**
 * Low-poly mobile game obstacles multipack — traps / defenses / dungeon hazards.
 *
 * Source: D:\Games\Models\low_poly_mobile_game_obstacles.glb
 * Production: public/models/obstacles/mobile_game_obstacles.glb
 *   (PBR-upgraded: metal/stone/hazard albedo + ORM maps)
 *
 * Node names are Sketchfab-export roots; PackModelLoader clones by nodeName.
 */

export const MOBILE_OBSTACLES_MODEL = '/models/obstacles/mobile_game_obstacles.glb';
/** CDN-relative path used by BuildAssetManifest (same-origin public fallback). */
export const MOBILE_OBSTACLES_CDN = 'models/obstacles/mobile_game_obstacles.glb';

export type ObstacleKind =
  | 'spike'
  | 'spike_tall'
  | 'cylinder'
  | 'gear'
  | 'bomb'
  | 'spiral'
  | 'spike_base'
  | 'door'
  | 'grid'
  | 'platform';

export interface ObstaclePieceDef {
  id: string;
  kind: ObstacleKind;
  /** Multipack node name inside mobile_game_obstacles.glb */
  nodeName: string;
  label: string;
  /** Build / defense catalog size [w,h,d] metres (approx after recenter) */
  size: [number, number, number];
  /** Default uniform scale for island placement */
  scale: number;
  /** Hazard radius (m) when used as trap */
  hazardRadius: number;
  /** Damage per trigger / tick */
  damage: number;
  /** Seconds between damage ticks while player is inside (0 = one-shot) */
  tickSec: number;
  /** Rotating / animated prop in dungeon */
  animate?: 'spin_y' | 'bob_y' | 'none';
  /** Suggested roles */
  roles: Array<'buildable' | 'camp_defense' | 'dungeon_trap' | 'enemy_camp'>;
}

/**
 * Placeable trap / defense pieces extracted from the multipack.
 * (Spike variants 002/003 are tall risers; 8/001 are base spikes.)
 */
export const MOBILE_OBSTACLE_PIECES: Record<string, ObstaclePieceDef> = {
  trap_spike: {
    id: 'trap_spike',
    kind: 'spike',
    nodeName: 'spike-obstacle_8',
    label: 'Spike Trap',
    size: [1.4, 1.2, 1.4],
    scale: 1.15,
    hazardRadius: 1.1,
    damage: 18,
    tickSec: 0.9,
    animate: 'none',
    roles: ['buildable', 'camp_defense', 'dungeon_trap', 'enemy_camp'],
  },
  trap_spike_tall: {
    id: 'trap_spike_tall',
    kind: 'spike_tall',
    nodeName: 'spike-obstacle.002_11',
    label: 'Rising Spikes',
    size: [1.2, 1.6, 1.2],
    scale: 1.2,
    hazardRadius: 1.0,
    damage: 22,
    tickSec: 0.75,
    animate: 'bob_y',
    roles: ['buildable', 'dungeon_trap', 'enemy_camp'],
  },
  trap_cylinder: {
    id: 'trap_cylinder',
    kind: 'cylinder',
    nodeName: 'CylinderObstacle_6',
    label: 'Spinning Barrel',
    size: [1.6, 1.8, 1.6],
    scale: 1.1,
    hazardRadius: 1.35,
    damage: 14,
    tickSec: 0.55,
    animate: 'spin_y',
    roles: ['buildable', 'camp_defense', 'dungeon_trap', 'enemy_camp'],
  },
  trap_gear: {
    id: 'trap_gear',
    kind: 'gear',
    nodeName: 'gear-base_7',
    label: 'Gear Crusher',
    size: [2.0, 1.4, 2.0],
    scale: 1.05,
    hazardRadius: 1.5,
    damage: 20,
    tickSec: 0.65,
    animate: 'spin_y',
    roles: ['buildable', 'dungeon_trap', 'enemy_camp'],
  },
  trap_bomb: {
    id: 'trap_bomb',
    kind: 'bomb',
    nodeName: 'Bomb_5',
    label: 'Bomb Mine',
    size: [0.9, 1.0, 0.9],
    scale: 1.0,
    hazardRadius: 2.2,
    damage: 45,
    tickSec: 0,
    animate: 'none',
    roles: ['buildable', 'dungeon_trap', 'enemy_camp'],
  },
  trap_spiral: {
    id: 'trap_spiral',
    kind: 'spiral',
    nodeName: 'SpiralBase_15',
    label: 'Spiral Plate',
    size: [2.2, 0.5, 2.2],
    scale: 1.0,
    hazardRadius: 1.4,
    damage: 8,
    tickSec: 1.0,
    animate: 'spin_y',
    roles: ['buildable', 'dungeon_trap'],
  },
  trap_spike_base: {
    id: 'trap_spike_base',
    kind: 'spike_base',
    nodeName: 'SpikeBase_16',
    label: 'Spike Plate',
    size: [2.4, 0.6, 2.4],
    scale: 1.0,
    hazardRadius: 1.6,
    damage: 16,
    tickSec: 0.85,
    animate: 'none',
    roles: ['buildable', 'camp_defense', 'dungeon_trap', 'enemy_camp'],
  },
  trap_grid: {
    id: 'trap_grid',
    kind: 'grid',
    nodeName: 'GridGround_4',
    label: 'Hazard Grid',
    size: [2.5, 0.2, 2.5],
    scale: 1.0,
    hazardRadius: 1.2,
    damage: 10,
    tickSec: 1.1,
    animate: 'none',
    roles: ['buildable', 'dungeon_trap'],
  },
  defense_door: {
    id: 'defense_door',
    kind: 'door',
    nodeName: 'GroundDoor01_2',
    label: 'Trap Door Plate',
    size: [2.0, 0.35, 2.0],
    scale: 1.0,
    hazardRadius: 1.0,
    damage: 0,
    tickSec: 0,
    animate: 'none',
    roles: ['buildable', 'camp_defense'],
  },
};

export const MOBILE_OBSTACLE_LIST = Object.values(MOBILE_OBSTACLE_PIECES);

/** Pieces that auto-seed on hostile enemy camps (perimeter defense). */
export const ENEMY_CAMP_TRAP_SEED: Array<{ pieceId: string; count: number }> = [
  { pieceId: 'trap_spike', count: 3 },
  { pieceId: 'trap_spike_base', count: 1 },
  { pieceId: 'trap_cylinder', count: 1 },
  { pieceId: 'trap_bomb', count: 1 },
];

/**
 * Dungeon surface trap plan by seed (deterministic pick from pool).
 * Weights used with mulberry32(seed).
 */
export const DUNGEON_TRAP_SEED_POOL: Array<{ pieceId: string; weight: number }> = [
  { pieceId: 'trap_spike', weight: 4 },
  { pieceId: 'trap_spike_tall', weight: 3 },
  { pieceId: 'trap_cylinder', weight: 3 },
  { pieceId: 'trap_gear', weight: 2 },
  { pieceId: 'trap_bomb', weight: 2 },
  { pieceId: 'trap_spiral', weight: 2 },
  { pieceId: 'trap_spike_base', weight: 2 },
  { pieceId: 'trap_grid', weight: 1 },
];

/** How many surface traps / pit traps for a given dungeon seed. */
export function dungeonTrapCounts(seed: number): { surface: number; pit: number } {
  const s = Math.abs(seed | 0);
  return {
    surface: 10 + (s % 7), // 10–16
    pit: 4 + (s % 4), // 4–7
  };
}

export function pickWeightedObstacle(
  pool: Array<{ pieceId: string; weight: number }>,
  rand: () => number,
): string {
  let total = 0;
  for (const p of pool) total += p.weight;
  let r = rand() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p.pieceId;
  }
  return pool[0]?.pieceId ?? 'trap_spike';
}
