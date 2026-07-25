# Combat Lab — equipment, IK, forces, statuses

**Route:** `/combat-lab` (aliases: `/equipment-lab`, `/editor/combat`)  
**Live:** grudgewarlords.com/combat-lab

## Purpose

Single editor for **testing / improving / building** weapons and armor against **canonical databases**, with production combat geometry:

| System | SSOT |
|--------|------|
| Items (weapons, armor) | `grudaDB` ← ObjectStore `master-items` |
| Holster / sockets | `shared/definitions/weaponAttachSystem.ts` |
| Grip, wrist IK, reach, forces | `shared/definitions/weaponCombatGeometry.ts` |
| Runtime grip apply | `client/src/lib/weaponGripRuntime.ts` |
| Equip hook | `Grudge6EquipmentManager.applyCombatGripForSlot` |
| Buffs / debuffs | `shared/definitions/statusEffects.ts` + `statusEffectRuntime` |

## Grip & wrist IK

- Weapons parent to `R_hand_container` / `L_hand_container`.
- Grip **offset / rotation / scale** keep the mesh in the palm.
- **Wrist lock** clamps pitch/yaw/roll and applies bias Euler so the blade faces **outward** (reduces mesh-through-torso on run/attack).
- Call `updateWeaponWristLocks(dt)` after animation mixer each frame (Island3D / play controllers).

## Collider & reach

- Capsule/box/sphere in **weapon local space** from the grip.
- `reachM` + `arcHalfRad` + `heightBiasM` define optimal attack volume.
- Use `getOptimalAttackPoint()` for aim / AI strike points.

## Forces

Patterns: slash, thrust, smash, **push**, **pull**, **knockup**, **uppercut**, **back_uppercut**, cleave, pierce, shot, cast.

`resolveHitImpulse(pattern, profile, forwardXZ)` → velocity + status ids + stagger chance. Status application uses the same stack rules as `statusEffects` SSOT.

## Passives

`WEAPON_PASSIVES` — stack counters, prime every N hits, optional on-hit / on-equip status. Wired in Combat Lab for enable/disable per weapon type.

## Status UI

- Icons from def.icon (CDN) with emoji fallback.
- Tooltips: polarity, stack rule, duration, DoT/Hard CC.
- Live apply via `playerStatusEffects` (same HUD runtime as play).

## Related tools

- `/weapon-admin` — GLB upload per tier  
- `/weapon-skills` — skill bars  
- `/admin-combat` — timeline / ability editor  
- `/database` — item card browser  
- `/arsenal` — player arsenal UI  
