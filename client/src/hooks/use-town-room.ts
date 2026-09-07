import { CharacterManager } from '@/lib/characterManager';
import { createGameClient } from '@/lib/gameClient';
import { getStateCallbacks } from '@colyseus/sdk';
/**
 * useTownRoom — Colyseus hook for faction town instances.
 *
 * Connects to a TownRoom, syncs:
 *   - NPC positions + lock state (server-authoritative patrol movement)
 *   - Harvest node depleted/respawn state
 *   - Other players' positions
 *   - Chat messages
 *
 * Provides actions:
 *   - sendMove(x, y, z, facing)
 *   - interact(npcId) / endInteract()
 *   - harvest(nodeId)
 *   - sendChat(text)
 *   - leaveTown()
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Client, Room } from '@colyseus/sdk';
import { getColyseusEndpoint } from '@/lib/colyseusEndpoint';

// ── Types ────────────────────────────────────────────────────────

export interface TownNPCSync {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  z: number;
  lockedBy: string;
}

export interface TownHarvestNodeSync {
  id: string;
  resourceType: string;
  x: number;
  z: number;
  depleted: boolean;
}

export interface TownPlayerSync {
  id: string;
  characterName: string;
  faction: string;
  x: number;
  y: number;
  z: number;
  facing: number;
  state: string;
  interactingWith: string;
}

export interface TownRoomState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  room: Room | null;
  localSessionId: string | null;
  townId: string | null;
  npcs: Map<string, TownNPCSync>;
  harvestNodes: Map<string, TownHarvestNodeSync>;
  players: Map<string, TownPlayerSync>;
  interactingNpcId: string | null;
}

interface TownJoinOptions {
  characterId?: string;
  sectorId: string;
  accountId?: string;
  characterName?: string;
  faction?: string;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useTownRoom(options: TownJoinOptions | null) {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);

  const [state, setState] = useState<TownRoomState>({
    connected: false,
    connecting: false,
    error: null,
    room: null,
    localSessionId: null,
    townId: null,
    npcs: new Map(),
    harvestNodes: new Map(),
    players: new Map(),
    interactingNpcId: null,
  });

  // ── Connect ────────────────────────────────────────────────────

  useEffect(() => {
    if (!options) return;

    let room: Room | null = null;
    let cancelled = false;

    async function connect() {
      setState(s => ({ ...s, connecting: true, error: null }));

      try {
        const endpoint = getColyseusEndpoint();
        const client = createGameClient(endpoint);
        clientRef.current = client;

        room = await client.joinOrCreate('town', {
          characterId: options!.characterId || CharacterManager.getActiveId(),
          sectorId: options!.sectorId,
          accountId: options!.accountId || '',
          characterName: options!.characterName || 'Traveler',
          faction: options!.faction || '',
        });

        if (cancelled) { room.leave(); return; }
        roomRef.current = room;
        const callbacks = getStateCallbacks(room);

        setState(s => ({
          ...s,
          connected: true,
          connecting: false,
          room,
          localSessionId: room!.sessionId,
          townId: room!.state.townId ?? null,
        }));

        // ── Sync NPCs ──────────────────────────────────────────
        callbacks(room.state).npcs.onAdd((npc: any, id: string) => {
          setState(s => {
            const npcs = new Map(s.npcs);
            npcs.set(id, {
              id: npc.id, name: npc.name, role: npc.role,
              x: npc.x, y: npc.y, z: npc.z, lockedBy: npc.lockedBy,
            });
            return { ...s, npcs };
          });

          callbacks(npc).onChange(() => {
            setState(s => {
              const npcs = new Map(s.npcs);
              npcs.set(id, {
                id: npc.id, name: npc.name, role: npc.role,
                x: npc.x, y: npc.y, z: npc.z, lockedBy: npc.lockedBy,
              });
              return { ...s, npcs };
            });
          });
        });

        // ── Sync harvest nodes ─────────────────────────────────
        callbacks(room.state).harvestNodes.onAdd?.((node: any, id: string) => {
          setState(s => {
            const harvestNodes = new Map(s.harvestNodes);
            harvestNodes.set(id, {
              id: node.id, resourceType: node.resourceType,
              x: node.x, z: node.z, depleted: node.depleted,
            });
            return { ...s, harvestNodes };
          });

          callbacks(node).onChange(() => {
            setState(s => {
              const harvestNodes = new Map(s.harvestNodes);
              harvestNodes.set(id, {
                id: node.id, resourceType: node.resourceType,
                x: node.x, z: node.z, depleted: node.depleted,
              });
              return { ...s, harvestNodes };
            });
          });
        });

        // ── Sync players ───────────────────────────────────────
        callbacks(room.state).players.onAdd((player: any, sessionId: string) => {
          setState(s => {
            const players = new Map(s.players);
            players.set(sessionId, {
              id: player.id, characterName: player.characterName,
              faction: player.faction,
              x: player.x, y: player.y, z: player.z,
              facing: player.facing, state: player.state,
              interactingWith: player.interactingWith,
            });
            return { ...s, players };
          });

          callbacks(player).onChange(() => {
            setState(s => {
              const players = new Map(s.players);
              players.set(sessionId, {
                id: player.id, characterName: player.characterName,
                faction: player.faction,
                x: player.x, y: player.y, z: player.z,
                facing: player.facing, state: player.state,
                interactingWith: player.interactingWith,
              });
              return { ...s, players };
            });
          });
        });

        callbacks(room.state).players.onRemove((_: any, sessionId: string) => {
          setState(s => {
            const players = new Map(s.players);
            players.delete(sessionId);
            return { ...s, players };
          });
        });

        // ── Room lifecycle ─────────────────────────────────────
        room.onLeave(() => {
          roomRef.current = null;
          setState(s => ({
            ...s, connected: false, room: null, localSessionId: null,
            npcs: new Map(), harvestNodes: new Map(), players: new Map(),
          }));
        });

        room.onError((code, msg) => {
          setState(s => ({ ...s, error: `TownRoom error: ${msg}` }));
        });

        console.log(`[useTownRoom] Connected to ${room.state.townId}`);
      } catch (err: any) {
        if (!cancelled) {
          setState(s => ({
            ...s, connecting: false,
            error: err.message || 'Town connection failed',
          }));
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      room?.leave();
      roomRef.current = null;
    };
  }, [options?.sectorId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────

  const sendMove = useCallback((x: number, y: number, z: number, facing: number) => {
    roomRef.current?.send('move', { x, y, z, facing });
  }, []);

  const stopMoving = useCallback(() => {
    roomRef.current?.send('stop');
  }, []);

  const interact = useCallback((npcId: string) => {
    roomRef.current?.send('interact', { npcId });
    setState(s => ({ ...s, interactingNpcId: npcId }));
  }, []);

  const endInteract = useCallback(() => {
    roomRef.current?.send('interact_end');
    setState(s => ({ ...s, interactingNpcId: null }));
  }, []);

  const harvest = useCallback((nodeId: string) => {
    roomRef.current?.send('harvest', { nodeId });
  }, []);

  const sendChat = useCallback((text: string) => {
    roomRef.current?.send('chat', { text });
  }, []);

  const leaveTown = useCallback(() => {
    roomRef.current?.send('leave_town');
  }, []);

  return {
    ...state,
    sendMove,
    stopMoving,
    interact,
    endInteract,
    harvest,
    sendChat,
    leaveTown,
  };
}
