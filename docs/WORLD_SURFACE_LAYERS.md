# World surface layers (terrain · water · deck · climb)

**SSOT:** `shared/definitions/worldSurfaceLayers.ts`  
**Fleet:** `FLEET_PLAY_SYSTEMS.worldSurface` (v1.5.0+)

## Rules

| Layer | Content | Placement |
|-------|---------|-----------|
| **Terrain** | trees, rocks, crystals, animals, camps | dry land: `groundY > water + 1.25 m` |
| **Water** | fish, water predators, floating props | water column: `seabed ≤ water − 0.75 m` |
| **Deck** | captain walk, helm, cannons | sample deck Y; no ocean swim while `shipDeckLocked` |
| **Hull climb** | overboard recovery | climbable hull meshes; Space grab from water |
| **Cliff climb** | terrain walls | normal.y &lt; 0.35; Space hold |

SI units: **1 unit = 1 m**, human **1.8 m**.

## Player locomotion

| State | Behaviour |
|-------|-----------|
| Ground | WASD on terrain sample |
| Wade | feet in water &lt; 0.9 m depth |
| Swim surface | feet below water − 0.45 m |
| Swim underwater | head under / Ctrl dive |
| Climb | Space near wall/hull; W/S up/down; A/D shimmy; X off |
| Deck | board ship → walk deck; W at helm sails |
| Overboard | jump Space off deck → swim → Space grab hull → climb → W mantle deck |

## Code map (GrudgeBuilder)

| Concern | Module |
|---------|--------|
| Placement SSOT | `shared/definitions/worldSurfaceLayers.ts` |
| Harvest land/water | `island3d/harvest/RegenerativeHarvest.ts` |
| Wildlife land/fish | `island3d/creatures/CreatureManager.ts` |
| Climb / swim / ground | `island3d/player/CharacterController3D.ts` |
| Deck walk / climb aboard | `game/dock/ShipBoardingController.ts` |
| Deck colliders / helm | `game/dock/ShipInteractable.ts` |
| Zone wildlife sampler | `Island3DEngine` sets `setGroundSampler` before spawn |

## Sector / deployment checklist

1. Set **waterLevel** for sector (Gmap / zone cfg).
2. Tag hull meshes `userData.climbable` / `shipHull` (or use `tagSurfaceMesh`).
3. Land scatter must call `isDryLand` / `validateHarvestPlacement`.
4. Fish spawn **requires** ground sampler so columns reject dry land.
5. Boarding: `registerClimbMeshes(climbColliders)` before play.
6. QA: walk deck → Space overboard → swim to hull → Space climb → W board.

## Related

- `grudge-production-world` skill  
- `docs/THREE_GAME_SYSTEMS.md`  
- `docs/FLEET_PLAY_SYSTEMS.md`
