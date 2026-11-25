/**
 * Zone interact (E key) priority — single place for island3d zone actions.
 *
 * Priority (first match wins):
 *  1. Volcanic climb summit chest
 *  2. Boss room exit (if inside instance)
 *  3. Event island portal → boss room
 *  4. Iceland / frozen biome soft portal
 */
import type * as THREE from 'three';
import type { VolcanicClimbIslandSystem } from './VolcanicClimbIslandSystem';
import type { EventIslandSystem } from './EventIslandSystem';
import type { BossRoomInstanceSystem } from './BossRoomInstanceSystem';
import type { IcelandPlaceResult } from './IcelandScenePlacer';
import type { ClimbLootGrant } from '@shared/definitions/volcanicClimb';
import { pickBossRoomInstance } from '@shared/definitions/floatingIslandBossAssets';

export type ZoneInteractResult =
  | { kind: 'climb_chest'; floor: number; grants: ClimbLootGrant[] }
  | { kind: 'boss_exit' }
  | { kind: 'boss_enter'; source: string }
  | { kind: 'none' };

export interface ZoneInteractContext {
  playerPos: THREE.Vector3;
  volcanicClimb?: VolcanicClimbIslandSystem | null;
  eventIslands?: EventIslandSystem | null;
  bossRooms?: BossRoomInstanceSystem | null;
  icelandScene?: IcelandPlaceResult | null;
  sectorId: string;
  isHothEligible: boolean;
  chestRange?: number;
  portalRange?: number;
  icelandRange?: number;
}

export function resolveZoneInteract(ctx: ZoneInteractContext): ZoneInteractResult {
  const pos = ctx.playerPos;
  const chestRange = ctx.chestRange ?? 3.8;
  const portalRange = ctx.portalRange ?? 9;
  const icelandRange = ctx.icelandRange ?? 35;

  // 1. Summit chest
  if (ctx.volcanicClimb) {
    const chest = ctx.volcanicClimb.nearestChest(pos, chestRange);
    if (chest) {
      const grants = ctx.volcanicClimb.openChest(chest.floor);
      if (grants) {
        return { kind: 'climb_chest', floor: chest.floor, grants };
      }
    }
  }

  // 2. Boss room exit
  if (ctx.bossRooms?.isInside) {
    ctx.bossRooms.tryExit(pos);
    return { kind: 'boss_exit' };
  }

  // 3. Event island portal
  const near = ctx.eventIslands?.nearestPortal(pos, portalRange);
  if (near && ctx.bossRooms) {
    const room = pickBossRoomInstance({ sectorId: ctx.sectorId });
    ctx.bossRooms.enter(pos, 'event_island_portal', room?.id);
    return { kind: 'boss_enter', source: 'event_island_portal' };
  }

  // 4. Iceland / frozen soft portal
  if (ctx.bossRooms && ctx.isHothEligible && ctx.icelandScene) {
    const ip = ctx.icelandScene.root.position;
    if (pos.distanceTo(ip) < icelandRange) {
      ctx.bossRooms.enter(pos, 'frozen_biome_portal');
      return { kind: 'boss_enter', source: 'frozen_biome_portal' };
    }
  }

  return { kind: 'none' };
}
