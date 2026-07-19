# Multiplayer: REST, NetworkManager, assets, lag-free play

## Stack

| Layer | Module |
|-------|--------|
| Protocol SSOT | `shared/network/syncProtocol.ts` |
| REST bootstrap | `GET /api/multiplayer/status` · `/session` · `/assets/:sectorId` |
| Client facade | `client/src/lib/network/NetworkManager.ts` |
| Asset queue | `client/src/lib/network/AssetLoadQueue.ts` |
| Remote avatars | `RemotePlayerManager` |
| Buildings | `SyncedBuildingManager` |
| Chat UI | `ServerChatHUD` |
| Zone hook | `useZoneNetwork` |
| Transport | Colyseus on Railway (`FLEET_URLS.colyseus`) |

## Lag-free rules

1. **Move @ 15 Hz** — never stream every physics tick.
2. **Interpolate remotes** — lerp position/yaw (`NETWORK_RATES.remoteLerp`).
3. **Anim on change + 2 Hz heartbeat** — not every frame.
4. **VFX as reliable messages** — attack/teleport/dash once, not schema spam.
5. **Buildings in schema Map** — late joiners get full set via `onAdd`.
6. **Chat server-authoritative** — only broadcast after validation.
7. **Asset queue priorities** — local race 0 → remote 1 → landmarks 3–4; max 4 concurrent GLBs.
8. **Clone from shared GLTF cache** — `modelLoader` cache; never share scene graphs between players.
9. **Preload** — REST session returns race list; queue starts before join completes.
10. **Solo fallback** — if REST/matchmake fails, zone still runs local population.

## Client flow

```
fetchSession(sector) → preload races
connectWorld → joinSector
  players.onAdd → AssetLoadQueue race prio 1 → RemotePlayerManager
  buildings.onAdd → SyncedBuildingManager
  chat/fx messages → HUD / WorldFxBus
local: 15 Hz sendMove + sendAnim
```

## REST

```
GET /api/multiplayer/status
GET /api/multiplayer/session?sector=ethereal_falls
GET /api/multiplayer/assets/ethereal_falls
```

## Server asset / client CDN

- Prefer `assets.grudge-studio.com` (long `Cache-Control` on CDN).
- Race GLBs: `RACE_GRUDGE6.cdnPath`.
- Sector landmarks: `sectorProductionContent` local then CDN.
- Publish: `npm run production:publish-sectors` + R2 upload for large GLBs.

## What both players see

| Feature | Mechanism |
|---------|-----------|
| Position / facing | `move` schema + lerp |
| Animations | `animState` / `animClip` / `animSeq` + RemotePlayerManager |
| Attack / teleport / dash VFX | `fx` broadcast → WorldFxBus |
| Buildings | `buildings` Map + place_building |
| Harvest nodes | harvestNodes schema depleted |
| Chat | server `chat` broadcast → ServerChatHUD |

## Smoke test

```
# A + B browsers
https://grudge.studio/island-3d?mode=zone&sector=haven_shore&worldSeed=grudge-world-1
# Expect: remote mesh, nameplate, walk/attack anims, chat Send, buildings if placed
```
