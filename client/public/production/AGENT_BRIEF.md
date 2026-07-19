# Grudge Open World — Production Map Asset

## Geometry (mesh)
- LIVE GLTF: https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.gltf
- Preferred GLB (build if missing): https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.glb
- Local: public/models/lobby/pirate-islands/

## Full production package (Forge + AI)
- SSOT: shared/definitions/productionMapPackage.ts
- Built JSON: public/maps/grudge-open-world/grudge-open-world.gmap.json
- Forge import: grudge-open-world.studio.json (via exportStudioProjectFromGmap)
- Editor: https://forge.grudge-studio.com/

## Systems baked into package
- rtsCaptureFlags: true
- aiSailing: true
- aiCombat: true
- aiShips: true
- autoHarvestUnits: true
- characterAccountEquipment: true
- factionIslands: true
- boatsPhysics: true
- dayNight: true

## Layers: ocean_floor, ocean, island_base, beach, structure, prop, nature, camp, living, vehicle, nav, physics, rts, ai, network, missions, items, characters, systems, vfx