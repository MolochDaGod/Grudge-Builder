# Firewood-style tree chop

**Reference:** [screen.toys/firewood](https://screen.toys/firewood/) — line up a plane, click to split, work the remaining mass.  
**Also:** Valheim-like base notching (face the cut, fell away from notch).

## Goal

Axe harvest should **not** be random HP spam. It should feel like:

1. **Notch the base** at a consistent angle (the cut face)  
2. **Timber fall** away from that face  
3. **Split the log on the ground** with axe swings (firewood plane)  
4. **Collect pinata wood** by walking near pieces  

## Files

| Layer | Path |
|-------|------|
| SSOT thresholds / grades | `shared/definitions/firewoodChop.ts` |
| Runtime | `client/src/island3d/harvest/FirewoodChopSystem.ts` |
| Tree phases | `client/src/island3d/objects/HarvestableTree.ts` |
| Fall anim | `client/src/island3d/harvest/HarvestFeedback.ts` |
| Fracture | `client/src/island3d/harvest/PinataHarvestBreak.ts` |
| Wire | `Island3DEngine` click path + `updateHarvestables` |
| Pinata overview | `client/src/island3d/harvest/PINATA_HARVEST.md` |

## Phases

```
live → notching → falling → downed → splitting → stump → (regrow) live
```

| Phase | Player action |
|-------|----------------|
| **live / notching** | Axe hits within **base height band** (~0.15–1.35 m) on one **face arc** (~±42°) |
| **falling** | Directed lean (yaw from notch face) |
| **downed / splitting** | Axe hits log segments; 2 hits/segment → pinata split |
| **stump** | Full log cleared; respawn timer → sapling |

## Strike grades (standing)

| Grade | Meaning |
|-------|---------|
| perfect / good | Height OK + same cut face → notch progress |
| chip | Height OK, wrong side → little progress |
| miss_high / miss_low | Wrong height → tip text, tiny progress |

First good base hit **locks the face**. Keep walking around until you’re on that side.

## Firewood toy → Grudge map

| screen.toys/firewood | Grudge |
|----------------------|--------|
| Drag to rotate log | Walk around tree / aim at base |
| Click to split plane | LMB axe strike |
| Halves stay workable | Ground **segments** with hit counters |
| Pieces tumble | Pinata fragments + collectible cylinders |
| Repeat until firewood | Walk near pieces or wait auto-loot |

## Events

```js
window.addEventListener('grudge:firewood-chop', (e) => {
  // { type: 'prompt', prompt }
  // { type: 'fell', nodeId, fallYaw }
  // { type: 'segment', nodeId, segment }
  // { type: 'collect', qty }
});
```

## Tools

- Radial harvest tool **axe** (hatchet) — see `HarvestToolActions` / `HarvestNodeRecognition`
- Rocks still use pickaxe + pinata chip/shatter (unchanged)

## Agent rules

1. Thresholds only in `firewoodChop.ts`  
2. Don’t bypass `FirewoodChopSystem` with raw `tree.health--` for standing trees  
3. After fall, **do not** stump until ground splits complete  
4. Pinata = VFX/physics; bag loot via `onHarvest` / collect events  
