/**
 * use-colyseus.ts — React hook for Colyseus room lifecycle.
 *
 * Connects to the Colyseus server (same origin on port 5000 in dev,
 * or wss://api.grudge-studio.com in prod), joins WorldRoom first,
 * then provides helpers to join SectorRoom/TownRoom.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Client, Room } from 'colyseus.js';

// ── Colyseus endpoint ────────────────────────────────────────────

function getColyseusEndpoint(): string {
  // In prod, use the configured API URL
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    // Convert https:// to wss:// for WebSocket
    return envUrl.replace(/^http/, 'ws');
  }
  // Dev: same host, port 5000
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:5000`;
}

// ── Types ────────────────────────────────────────────────────────

export interface PlayerInfo {
  characterName: string;
  heroClass: string;
  heroRace: string;
  faction: string;
  level: number;
  accountId?: string;
  characterId?: string;
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
        characterName: playerInfo.characterName,
        heroClass: playerInfo.heroClass,
        heroRace: playerInfo.heroRace,
        faction: playerInfo.faction,
        level: playerInfo.level,
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
      console.error('[Colyseus] Connection failed:', err);
      setState(s => ({
        ...s,
        connecting: false,
        error: err.message || 'Connection failed',
      }));
    }
  }, [playerInfo]);

  // Join a sector
  const joinSector = useCallback(async (sectorId: string) => {
    const client = clientRef.current;
    if (!client || !playerInfo) return;

    // Leave current sector if any
    if (sectorRoomRef.current) {
      try { await sectorRoomRef.current.leave(); } catch {}
      sectorRoomRef.current = null;
    }

    try {
      console.log('[Colyseus] Joining sector:', sectorId);
      const sectorRoom = await client.joinOrCreate('sector', {
        sectorId,
        characterName: playerInfo.characterName,
        heroClass: playerInfo.heroClass,
        heroRace: playerInfo.heroRace,
        faction: playerInfo.faction,
        level: playerInfo.level,
        accountId: playerInfo.accountId,
        sourceGame: 'warlords',
      });

      sectorRoomRef.current = sectorRoom;
      console.log('[Colyseus] Joined SectorRoom:', sectorRoom.sessionId);

      // Sync players
      sectorRoom.state.players.onAdd((player: any, sessionId: string) => {
        setState(s => {
          const players = new Map(s.players);
          players.set(sessionId, player);
          return { ...s, players };
        });
      });

      sectorRoom.state.players.onRemove((_player: any, sessionId: string) => {
        setState(s => {
          const players = new Map(s.players);
          players.delete(sessionId);
          return { ...s, players };
        });
      });

      // Sync enemies
      sectorRoom.state.enemies.onAdd((enemy: any, enemyId: string) => {
        setState(s => {
          const enemies = new Map(s.enemies);
          enemies.set(enemyId, enemy);
          return { ...s, enemies };
        });
      });

      sectorRoom.state.enemies.onRemove((_enemy: any, enemyId: string) => {
        setState(s => {
          const enemies = new Map(s.enemies);
          enemies.delete(enemyId);
          return { ...s, enemies };
        });
      });

      sectorRoom.onLeave(() => {
        console.log('[Colyseus] Left SectorRoom');
        sectorRoomRef.current = null;
        setState(s => ({
          ...s,
          sectorRoom: null,
          sectorId: null,
          players: new Map(),
          enemies: new Map(),
        }));
      });

      setState(s => ({ ...s, sectorRoom, sectorId }));
    } catch (err: any) {
      console.error('[Colyseus] Sector join failed:', err);
      setState(s => ({ ...s, error: `Sector join failed: ${err.message}` }));
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

  // Send harvest
  const sendHarvest = useCallback((nodeId: string, professionId: string) => {
    sectorRoomRef.current?.send('harvest', { nodeId, professionId });
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
    sendHarvest,
  };
}
