# Platformer jump (random-boxes FLY_JUMP)

**Reference:** [threejs-games Random boxes](https://threejs-games.github.io/examples/80-scenes/random-boxes/)  
**Source:** `core/actor/states/FlyState.js` + `Avatar.js` (`jumpStyle: FLY_JUMP`, `maxJumpTime ≈ 0.99`)

## Mechanic

| Input | Effect |
|-------|--------|
| **Space press** on ground | Start boost window |
| **Space hold** | `vy += jumpForce * dt` until `maxJumpTime` or `maxVelocityY` |
| **Space release** | Boost ends early → shorter hop |
| Airborne | `vy -= gravity * dt` |
| Land | `vy = 0`, stick to ground |

This is **variable-height hold-to-jump**, not a single impulse.

## Grudge wiring

| Surface | Config | How |
|---------|--------|-----|
| **Ethereal Falls** | `ETHEREAL_FALLS_JUMP` | `resolvePlatformerJumpForSector` → `setPlatformerJump` |
| **Volcanic climb (Ember Spire)** | `VOLCANIC_CLIMB_JUMP` | same resolver + `VolcanicClimbIslandSystem` |
| **Airship solo zone** | `AIRSHIP_DECK_JUMP` | Own player root + `stepPlatformerJump` (not CharacterController) |
| Default zones | impulse | Classic `verticalVelocity = jumpForce` once |

**SSOT:** call `resolvePlatformerJumpForSector(sectorId)` — do not scatter sector ifs in the engine.

Code: `client/src/island3d/physics/PlatformerJump.ts`  
Climb tower + ownership matrix: `docs/VOLCANIC_CLIMB.md`

## Defaults (Avatar-like)

```
gravity        ≈ 36–42
jumpForce      ≈ gravity × 1.65–1.8
maxJumpTime    ≈ 0.72–0.99 s
maxVelocityY   ≈ gravity / 3
```

## Play

```
/play?mode=zone&sector=ethereal_falls
/island-3d?mode=zone&sector=ember_depths
/island-3d?mode=zone&sector=ashen_wastes
/airship-zone
```

Hold **Space** longer for higher jumps on floating islands / Ember Spire climb / deck.
