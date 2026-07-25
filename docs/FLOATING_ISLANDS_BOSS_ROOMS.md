# Floating islands, event islands & boss rooms

## Assets

| Source | Game / CDN path | Use |
|--------|-----------------|-----|
| `lyoko_mountain_sector (1).glb` | `/models/biomes/ethereal/…` + CDN | Ethereal Falls stacked floats |
| `spiral_mountain_reimagined.glb` | `/models/biomes/event/…` + CDN | Mountain + plains event islands |
| `hoth_boss_room_low_poly.glb` | `/models/biomes/frozen/…` + CDN | Frozen boss instance |
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

## Iceland — **frozen biomes only**

| Sector | Role |
|--------|------|
| `frostbite_expanse` | Primary frozen plate |
| `stormbreak_reef` | Near-frozen cold-storm shelf only |

## Engine wiring

- ethereal → Lyoko floats + destruction
- thornwood / haven / ashen → spiral event islands
- frostbite / stormbreak → Iceland plate
- hoth-eligible cold → boss room preload
