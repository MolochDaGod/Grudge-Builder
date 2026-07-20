# haven_shore dual-browser authority slice

**Goal:** login → Foundry create/select → `/play?sector=haven_shore` → two browsers see each other; harvest/combat results agree with server.

## Already built (build on this)

| Layer | What exists | Where |
|-------|-------------|--------|
| **SectorRoom** | Full Colyseus room: `move`, `harvest`, `pve_attack`, `pvp_attack`, `anim`, `fx`, `chat`, buildings, dungeon portals | `server/colyseus/rooms/SectorRoom.ts` |
| **SectorState** | Players, enemies, harvestNodes, buildings schemas | `server/colyseus/schemas/SectorState.ts` |
| **Client join** | WorldRoom → SectorRoom, 15 Hz `sendMove`, `sendHarvest` on engine harvest | `use-colyseus.ts`, `play.tsx` |
| **Remotes** | `RemotePlayerManager` (mesh + lerp + nameplate) | `island3d/sync/RemotePlayerManager.ts` |
| **Harvest visuals** | Client harvest → server `harvest` → state `depleted` sync | ZoneHarvestSpawner + SectorRoom |
| **Rooms registered** | sector, world, home_island, lobby, dungeon, town, tutorial/shipwreck | `server/colyseus/index.ts` |
| **NetworkManager** | Alternate stack for island-3d: move/anim/fx/chat/buildings/harvest + **pve/pvp** | `lib/network/NetworkManager.ts` |

## Wired (2026-07)

| Gap | Status |
|-----|--------|
| `characterId` omitted on sector join | **Fixed** — passed in join options |
| `harvest_complete` / `harvest_error` not listened on play | **Fixed** — UI toast + deplete sync |
| `pve_damage` / `pve_kill` not listened | **Fixed** — UI feedback + remote mesh damage |
| `ready` / `room_snapshot` unused | **Fixed** — send ready on join |
| `anim` / `fx` send helpers unused | **Fixed** — `sendAnim`/`sendFx` + coarse anim interval + combat oneshots |
| Remote `animState` not updated in onChange | **Fixed** — pass anim fields to RPM |
| **`localSessionId` stuck on WorldRoom id** | **Fixed** — set to `sectorRoom.sessionId` on join (prevents self-as-remote) |
| **`sendPveAttack` never called** | **Fixed** — `onCombatHit` → `sendPveAttack` + anim/fx |
| **Server enemies ≠ client creature IDs** | **Fixed** — `CreatureManager.upsertNetworkEnemy` + play bridge from `state.enemies` |
| NetworkManager missing combat send | **Fixed** — `sendPveAttack` / `sendPvpAttack` |
| Remote `fx` not played on play path | **Fixed** — `room.onMessage('fx')` → WorldFxBus |

## Still hanging (do next)

1. **Harvest loot not persisted to Railway inventory** — `harvest_complete` is broadcast-only; need bag/XP write for `characterId` on server.
2. **Position authority** — server accepts client x/y/z with no clamp/speed check (predict-ok for slice).
3. **Lobby / HomeIsland rooms** — separate code paths; home-island has richer harvest_complete (qty/resource); sector is thinner.
4. **Two client stacks** — `play.tsx` uses `use-colyseus`; `island-3d` uses `NetworkManager`/`useZoneNetwork`. Prefer one facade long-term.
5. **Local wildlife** (`creature_*` ids) still client-only — only schema enemies (`enemy_*`) are dual-browser authoritative.
6. **Magic portals / caves** — authored systems, not required for dual-browser move+harvest+combat proof.
7. **PvP mesh HP** — `pvp_attack` server exists; play UI does not yet call `sendPvpAttack` on player hits.

## Dual-browser test checklist

```
[ ] Two accounts, each create/select hero on character.grudge-studio.com
[ ] Both open: client…/play?mode=zone&sector=haven_shore&worldSeed=grudge-world-1&characterId=
[ ] Console: Joined WorldRoom, Joined SectorRoom <sectorSessionId>, room_snapshot
[ ] Each sees the other mesh move (15 Hz move) — NOT a ghost of yourself
[ ] One harvests → both see node deplete + harvest_complete toast
[ ] Both see same server enemies (network-auth meshes); one attacks → both see damage/kill
[ ] Attacker oneshot anim + remote sees attack_burst fx
```

## Server message map (SectorRoom)

| Client → server | Server → clients |
|-----------------|------------------|
| `move` | state.players.* |
| `harvest` | `harvest_complete`, `harvest_error`, harvestNodes.depleted |
| `pve_attack` | `pve_damage`, `pve_kill` |
| `pvp_attack` | `pvp_damage`, `pvp_kill` |
| `anim` | state.players.anim* |
| `fx` | `fx` (except sender) |
| `chat` | `chat` |
| `ready` | `room_snapshot` |
| `place_building` / `remove_building` | schema + broadcast |

## Recommended next code session

1. On `handleHarvest` success → write profession XP + bag to Railway for `characterId`.
2. Optional speed clamp on `move` (anti-teleport).
3. Smoke script: two headless colyseus clients join haven_shore, assert both in state.players + shared enemy id.
4. Collapse play path onto NetworkManager **or** keep use-colyseus as SSOT and deprecate island-3d stack for zones.
