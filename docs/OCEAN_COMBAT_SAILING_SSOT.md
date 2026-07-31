# Ocean · combat · sailing production SSOT

**Domains:** grudgewarlords.com Island3D · open water · boats/rafts  
**Rapier skill:** `grudge-rapier` · **Combat skill:** `grudge-fleet-combat`

## Modules

| Domain | Path | Role |
|--------|------|------|
| Hit / knock-up | `client/src/island3d/combat/HitResponseSystem.ts` | Stun, knockback, knock-up, hit-react anim |
| Weapon skills | `ProductionSkillCombatRuntime.ts` + `weaponSkillCombatCatalog` | Anim · VFX · collider · hit windows |
| Deck ride | `game/sailing/ShipDeckPhysics.ts` | Grip / stagger on rocking hull |
| Ship probe | `game/dock/ShipInteractable.ts` | Deck plates, helm, cannons, climb |
| Ocean climb | `game/sailing/OceanBoatClimbRig.ts` | Gunwales, lips, freeboard, snap-to-deck |
| Sails | `game/sailing/SailMaterialSystem.ts` + `clothPhysics.ts` | Canvas materials + Verlet cloth |
| Watercraft Rapier | `island3d/physics/fleet/oceanWatercraftPresets.ts` | Kinematic hull / fixed dock / debris |
| Boarding | `ShipBoardingController.ts` · `BoatBoardingSystem.ts` | Deck walk, swim, climb register |

## Combat pipeline (best use)

```
cast skill → anim one-shot → hit window
  → resolveHitResponse (knockback / knockUp / stun / anim)
  → applyHitResponse (CCT motion or Rapier impulse)
  → WorldFx impact + camera punch
  → knockUpAnimPhase while airborne
```

Wire host once:

```ts
combat.setHitResponseHost({
  playAnim: (id, anim) => director.playHitReact(id, anim),
  applyMotion: (id, vel, stun) => cct.applyHitVelocity(id, vel, stun),
  applyImpulse: (id, imp) => physics.applyImpulse(body, imp),
  spawnImpact: (p, s, school) => worldFx.impact(p, s),
  cameraPunch: (s) => cam.impact(s),
}, /* useRapierImpulse */ true);
```

## Sailing / boats (best use)

1. **Load ship GLB** → `buildShipInteractable(root, size)`  
   - Applies **sail canvas materials**  
   - Probes deck / helm / stairs / cannons  
   - Builds **ocean climb gunwales** + deck plates  
2. **Board** → `ShipBoardingController.board()`  
   - `registerClimbMeshes` for swim → climb → deck  
   - `ShipDeckRig` keeps feet on rocking deck  
3. **Hull motion** → kinematic position (Rapier) or procedural waves  
4. **Sails** → mesh materials always; live cloth only on hero ship if budget allows  

### Climb loop (ocean)

```
swim near gunwale → Space grab (CCT climb)
  → climb-to-top → trySnapOntoDeck
  → deck phase (WASD local walk)
```

Freeboard: raft low · rowboat mid · sloop/galleon high (`CRAFT_CLIMB_PROFILE`).

## Rapier editing (watercraft)

| Craft | Body | Notes |
|-------|------|--------|
| Raft / boat / ship | **Kinematic position** | `setNextKinematicTranslation` each step |
| Dock / pier | **Fixed** | Cuboid / trimesh |
| Wreck debris | **Dynamic** density > 0 | Buoyancy spring in water sensor |
| Water volume | **Sensor** | Swim enter/exit events |
| Deck plates | High friction | No solid sail colliders |

## Anim keys (hit response)

| Key | When |
|-----|------|
| `hit_light` / `hit_heavy` | Ground hits |
| `knockup_rise` → `hit_air` → `knockup_fall` → `knockup_land` | Launch combo |
| `stun_loop` | Long stun |

Map these in grudge6 / toon packs when clips exist; fallback to flinch / fall.

## Deployment

```bash
# Client (grudgewarlords.com)
git push origin main   # Vercel build:client

# Physics package gate
# "@dimforge/rapier3d-compat": "^0.19.3"

# AI agent checklist
curl https://ai.grudge-studio.com/v1/rapier/checklist
```

## Rules checklist

- Hit response **once per hit window**  
- Knock-up cancels ground snap while airborne  
- Sails = canvas standard material (rough), not emissive plastic  
- Climb meshes `userData.climbable = true`  
- SI metres everywhere  
- One Rapier world; fixed 1/60  

See also: `docs/RAPIER_FLEET.md`, `docs/SAILING.md` (if present), skill `grudge-rapier`.
