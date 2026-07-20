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

## Was hanging / now wired (2026-07)

| Gap | Status |
|-----|--------|
| `characterId` omitted on sector join | **Fixed** — passed in join options |
| `harvest_complete` / `harvest_error` not listened on play | **Fixed** — UI toast + deplete sync |
| `pve_damage` / `pve_kill` not listened | **Fixed** — UI feedback (enemy mesh HP still client-local) |
| `ready` / `room_snapshot` unused | **Fixed** — send ready on join |
| `anim` / `fx` send helpers unused | **Fixed** — `sendAnim`/`sendFx` + coarse anim interval |
| Remote `animState` not updated in onChange | **Fixed** — pass anim fields to RPM |

## Still hanging (do next)

1. **PvE damage not applied to client creature meshes** — server enemies Map ≠ engine `CreatureManager` IDs. Need ID bridge or spawn enemies from room state.
2. **`sendPveAttack` never called** from combat pipeline — wire ModePlayHUD / weapon hit to `colyseus.sendPveAttack(enemyId, dmg)`.
3. **Harvest loot not persisted to Railway inventory** — `harvest_complete` is broadcast-only; need `storage.addInventory` on server handler.
4. **Position authority** — server accepts client x/y/z with no clamp/speed check (predict-ok for slice, add validation next).
5. **Lobby / HomeIsland rooms** — separate code paths; home-island has richer harvest_complete (qty/resource); sector is thinner.
6. **NetworkManager** (`lib/network`) — alternate path used by island-3d; not used by play.tsx (two stacks).
7. **Magic portals / caves** — authored systems, not required for dual-browser move+harvest proof.

## Dual-browser test checklist

```
[ ] Two accounts, each create/select hero on character.grudge-studio.com
[ ] Both open: client…/play?mode=zone&sector=haven_shore&worldSeed=grudge-world-1&characterId=
[ ] Console: Joined WorldRoom, Joined SectorRoom, room_snapshot
[ ] Each sees the other mesh move (15 Hz move)
[ ] One harvests → both see node deplete + harvest_complete toast
[ ] (Later) one attacks shared enemy → both see pve_damage/kill
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

1. Bridge SectorEnemy → CreatureManager (or render simple proxies from room.enemies).  
2. On local weapon hit → `sendPveAttack(id, dmg)`.  
3. On `handleHarvest` success → write profession XP + bag to Railway for `characterId`.  
4. Smoke script: two headless colyseus clients join haven_shore, assert both in state.players.
