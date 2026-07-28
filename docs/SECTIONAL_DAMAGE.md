# Sectional damage + build-hammer repair

**Refs:** [three-pinata](https://github.com/dgreenheck/three-pinata) · `client/src/island3d/damage/*`

## What it does

| Target | Registration | On impact | On repair |
|--------|--------------|-----------|-----------|
| Boats / ships | `registerWatercraftSections` / `engine.registerWatercraftDamage` | Section HP ↓; at 0 **hide mesh** (damaged) | Toolkit + **1 wood**, RMB then LMB |
| Buildings / props | `registerBuildingSections` / auto on place | same | same |
| Vehicles | `registerVehicleSections` | same | same |
| Enemies / objects | `registerEnemySections` / `registerObjectSections` | hide chunk; optional pinata shatter | same |

Damaged = **hidden chunk**. Progressive play stays lightweight; full Voronoi shatter is optional via `@dgreenheck/three-pinata` (`PinataFracture.ts`).

## Player flow

1. Equip **Build Hammer** (R-radial toolkit).
2. **RMB** a damaged boat / building / vehicle section (highlight + prompt).
3. **LMB** spends **1 wood** from player inventory (`wood` / `t0_wood` / `driftwood` / `plank`) **or** boat cargo (`engine.boatCargo`).
4. Chunk becomes visible again at full HP.

## Engine API

```ts
engine.registerWatercraftDamage("ship_1", shipRoot);
engine.registerBuildingDamage("wall_a", wallMesh);
engine.applySectionImpactAt(hitPoint, 25, 2.5);

// Hosts may fill boat hold for mid-ocean repairs
engine.boatCargo = { wood: 12 };
```

## Files

- `SectionalDamageSystem.ts` — sections, hide/show, integrity
- `BuildHammerRepair.ts` — RMB select / LMB spend wood
- `PinataFracture.ts` — optional three-pinata adapter
- Wired in `Island3DEngine` (`tryHammerRepairSelect` / `tryHammerRepairApply`)

## Rules

- SI meters, max repair range **4.5 m**
- Do not double-apply hull HP from both Rapier VFX path and section system without a host split
- Sail XOR oar and open-water rules unchanged
