# Medieval War Scene — Island Siege

Turn `huge_medieval_battle_scene.glb` into a **Conqueror's Blade–style island siege**: hero select, ordered deploy, catapult, 3 capture zones, 10:00 timer, destructible walls.

## Match flow

```
load island fortress (291 meshes, textures, walls, PG proxies)
    → cinematic (AI voice declaration of war)
    → deploy UX: grudge6 hero → ordered companies/siege → Begin Siege
    → siege: catapult from t=0 · 3 banners · 10:00 · click-move hero
    → ended: all zones / timer / wipe
```

| Phase | What happens |
|-------|----------------|
| **Cinematic** | Camera flyover + herald / lords VO. Skip available. |
| **Deploy** | 1) Pick hero (account char or race) 2) Toggle ordered roster 3) Launch. |
| **Siege** | Catapult hits walls; capture Beach / Gate / Keep; waves; click ground to move hero. |
| **Ended** | Hold all 3 zones, best zones at 10:00, or army wiped. |

Query flags:

| Query | Effect |
|-------|--------|
| `?local=1` | Stream local 517MB GLB |
| `?units=48` | Max concurrent fielded |
| `?deploy=12` | Opening companies per faction |
| `?skip=1` | Skip cinematic → deploy |

## Scene facts (inspected)

| Field | Value |
|-------|------:|
| Nodes | 298 |
| Meshes | 291 |
| Skins | **0** |
| Animations | **0** |
| Materials | 68 |
| Unit proxies (`PG_Mat*`) | **113** |

Italian Maya flatten: `PG_` = personaggi (units), `Mura` walls, `Legno` wood, `Ferro` iron, `Stendardi` banners, `Fire`/`Smoke` VFX.

**There are no skeletons in the GLB.** Active combat:

1. Load full GLB as **static island environment**
2. Material pass (sRGB albedo, terrain/wall roughness) + **water ring** so it reads as an island
3. Record `PG_*` poses → **hide all** → reserve pool
4. Spawn **grudge6** skinned units only when deployed / waved
5. GOAP-lite AI + Mixamo skills + wall HP

## Run (dev)

```bash
npm run dev
npm run dev:client
# http://localhost:5000/war-scene?local=1
# http://localhost:5000/war-scene?local=1&units=48&deploy=10
# http://localhost:5000/war-scene?local=1&skip=1   # skip VO
```

Env: `WAR_SCENE_GLB=D:/path/to/scene.glb`

## Production (required for grudgewarlords.com)

The SPA never uses `/api/local-war-scene` on production (that route is Railway/dev only and 404s on Vercel).

Upload / re-bake production fortress:

```bash
npm run upload:war-scene
# pipeline: gltf-transform optimize (Draco+WebP) → ~23MB → wrangler R2 put
```

Wrangler cannot put the raw ~493 MB Maya dump (300 MiB cap). The script optimizes first; Three.js already loads with DRACOLoader.

Verify:

```bash
curl -sI https://assets.grudge-studio.com/models/war/huge_medieval_battle_scene.glb
# Expect: Content-Type model/gltf-binary, Content-Length ~23e6
# Magic bytes glTF — NOT text/html
```

Live: `https://grudgewarlords.com/war-scene` (CDN path only; no `?local=1` on prod)

## Code map

| Path | Role |
|------|------|
| `shared/definitions/medievalBattleScene.ts` | Classification, archetypes, defaults |
| `client/src/warscene/WarSceneEngine.ts` | Match phases, load, tick |
| `client/src/warscene/WarCinematic.ts` | Declaration script + camera |
| `client/src/warscene/WarVoice.ts` | AI herald/lord TTS (Web Speech) |
| `client/src/warscene/WarDeployment.ts` | Reserve, zones, waves |
| `client/src/warscene/WarIslandDecor.ts` | Water, materials, atmosphere |
| `client/src/warscene/WarUnit.ts` | Skinned unit + anims |
| `client/src/warscene/WarAIBrain.ts` | GOAP-lite goals (incl. siege) |
| `client/src/warscene/WarWallSegment.ts` | Intact/broken HP walls |
| `client/src/warscene/WarProjectileSystem.ts` | Harvest Fire_* → pooled archer arrows |
| `client/src/pages/war-scene.tsx` | `/war-scene` UI |
| `GET /api/local-war-scene` | Streams local GLB |

## Flaming arrows (map cleanup → gameplay)

Maya left `Fire_01_*` / `Fire_02_*` meshes floating mid-air. On load we:

1. **Hide** all static `Fire_*` + `Smoke0*` baked VFX  
2. **Clone** a Fire mesh into an **object pool** (≤48)  
3. Archers fire **ballistic flaming arrows** with additive trail points  
4. **Damage on impact** (not at bow release)

Rapier (`@dimforge/rapier3d-compat`) is already a fleet dep via `PhysicsWorld` for characters/terrain; arrows stay kinematic for high-volume volleys.

## Island / texture best practices

| Practice | Implementation |
|----------|----------------|
| sRGB albedo | `map.colorSpace = SRGBColorSpace` on load |
| Terrain vs wall materials | Roughness/metalness pass by name family |
| Island read | Water disc + foam ring + fog horizon |
| Shadows | Soft PCF + shadow-catch ground |
| Tonemap | ACES Filmic, exposure ~1.08 |
| Anisotropy | Albedo maps anisotropy 8 when present |
| Perf | Field cap (default 64); rest stay in reserve |

Full PBR re-bake of the Maya dump is a separate asset pipeline step (`grudge-convert` / Blender). Runtime pass improves presentation without re-export.

## AI voices

`WarVoice` uses the **Web Speech API** (instant, no key):

- `herald` — declaration lines  
- `crimson_lord` / `azure_lord` — war threats  
- `narrator` — island atmosphere  

Future: swap utterance backend to Puter/Inworld `tts-2` when fleet speech route is live.

## Deployment model (vs “all units on map”)

```
113 PG proxies
  ├── all hidden at start
  ├── deploy commit → ~10/faction animated (zones)
  └── siege waves → +6 every ~28s until reserve empty / field cap
```

## AI goals

| Goal | When |
|------|------|
| hold | No enemy in aggro / defend spawn |
| chase | Hostile in aggro |
| attack | In weapon range |
| flank | Melee circle |
| siege | Attack intact wall when no unit target |
| flee | HP low / archer too close |

## Destructible walls

1. **Intact** — larger mesh, visible, AABB collider, HP  
2. **Broken** — nearby rubble, hidden until breach  

HP → 0: shake + fade (~0.85s) → reveal rubble → drop collider.
