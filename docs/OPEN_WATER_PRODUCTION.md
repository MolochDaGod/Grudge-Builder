# Open water production — waves, storms, rain, boats, oars, sails

**Live domain:** grudgewarlords.com  
**SSOT entry:** `OpenWaterProduction` · `OpenWaterDriveController` · `SmallCraftRowSystem`

## Reference → production

| Ref | Ours |
|-----|------|
| [threejs-games waves](https://threejs-games.github.io/examples/15-animations/waves/) | **OceanShader** 6-octave **Gerstner** + wind/storm (not raw sine demo) |
| [threejs-games rain](https://threejs-games.github.io/examples/20-particles/rain/) | **StormRainSystem** GPU points, camera volume, storm-linked |
| Simple sail demos | **SailMaterialSystem** canvas + optional cloth; deploy 0–1 |
| Dual control mess | **OpenWaterDriveMode** — sail XOR oar |

## One ocean rule (no conflicts)

```
✅ OpenWaterProduction  →  OceanEnvironment + rain + weather
✅ OceanEnvironment alone (if no rain needed)
❌ Never spawn two DynamicOcean meshes in one scene
❌ Never apply sail thrust + oar thrust same frame
```

## Weather → shader + rain + boats

| Preset | storm | rain | waves |
|--------|-------|------|-------|
| calm | 0 | 0 | low |
| light_rain | 0.12 | 0.45 | mid |
| heavy_rain | 0.28 | 0.75 | mid+ |
| storm | 0.55 | 0.9 | high |
| hurricane | 0.9 | 1 | max |

```ts
const water = new OpenWaterProduction({
  scene,
  worldSize: 800,
  quality: "high", // low|medium|high|ultra segments
  weather: "calm",
});
water.setWeatherPreset("storm");
// each frame:
water.update(dt, camera, sunDir);
water.setIslandPositions(islandCenters);
```

## Boat control (precision oars)

| Hotkey | Action |
|--------|--------|
| **R** or **O** | **OAR mode** — sails down, precision stroke |
| **T** | **SAIL mode** (fishing boat+) — wind thrust |
| **W/S** | Stroke (oar) or sheet (sail) |
| **A/D** | Turn |
| **Space** | Rest stroke (oar) |
| **F** | Fish (fishing boat near island) |
| **E** | Board / leave |

### Craft rules

| Craft | Default | Sails? |
|-------|---------|--------|
| Raft | OAR | No |
| Dinghy / rowboat | OAR | No |
| Fishing boat | OAR | Yes (T raise) |
| Sloop+ | SAIL | Yes (R → oars docks) |

## Islands + rafts deploy

1. Island mesh / heightfield on land  
2. `OpenWaterProduction` for water between islands  
3. Raft/dinghy via `SmallCraftRowSystem` at dock  
4. `setIslandPositions` for fish + cast range  
5. Climb gunwales: `ShipInteractable` / `OceanBoatClimbRig` for swim-board  

## Quality / optimization

| Quality | Ocean segs | Rain drops |
|---------|------------|------------|
| low | 96 | 4k |
| medium | 160 | 8k |
| high | 256 | 12k |
| ultra | 384 | 12k+ |

- Rain **hidden** when intensity ≈ 0 (no draw cost)  
- Ocean `frustumCulled = false` for horizon (single plane)  
- One fish manager under OceanEnvironment  

## Files

| Module | Path |
|--------|------|
| Facade | `game/sailing/OpenWaterProduction.ts` |
| Rain | `game/sailing/StormRainSystem.ts` |
| Drive | `game/sailing/OpenWaterDriveMode.ts` |
| Small craft | `game/sailing/SmallCraftRowSystem.ts` |
| Shader | `game/sailing/OceanShader.ts` |
| Env | `game/ocean/OceanEnvironment.ts` |

## Deploy

```bash
git push origin main   # Vercel grudgewarlords.com
```

See also: `OCEAN_COMBAT_SAILING_SSOT.md` · `RAPIER_FLEET.md` · skill `grudge-rapier`
