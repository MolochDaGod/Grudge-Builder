# Leviathan Ocean → Shipwreck Tutorial Cinema

**Surface:** `https://client.grudge-studio.com/island-3d`  
**Engine:** `client/src/island3d/intro/LeviathanOceanCinema.ts`  
**Gate:** `StormShipIntroGate.tsx`  
**SSOT:** `shared/definitions/productionIntro.ts` (`SHIPWRECK_TUTORIAL_INTRO` v4)  
**Skills:** `threejs-cinema` · `grudge-production-cinema`

## Story (production)

1. **Open sea** — SI pirate ship (~22 m) on Gerstner storm water  
2. **Raise the rings** — 3 deck casters (grudge6) raise yin-yang blue wards (~2.4 m), aimed at leviathan  
3. **Leviathan** — rises (~42 m LOA); fire aura points  
4. **Fire beam** — additive beam mouth → deck; **supernova** flares at ring contacts (scaled SI)  
5. **Hold / dive** — beast submerges  
6. **Breach + pinata** — hull confetti (55 debris fragments + wreck mesh)  
7. **Twenty meters** — hero thrown `HERO_THROW_M = 20`; camera FG on hero, fight BG  
8. **Into the black** — sink + blackout  
9. **Logo** — `/cinema/grudge-logo.jpeg` (from user art)  
10. **Handoff** — `/tutorial?from=shipwreck-intro` → chicken-gun pirate-islands **shipwreck_cove** wake  

## Assets (public, production-local)

| Role | Path |
|------|------|
| Leviathan | `client/public/models/cinema/leviathan.glb` (from `D:\Games\Models\leviathan.glb`) |
| Magic ring | `client/public/models/cinema/magic-ring-yinyang-blue.glb` |
| Supernova impact | `client/public/models/cinema/supernova-impact.prod.glb` (meshopt; ~16 MB from 128 MB) |
| Water attractor (entry/exit spray) | `…/water-attractor.glb` (Lorenz attractor, ocean-tinted) |
| Shield-defeat smoke | `…/smoke-rings.glb` (recolor magenta→cyan) |
| Beam enhancers | `…/ethereal-diodes.glb` |
| Sky lightning | `…/lightning-flash.glb` |
| Twin whirlpools | `…/spinjitzu-whirl.glb` (ocean tint, translucent) |
| Whirl lightning bolts | `…/negative-leader.glb` |
| Stylized explosion | `…/stylized-explosion.prod.glb` (~17 MB from 119 MB) |
| Megumin mark→blast | `…/megumin-explosion.prod.glb` (~0.55 MB) |
| Tornado | `…/tornado.prod.glb` (~7.5 MB from 56 MB) |
| Hull fire aura | `FireSmokeParticles` presets `boat_fire` + `attack_burst` |
| Logo | `client/public/cinema/grudge-logo.jpeg` |
| Foundation map | `…/startingfalls.prod.glb` (Desktop `startingfalls.glb`) — **waterfall island** |
| Cinema stage | **stones_v2 / Stone_1_Low*** (stones_moss) — no pirate-island prop |
| Distant islands | Startingfalls `Object_*` meshes (kept in distance after SI fit) |
| Ship / hero | CDN grudge6 + pirate ship; procedural fallbacks |

### Physics (cinema canvas)

`ShipImpulseBody` — mass/inertia proxy; beam/ram/breach impulses shake & translate the hull with damping + wave spring. Not full Rapier (gate WebGL only).

## SI rules

- 1 unit = 1 m  
- Human 1.8 m (`plantHeight`)  
- Ship LOA 22 m · Leviathan LOA 42 m · Rings 2.4 m · Supernova contacts 1.5–3.5 m  
- Throw distance **exactly 20 m** along throwDir  

## QA

```
http://127.0.0.1:5173/island-3d?intro=1
http://127.0.0.1:5173/island-3d?intro=shipwreck
# after skip/complete:
/tutorial?from=shipwreck-intro
```

Session key: `grudge_shipwreck_intro_seen_v4`  

Zone land-in (`?mode=zone`) still never auto-plays.

## Kill list

- TI iframe / Stonewisp / intro.mp4 as primary  
- Capsule heroes  
- 100× supernova (always re-fit to SI meters)  
- Orbit during cinema  
