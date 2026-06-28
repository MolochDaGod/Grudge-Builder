/**
 * Ship System
 *
 * Modular ship builder using Scallywag Ships tileset parts.
 * Ships are crafted at docks, used for zone travel on the world map,
 * and can engage in cannon combat when entering hostile zones.
 *
 * Characters become captains — ships are game assets (not NFTs).
 */

import { v4 as uuidv4 } from 'uuid';
import {
  HULL_COLORS, SAIL_COLORS, SHIP_SIZES, SHIPS_SHEET,
  getShipHullRegion, getShipSailRegion,
  type HullColor, type SailColor, type ShipSize,
} from '@shared/definitions/islandAssetManifest';
import { SHIP_CATALOG_BY_SIZE } from '@shared/definitions/shipCatalog';

// ── Ship Configuration ────────────────────────────────────────────────────────

export interface ShipConfig {
  id: string;
  name: string;
  size: ShipSize;
  hullColor: HullColor;
  sailColor: SailColor;
  /** Equipped cannon count (max = SHIP_SIZES[size].cannonSlots) */
  cannons: number;
  /** Crew members aboard (characters + pirate units) */
  crewIds: string[];
  /** Captain character ID */
  captainId: string | null;
}

export interface Ship extends ShipConfig {
  hp: number;
  maxHp: number;
  speed: number; // zones per hour
  /** Current world zone position */
  zoneX: number;
  zoneY: number;
  /** Travel state */
  travelDestination: { zoneX: number; zoneY: number } | null;
  travelStartedAt: number | null;
  travelArrivalAt: number | null;
  /** Damage state */
  isDamaged: boolean;
  createdAt: number;
}

// ── Ship Stats by Size ────────────────────────────────────────────────────────

const SHIP_STATS: Record<ShipSize, { maxHp: number; speed: number; cannonDmg: number }> = {
  rowboat:  { maxHp: 30,  speed: 4, cannonDmg: 0 },
  sloop:    { maxHp: 80,  speed: 3, cannonDmg: 10 },
  galleon:  { maxHp: 200, speed: 2, cannonDmg: 15 },
};

/** Missile sprite IDs for ship combat (from SPELL_ANIMATIONS) */
export const SHIP_PROJECTILE_SPRITES: Record<ShipSize, { projectile: string; impact: string } | null> = {
  rowboat: null, // No cannons
  sloop:   { projectile: 'origins_cannon',     impact: 'origins_cannon_explosion' },
  galleon: { projectile: 'origins_big_cannon',  impact: 'origins_explosion' },
};

// ── Crafting Costs ────────────────────────────────────────────────────────────

export interface ShipCost {
  gold: number;
  wood?: number;
  iron?: number;
  cloth?: number;
}

export const SHIP_CRAFT_COSTS: Record<ShipSize, ShipCost> = {
  rowboat: {
    gold: SHIP_CATALOG_BY_SIZE.rowboat.craftGold,
  },
  sloop: {
    gold: SHIP_CATALOG_BY_SIZE.sloop.craftGold,
    wood: SHIP_CATALOG_BY_SIZE.sloop.craftWood,
    iron: SHIP_CATALOG_BY_SIZE.sloop.craftIron,
    cloth: SHIP_CATALOG_BY_SIZE.sloop.craftCloth,
  },
  galleon: {
    gold: SHIP_CATALOG_BY_SIZE.galleon.craftGold,
    wood: SHIP_CATALOG_BY_SIZE.galleon.craftWood,
    iron: SHIP_CATALOG_BY_SIZE.galleon.craftIron,
    cloth: SHIP_CATALOG_BY_SIZE.galleon.craftCloth,
  },
};

// ── Ship Factory ──────────────────────────────────────────────────────────────

export function createShip(
  size: ShipSize,
  hullColor: HullColor,
  sailColor: SailColor,
  captainId: string | null,
  dockZoneX: number,
  dockZoneY: number,
  name?: string,
): Ship {
  const stats = SHIP_STATS[size];
  const sizeConfig = SHIP_SIZES.find(s => s.type === size)!;

  return {
    id: uuidv4(),
    name: name || `${hullColor} ${sizeConfig.label}`,
    size,
    hullColor,
    sailColor,
    cannons: sizeConfig.cannonSlots,
    crewIds: captainId ? [captainId] : [],
    captainId,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    speed: stats.speed,
    zoneX: dockZoneX,
    zoneY: dockZoneY,
    travelDestination: null,
    travelStartedAt: null,
    travelArrivalAt: null,
    isDamaged: false,
    createdAt: Date.now(),
  };
}

// ── Travel ────────────────────────────────────────────────────────────────────

/** Calculate travel time in ms between two zones */
export function calculateTravelTime(ship: Ship, destX: number, destY: number): number {
  const dx = Math.abs(destX - ship.zoneX);
  const dy = Math.abs(destY - ship.zoneY);
  const distance = Math.max(dx, dy); // Chebyshev distance
  const hoursPerZone = 1 / ship.speed;
  return distance * hoursPerZone * 60 * 60 * 1000;
}

/** Start traveling to a destination zone */
export function startTravel(ship: Ship, destX: number, destY: number): Ship {
  const travelTime = calculateTravelTime(ship, destX, destY);
  const now = Date.now();
  return {
    ...ship,
    travelDestination: { zoneX: destX, zoneY: destY },
    travelStartedAt: now,
    travelArrivalAt: now + travelTime,
  };
}

/** Check if ship has arrived at destination */
export function hasArrived(ship: Ship): boolean {
  if (!ship.travelArrivalAt) return false;
  return Date.now() >= ship.travelArrivalAt;
}

/** Complete travel — move ship to destination */
export function completeTravel(ship: Ship): Ship {
  if (!ship.travelDestination) return ship;
  return {
    ...ship,
    zoneX: ship.travelDestination.zoneX,
    zoneY: ship.travelDestination.zoneY,
    travelDestination: null,
    travelStartedAt: null,
    travelArrivalAt: null,
  };
}

/** Get travel progress 0-1 */
export function getTravelProgress(ship: Ship): number {
  if (!ship.travelStartedAt || !ship.travelArrivalAt) return 0;
  const elapsed = Date.now() - ship.travelStartedAt;
  const total = ship.travelArrivalAt - ship.travelStartedAt;
  return Math.min(1, elapsed / total);
}

// ── Combat ────────────────────────────────────────────────────────────────────

/** Apply cannon damage to a target ship */
export function fireCannonBroadside(attacker: Ship, target: Ship): { target: Ship; damage: number } {
  const stats = SHIP_STATS[attacker.size];
  const totalDamage = attacker.cannons * stats.cannonDmg;
  const newHp = Math.max(0, target.hp - totalDamage);
  return {
    target: { ...target, hp: newHp, isDamaged: newHp < target.maxHp * 0.5 },
    damage: totalDamage,
  };
}

/** Check if ship is sunk */
export function isSunk(ship: Ship): boolean {
  return ship.hp <= 0;
}

/** Repair ship at home dock (costs gold) */
export function repairShip(ship: Ship): { ship: Ship; goldCost: number } {
  const missingHp = ship.maxHp - ship.hp;
  const goldCost = Math.ceil(missingHp * 0.5);
  return {
    ship: { ...ship, hp: ship.maxHp, isDamaged: false },
    goldCost,
  };
}

// ── Crew Management ───────────────────────────────────────────────────────────

/** Add a crew member (character or pirate unit ID) */
export function addCrew(ship: Ship, crewId: string): Ship | null {
  const sizeConfig = SHIP_SIZES.find(s => s.type === ship.size)!;
  if (ship.crewIds.length >= sizeConfig.crewCap) return null; // Full
  if (ship.crewIds.includes(crewId)) return ship; // Already aboard
  return { ...ship, crewIds: [...ship.crewIds, crewId] };
}

/** Remove a crew member */
export function removeCrew(ship: Ship, crewId: string): Ship {
  return {
    ...ship,
    crewIds: ship.crewIds.filter(id => id !== crewId),
    captainId: ship.captainId === crewId ? null : ship.captainId,
  };
}

/** Set captain (must be in crew) */
export function setCaptain(ship: Ship, characterId: string): Ship {
  if (!ship.crewIds.includes(characterId)) return ship;
  return { ...ship, captainId: characterId };
}

// ── Tileset Helpers ───────────────────────────────────────────────────────────

/** Get the hull tile region offset for a specific color and size */
export function getHullRegion(size: ShipSize, color: HullColor) {
  const colorIndex = Math.max(0, HULL_COLORS.indexOf(color));
  return getShipHullRegion(size, colorIndex);
}

/** Get the sail tile region offset for a specific color and ship size */
export function getSailRegion(size: ShipSize, color: SailColor) {
  const colorIndex = Math.max(0, SAIL_COLORS.indexOf(color));
  return getShipSailRegion(size, colorIndex);
}
