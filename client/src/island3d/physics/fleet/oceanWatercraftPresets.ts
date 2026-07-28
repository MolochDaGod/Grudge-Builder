/**
 * Rapier + gameplay presets for ocean craft: boats, rafts, decks, water.
 *
 * Official Rapier: kinematic for driven hulls, fixed for static docks,
 * sensors for water volumes / boarding zones.
 */

import { packCollisionGroups, COLLISION_MEMBER, FILTER_SOLIDS } from './colliderPresets';

export type WatercraftKind = 'raft' | 'rowboat' | 'sloop' | 'galleon' | 'dock' | 'debris';

export interface WatercraftPhysicsPreset {
  kind: WatercraftKind;
  /** Hull rigid body role */
  bodyType: 'kinematic_position' | 'fixed' | 'dynamic';
  /** Deck friction for characters */
  deckFriction: number;
  /** Hull restitution (bump) */
  hullRestitution: number;
  /** Density if dynamic debris */
  density: number;
  /** Continuous collision for fast craft */
  ccd: boolean;
  /** Prefer multi-collider hull + deck plates */
  compoundHull: boolean;
  /** Waterline offset from root Y (metres) */
  waterlineY: number;
  notes: string;
}

export const WATERCRAFT_PHYSICS: Record<WatercraftKind, WatercraftPhysicsPreset> = {
  raft: {
    kind: 'raft',
    bodyType: 'kinematic_position',
    deckFriction: 0.95,
    hullRestitution: 0.05,
    density: 0.4,
    ccd: false,
    compoundHull: true,
    waterlineY: 0.15,
    notes: 'Player-driven raft: kinematic follow waves; low freeboard climb lips',
  },
  rowboat: {
    kind: 'rowboat',
    bodyType: 'kinematic_position',
    deckFriction: 0.9,
    hullRestitution: 0.08,
    density: 0.5,
    ccd: false,
    compoundHull: true,
    waterlineY: 0.35,
    notes: 'Small boat — deck + gunwale climb',
  },
  sloop: {
    kind: 'sloop',
    bodyType: 'kinematic_position',
    deckFriction: 0.88,
    hullRestitution: 0.1,
    density: 0.6,
    ccd: true,
    compoundHull: true,
    waterlineY: 0.55,
    notes: 'Main player ship; CCD when ramming',
  },
  galleon: {
    kind: 'galleon',
    bodyType: 'kinematic_position',
    deckFriction: 0.9,
    hullRestitution: 0.12,
    density: 0.8,
    ccd: true,
    compoundHull: true,
    waterlineY: 0.85,
    notes: 'Large multi-deck; upper deck + stairs colliders',
  },
  dock: {
    kind: 'dock',
    bodyType: 'fixed',
    deckFriction: 0.95,
    hullRestitution: 0,
    density: 0,
    ccd: false,
    compoundHull: true,
    waterlineY: 0,
    notes: 'Static pier — fixed cuboids / trimesh',
  },
  debris: {
    kind: 'debris',
    bodyType: 'dynamic',
    deckFriction: 0.5,
    hullRestitution: 0.2,
    density: 0.35,
    ccd: false,
    compoundHull: false,
    waterlineY: 0.1,
    notes: 'Floating wreck bits — dynamic + buoyancy force in water volume',
  },
};

/** Sensor groups for water volume + boarding trigger */
export const WATER_SENSOR_GROUPS = packCollisionGroups(
  COLLISION_MEMBER.SENSOR,
  COLLISION_MEMBER.PLAYER | COLLISION_MEMBER.NPC | COLLISION_MEMBER.VEHICLE,
);

export const DECK_COLLIDER_GROUPS = packCollisionGroups(
  COLLISION_MEMBER.STATIC | COLLISION_MEMBER.VEHICLE,
  FILTER_SOLIDS,
);

export const WATERCRAFT_RULES = [
  'Driven hulls = kinematic position-based (setNextKinematicTranslation each step)',
  'Never dynamic trimesh for whole ship — compound cuboids / convex pieces',
  'Deck plates friction high; sail cloth is visual only (no solid sail colliders)',
  'Water volume = sensor for swim state; buoyancy is gameplay spring not full fluid sim',
  'Climb gunwales registered as climbable meshes for CCT',
  'Docks fixed; boats kinematic; wreck debris dynamic with density>0',
  'SI meters; freeboard from oceanWatercraft / ShipInteractable profiles',
] as const;
