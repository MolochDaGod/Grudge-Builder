# Warlords-era assets (canonical)

**Upload folder:** `D:\Games\grudge-game-engine\uplaod\`  
**Catalog:** `shared/definitions/warlordsEraAssets.ts`  
**Mines seed:** `shared/definitions/homeIslandMines.ts`  
**Runtime:** `client/src/island3d/objects/MineEntranceSystem.ts`

---

## Asset inventory (uplaod)

| Pack | Role | Faction |
|------|------|---------|
| craftpix-net-692030-mine-3d… | Mine entrances + ore props | Neutral |
| rock_mountain…85k (Models) | Event mountain + cave mouth | Neutral |
| craftpix medieval building zips | Crusade homes / keeps | Crusade |
| craftpix orc settlement + props | Legion | Legion |
| craftpix free elf house | Fabled | Fabled |
| chests / treasure / crops / env | Neutral props | Neutral |
| vol.glb / pirate island pack | Optional open-world | Neutral |

Each **mesh** is registered as its own `WarlordsAssetEntry` (one id, one CDN path).  
Faction zips: extract → one GLB per building → `models/warlords/faction/{crusade|legion|fabled}/…`.

---

## Home island

| Feature | Spec |
|---------|------|
| Mines | **≥2** per seed (`generateHomeIslandMines`) |
| Mine models | Craftpix `_mine_1…4` → CDN `models/warlords/mines/mine*.fbx` |
| Interact | Press **E** within 6m |
| Run | Hero **hidden 4s** (`MINE_RUN_DURATION_SEC`) |
| Loot | Bag rolls miner + engineer + mystic harvestables |
| Mountain | JJ realistic cave GLB + existing triad portal events |

Loot pools (account bag):

- **Miner:** stone, coal, iron, copper, gold, raw gem  
- **Engineer:** scrap, bolts, gear fragments, slag  
- **Mystic:** arcane dust, crystal shard, emerald chip, diamond dust  

---

## CDN commands

```bash
# Mines + mountain (from client/public/models/warlords)
npm run upload:warlords-assets

# Survival kit / towers / benches (separate)
npm run upload:build-packs
```

Smoke:

```bash
curl -sI "https://assets.grudge-studio.com/models/warlords/mines/mine1.fbx"
curl -sI "https://assets.grudge-studio.com/models/warlords/mountains/rock_mountain_cave_entrance.glb"
```

---

## Faction buildings (next extract pass)

1. Unzip craftpix packs under `tmp-warlords-faction/`  
2. Convert FBX→GLB per mesh (gltf-pipeline / Blender batch)  
3. Upload to `models/warlords/faction/{crusade|legion|fabled}/`  
4. Register each file in `warlordsEraAssets.ts`  
5. Map race homes / RTS buildings to faction theme  

Until converted, survival kit race homes remain interim meshes.
