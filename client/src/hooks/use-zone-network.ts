/**
 * useZoneNetwork — NetworkManager-driven multiplayer for zone mode.
 *
 * Prefers NetworkManager (REST session + Colyseus + asset queue + buildings/chat/fx).
 * Falls back gracefully if connect fails (solo zone still playable).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { Island3DEngine } from '@/island3d/engine/Island3DEngine';
import { RemotePlayerManager } from '@/island3d/sync/RemotePlayerManager';
import { SyncedBuildingManager } from '@/island3d/sync/SyncedBuildingManager';
import {
  getNetworkManager,
  type NetworkPlayerJoin,
} from '@/lib/network/NetworkManager';
import { AssetLoadQueue } from '@/lib/network/AssetLoadQueue';
import { getWorldFxBus } from '@/island3d/vfx/WorldFxBus';
import { NETWORK_RATES } from '@shared/network/syncProtocol';
import { syncHarvestNodeDepleted } from '@/island3d/harvest/ZoneHarvestSpawner';

export interface ZoneNetworkOptions {
  engine: Island3DEngine | null;
  sectorId: string;
  worldSeed?: string;
  player: NetworkPlayerJoin | null;
  enabled?: boolean;
}

export function useZoneNetwork({
  engine,
  sectorId,
  worldSeed = 'grudge-world-1',
  player,
  enabled = true,
}: ZoneNetworkOptions) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const rpmRef = useRef<RemotePlayerManager | null>(null);
  const buildingsRef = useRef<SyncedBuildingManager | null>(null);
  const moveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAnim = useRef('idle');

  // Connect + join sector
  useEffect(() => {
    if (!enabled || !player || !sectorId) return;
    let cancelled = false;
    const nm = getNetworkManager();

    (async () => {
      try {
        setError(null);
        await nm.fetchSession(sectorId);
        const health = await nm.fetchHealth();
        if (!health.ok) {
          console.warn('[ZoneNetwork] multiplayer status not ready — solo fallback');
        }
        await nm.joinSector(sectorId, player, worldSeed);
        if (cancelled) return;
        setConnected(true);
        setSessionId(nm.localSessionId);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || 'multiplayer join failed');
          setConnected(false);
        }
      }
    })();

    const offErr = nm.on('error', (m) => setError(m));
    const offDisc = nm.on('disconnected', () => setConnected(false));

    return () => {
      cancelled = true;
      offErr();
      offDisc();
      if (moveTimer.current) clearInterval(moveTimer.current);
      void nm.dispose();
      setConnected(false);
    };
  }, [enabled, sectorId, worldSeed, player?.characterId, player?.accountId]); // eslint-disable-line

  // Remote players + buildings + fx + harvest
  useEffect(() => {
    if (!enabled || !connected || !engine || !sessionId) return;
    const nm = getNetworkManager();
    const scene = engine.getScene?.() ?? (engine as any).scene;
    if (!scene) return;

    const rpm = new RemotePlayerManager(scene, sessionId);
    rpmRef.current = rpm;
    const buildings = new SyncedBuildingManager(scene);
    buildingsRef.current = buildings;

    const unreg = engine.onUpdate((dt) => rpm.update(dt));

    const offAdd = nm.on('playerAdd', ({ sessionId: sid, player: p }) => {
      if (sid === sessionId) return;
      rpm.addPlayer(sid, {
        id: p.id,
        characterName: p.characterName,
        heroClass: p.heroClass,
        heroRace: p.heroRace,
        faction: p.faction,
        level: p.level,
        x: p.x,
        y: p.y,
        z: p.z,
        facing: p.facing,
        state: p.animState || p.state,
        hp: p.hp,
        maxHp: p.maxHp,
        baseModelId: p.baseModelId,
        equippedMeshJson: p.equippedMeshJson,
        weaponSlotsJson: p.weaponSlotsJson,
        skinColor: p.skinColor,
        armorColor: p.armorColor,
        equippedWeaponType: p.equippedWeaponType,
        animState: p.animState,
        animClip: p.animClip,
        animSeq: p.animSeq,
      });
    });

    const offChange = nm.on('playerChange', ({ sessionId: sid, player: p }) => {
      rpm.updatePlayer(sid, {
        x: p.x,
        y: p.y,
        z: p.z,
        facing: p.facing,
        state: p.state,
        animState: p.animState,
        animClip: p.animClip,
        animSeq: p.animSeq,
        hp: p.hp,
        maxHp: p.maxHp,
      });
    });

    const offRem = nm.on('playerRemove', ({ sessionId: sid }) => rpm.removePlayer(sid));

    const offBld = nm.on('buildingAdd', ({ id, building }) => {
      void buildings.addBuilding({
        id,
        assetId: building.assetId,
        ownerId: building.ownerId,
        ownerName: building.ownerName,
        x: building.x,
        y: building.y,
        z: building.z,
        rotation: building.rotation,
      });
    });
    const offBldR = nm.on('buildingRemove', ({ id }) => buildings.removeBuilding(id));

    const offHarvest = nm.on('harvest', ({ nodeId, depleted }) => {
      syncHarvestNodeDepleted(engine, nodeId, depleted);
    });

    const offFx = nm.on('fx', (fx) => {
      const bus = getWorldFxBus();
      if (!bus) return;
      const v = new THREE.Vector3(fx.x, fx.y, fx.z);
      if (fx.kind === 'attack_burst') bus.attackBurst(v);
      else if (fx.kind === 'teleport_smoke') bus.teleportSmoke(v);
      else if (fx.kind === 'dash_foot') bus.dashFootSmoke(v);
      else bus.spawn(fx.kind as any, { position: v, burst: true });
    });

    // Seed existing players from room state
    const room = nm.room;
    room?.state?.players?.forEach?.((p: any, sid: string) => {
      if (sid === sessionId) return;
      rpm.addPlayer(sid, {
        id: p.id,
        characterName: p.characterName,
        heroClass: p.heroClass,
        heroRace: p.heroRace,
        faction: p.faction,
        level: p.level,
        x: p.x,
        y: p.y,
        z: p.z,
        facing: p.facing,
        state: p.animState || p.state,
        hp: p.hp,
        maxHp: p.maxHp,
        baseModelId: p.baseModelId,
        equippedMeshJson: p.equippedMeshJson,
        weaponSlotsJson: p.weaponSlotsJson,
        skinColor: p.skinColor,
        armorColor: p.armorColor,
        equippedWeaponType: p.equippedWeaponType,
        animState: p.animState,
        animClip: p.animClip,
        animSeq: p.animSeq,
      });
    });

    return () => {
      offAdd();
      offChange();
      offRem();
      offBld();
      offBldR();
      offHarvest();
      offFx();
      unreg();
      rpm.dispose();
      buildings.dispose();
      rpmRef.current = null;
      buildingsRef.current = null;
    };
  }, [enabled, connected, engine, sessionId]);

  // Local outbound move + anim @ 15 Hz
  useEffect(() => {
    if (!enabled || !connected || !engine) return;
    const nm = getNetworkManager();
    moveTimer.current = setInterval(() => {
      const ch = engine.character;
      if (!ch) return;
      const pos = ch.getPosition();
      const facing = typeof ch.getFacing === 'function' ? ch.getFacing() : 0;
      const moving = typeof ch.isMoving === 'function' ? ch.isMoving() : false;
      const attack = ch.isAttacking;
      let state = 'idle';
      if (attack) state = 'attacking';
      else if (moving) state = 'moving';
      nm.sendMove(pos.x, pos.y, pos.z, facing, state);
      if (state !== lastAnim.current || attack) {
        nm.sendAnim(state === 'attacking' ? 'attack' : state === 'moving' ? 'walk' : 'idle');
        lastAnim.current = state;
      }
    }, 1000 / NETWORK_RATES.moveHz);
    return () => {
      if (moveTimer.current) clearInterval(moveTimer.current);
    };
  }, [enabled, connected, engine]);

  // Bridge local VFX → network (so others see attack/teleport/dash)
  useEffect(() => {
    if (!enabled || !connected || !engine) return;
    const nm = getNetworkManager();
    const ch = engine.character;
    if (!ch) return;

    const origTeleport = ch.teleportTo.bind(ch);
    ch.teleportTo = (pos: any) => {
      const p = ch.getPosition();
      nm.sendFx({ kind: 'teleport_smoke', x: p.x, y: p.y + 0.5, z: p.z });
      origTeleport(pos);
      nm.sendFx({ kind: 'teleport_smoke', x: pos.x, y: pos.y + 0.5, z: pos.z });
    };

    return () => {
      ch.teleportTo = origTeleport;
    };
  }, [enabled, connected, engine]);

  const sendChat = useCallback((text: string) => {
    getNetworkManager().sendChat(text);
  }, []);

  const sendPlaceBuilding = useCallback(
    (b: { id: string; assetId: string; x: number; y: number; z: number; rotation: number }) => {
      getNetworkManager().sendPlaceBuilding(b);
    },
    [],
  );

  const sendHarvest = useCallback((nodeId: string, professionId: string) => {
    getNetworkManager().sendHarvest(nodeId, professionId);
  }, []);

  return {
    connected,
    error,
    sessionId,
    sendChat,
    sendPlaceBuilding,
    sendHarvest,
    assetStats: () => AssetLoadQueue.getStats(),
  };
}
