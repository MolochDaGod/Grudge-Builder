# Floating islands, event islands & boss rooms

## Assets

| Source | Game / CDN path | Use |
|--------|-----------------|-----|
| `lyoko_mountain_sector (1).glb` | `/models/biomes/ethereal/…` + CDN | Ethereal Falls stacked floats |
| `spiral_mountain_reimagined.glb` | `/models/biomes/event/…` + CDN | Mountain + plains event islands |
| `hoth_boss_room_low_poly.glb` | `/models/biomes/frozen/…` + CDN | Frozen boss instance |
| `scary_forest.glb` | `/models/biomes/forest/…` + CDN | Deep woods dungeon instance |
| `bossinstanceisland.glb` | `/models/biomes/desert/…` + CDN | Desert boss island |
| `low_poly_lava_fighting_arenastage.glb` | `/models/biomes/volcanic/…` + CDN | Volcanic boss arena |
| `iceland_scene_for_canimatic.glb` | `/models/biomes/cold/…` + CDN | Frozen + near-frozen plate |

```bash
node scripts/copy-cold-biome-assets.mjs
node scripts/upload-floating-island-assets.mjs
```

CDN base: `https://assets.grudge-studio.com/models/biomes/…`  
Loaders try **CDN first**, then same-origin (`FLOATING_ISLAND_LOAD_ORDER`).

## Ethereal Falls — Lyoko

Code: `EtherealFloatingIslandSystem`

1. Two variants per mesh (cyan large / violet small)
2. Stacked + orbit/weave/bob (flying-mount steer)
3. Upstream drift in destruction half

## Spiral mountain — **mountain + plains only**

Code: `EventIslandSystem`

| Sector | Role |
|--------|------|
| `thornwood_wilds` | Mountain / highland forest |
| `haven_shore` | Plains / trade coast flats |
| `ashen_wastes` | Desert plains |

**Not** on ethereal (Lyoko), frostbite/storm (Iceland), or abyssal.

- Skybox stripped
- Sink/raise cycle + rotating NPC/boss
- Portal → Hoth when cold-eligible

## Hoth boss room

- Event island portal, frozen Iceland approach, random dungeon portal (cold)

## Deep woods / desert / volcanic instances

Same `BossRoomInstanceSystem` catalog as Hoth (`pickBossRoomInstance`).

| Map | Sector | Dungeon name tokens |
|-----|--------|---------------------|
| Deep Woods | `thornwood_wilds` | wood, forest, thorn, grove |
| Desert Boss Island | `ashen_wastes` | desert, dune, sand, ashen |
| Volcanic Boss Arena | `ember_depths` | lava, volcan, ember, magma |

Does **not** replace Ember Spire climb — climb stays platforms + chests; lava arena is the boss instance.

## Play bake (size + layers + colliders)

`prepareBossArenaPlay` / `bossArenaPlay.ts` — same Island3D physics, not a second engine.

| Layer | Meshes (examples) | Collider |
|-------|-------------------|----------|
| terrain | WalkableFloor, Central_Platform, base_Main | Rapier trimesh `ground` + BVH feet |
| water | Central_Water, Lateral_Water* | sensor `sensor_trigger` (not walk) |
| lava | lava/magma names | walk + `ground` (hazard tag) |
| seafloor | GroundUnder, lower_Bottom | walk + `ground` |
| column | IceColumn*, Column_* | `wall` (CCT block) |
| building | Walls, Outer, doors | `wall` |
| ignore | sky, cameras, lights | none |

SI: keep author metres if XZ is 28–140 m (lava arena is ~78 m). Only 100× / tiny maps rescale. Enter rebinds `CharacterController3D.setGroundSampler` to the arena BVH; exit restores the zone sampler.

## Iceland — **frozen biomes only**

| Sector | Role |
|--------|------|
| `frostbite_expanse` | Primary frozen plate |
| `stormbreak_reef` | Near-frozen cold-storm shelf only |

## Engine wiring

- ethereal → Lyoko floats + destruction
- thornwood / haven / ashen → spiral event islands
- frostbite / stormbreak → Iceland plate
- instance-eligible (ice / woods / desert / volcanic) → matching boss room preload
