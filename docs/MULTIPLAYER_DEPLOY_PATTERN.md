# Multiplayer Deploy Pattern

Honest status vs. a full three-player-controller style GLTF multiplayer demo
(nameplates, kill feed, chat bubbles, scoreboard, death/respawn, room full).

## Answer: foundation YES · NetworkManager + REST YES · polish PARTIAL · home visit CODED

See also: **MULTIPLAYER_NETWORK_BEST_PRACTICES.md** (REST, AssetLoadQueue, anim/fx/building/chat sync).

| Layer | Status | Notes |
|-------|--------|--------|
| **Colyseus matchmake + rooms** | **Live** | Railway `grudge-api` — `matchMakerReady: true` |
| **Room types registered** | **Live** | tutorial, shipwreck, lobby, dungeon, sector, world, town, **home_island** |
| **Remote GLTF players** | **Live in code** | `RemotePlayerManager` — race mesh, equip, nameplate, HP bar, lerp, anims |
| **Sector / zone MP** | **Wired** | `useZoneColyseus` + `SectorRoom` · 15 Hz move |
| **Home island + visitors** | **Coded** | Owner + 5 visitors, `isVisitor`, harvest owner-only |
| **Lobby hub MP** | **Coded** | `LobbyRoom` after tutorial (not tutorial itself) |
| **Kill feed / scoreboard / death UI** | **Missing / thin** | Events exist; full HUD like the Chinese demo not shipped |
| **Chat** | **Partial** | Server `chat` / `world_chat` broadcasts; bubble UI incomplete |
| **Socket.IO open-world PvP** | **Separate path** | `MultiplayerSync` → `wss://world.grudge-studio.com` (legacy dual stack) |

## Production endpoints (fleet SSOT)

```
Colyseus (Warlords):  wss://grudge-api-production-0d46.up.railway.app
  health: https://grudge-api-production-0d46.up.railway.app/api/colyseus/health
  matchmake: POST …/matchmake/joinOrCreate/{room}

Socket.IO world (optional): wss://world.grudge-studio.com
Client: https://grudge.studio / client.grudge-studio.com
```

Client resolver: `client/src/lib/colyseusEndpoint.ts`  
Fleet: `FLEET_URLS.colyseus` in `shared/fleet/manifest.ts`

## Room contract (deploy pattern)

| Room | Max | Purpose | Filter / key |
|------|-----|---------|--------------|
| `tutorial` / `shipwreck` | 1 | Solo start | `characterId` |
| `lobby` | multi | Pirate hub after onboarding | map id |
| `sector` | sector max | 9-zone open world | `sectorId` + `worldSeed` |
| `world` | multi | Router / social | world seed |
| `town` | multi | Town instances | town id |
| `dungeon` | party | Instanced dungeons | dungeon id |
| `home_island` | 1+5 | Owner + visitors | **`accountId` / islandUUID** |

## Home island visit pattern

```ts
// Owner
client.joinOrCreate('home_island', {
  accountId: myAccountId,
  islandUUID: myIslandId,
  characterName, heroRace, heroClass, …
});

// Visitor (dock / invite link)
client.joinOrCreate('home_island', {
  accountId: ownerAccountId,   // room key = owner's island
  islandUUID: ownerIslandId,
  isVisitor: true,
  characterName: visitorName,
  …
});
```

Server (`HomeIslandRoom`):
- `maxClients = 6` (owner + 5)
- Visitors get `island_full` if over capacity
- Harvest / place building **owner only**
- Owner leave → DB save

Client: `/home-island` joins as owner today. Visit URL pattern to productize:

```
/home-island?visit={ownerAccountId}&island={islandUUID}
```

## Client pattern (same as three-player GLTF demo)

| Demo feature | Warlords equivalent |
|--------------|---------------------|
| Local GLTF controller | `CharacterController3D` + `applyGrudge6PlayerToController` |
| Remote avatars | `RemotePlayerManager` (nameplate + HP + race equip) |
| Position sync | Colyseus `move` 15 Hz |
| Room full | `island_full` / leave |
| Chat | `room.send('chat')` + broadcast |
| Kill feed | Socket.IO `pvp:kill` / sector enemy kills — **UI HUD still thin** |
| Scoreboard | Not shipped |
| Death overlay | Per-room; not unified BR-style overlay |

## Deploy checklist

1. **Railway game-data / Colyseus** process running (same Express + WS)
2. `GET /api/colyseus/health` → `ok: true`, rooms listed
3. Client `VITE_COLYSEUS_URL` or fleet `colyseus` points at that host (wss)
4. CORS allows client origins for matchmake POST + WS upgrade
5. Zone play: `/island-3d?mode=zone&sector=ethereal_falls` with multiplayer enabled (not `solo=1`)
6. Home: `/home-island` owner join; visitor join with `isVisitor: true`
7. Optional: Socket.IO world server for legacy PvP island rooms

## Honest “are we set?”

- **Yes for:** authoritative rooms, sector multiplayer wiring, remote race prefabs, home island visit slots, live matchmake health.
- **Not yet for:** full deathmatch-style HUD (kill feed, scoreboard, death screen, chat bubbles) parity with that HTML demo.
- **Home visit:** server ready; productize invite/visit URL + UI next.

## Smoke test

```bash
# Health
curl -s https://grudge-api-production-0d46.up.railway.app/api/colyseus/health

# Two browsers
# A: https://grudge.studio/island-3d?mode=zone&sector=haven_shore
# B: same URL, different account
# Expect: two remote meshes + nameplates when Colyseus connects
```
