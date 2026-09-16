# Leviathan Ocean → Shipwreck Tutorial Cinema (v26 · rogue wave)

**Surface:** `https://client.grudge-studio.com/island-3d`  
**Engine:** `client/src/island3d/intro/LeviathanOceanCinema.ts`  
**Gate:** `StormShipIntroGate.tsx` (native canvas — **no TI iframe / no intro.mp4**)  
**Stage SSOT:** `shared/definitions/leviathanCinemaStage.ts`  
**Battle script:** `client/src/island3d/intro/LeviathanBattleScript.ts`  
**Spine IK:** `client/src/island3d/intro/CinemaSpineIk.ts`  
**Film post:** `island3d/render/PostProcessing.ts` (bloom · SMAA · grade · vignette)  
**Box3 SI:** `intro/CinemaBoxSystems.ts` (`?box3=1` helpers)  
**Session key:** `grudge_shipwreck_intro_seen_v26`

## Architecture (scripted battle)

1. **Positional UUIDs** — every pin (deck, levi path, cam eye/look, IK target, VFX) has a stable UUID in `CIN_UUID` / `LEVIATHAN_STAGE_LOCATIONS`.
2. **Stage graph** — `CinemaStageGraph` builds empties named by UUID; actors snap *to* empties (no free-float XYZ in ticks).
3. **Battle script** — `LEVIATHAN_BATTLE_SCRIPT` assigns per beat: `at` location, `lookAt` IK target, anim, timeScale, VFX flags.
4. **Spine IK** — after `AnimationMixer.update`, `CinemaSpineIk` aims Bip001 Spine→Head at look targets (clamped yaw/pitch).
5. **Multi-cam** — sole camera owner via `MultiCameraDirector` (`setTarget` / `followTo` / `impact` / `evaluate`).

## Helper inventory (do not invent parallel APIs)

| Module | Owns | Required API |
|--------|------|----------------|
| `CinemaAnimDirector` | Mixer, fuzzy clips, rematch Bip001 | `play` · `getOrCreateAction` · `setActionWeight` · **`setActionTime`** · `setActionTimeScale` · `setCurrentName` · `seekTime` · `addClips` · `update` |
| `MultiCameraDirector` | Virtual multi-cam blend | `setTarget` · **`followTo`** (ship-link, no blend restart) · `impact` · `setBlendSpeed` · `update` · `evaluate(handheld, timeSec?)` |
| `LeviathanAnimController` | Levi swim/charge/roar | Uses director helpers above for charge scrub |
| `CinemaDeckMages` | **`DECK_MAGE_SPECS` + `castHintsForVariant` only** | Runtime plant/tick stays in `LeviathanOceanCinema` (no dual mixer class in prod) |
| `CinemaSceneAudio` | Beat BGM/SFX | `start` · `onBeat` · `tick` · `setMuted` · `dispose` |
| `CinemaCastingSfx` | Leviathan WAV pack (was stuck on casting.*) | `play` · `impact` · `setBurning` · `prefetch` |
| `cinemaVfxUtils` | Rain / lightning | Soft-fail optional GLBs |

### Historical missing-helper crashes (fixed)

| Call site | Missing method | Symptom |
|-----------|----------------|---------|
| `LeviathanAnimController` | `setActionWeight` | tick error / T-pose weight fight |
| `refreshShipLinkedCamera` | `followTo` | tick loop dead every frame |
| `LeviathanAnimController.charge` | `setActionTime` | charge maw scrub no-op / silent fail if strict |

## Surfaces (do not mix)

| Surface | Engine | Video / TI? |
|---------|--------|-------------|
| **`/leviathan-cinema`** | `LeviathanOceanCinema` page | **CANONICAL** first-voyage entry |
| `/shipwreck-cinema` | Soft-redirect → `/leviathan-cinema` | Legacy bookmarks only |
| `/island-3d?intro=1` | `StormShipIntroGate` → `LeviathanOceanCinema` | Same engine, not primary product entry |
| `/homeisland` End Game | `AbandonShipIntroGate` | TI/storyboard (separate product) |
| `/island` legacy | `IslandCutscene` + `warlordsIntro` mp4 | **Legacy only** — not island-3d opener |

## Cast

| Actor | Stage UUID keys | Asset / SI |
|-------|-----------------|------------|
| Leviathan | `levi_swim_*` … `levi_breach` … | `/models/cinema/leviathan.glb` · ~90 m LOA |
| Mage 0–3 | `deck_mage_0` … `deck_mage_3` | ORC kit · **~2.2 m** |
| Hero (throw) | `deck_hero` → rogue-wave crest → throw path | unarmed · 1.8 m |
| Rogue wave | `CinemaRogueWave` wall | crash at ~38.6 s · hull pinata + ride |
| Ship | `ship_origin` | tz-pirate · ~36 m LOA |

## Audio (cinema WAV pack)

Magic/combat stems live **on the cinema origin**, not only on Casting Lab.

| Role | File | Beat |
|------|------|------|
| `cast_ramp` | `/audio/sfx/cast-ramp.wav` | deck mage channel, dragon charge/snap |
| `cast_chant` | `/audio/sfx/cast-chant.wav` | ice snake, blizzard, hull pinata |
| `parry_magic` | `/audio/sfx/parry-magic.wav` | wards, shield bounce, shatter |
| `impact_magic` | `/audio/sfx/impact-magic-a\|b\|c.wav` | beam, pinata, ice hits |
| `burn` | `/audio/sfx/burn.wav` (loop) | fire beam / hull fire |
| `parry` | `/audio/sfx/parry.wav` | mage flee |

Player: `CinemaCastingSfx` — same-origin first, then `https://casting.grudge.studio/audio/sfx` (CORS *).  
Do **not** use `assets.grudge-studio.com/audio/casting/sfx` (truncated ~44 KB, incomplete).  
Casting Lab still keeps its own copy for lab gameplay.

## QA

```
https://client.grudge-studio.com/leviathan-cinema?characterId=…&from=home
https://client.grudge-studio.com/island-3d?intro=1
# legacy (redirects): /shipwreck-cinema?characterId=…
http://127.0.0.1:5173/leviathan-cinema
# seek combat: ?seek=29
# SI helpers: ?box3=1
```

## Kill list

- TI iframe / Stonewisp / intro.mp4 as primary island-3d gate  
- Dual WebGL contexts (defer Island3D until intro ends)  
- Parallel `CinemaDeckMages` class owning production mixers  
- Capsule-only cast when CDN available  
- Free-float positions outside stage UUIDs  
- Mixer after IK (order: mixer → spine IK → camera)  
- OrbitControls writing camera during cinema  
- Calling helper methods that do not exist on `CinemaAnimDirector` / `MultiCameraDirector`  

## Audit notes (v23)

- Optional cinema GLBs (`ward-shield`, `fish-particle`, `ocean-floor`, …) soft-fail via `loadFirst` — not hard crashes.  
- Guest `/api/*` 401s are expected without Grudge ID session.  
- `Refused to set unsafe header Origin` = browser/Puter interceptor noise.  
- Version chrome + docs aligned to **v23** (was stale v9/v10 labels).
