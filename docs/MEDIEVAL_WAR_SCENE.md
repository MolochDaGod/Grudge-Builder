# Medieval War Scene

Turn `huge_medieval_battle_scene.glb` (~517 MB static fortress) into a **live war**.

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

**There are no skeletons in the GLB.** Active combat is achieved by:

1. Loading the full GLB as **static environment**
2. Recording world poses of every `PG_*` mesh
3. Hiding those proxies
4. Spawning **grudge6 race GLBs** (skinned) with Mixamo weapon packs
5. Running **goal-oriented AI** (hold / chase / attack / flank / flee)

## Run (dev)

```bash
# Terminal 1 — API (serves D: GLB)
npm run dev

# Terminal 2 — client
npm run dev:client

# Browser
http://localhost:5000/war-scene?local=1
# or with unit cap:
http://localhost:5000/war-scene?local=1&units=48
```

Env override: `WAR_SCENE_GLB=D:/path/to/scene.glb`

## Production

Upload once:

```bash
# ~517MB — use wrangler / upload-warlords pattern
wrangler r2 object put grudge-assets/models/war/huge_medieval_battle_scene.glb \
  --file="D:/Games/grudge-game-engine/huge_medieval_battle_scene.glb" \
  --content-type=model/gltf-binary --remote
```

Then open `/war-scene` (CDN path `/models/war/huge_medieval_battle_scene.glb`).

## Code map

| Path | Role |
|------|------|
| `shared/definitions/medievalBattleScene.ts` | Classification + faction archetypes |
| `client/src/warscene/WarSceneEngine.ts` | Load, classify, spawn, tick |
| `client/src/warscene/WarUnit.ts` | Skinned unit + anims + skills |
| `client/src/warscene/WarAIBrain.ts` | GOAP-lite goals |
| `client/src/pages/war-scene.tsx` | `/war-scene` UI |
| `GET /api/local-war-scene` | Streams local GLB |

## AI goals

| Goal | When |
|------|------|
| hold | No enemy in aggro / defend spawn |
| chase | Hostile in aggro radius |
| attack | In weapon range — fire skill |
| flank | Melee circle to side |
| flee | HP &lt; 22% or archer too close |

Weapon skills: slash, cleave, aimed_shot, firebolt, warcry, etc. (archetype table).

## Packages / practices

- `three` GLTFLoader + DRACOLoader  
- `SkeletonUtils` via `loadCharacterModel`  
- grudge6 mesh equip (`setupGrudge6Equipment`)  
- Mixamo anim packs (`getAnimationSet` / `AnimationManager`)  
- Soft shadows, ACES tone map, fog  
- Unit separation steering, ground raycast snap  
- AI goal arbitration ~4 Hz (not every frame for scoring)
