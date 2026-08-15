/**
 * use-colyseus.ts — React hook for Colyseus room lifecycle.
 *
 * Connects to the Colyseus server (same origin on port 5000 in dev,
 * or wss://api.grudge-studio.com in prod), joins WorldRoom first,
 * then provides helpers to join SectorRoom/TownRoom.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Client, Room } from 'colyseus.js';
import { getColyseusEndpoint } from '@/lib/colyseusEndpoint';
import { resolveZoneSectorId } from '@shared/definitions/sectorBridge';

// ── Types ────────────────────────────────────────────────────────

export interface PlayerInfo {
  characterName: string;
  heroClass: string;
  heroRace: string;
  faction: string;
  level: number;
  accountId?: string;
  characterId?: string;
  // 3D model data (from character.model3d DB field)
  baseModelId?: string;
  equippedMeshes?: Record<string, string>;
  weaponSlots?: Record<string, string>;
  skinColor?: string;
  armorColor?: string;
  equippedWeaponType?: string;
}

export interface ColyseusState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  worldRoom: Room | null;
  sectorRoom: Room | null;
  sectorId: string | null;
  players: Map<string, any>;
  enemies: Map<string, any>;
  localSessionId: string | null;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useColyseus(playerInfo: PlayerInfo | null) {
  const clientRef = useRef<Client | null>(null);
  const worldRoomRef = useRef<Room | null>(null);
  const sectorRoomRef = useRef<Room | null>(null);

  const [state, setState] = useState<ColyseusState>({
    connected: false,
    connecting: false,
    error: null,
    worldRoom: null,
    sectorRoom: null,
    sectorId: null,
    players: new Map(),
    enemies: new Map(),
    localSessionId: null,
  });

  // Connect to WorldRoom
  const connect = useCallback(async () => {
    if (!playerInfo || clientRef.current) return;

    setState(s => ({ ...s, connecting: true, error: null }));

    try {
      const endpoint = getColyseusEndpoint();
      console.log('[Colyseus] Connecting to', endpoint);
      const client = new Client(endpoint);
      clientRef.current = client;

      const worldRoom = await client.joinOrCreate('world', {
        characterName: playerInfo.characterName || 'Guest',
        heroClass: playerInfo.heroClass || 'warrior',
        heroRace: playerInfo.heroRace || 'human',
        faction: playerInfo.faction || 'crusade',
        level: playerInfo.level || 1,
        accountId: playerInfo.accountId,
        characterId: playerInfo.characterId,
        sourceGame: 'warlords',
      });

      worldRoomRef.current = worldRoom;
      console.log('[Colyseus] Joined WorldRoom:', worldRoom.sessionId);

      setState(s => ({
        ...s,
        connected: true,
        connecting: false,
        worldRoom,
        localSessionId: worldRoom.sessionId,
      }));

      worldRoom.onLeave(() => {
        console.log('[Colyseus] Left WorldRoom');
        worldRoomRef.current = null;
        setState(s => ({ ...s, connected: false, worldRoom: null }));
      });

      worldRoom.onError((code, message) => {
        console.error('[Colyseus] WorldRoom error:', code, message);
        setState(s => ({ ...s, error: `WorldRoom error: ${message}` }));
      });
    } catch (err: any) {
      // Matchmake HTML/empty reservation → consumeSeatReservation reads .name of undefined
      const msg = err?.message || String(err);
      console.warn('[Colyseus] World join skipped (solo play continues):', msg);
      clientRef.current = client;
      setState(s => ({
        ...s,
        connecting: false,
        connected: false,
        error: /name|reservation|matchmake/i.test(msg)
          ? 'Realtime lobby offline — playing solo'
          : msg,
      }));
    }
  }, [playerInfo]);

  // Join a sector (accepts legacy NW/CENTER ids or worldMapSectors snake_case ids)
  const joinSector = useCallback(async (sectorId: string, worldSeed = 'grudge-world-1') => {
    const client = clientRef.current;
    if (!client || !playerInfo) return;

    const zoneId = resolveZoneSectorId(sectorId);

    // Leave current sector if any
    if (sectorRoomRef.current) {
      try { await sectorRoomRef.current.leave(); } catch {}
      sectorRoomRef.current = null;
    }

    try {
      console.log('[Colyseus] Joining sector:', zoneId);
      const sectorRoom = await client.joinOrCreate('sector', {
        sectorId: zoneId,
        worldSeed,
        characterName: playerInfo.characterName,
        heroClass: playerInfo.heroClass,
        heroRace: playerInfo.heroRace,
        faction: playerInfo.faction,
        level: playerInfo.level,
        accountId: playerInfo.accountId,
        // Required for authority + persistence correlation on server
        characterId: playerInfo.characterId,
        sourceGame: 'warlords',
        // 3D model data for mesh sync
        baseModelId: playerInfo.baseModelId || playerInfo.heroRace || 'human',
        equippedMeshes: playerInfo.equippedMeshes || {},
        weaponSlots: playerInfo.weaponSlots || {},
        skinColor: playerInfo.skinColor || '#ffffff',
        armorColor: playerInfo.armorColor || '#ffffff',
        equippedWeaponType: playerInfo.equippedWeaponType || 'sword-shield',
      });

      sectorRoomRef.current = sectorRoom;
      // CRITICAL: localSessionId must be SectorRoom sessionId (not WorldRoom).
      // RemotePlayerManager skips self by this id — world id would spawn self as remote.
      console.log('[Colyseus] Joined SectorRoom:', sectorRoom.sessionId, 'char=', playerInfo.characterId);

      // Sync players
      sectorRoom.state.players.onAdd((player: any, sessionId: string) => {
        setState(s => {
          const players = new Map(s.players);
          players.set(sessionId, player);
          return { ...s, players };
        });
        player.onChange?.(() => {
          setState(s => {
            const players = new Map(s.players);
            players.set(sessionId, player);
            return { ...s, players };
          });
        });
      });

      sectorRoom.state.players.onRemove((_player: any, sessionId: string) => {
        setState(s => {
          const players = new Map(s.players);
          players.delete(sessionId);
          return { ...s, players };
        });
      });

      // Sync enemies (schema SSOT for dual-browser PvE)
      sectorRoom.state.enemies.onAdd((enemy: any, enemyId: string) => {
        setState(s => {
          const enemies = new Map(s.enemies);
          enemies.set(enemyId, enemy);
          return { ...s, enemies };
        });
        enemy.onChange?.(() => {
          setState(s => {
            const enemies = new Map(s.enemies);
            enemies.set(enemyId, enemy);
            return { ...s, enemies };
          });
        });
      });

      sectorRoom.state.enemies.onRemove((_enemy: any, enemyId: string) => {
        setState(s => {
          const enemies = new Map(s.enemies);
          enemies.delete(enemyId);
          return { ...s, enemies };
        });
      });

      // Protocol handshake — server echoes room_snapshot
      sectorRoom.send('ready', { protocolVersion: 1 });

      sectorRoom.onLeave(() => {
        console.log('[Colyseus] Left SectorRoom');
        sectorRoomRef.current = null;
        setState(s => ({
          ...s,
          sectorRoom: null,
          sectorId: null,
          // Fall back to world session id if still connected
          localSessionId: worldRoomRef.current?.sessionId ?? null,
          players: new Map(),
          enemies: new Map(),
        }));
      });

      setState(s => ({
        ...s,
        sectorRoom,
        sectorId: zoneId,
        localSessionId: sectorRoom.sessionId,
      }));
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn('[Colyseus] Sector join skipped (solo):', msg);
      setState(s => ({
        ...s,
        error: /name|reservation|matchmake/i.test(msg)
          ? 'Realtime lobby offline — playing solo'
          : `Sector join failed: ${msg}`,
      }));
    }
  }, [playerInfo]);

  // Send movement to sector
  const sendMove = useCallback((x: number, y: number, z: number, facing: number, moveState: string) => {
    sectorRoomRef.current?.send('move', { x, y, z, facing, state: moveState });
  }, []);

  // Send chat
  const sendChat = useCallback((text: string) => {
    sectorRoomRef.current?.send('chat', { text });
  }, []);

  // Send PvE attack
  const sendPveAttack = useCallback((enemyId: string, damage: number) => {
    sectorRoomRef.current?.send('pve_attack', { enemyId, damage });
  }, []);

  // Send PvP attack (hanging handler already on server)
  const sendPvpAttack = useCallback((targetId: string, damage: number) => {
    sectorRoomRef.current?.send('pvp_attack', { targetId, damage });
  }, []);

  // Send harvest
  const sendHarvest = useCallback((nodeId: string, professionId: string) => {
    sectorRoomRef.current?.send('harvest', { nodeId, professionId });
  }, []);

  // Animation oneshot for remotes (attack / harvest)
  const sendAnim = useCallback((state: string, clip?: string, oneshot = false) => {
    sectorRoomRef.current?.send('anim', { state, clip: clip || state, oneshot });
  }, []);

  // One-shot VFX broadcast
  const sendFx = useCallback((kind: string, x: number, y: number, z: number, meta?: string) => {
    sectorRoomRef.current?.send('fx', { kind, x, y, z, meta });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sectorRoomRef.current?.leave();
      worldRoomRef.current?.leave();
      clientRef.current = null;
    };
  }, []);

  return {
    ...state,
    connect,
    joinSector,
    sendMove,
    sendChat,
    sendPveAttack,
    sendPvpAttack,
    sendHarvest,
    sendAnim,
    sendFx,
  };
}
