# Waveboard — Grudge6 open-water windsurf (tslda-inspired)

**Source learning:** [Robpayot/tslda](https://github.com/Robpayot/tslda) (Wind Waker Three.js / TSL)  
**Live:** grudgewarlords.com open water · dock craft  
**Asset:** `client/public/models/watercraft/waveboard_rig.glb`  
  (from `Documents/windsurfing_rig_silhouette.glb`)

## What we took from tslda

| tslda | Grudge Waveboard |
|-------|------------------|
| `ControllerManager.boat` velocity / velocityP | `WaveboardController` accel · drag · speed% |
| Turn with A/D + turnForce feel | Yaw turn rate scales with speed |
| Space jump (higher when fast) | Space jump; gravity drop; airborne lean |
| Sail morph / velocity on material | Canvas sail billow from wind + speed |
| Splash / jump particles | Lightweight points burst on F shoot |
| Ocean ride | Uses fleet `OpenWaterProduction` weather |

We do **not** fork the whole TSL WebGPU stack — patterns only, wired into Gerstner ocean + Grudge6.

## Craft (dock)

| | |
|--|--|
| **Recipe** | **2× Wood Scraps** + **2× Scrap Cloth** |
| **Station** | Dock (Forester / carpentry) |
| **Time** | 8s |
| **Slot** | **Back** |
| **Item id** | `waveboard` |

```ts
import { WAVEBOARD_ITEM, WAVEBOARD_RECIPE } from "@shared/definitions/waveboard";
import { T0_WAVEBOARD, getT0CraftableItems } from "@shared/definitions/tier0Items";
// getT0CraftableItems() includes waveboard
```

## Deploy / ride

1. Craft at dock → equip **Back**  
2. On open water: **B** deploy waveboard  
3. Controls:
   - **W/S** — thrust / brake (wind assists)  
   - **A/D** — turn  
   - **Space** — jump (bigger at high speed)  
   - **F** — water splash bolt  
   - **B** — stow  

```ts
import { WaveboardController } from "@/game/sailing";

const board = new WaveboardController({
  scene,
  waterLevel: 0,
  weather: openWater.getWeather(),
  characterRoot: hero.model,
  onShoot: (o, d) => spawnWaterBolt(o, d),
});
await board.load();
// when player has Back=waveboard:
await board.toggleDeploy(hero.position);
// frame:
board.setWeather(openWater.getWeather());
board.update(dt);
```

## Materials (silhouette recolor)

| Part | Color | Look |
|------|-------|------|
| Board / base | `#2a1810` | Dark wood, high roughness |
| Handles / boom | `#e8b923` | Yellow grips |
| Sail | `#e6dcc0` | Canvas, double-sided |
| Mast / spar | `#4a3220` | Mid wood |

`WaveboardRig` classifies meshes by name (`wood|board|sail|handle|…`) or volume heuristics, then paints.

## Files

| Path | Role |
|------|------|
| `shared/definitions/waveboard.ts` | Item + recipe SSOT |
| `shared/definitions/tier0Items.ts` | `T0_WAVEBOARD` in craftables |
| `client/src/game/sailing/waveboard/*` | Controller + rig |
| `client/public/models/watercraft/waveboard_rig.glb` | Deployed mesh |

## Host checklist

- [ ] Inventory Back slot accepts `slot: "Back"`  
- [ ] Dock craft UI lists `T0_WAVEBOARD` recipe  
- [ ] Open water uses one `OpenWaterProduction` ocean  
- [ ] Deploy only if equipped waveboard  
- [ ] Character feet ride board Y + 0.85 m  

MIT patterns from tslda; content/assets Grudge Studio.
