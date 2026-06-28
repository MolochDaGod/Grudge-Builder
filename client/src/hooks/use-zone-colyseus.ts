/**
 * useZoneColyseus — Colyseus multiplayer bridge for Island3D zone mode.
 *
 * Connects to WorldRoom, joins the target sector, sends local player
 * position at 15 Hz, and syncs remote players via RemotePlayerManager.
 */
import { useEffect, useRef, useCallback } from 'react';
import type { Island3DEngine } from '@/island3d/engine/Island3DEngine';
import { RemotePlayerManager } from '@/island3d/sync/RemotePlayerManager';
import { useColyseus, type PlayerInfo } from '@/hooks/use-colyseus';
import { syncHarvestNodeDepleted } from '@/island3d/harvest/ZoneHarvestSpawner';

export interface ZoneColyseusOptions {
  engine: Island3DEngine | null;
  sectorId: string;
  worldSeed?: string;
  playerInfo: PlayerInfo | null;
  enabled?: boolean;
}

export function useZoneColyseus({
  engine,
  sectorId,
  worldSeed = 'grudge-world-1',
  playerInfo,
  enabled = true,
}: ZoneColyseusOptions) {
  const colyseus = useColyseus(playerInfo);
  const remotePlayersRef = useRef<RemotePlayerManager | null>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedSectorRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (enabled && playerInfo) colyseus.connect();
  }, [enabled, playerInfo, colyseus]);

  // Connect once player info is available
  useEffect(() => {
    if (!enabled || !playerInfo) return;
    colyseus.connect();
  }, [enabled, playerInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Join (or re-join) sector when connected and sector changes
  useEffect(() => {
    if (!enabled || !colyseus.connected || !sectorId) return;
    if (joinedSectorRef.current === sectorId && colyseus.sectorId === sectorId) return;

    joinedSectorRef.current = sectorId;
    colyseus.joinSector(sectorId, worldSeed);
  }, [enabled, colyseus.connected, sectorId, worldSeed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Send position updates at 15 Hz
  useEffect(() => {
    if (!enabled || !colyseus.sectorRoom || !engine) return;

    moveIntervalRef.current = setInterval(() => {
      const character = engine.character;
      if (!character) return;
      const pos = character.getPosition();
      const facing = character.getFacing();
      const state = character.isMoving() ? 'moving' : 'idle';
      colyseus.sendMove(pos.x, pos.y, pos.z, facing, state);
    }, 1000 / 15);

    return () => {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, [enabled, colyseus.sectorRoom, engine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync remote players
  useEffect(() => {
    if (!enabled || !colyseus.sectorRoom || !engine || !colyseus.localSessionId) return;

    const rpm = new RemotePlayerManager(engine.getScene(), colyseus.localSessionId);
    remotePlayersRef.current = rpm;
    const unregister = engine.onUpdate((dt) => rpm.update(dt));
    const room = colyseus.sectorRoom;

    room.state.players.onAdd((player: any, sessionId: string) => {
      if (sessionId === colyseus.localSessionId) return;
      rpm.addPlayer(sessionId, {
        id: player.id,
        characterName: player.characterName,
        heroClass: player.heroClass,
        heroRace: player.heroRace,
        faction: player.faction,
        level: player.level,
        x: player.x, y: player.y, z: player.z,
        facing: player.facing,
        state: player.state,
        hp: player.hp, maxHp: player.maxHp,
        baseModelId: player.baseModelId,
        equippedMeshJson: player.equippedMeshJson,
        weaponSlotsJson: player.weaponSlotsJson,
        skinColor: player.skinColor,
        armorColor: player.armorColor,
        equippedWeaponType: player.equippedWeaponType,
      });
      player.onChange(() => {
        rpm.updatePlayer(sessionId, {
          x: player.x, y: player.y, z: player.z,
          facing: player.facing,
          state: player.state,
          hp: player.hp, maxHp: player.maxHp,
        });
      });
    });

    room.state.players.onRemove((_player: any, sessionId: string) => {
      rpm.removePlayer(sessionId);
    });

    return () => {
      unregister();
      rpm.dispose();
      remotePlayersRef.current = null;
    };
  }, [enabled, colyseus.sectorRoom, colyseus.localSessionId, engine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync zone harvest node depleted / respawn from SectorRoom
  useEffect(() => {
    if (!enabled || !colyseus.sectorRoom || !engine) return;
    const room = colyseus.sectorRoom;

    const applyNode = (node: any, id: string) => {
      syncHarvestNodeDepleted(engine, id, node.depleted);
    };

    room.state.harvestNodes?.onAdd?.((node: any, id: string) => {
      applyNode(node, id);
      node.onChange(() => applyNode(node, id));
    });

    room.state.harvestNodes?.forEach?.((node: any, id: string) => {
      applyNode(node, id);
    });
  }, [enabled, colyseus.sectorRoom, engine]);

  return colyseus;
}