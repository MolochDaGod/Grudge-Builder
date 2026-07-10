# Ultimate Fantasy RTS pack — SSOT

**Source:** `Documents/Ultimate Fantasy RTS - Aug 2022-.../Ultimate Fantasy RTS - Aug 2022/FBX` (128 FBX)  
**Catalog:** `shared/definitions/ultimateFantasyRtsCatalog.ts`  
**Build pieces:** `shared/definitions/ultimateFantasyRtsBuildPieces.ts`  
**Public stage:** `client/public/models/warlords/rts/{mines,mountains,buildings,resources,props}/`

## Home island generation

| Feature | Rule |
|---------|------|
| **Stone quarry** | `Mine.fbx` — always ≥1 per island; **miner-only** loot (stone/granite/marble) |
| **Mixed mines** | Craftpix entrances — miner + engineer + mystic bag |
| **Mountain** | Exactly **one** of: Group_1, Group_2, Single, Large_Single (seed pick) |
| **Interact** | E near mine → 4s vanish → bag (same as craftpix) |

## RTS buildings → units

| Building | Trains |
|----------|--------|
| Barracks L1–3 (Age I/II) | Infantry |
| Archery L1–3 | Archer |
| Farm / Town Center | Worker / Villager |
| Temple L1–3 | Priest |

Upgrades: L1→L2→L3 then Age I L3 → Age II L1 (`ufrtsUpgradeTarget`).

## Convert / deploy

```bash
npm run convert:ufrts:priority   # mine, mountains, Age I L1 core
npm run convert:ufrts            # all 128
npm run convert:ufrts:upload     # + R2 models/warlords/*
```

Runtime loads **FBX** until GLB convert succeeds (`PackModelLoader` + `FBXLoader`).

## UI

Build panel lists starters: stone mine, barracks, archery, farm, temple, town center, market, storage, dock, port, watchtower, wall, house, windmill.
