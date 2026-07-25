# Weapon prefab production — 6 styles × each type

**SSOT:** `shared/definitions/weaponPrefabCatalog.ts`  
**Tier dress (glow/trail):** `shared/definitions/weaponTierVisuals.ts`  
**Converted source:** `D:\Games\Models\_codex_prod\dist\`  
**CDN:** `https://assets.grudge-studio.com/models/codex/**`

## Six styles (art skins)

| # | id | Pack | Material |
|---|-----|------|----------|
| 1 | `copper` | glitch-weapons | copper |
| 2 | `silver` | glitch-weapons | silver |
| 3 | `gold` | glitch-weapons | gold |
| 4 | `diamond` | glitch-weapons | diamond |
| 5 | `voxel` | voxel-weapons | voxel fantasy |
| 6 | `cold_viking` | cold-biome | viking axe/shield |

Power tiers **T1–T8** are separate (stats + tint/glow). Default equip maps T1–T4 → styles 1–4, T5–T6 → voxel, T7–T8 → cold.

## Converted & production-ready (mesh on CDN)

| Type | 1–4 glitch | 5 voxel | 6 viking | Status |
|------|------------|---------|----------|--------|
| SWORD | ✓ | ✓ | fallback diamond | playable |
| AXE | ✓ | ✓ | ✓ axe | **full 6** |
| SCYTHE | ✓ (scyth) | ✓ | fallback | playable |
| PICKAXE | ✓ (picaxe) | ✓ | fallback | playable |
| SHOVEL | ✓ | fallback | fallback | playable |
| SHIELD | viking shield/rune ×6 | — | — | ready (cold) |
| GREATSWORD | sword fallback ×6 | — | — | fallback scale |
| DAGGER | sword fallback | — | — | art debt |
| MACE | axe fallback | — | — | art debt |
| HAMMER | pickaxe fallback | — | — | art debt |
| BOW | **missing ×6** | | | needs convert |
| STAFF | **missing ×6** | | | needs convert |
| SPEAR | **missing ×6** | | | needs convert |
| WAND | **missing ×6** | | | needs convert |
| GUN | **missing ×6** | | | source: steampunk guns GLB |

## Author pipeline (what you are doing now)

```
D:\Games\Models\_codex_ingest_*     raw downloads
        ↓ convert (obj2glb / glb2glb + colliders)
D:\Games\Models\_codex_prod\dist\   production GLB + .manifest.json + .collider.json
        ↓ mesh-registry + R2 upload
https://assets.grudge-studio.com/models/codex/...
        ↓ sync into game repo
node scripts/sync-weapon-prefabs.mjs
```

Glitch pack tools: `sword`, `axe`, `picaxe`, `scyth`, `shovel` × copper/silver/gold/diamond.  
Voxel: `sword`, `axe`, `scythe`, `pickaxe`.  
Viking cold: `axe`, `axerune`, `shield`, `shieldrune`.

## Runtime

```ts
import { getWeaponVisuals } from '@shared/definitions/weaponTierVisuals';
import { getWeaponPrefab, buildWeaponPrefabCoverage } from '@shared/definitions/weaponPrefabCatalog';

const vis = getWeaponVisuals('SWORD', 3); // gold-style mesh + steel-tier glow
// vis.modelUrl → CDN glitch gold_sword
// vis.prefabStatus → 'ready'

const report = buildWeaponPrefabCoverage();
```

## Next convert targets (to complete all types × 6)

1. **BOW** — 6 style meshes (can mirror copper→diamond + voxel + cold wood)
2. **STAFF / WAND** — magic set
3. **SPEAR** — polearm
4. **DAGGER** — dedicated small blades (retire sword fallback)
5. **MACE / HAMMER** — blunt set (retire axe/pickaxe fallback)
6. **GUN** — split `modular_steampunk_guns_collection (1).glb` into 6 styles

## Sync command

```bash
node scripts/sync-weapon-prefabs.mjs
```

## Class-locked weapon types

| Type | Class | Notes |
|------|-------|--------|
| **WAND** | **Mage** | Light focus / spell channel |
| **GRIMOIRE** | **Worge** | Shapeshift grimoire (not mage tome) |
| **RANGER_LOG** | **Ranger** | Ammo/log + aspect toggles |
| **BATTLE_DUAL** | **Warrior** | Dual-wield battle system |
| **GUN / BOW** | Ranger-primary | Ranged |
| **CHAIN_KNIFE** | Any | 2H knives; chain throw → yank dash |

## GUN styles (5/6 ready)

| Style | Mesh file | Icon sprite | Palette |
|-------|-----------|-------------|---------|
| 1 copper | `gun_style_copper.glb` | blackpowder_blaster | #b87333 brass |
| 2 silver | `gun_style_silver.glb` | ironstorm_gun | #c0c0c0 steel |
| 3 gold | `gun_style_gold.glb` | emberrifle | #d4af37 gold/pyro |
| 4 diamond | `gun_style_diamond.glb` | wraithbarrel | #a5f3fc cyan tip |
| 5 voxel | `gun_style_voxel.glb` | duskblaster | #68d391 blocky |
| 6 cold_viking | **TBD** | bloodcannon | ice steel + blue |

Skill descriptions for GUN reference these palettes so skill icons can match the mesh.

## Icon ↔ asset match

`STYLE_ICON_MATCH` in `weaponPrefabCatalog.ts` defines primary/secondary/glow hex + texture notes per style.  
UI: `getGunStyleIconPath(styleId)` in `weaponSpriteMap.ts`.

## Chain knife combat

1. **Chain Throw** — ranged dagger with tether  
2. **Yank Dash** — next attack dashes to enemy; chain + knife return to user  
3. Mesh: `2bone_knife` + hook/twinblade multipacks for more styles
