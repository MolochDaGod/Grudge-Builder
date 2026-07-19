# Sector Production Content

**SSOT:** `shared/definitions/sectorProductionContent.ts`  
**Published JSON:** `/production/sectors-content.json`  
**API:** `GET /api/production/sectors` · `GET /api/production/sectors/:sectorId`

Each of the **9 Warlords zones** is individually assigned biome textures, heightmap modifiers, terrain seeds, harvest assets, animals, monsters, NPC camp seeds, event seeds, and landmark GLBs.

## Grid

| | West | Center | East |
|--|------|--------|------|
| **North** | `ethereal_falls` (event falls) | `frostbite_expanse` (fabled + ice) | `thornwood_wilds` (hidden mountain city) |
| **Mid** | `stormbreak_reef` | `convergence_nexus` | `ashen_wastes` |
| **South** | `abyssal_trench` | `haven_shore` (starter) | `ember_depths` |

## Best practices (enforced)

1. **One SSOT** — client `Island3DEngine` and production server share `resolveSectorSeeds(sectorId, worldSeed)`.
2. **No megakit trees** — harvest uses ecosystem `treeCdn` / variants only.
3. **5 land animal types** per biome; spawn counts from `wildlife.landSpawnCount`.
4. **Fish only in water**; land wildlife never below `waterLevel + 1.25`.
5. **Heightmap modifier + terrain seed** stay paired for Colyseus / client parity.
6. **Landmark GLBs:** local public first, then CDN; procedural fallback if both fail.
7. **`eventfalls.glb`** → `ethereal_falls` only (`/models/biomes/ethereal/event-falls.glb`).
8. **`mountainshiddencity.glb`** → `thornwood_wilds` only (boss-gated door).
9. **Haven Shore** is the safe starter — no world bosses, Fruzer foundation + vendors.

## Authoring assets (MouseWithoutBorders)

| File | Sector | Public path |
|------|--------|-------------|
| `eventfalls.glb` | ethereal_falls | `/models/biomes/ethereal/event-falls.glb` |
| `startingfalls.glb` | ethereal_falls | `/models/biomes/ethereal/starting-falls.glb` |
| `mountainshiddencity.glb` | thornwood_wilds | `/models/mountains/mountains-hidden-city.glb` |
| `icebiome.glb` / ice kit | frostbite_expanse | `/models/biomes/ice/ice_biome_kit.glb` |
| `fabledzone.glb` | frostbite_expanse | `/models/warlords/fabled/fabledzone.glb` |

Upload large GLBs to R2 under the matching `cdnKey` before production clients rely on CDN-only.

## Publish

```bash
node scripts/publish-sector-production-content.mjs
```

## Client wiring

- Zone init loads `getSectorProductionContent(sectorId)`.
- Wildlife / camp seeds use `resolveSectorSeeds`.
- Event landmarks load via `SectorEventLandmarks` (skips dedicated systems like Hidden Mountain City / Fabled core).

## Server wiring

- `GET /api/production/sectors` → full manifest (static file or live SSOT).
- `GET /api/production/sectors/:id?worldSeed=` → one sector + seeds.
- Static serve: `client/public/production/sectors-content.json`.
