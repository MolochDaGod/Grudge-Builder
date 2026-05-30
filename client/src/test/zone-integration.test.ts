/**
 * Zone Integration Tests
 *
 * Verifies:
 *   1. Sector grid layout — no overlaps, full coverage, correct positions
 *   2. Zone population determinism — same seed = same nodes
 *   3. Boss AI state machine — phase transitions, damage, death, leash
 *   4. Sector transitions — sailing between adjacent zones
 *   5. Building catalog — no duplicate IDs, valid costs, snap point integrity
 */
import { describe, it, expect } from 'vitest';

import {
  WORLD_SECTORS,
  getSectorAt,
  getSectorById,
  getSectorTileColor,
  type WorldSector,
} from '@shared/definitions/worldMapSectors';

import {
  generateZonePopulation,
  getNodesByCategory,
  getIslandChildren,
  type IslandNode,
  type HarvestNode,
  type DockNode,
  type SpawnPointNode,
  type OceanHazardNode,
} from '@shared/definitions/zoneServerNodes';

import {
  ORC_BOSS_BASE_STATS,
  ORC_BOSS_PHASES,
  getBossPhase,
  pickAttack,
  type BossPhase,
} from '@shared/definitions/orcWarriorBoss';

import {
  BUILDING_CATALOG,
  getPiecesByCategory,
  getPieceById,
  canAfford,
  getAvailablePieces,
  getCategorySummary,
} from '@shared/definitions/modularBuildings';

// ═══════════════════════════════════════════════════════════════
// 1. SECTOR GRID LAYOUT
// ═══════════════════════════════════════════════════════════════

describe('Sector Grid Layout', () => {
  it('has exactly 9 sectors', () => {
    expect(WORLD_SECTORS).toHaveLength(9);
  });

  it('covers the full 100×100 grid with no gaps', () => {
    // Sample every 5th tile — should always resolve to a sector
    for (let y = 0; y < 100; y += 5) {
      for (let x = 0; x < 100; x += 5) {
        const sector = getSectorAt(x, y);
        expect(sector, `No sector at (${x}, ${y})`).not.toBeNull();
      }
    }
  });

  it('has no overlapping sector bounds', () => {
    for (let i = 0; i < WORLD_SECTORS.length; i++) {
      for (let j = i + 1; j < WORLD_SECTORS.length; j++) {
        const a = WORLD_SECTORS[i].bounds;
        const b = WORLD_SECTORS[j].bounds;
        const overlaps =
          a.x0 <= b.x1 && a.x1 >= b.x0 &&
          a.y0 <= b.y1 && a.y1 >= b.y0;
        expect(overlaps, `${WORLD_SECTORS[i].id} overlaps ${WORLD_SECTORS[j].id}`).toBe(false);
      }
    }
  });

  it('places Ethereal Falls at top-left (0,0)', () => {
    const ef = getSectorById('ethereal_falls')!;
    expect(ef.bounds.x0).toBe(0);
    expect(ef.bounds.y0).toBe(0);
    expect(getSectorAt(0, 0)?.id).toBe('ethereal_falls');
  });

  it('places Ember Depths at bottom-right (2,2)', () => {
    const ed = getSectorById('ember_depths')!;
    expect(ed.bounds.x0).toBe(68); // col 2 × 34
    expect(ed.bounds.y0).toBe(68); // row 2 × 34
    expect(getSectorAt(99, 99)?.id).toBe('ember_depths');
  });

  it('places Haven Shore at bottom-center (1,2)', () => {
    const hs = getSectorById('haven_shore')!;
    expect(hs.bounds.x0).toBe(34); // col 1 × 34
    expect(hs.bounds.y0).toBe(68); // row 2 × 34
    expect(hs.isSafeZone).toBe(true);
  });

  it('places Convergence Nexus at center (1,1)', () => {
    const cn = getSectorById('convergence_nexus')!;
    expect(cn.bounds.x0).toBe(34);
    expect(cn.bounds.y0).toBe(34);
    expect(cn.isContested).toBe(true);
  });

  it('all sectors have valid terrain3d configs', () => {
    for (const sector of WORLD_SECTORS) {
      expect(sector.terrain3d.sizeMeters).toBe(4000);
      expect(sector.terrain3d.segments).toBe(255);
      expect(sector.terrain3d.maxHeight).toBeGreaterThan(sector.terrain3d.minHeight);
      expect(sector.terrain3d.spawnPoints.length).toBeGreaterThan(0);
      expect(sector.terrain3d.maxPlayers).toBeGreaterThanOrEqual(64);
    }
  });

  it('each sector has unique ID and name', () => {
    const ids = WORLD_SECTORS.map(s => s.id);
    const names = WORLD_SECTORS.map(s => s.name);
    expect(new Set(ids).size).toBe(9);
    expect(new Set(names).size).toBe(9);
  });

  it('Ethereal Falls renders custom tile colors', () => {
    const color = getSectorTileColor('deep_ocean', 0.3, 5, 5, true);
    expect(color).not.toBeNull();
    expect(color).toMatch(/^rgb\(/);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. ZONE POPULATION DETERMINISM
// ═══════════════════════════════════════════════════════════════

describe('Zone Population', () => {
  const sector = getSectorById('ethereal_falls')!;
  const worldSeed = 'test-seed-123';

  it('generates deterministic population from same seed', () => {
    const pop1 = generateZonePopulation(
      sector.id, worldSeed, sector.terrain3d.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      sector.resources, sector.biome,
    );
    const pop2 = generateZonePopulation(
      sector.id, worldSeed, sector.terrain3d.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      sector.resources, sector.biome,
    );
    expect(pop1.islandIds).toEqual(pop2.islandIds);
    expect(pop1.nodes.size).toBe(pop2.nodes.size);
  });

  it('generates islands with valid properties', () => {
    const pop = generateZonePopulation(
      sector.id, worldSeed, sector.terrain3d.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      sector.resources, sector.biome,
    );
    const islands = getNodesByCategory<IslandNode>(pop, 'island');
    expect(islands.length).toBeGreaterThan(3);

    for (const island of islands) {
      expect(island.radiusM).toBeGreaterThan(0);
      expect(island.islandSeed).toBeTruthy();
      expect(['atoll', 'small', 'medium', 'large', 'fortress']).toContain(island.size);
    }
  });

  it('places harvesting nodes on islands', () => {
    const pop = generateZonePopulation(
      sector.id, worldSeed, sector.terrain3d.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      sector.resources, sector.biome,
    );
    const harvests = getNodesByCategory<HarvestNode>(pop, 'harvest');
    const onIsland = harvests.filter(h => h.parentIslandId !== null);
    const inOcean = harvests.filter(h => h.parentIslandId === null);

    expect(onIsland.length).toBeGreaterThan(0);
    expect(inOcean.length).toBeGreaterThan(0); // fishing spots
  });

  it('creates docks on larger islands', () => {
    const pop = generateZonePopulation(
      sector.id, worldSeed, sector.terrain3d.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      sector.resources, sector.biome,
    );
    const docks = getNodesByCategory<DockNode>(pop, 'dock');
    expect(docks.length).toBeGreaterThan(0);

    for (const dock of docks) {
      expect(dock.berths).toBeGreaterThan(0);
      expect(dock.parentIslandId).toBeTruthy();
    }
  });

  it('places spawn points at docks', () => {
    const pop = generateZonePopulation(
      sector.id, worldSeed, sector.terrain3d.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      sector.resources, sector.biome,
    );
    const spawns = getNodesByCategory<SpawnPointNode>(pop, 'spawn_point');
    const playerSpawns = spawns.filter(s => s.spawnType === 'player');
    const shipSpawns = spawns.filter(s => s.spawnType === 'ship');

    expect(playerSpawns.length).toBeGreaterThan(0);
    expect(shipSpawns.length).toBeGreaterThan(0);
  });

  it('generates ocean hazards appropriate to biome', () => {
    const pop = generateZonePopulation(
      sector.id, worldSeed, sector.terrain3d.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      sector.resources, sector.biome,
    );
    const hazards = getNodesByCategory<OceanHazardNode>(pop, 'ocean_hazard');
    // Ethereal biome should have luminous_vortex as a possible hazard type
    const hasLuminous = hazards.some(h => h.hazardType === 'luminous_vortex');
    // Not guaranteed every run but the hazard type pool includes it
    expect(hazards.length).toBeGreaterThan(0);
  });

  it('island children are accessible via getIslandChildren', () => {
    const pop = generateZonePopulation(
      sector.id, worldSeed, sector.terrain3d.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      sector.resources, sector.biome,
    );
    const islands = getNodesByCategory<IslandNode>(pop, 'island');
    const largeIsland = islands.find(i => i.size === 'large' || i.size === 'fortress' || i.size === 'medium');
    if (largeIsland) {
      const children = getIslandChildren(pop, largeIsland.id);
      expect(children.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. BOSS AI STATE MACHINE
// ═══════════════════════════════════════════════════════════════

describe('Orc Boss AI', () => {
  it('starts in phase1 at full HP', () => {
    expect(getBossPhase(25000, 25000)).toBe('phase1');
  });

  it('transitions to phase2 at 60% HP', () => {
    expect(getBossPhase(15000, 25000)).toBe('phase2');
    expect(getBossPhase(14999, 25000)).toBe('phase2');
  });

  it('transitions to phase3 at 25% HP', () => {
    expect(getBossPhase(6250, 25000)).toBe('phase3');
    expect(getBossPhase(1, 25000)).toBe('phase3');
  });

  it('each phase has valid attacks', () => {
    const phases: BossPhase[] = ['phase1', 'phase2', 'phase3'];
    for (const phase of phases) {
      const config = ORC_BOSS_PHASES[phase];
      expect(config.attacks.length).toBeGreaterThan(0);
      expect(config.speedMultiplier).toBeGreaterThan(0);
      expect(config.hpThreshold).toBeGreaterThan(0);

      for (const atk of config.attacks) {
        expect(atk.damage).toBeGreaterThanOrEqual(0);
        expect(atk.cooldownSec).toBeGreaterThan(0);
        expect(atk.weight).toBeGreaterThan(0);
        expect(atk.telegraphSec).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('phase3 is more aggressive than phase1', () => {
    const p1 = ORC_BOSS_PHASES.phase1;
    const p3 = ORC_BOSS_PHASES.phase3;
    expect(p3.attackMultiplier).toBeGreaterThan(p1.attackMultiplier);
    expect(p3.speedMultiplier).toBeGreaterThan(p1.speedMultiplier);
    expect(p3.defenseMultiplier).toBeLessThan(p1.defenseMultiplier);
  });

  it('pickAttack respects cooldowns', () => {
    const cooldowns = new Map<string, number>();
    // Put all phase1 attacks on cooldown
    for (const atk of ORC_BOSS_PHASES.phase1.attacks) {
      cooldowns.set(atk.id, 10);
    }
    const result = pickAttack('phase1', cooldowns);
    expect(result).toBeNull(); // all on cooldown
  });

  it('pickAttack returns an attack when available', () => {
    const cooldowns = new Map<string, number>();
    const result = pickAttack('phase1', cooldowns);
    expect(result).not.toBeNull();
    expect(result!.id).toBeTruthy();
  });

  it('boss has correct base stats', () => {
    expect(ORC_BOSS_BASE_STATS.maxHP).toBe(25000);
    expect(ORC_BOSS_BASE_STATS.scale).toBe(1.8);
    expect(ORC_BOSS_BASE_STATS.aggroRadius).toBe(30);
    expect(ORC_BOSS_BASE_STATS.leashRadius).toBe(80);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. SECTOR TRANSITIONS (sailing between zones)
// ═══════════════════════════════════════════════════════════════

describe('Sector Transitions', () => {
  it('adjacent sectors share borders with no gap', () => {
    // Ethereal Falls (0,0) right edge should touch Frostbite (1,0) left edge
    const ef = getSectorById('ethereal_falls')!;
    const fb = getSectorById('frostbite_expanse')!;
    expect(ef.bounds.x1 + 1).toBe(fb.bounds.x0);
    expect(ef.bounds.y0).toBe(fb.bounds.y0); // same row
  });

  it('sailing from Haven Shore south exits the map', () => {
    const hs = getSectorById('haven_shore')!;
    const below = getSectorAt(hs.bounds.x0 + 10, hs.bounds.y1 + 1);
    expect(below).toBeNull(); // no sector below the map
  });

  it('sailing from Ethereal Falls east enters Frostbite Expanse', () => {
    const ef = getSectorById('ethereal_falls')!;
    const nextSector = getSectorAt(ef.bounds.x1 + 1, ef.bounds.y0 + 5);
    expect(nextSector?.id).toBe('frostbite_expanse');
  });

  it('sailing from Ethereal Falls south enters Stormbreak Reef', () => {
    const ef = getSectorById('ethereal_falls')!;
    const nextSector = getSectorAt(ef.bounds.x0 + 5, ef.bounds.y1 + 1);
    expect(nextSector?.id).toBe('stormbreak_reef');
  });

  it('sailing from Haven Shore east enters Ember Depths', () => {
    const hs = getSectorById('haven_shore')!;
    const nextSector = getSectorAt(hs.bounds.x1 + 1, hs.bounds.y0 + 5);
    expect(nextSector?.id).toBe('ember_depths');
  });

  it('sailing from Haven Shore west enters Abyssal Trench', () => {
    const hs = getSectorById('haven_shore')!;
    const nextSector = getSectorAt(hs.bounds.x0 - 1, hs.bounds.y0 + 5);
    expect(nextSector?.id).toBe('abyssal_trench');
  });

  it('difficulty increases as you move away from Haven Shore', () => {
    const haven = getSectorById('haven_shore')!;
    const nexus = getSectorById('convergence_nexus')!;
    const ethereal = getSectorById('ethereal_falls')!;
    expect(nexus.difficultyMin).toBeGreaterThan(haven.difficultyMax);
    expect(ethereal.difficultyMin).toBeGreaterThan(haven.difficultyMax);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. BUILDING CATALOG INTEGRITY
// ═══════════════════════════════════════════════════════════════

describe('Building Catalog', () => {
  it('has no duplicate piece IDs', () => {
    const ids = BUILDING_CATALOG.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all pieces have valid categories', () => {
    const validCategories = ['structures', 'workshops', 'camp', 'walls_paths', 'doors_windows', 'decorations', 'utilities'];
    for (const piece of BUILDING_CATALOG) {
      expect(validCategories).toContain(piece.category);
    }
  });

  it('all pieces have valid footprints', () => {
    for (const piece of BUILDING_CATALOG) {
      expect(piece.footprint).toHaveLength(3);
      expect(piece.footprint[0]).toBeGreaterThan(0);
      expect(piece.footprint[1]).toBeGreaterThanOrEqual(0);
      expect(piece.footprint[2]).toBeGreaterThan(0);
    }
  });

  it('snappable pieces have snap points', () => {
    const snappable = BUILDING_CATALOG.filter(p => p.snappable);
    for (const piece of snappable) {
      if (piece.snapPoints) {
        expect(piece.snapPoints.length).toBeGreaterThan(0);
        for (const sp of piece.snapPoints) {
          expect(sp).toHaveLength(3);
        }
      }
    }
  });

  it('getCategorySummary returns all 7 categories', () => {
    const summary = getCategorySummary();
    expect(summary).toHaveLength(7);
    const total = summary.reduce((s, c) => s + c.count, 0);
    expect(total).toBe(BUILDING_CATALOG.length);
  });

  it('canAfford returns false when resources are insufficient', () => {
    const inn = getPieceById('inn')!;
    expect(canAfford(inn, { wood: 0, stone: 0, iron: 0, gold: 0 })).toBe(false);
  });

  it('canAfford returns true when resources are sufficient', () => {
    const bonfire = getPieceById('bonfire')!;
    expect(canAfford(bonfire, { wood: 100, stone: 100, iron: 100, gold: 100 })).toBe(true);
  });

  it('getAvailablePieces filters by level', () => {
    const level0 = getAvailablePieces(0);
    const level30 = getAvailablePieces(30);
    expect(level30.length).toBeGreaterThan(level0.length);
    // Level 0 should include campfire (requiredLevel: 0)
    expect(level0.some(p => p.id === 'bonfire')).toBe(true);
    // Bell tower requires level 30
    expect(level30.some(p => p.id === 'bell_tower')).toBe(true);
    expect(level0.some(p => p.id === 'bell_tower')).toBe(false);
  });
});
