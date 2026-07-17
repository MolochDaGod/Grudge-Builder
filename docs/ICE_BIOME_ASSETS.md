# Ice / snow / mountain biome kit

**Source file:** `C:\Users\david\OneDrive\Desktop\MouseWithoutBorders\icebiome.glb`  
**Game pack:** `client/public/models/biomes/ice/ice_biome_kit.glb`  
**Catalog:** `ice_biome_kit.catalog.json`  
**TS SSOT:** `shared/definitions/iceBiomeCatalog.ts` + `iceBiomeRecipes.ts`  
**Learn API client:** `client/src/lib/recipeLearn.ts`  
**Sketchfab:** Sandman Lair — Low Poly Stylized Asset Pack (CC-BY-4.0, artikora)

## Purpose

Assets for **frostbite_expanse**, mountain snow event islands, deserted cold landings, NPC snow bases:

| System | How pack is used |
|--------|------------------|
| **Textures** | Single atlas material `M_Sandman` (2 PNG images in GLB) |
| **Terrain** | `Mountain_*`, `Snowy_mountain_*`, `Iceberg_*` backdrops |
| **Harvestables** | Pines, snowy trees, trunks, path rocks, grass → wood/stone/fiber |
| **Build placeables** | Fences, panels, house, well, bridges, barrels, boxes |
| **Items / recipes** | Learnable craft recipes (`recipe_ice_*`) from world props |
| **E learn (1×)** | Stand over prop → **E** → unlock once per character |

## E-to-learn rules

1. Player stands over a world mesh with `learnable: true` (chest, campfire, barrel, station, fence…).
2. HUD: `E — Learn recipe: <Name>` (or “recipe known” if already unlocked).
3. **Once per character per `recipeId`** — stored in `localStorage` + `unlocked_recipes` table.
4. Sources: `chest` · `camp` · `npc_base` · `world_prop` · `event_island` · `deserted_island`.

```ts
import { buildLearnPrompt, tryLearnRecipeFromAsset, learnHudLabel } from '@/lib/recipeLearn';

// On proximity to nodeName "Chest":
const prompt = buildLearnPrompt('Chest');
// On KeyE:
const result = await tryLearnRecipeFromAsset('Chest', { source: 'chest' });
```

Wire into existing `Island3DEngine` interact path (E/F near interactables).

## Role counts (137 parents)

| Role | ~Count | Examples |
|------|--------|----------|
| terrain | 33 | Mountain, Snowy_mountain, Iceberg |
| harvestable | 34+ | Pine, Snowy_tree, Trunk, Path_rock, Grass |
| build | 33 | Fence, Pannel, Sandman_house, Bridge, Well |
| crafting_station | 9 | Campfire, extractor, dryer, crusher, bag bench |
| storage | 5+ | Barrels, bags, powder crate |
| interact_chest | 3 | Chest, Box, Snowy_box |
| transport | 2 | Boat, Sled |
| decor / npc_prop | rest | Dream catcher, harp, sleepers |

## API fields (per piece)

| Field | Example |
|-------|---------|
| `id` | `ice_wooden_wall` style → `ice_chest` |
| `nodeName` | `Chest` (exact GLB parent) |
| `recipeId` | `recipe_ice_chest` |
| `itemId` | `item_ice_chest` |
| `harvestResource` | `wood` \| `stone` \| `fiber` |
| `biomes` | frostbite_expanse, snow, mountain, event_snow… |

## Regen

```bash
node scripts/generate-ice-biome-catalog.mjs
```

## Note on trees

This pack’s pines/snowy trees are **stylized event-biome trees** (allowed for ice/mountain).  
Fantasy village kit still excludes low-poly square trees for general modular build.
