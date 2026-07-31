# Naming SSOT — stop synonym / plural / capital confusion

**Code:** `shared/definitions/namingSsot.ts`  
**Surfaces:** `worldSurfaceLayers.ts` re-exports ocean helpers.

## Ocean ≡ open water ≡ sea

| Say this | Not this (same thing) | Code |
|----------|------------------------|------|
| **ocean** (mesh / system) | sea, open water, water plane, DynamicOcean as a *second* system | `mesh.name = 'ocean'`, `createOceanMesh`, `PirateLobbyOcean` |
| **waterLevel** (free-surface Y) | seaLevel, openWaterY, oceanY | `waterLevel` on physics / mesh.userData; prefer also documenting as `oceanSurfaceY` |
| **seabed / seafloor** | bottom of sea (ok) | below free surface; not a second ocean mesh |

### Constants

| Constant | Meaning |
|----------|---------|
| `OCEAN.surfaceY` / `OCEAN_SURFACE_Y` | Default free surface (0) |
| `OCEAN.lobbySurfaceY` / `LOBBY_WATER_LEVEL` | Lobby free surface (same concept) |
| `PROCEDURAL_WATER_LEVEL` / `PROCEDURAL_OCEAN_SURFACE_Y` | Home-island free surface (−2) |
| `SEA_SURFACE_Y` / `OPEN_WATER_SURFACE_Y` | **Aliases** of `OCEAN_SURFACE_Y` |

### Not ocean

| Term | Meaning |
|------|---------|
| GroundTool `bucket` / farm water | Crop watering |
| PlacementDomain `'water'` | Spawn fish under free surface |
| WorldSurfaceLayer `'water'` | Content layer tag |
| Cave interior | Suppress ocean swim — no second ocean |

### Resolver

```ts
import { resolveOceanSurfaceY, isOceanMesh, OCEAN } from '@shared/definitions';

const y = resolveOceanSurfaceY({ waterLevel: 0 }); // or seaLevel / openWaterY
if (isOceanMesh(mesh)) { /* keep single free surface */ }
```

---

## Play modes

| Canonical | Values | Notes |
|-----------|--------|-------|
| **controlMode** | combat \| harvest \| **build** | CharacterController3D |
| **playMode** (HUD) | combat \| harvest | Build is harvest + hammer, not a third mode |

Aliases people confuse: “mode”, “hud mode”, “control mode”, “shell mode” → use **playMode** or **controlMode** explicitly.

---

## Weapons

| Slot | Meaning |
|------|---------|
| **MainHand** | Active weapon/tool |
| **OffHand** | Shield / dual off-hand paperdoll |
| **SecondaryWeapon** | Non-drop **Q-tap** reserve — **not** OffHand |

---

## UI surfaces

| Canonical | Host / component |
|-----------|------------------|
| **playHud** | ModePlayHUD (combat/harvest chrome) |
| **mainPanel** | ui.grudge-studio.com/main-panel (equip/bag) |
| **spellbook** | ui.grudge-studio.com/spellbook |
| **settings** | UiKitSettingsPanel gear |
| **uiKit / craftpix** | Shared textures |
| **gameUiPack** | game-ui-packs/*.json |

Avoid bare “panel”, “main”, “HUD” for main-panel.

---

## Other twins (do not merge)

| Pair | Difference |
|------|------------|
| AnimationManager vs AnimationController vs AnimationMixerHub | Manager wraps Controller wraps three Mixer; Hub = registry |
| SkillMacroSystem vs hotbarLayout | Macros fire chains; hotbar = slot maps only |
| grudge6.grudge-studio.com vs ui.grudge-studio.com | Hub vs UI chrome SSOT |
| quality (post) vs ocean quality | Bloom/SMAA vs reflect/refract RTs |

---

## Agent rules

1. New ocean code: names contain **ocean** or **waterLevel**, never invent `OpenSeaPlane`.  
2. One free-surface mesh per scene (`removeDuplicateWaterMeshes` + `grudgeKeepOcean`).  
3. Q-swap weapon = **SecondaryWeapon**, not OffHand.  
4. HUD mode = combat|harvest only.  
5. Prefer imports from `@shared/definitions` (`namingSsot` / `worldSurfaceLayers`).  
