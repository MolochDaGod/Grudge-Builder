# Build System SSOT

**Assets (local):** `D:\Games\Models\`  
**Catalog code:** `shared/definitions/buildSystem.ts` · `survivalKitBuildCatalog.ts`  
**Runtime placeables:** `client/src/island3d/building/BuildAssetManifest.ts` (sync from catalog)

Live reference for nature (trees/rocks): battle NatureDecor — separate from buildables.

---

## Four layers (do not collapse)

| Layer | What | XP | Materials | Example |
|-------|------|-----|-----------|---------|
| **Quick craft** | Inventory recipes, no world prop | Character profession | Account bag | T0 rope, torch |
| **Camp stages** | Tent → fire → bedroll | Comfort / unlocks | Account bag | `camp_tent`, `camp_fire_soup` |
| **Benches** | World stations for WCS | Character 1–100 | Account bag | Anvil, grind, lumbermill, spell table |
| **Modular T1** | Snap floors/walls/roofs | None | Account bag | `mod_floor`, `mod_foundation_float` |
| **Dock** | Floating pads + planks | None | Account bag | Deck **Y = water + 0.2** |
| **RTS** | Full buildings train AI | **Unit** then hero promote | Account bag | Barracks, towers |
| **Race home** | Per-race shelter | Spawn bind | Account bag | `race_home_human` … |

### uMMORPG Warlords review (mapped)

Classic uMMORPG / Warlords split:

1. **Player craft** without structure → **Quick craft**  
2. **CraftingStation** NPC/prop interact → **Benches** (+ camp unlock path)  
3. **Housing modular** pieces → **Modular T1** (survival kit wood)  
4. **Keep/barracks** that spawn minions → **RTS** (train unit → level with T0 → **promote to hero** on Railway `characters`)

WCS (`grudge-crafting.puter.site`) tabs **Camp / Cooking / Smithing / Lumber / Loom / Tinker** align to **bench** layer unlocks when the island has the matching prop (or friendly camp).

---

## free_survival_asset_kit.glb → pieces

Parent **nodes** (use these for extract, not leaf material meshes):

| Node | Build piece |
|------|-------------|
| `tentHalf` | Camp stage 0 |
| `tent` | Camp stage 1 open tent |
| `tentClosed` | Camp stage 2 |
| `campfire` | Cooking fire / soup fire |
| `bedroll` | Sleeping bag — **save / spawn** |
| `bedrollPacked` | Portable bedroll |
| `workbench` + `hammer` + `paper` | Workbench |
| `workbenchAnvil` | Engineer / smith anvil |
| `workbenchGrind` | Miner sharpening wheel |
| `floor` | Modular floor / dock plank |
| `structureBase` | Floating foundation |
| `structure` | Wall / barracks shell |
| `structureRoof` | Roof |
| `structureCloth` | Cloth wall |
| `fence` / `fenceFortified` | Perimeter |
| `chest` / `box` / `barrel` | Storage |
| `fishingStand` | Dock prop |

### Specialty GLBs

| File | Piece |
|------|--------|
| `3_medieval_towers (1).glb` | Towers (`b1_low` …) |
| `spell_table.glb` | Mystic bench |
| `lumbermill.glb` | Forestry bench (`sawmill`) |

---

## Dock height rule

```
waterLevel = ocean plane Y (or 0)
dock.deckY = waterLevel + 0.2   // DOCK_DECK_Y_OFFSET
// Visual pilings may extend below deck into water; deck stays dry
```

Starting modular path: **`mod_foundation_float`** → walls/floors → race home / benches.

---

## Profession bench map

| Profession | Piece id | Mesh |
|------------|----------|------|
| Camp / general | `bench_workbench` | workbench+hammer+paper |
| Cooking | `bench_cooking` / `camp_fire_soup` | campfire |
| Mining | `bench_grind_miner` | workbenchGrind |
| Engineering / smith | `bench_anvil_engineer` | workbenchAnvil |
| Forestry | `bench_forestry` | lumbermill.glb |
| Mystic | `bench_mystic` | spell_table.glb |

---

## RTS → hero path

```
Place rts_barracks_t0
  → Train AI unit (T0 items)
  → Unit gains profession XP 1–100 (unit scope)
  → Promote → POST /api/characters (Railway UUID)
  → Playable hero with same progress envelope
```

Do **not** store permanent heroes only on the unit AI table.

---

## Upload / extract (studio best practice)

```bash
# 1) Ensure GLBs under client/public/models/buildings/ (or D:/Games/Models)
# 2) Push binaries to R2 — never rely on local D: in production
npm run upload:build-packs

# Runtime: PackModelLoader → GLTFLoader(pack) → getObjectByName(nodeName) → clone
# Placement: BuildingSystem + buildPlaceY (docks waterLevel + 0.2)
```

| CDN path | Source |
|----------|--------|
| `models/buildings/survival/free_survival_asset_kit.glb` | free_survival_asset_kit.glb |
| `models/buildings/towers/3_medieval_towers.glb` | 3_medieval_towers (1).glb |
| `models/buildings/benches/spell_table.glb` | spell_table.glb |
| `models/buildings/benches/lumbermill.glb` | lumbermill.glb |

### Layer ownership (fleet)

| Layer | Who places | State SSOT | Binary SSOT |
|-------|------------|------------|-------------|
| Quick craft | UI / inventory | Railway bag + character progress | ObjectStore recipes |
| Camp / bench / modular | Island3D BuildingSystem | Railway island props (or local until save API) | R2 multipack + nodeName |
| Dock | BuildingSystem + waterLevel | same | same |
| RTS train | RTS UI / barracks | Unit → promote → Railway characters | R2 towers / kits |

---

## Race homes

| Race | Piece id | Kit node (interim) |
|------|----------|--------------------|
| human | `race_home_human` | structure |
| dwarf | `race_home_dwarf` | structureBase |
| elf | `race_home_elf` | structureCloth |
| orc | `race_home_orc` | tentClosed |
| undead | `race_home_undead` | structureRoof |
| demon | `race_home_demon` | tent |

Replace nodes with dedicated race exteriors when art ships; keep **ids** stable.
