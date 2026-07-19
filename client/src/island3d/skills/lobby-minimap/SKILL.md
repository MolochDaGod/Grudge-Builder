---
name: lobby-minimap
description: >
  Understand the pirate lobby map (pirate-islands / grudge-open-world): each island's
  contents, activities, game zones, minimap SSOT, and capture/dock layout. Use when
  editing LobbyMiniMap, lobbyIslands SSOT, Free Port, Shipwreck Cove, capture points,
  or answering "what is on this island / what do we do here".
---

# Lobby Minimap & Island Understanding

## SSOT

| Piece | Path |
|-------|------|
| Island definitions | `shared/definitions/lobbyIslands.ts` |
| Minimap UI | `client/src/island3d/render/LobbyMiniMap.tsx` |
| Capture points runtime | `client/src/island3d/engine/LobbyGameplay.ts` |
| Free Port hub NPCs | `client/src/island3d/engine/LobbyPlayZone.ts` |
| Map family | Chicken Gun pirate lobby · `mode=lobby` · map `pirate-islands` |

**Never confuse** this multiplayer lobby with the solo Colyseus `tutorial` / `shipwreck` room (`tutorialFlow.ts`). Shipwreck Cove reuses the *fantasy* of the tutorial (wreck, sticks, stones) on the **shared lobby map**.

## Coordinate convention

Same as capture flags:

```
worldX = lobby.center.x + offset.ox * lobby.size.x
worldZ = lobby.center.z + offset.oz * lobby.size.z
radius = radiusFrac * min(size.x, size.z)
```

Bounds from `Island3DEngine.getLobbyMapBounds()`.

## Islands (current)

| Id | Name | Role |
|----|------|------|
| `free_port` | Racalvin's Free Port | Safe hub, vendors, spawn, contracts |
| **`shipwreck_cove`** | **Shipwreck Cove** | **Wrecked pirate ship — featured beach / scavenge / loot / light PvE** |
| `north_harbor` | North Harbor | Capture `north-harbor` |
| `south_dock` | South Dock | Capture + primary board/sail |
| `east_battery` | East Battery | Capture `east-battery` |
| `west_camp` | West Camp | Capture + harvest fringe |

### Shipwreck Cove (primary detail)

Player is looking at the **wrecked pirate ship** island. Contents and activities are fully authored in `SHIPWRECK_ISLAND`:

- **Landmarks:** broken hull, mast fragments, flotsam, rocky spit  
- **Resources:** driftwood/sticks, stones, rope scraps  
- **Inhabitants:** shore scavengers, boar on outer sand  
- **Structures:** wreck interior, barrels, loot chest, lean-to  
- **Activities:** inspect wreck → scavenge beach → loot hold → clear scavengers → campfire → sail back  
- **Zones:** `shipwreck`, `beach`, `loot`, `story`, `pve_ring`

Default minimap focus: `getDefaultFocusIslandId()` → `shipwreck_cove`.

## Game zones vocabulary

`safe_hub` · `market` · `capture_point` · `harvest_ring` · `pve_ring` · `dock` · `shipwreck` · `beach` · `camp` · `battery` · `open_water` · `story`

## UI wiring

- Rendered in `Island3DRenderer` when `mode === 'lobby'` (top-right).
- Click island blob or chip → detail panel (contents + “what we do here”).
- Player arrow from `character.getPosition()` + `getCameraYaw()`.
- Capture flag pips colored from `lobbyCapture.points[].owner`.

## When extending

1. Add/edit `LobbyIslandDef` in `lobbyIslands.ts` (SSOT first).  
2. Minimap paints all `LOBBY_ISLANDS` automatically.  
3. If you add a new capture point in `LobbyGameplay`, set `capturePointId` on the island.  
4. Keep shipwreck **featured** until another island is the narrative focus.  
5. Use `formatLobbyIslandBrief(id)` / `formatAllLobbyIslandsBrief()` for agent summaries.

## Related docs

- `docs/MAP_FAMILIES_CANONICAL.md` — lobby vs zones vs home  
- `docs/TUTORIAL_AND_MP_FLOW.md` — solo shipwreck ≠ lobby  
- `docs/MAP_SCENE_COMPOSITION.md` — chunkable meshes on pirate-islands GLTF  
- `shared/definitions/tutorialFlow.ts` — solo mission steps (parallel fantasy)
