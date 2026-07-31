# Leviathan Ocean → Shipwreck Tutorial Cinema (v8)

**Surface:** `https://client.grudge-studio.com/island-3d`  
**Engine:** `client/src/island3d/intro/LeviathanOceanCinema.ts`  
**Gate:** `StormShipIntroGate.tsx` (native canvas — **no TI iframe**)  
**Stage SSOT:** `shared/definitions/leviathanCinemaStage.ts`  
**Battle script:** `client/src/island3d/intro/LeviathanBattleScript.ts`  
**Spine IK:** `client/src/island3d/intro/CinemaSpineIk.ts`  
**Session key:** `grudge_shipwreck_intro_seen_v8`

## Architecture (scripted battle best practices)

1. **Positional UUIDs** — every pin (deck, levi path, cam eye/look, IK target, VFX) has a stable UUID in `CIN_UUID` / `LEVIATHAN_STAGE_LOCATIONS`.
2. **Stage graph** — `CinemaStageGraph` builds empties named by UUID; actors snap *to* empties (no free-float XYZ in ticks).
3. **Battle script** — `LEVIATHAN_BATTLE_SCRIPT` assigns per beat: `at` location, `lookAt` IK target, anim, timeScale, VFX flags.
4. **Spine IK** — after `AnimationMixer.update`, `CinemaSpineIk` aims Bip001 Spine→Head at look targets (clamped yaw/pitch).
5. **Multi-cam** — only `camEye` / `camLook` UUIDs drive the lens (camera sole owner).

## Cast

| Actor | Stage UUID keys | Asset |
|-------|-----------------|-------|
| Leviathan | `levi_swim_*` … `levi_breach` … | `/models/cinema/leviathan.glb` |
| Mage 0–3 | `deck_mage_0` … `deck_mage_3` | WK mage → `WK_Characters.glb` |
| Hero (throw) | `deck_hero` → `throw_apex` → `throw_end` | `WK_Characters.glb` unarmed |
| Ship | `ship_origin` | CDN pirate ship |

## Beat table (~56 s)

| t | id | Levi at | Hero | IK focus |
|--:|----|---------|------|----------|
| 0 | establish | swim_a | deck | mages → levi head |
| 3.5 | shadow | swim_b | deck | under cam |
| 7 | wards | swim_b | brace | cast + rings |
| 11 | surface | surface | brace | defend mouth |
| 15 | cast_storm | cast | brace | attack |
| 18.5 | roar_beam | beam | brace | **roar 0.42×** |
| 24 | dive | dive | brace | shield defeat |
| 27.5 | rise | rise | brace | attack 0.85× |
| 31 | breach | breach | throw | pinata |
| 35.5 | twenty_meters | watch | air / throw_end | **20 m** |
| 40 | finisher | finisher | sink | attack |
| 44–52 | black / logo / handoff | gone | hidden | logo |

## QA

```
http://127.0.0.1:5173/island-3d?intro=1
http://127.0.0.1:5173/island-3d?intro=shipwreck
# after skip/complete:
/tutorial?from=shipwreck-intro
```

## Kill list

- TI iframe / Stonewisp / intro.mp4 as primary  
- Capsule-only cast when CDN available  
- Free-float positions outside stage UUIDs  
- Mixer after IK (order must be: mixer → spine IK)  
- Orbit during cinema  
