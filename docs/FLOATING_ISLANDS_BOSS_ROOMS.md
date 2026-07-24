# Floating islands, event islands & boss rooms

## Assets

| Source | Game path | Use |
|--------|-----------|-----|
| `lyoko_mountain_sector (1).glb` | `/models/biomes/ethereal/lyoko_mountain_sector.glb` | Ethereal Falls stacked floating islands |
| `spiral_mountain_reimagined.glb` | `/models/biomes/event/spiral_mountain_reimagined.glb` | Event island sink/raise (skybox stripped) |
| `hoth_boss_room_low_poly.glb` | `/models/biomes/frozen/hoth_boss_room_low_poly.glb` | Frozen boss instance |
| `iceland_scene_for_canimatic.glb` | `/models/biomes/cold/iceland_scene_for_canimatic.glb` | Frozen + near-frozen zone plate |

```bash
node scripts/copy-cold-biome-assets.mjs
```

## Ethereal Falls — Lyoko best practices

Code: `EtherealFloatingIslandSystem` + `floatingIslandBossAssets.ts`

1. **Two variants per island mesh**
   - **A cyan shelf** — scale 1.0, cool tint, lower emissive
   - **B violet shard** — scale 0.55, magenta emissive, higher metalness
2. **Stacked** — B rides above A (`stackOffsetY`)
3. **Moving** — orbit + weave + bob (flying-mount style bank/steer)
4. **Colorful upstream** — in destruction half, drift toward Cosmic Waterfall tip
5. **No skybox** on Lyoko plate so zone sky/fog remain SSOT

## Event islands — spiral mountain

Code: `EventIslandSystem`

- **Strip skybox** on load
- Biomes: **mountain + plains** (also allowed on ethereal/frostbite/storm/haven)
- Phases: `raised → sinking → sunken → rising` with different **boss + NPC** each raise
- Portal pad on island → **Hoth boss room** (`E`)

## Hoth boss room

Code: `BossRoomInstanceSystem`

Entry sources:
- Event island portal
- Frozen biome (near Iceland plate)
- Mountain biome portal (via event island)
- Random dungeon portal (same enter API)

`E` near portal enters instance; `E` on blue exit ring returns to stamp.

## Iceland

Code: `IcelandScenePlacer`

- Full freeze: `frostbite_expanse`
- Near-frozen: `stormbreak_reef`, `ethereal_falls`, `abyssal_trench`

## Engine wiring

`Island3DEngine` zone load:
- ethereal → destruction + Lyoko floats
- spiral sectors → event islands
- hoth-eligible → boss room preload
- iceland sectors → cinematic plate

## Events

```js
window.addEventListener('grudge:event-island', (e) => console.log(e.detail.prompt));
window.addEventListener('grudge:boss-room', (e) => console.log(e.detail.prompt));
```
