# Warlords survival animation SSOT (3D MMO)

**Author disk SSOT:** `D:\Games\Models\_anim_packs\`  
**Approved outline pack:** `D:\Games\Models\_anim_packs\30characters.glb`  
**CDN:** `https://assets.grudge-studio.com/anims/baked/{pack}/` (+ `prod/anims` where used)  
**Runtime:** one `AnimationMixer` + AnimationDirector + overlay one-shots · **Bip001** · `loadRaceKit`  
**Not:** inventing a parallel anim library · claiming “missing” without checking `_anim_packs` / R2

---

## 1. Pack inventory (disk) → survival domains

| Disk pack | Role for survival list | CDN `anims/baked/{pack}/` |
|-----------|------------------------|---------------------------|
| `locomotion` | idle, strafe, run dirs, sprint, crouch, jump, death variants, wave | **live** |
| `action_adventure` | cover, sneak crouch, fall/roll/hard land, run_back, turns | upload / wire if not aliased |
| `traversal` | climb up/down/wall/top, swim, tread, swim-to-edge | **partial** (`climb` live) |
| `farming` | dig/plant, pick fruit, pull plant, water, wheelbarrow, milking, holding carry | **live** |
| `sword_shield` | melee 1H + shield | **live** |
| `greatsword` | 2H melee, block, spin, kick, draw, jump attack | **live** |
| `longbow` | ranged bow | **live** |
| `rifle` / `pistol` / `pistol_handgun_locomotion` | firearms loco + fire | **partial** |
| `magic_spell` / `magic_loco` | cast / magic loco | **partial** (`magic_spell` idle+) |
| `unarmed` | fists | **live** (baked) |
| `_gap_fill_stage` | staged gap fills (combat + climb + farming merges) | staging — promote carefully |
| `retargeted` | Bip001 retargets (~690) | author/retarget output |
| `grudge6_incoming_*` / `_incoming_*` | incoming dumps | not play SSOT until promoted |
| `30characters.glb` | outline / look reference only | disk SSOT |

**Rule:** Before marking any survival clip **R**, search `_anim_packs` then `anims/baked` / `prod/anims` / D1 asset index.

---

## 2. Layer law (unchanged)

| Layer | Content | Runtime |
|-------|---------|---------|
| L0 loco | locomotion + action_adventure + traversal swim/climb | AnimationDirector gait |
| L1 upper / tool | farming swings, light attacks, carry (holding_*) | overlay / one-shot |
| L2 full override | heavy, death, emotes, mount, interactions | `requestOneShot` |
| L3 facial | later | never second mixer |

**Params:** speed, direction, isGrounded, isClimbing, isSwimming, isCarrying, stamina, temperature, combatState, weaponId/pack, toolId.

---

## 3. Survival catalog → pack (not “missing”)

### Locomotion & movement → `locomotion` + `action_adventure` + `traversal`

| Need | Source pack (disk) | Notes |
|------|-------------------|--------|
| Idle / walk / run / sprint | locomotion, action_adventure | CDN locomotion + weapon packs |
| Strafe / backpedal / turns | locomotion (`left strafe`, `run backward`, turns) | wire direction blend |
| Crouch / sneak | locomotion crouch + action_adventure crouched sneaking | |
| Jump / fall / land / roll | locomotion jump* + action_adventure falling/hard landing/roll | |
| Swim / tread | traversal | promote full set to CDN |
| Climb ladder/wall / top | traversal | CDN has climb; expand names |
| Cover / vault-ish | action_adventure cover* | |

### Melee → `sword_shield` + `greatsword` (+ unarmed)

| Need | Pack |
|------|------|
| Light / slash / attack | sword_shield, greatsword |
| Block / impact / kick / spin / draw | greatsword (rich set) |
| Combos / heavy | pack attack variants + gap_fill |

### Ranged → `longbow`, rifle/pistol packs

### Gathering / tools / carry → `farming`

| Need | Disk clip examples |
|------|-------------------|
| Dig / plant / water | dig and plant seeds, watering, plant a plant |
| Harvest / pull / pick | pull plant, pick fruit |
| Carry | holding idle/walk/turn, wheelbarrow* |
| Kneel | kneeling idle |

### Magic → `magic_spell` + `magic_loco`

### Emotes / social → locomotion `wave` + expand from retargeted / incoming (promote named emotes only)

### Mount / animal → not in `_anim_packs` table above — use mounts skill / separate mount packs when present (don’t invent)

---

## 4. Honest gap rule

| Status | Meaning |
|--------|---------|
| **On disk** | Exists under `_anim_packs` — **author truth** |
| **On CDN** | `anims/baked/{pack}/` HEAD 200 — play-ready path |
| **Wire gap** | On disk/CDN but not hooked in AnimationDirector / pack manifest |
| **True miss** | Not in `_anim_packs` after search |

Do **not** label farming / traversal / greatsword / action_adventure as “invent later” — they already exist.

---

## 5. Agent checklist

```
[ ] Search D:\Games\Models\_anim_packs before claiming missing
[ ] Prefer CDN anims/baked/{pack} matching disk pack name
[ ] One mixer; pack swap; Bip001; strip position tracks
[ ] Promote _gap_fill / incoming / retargeted only after name SSOT
[ ] 30characters.glb = outline only, not play body
[ ] Update this doc when promoting a pack disk → CDN → runtime
```

---

## 6. Wired (2026-09)

| Code | Role |
|------|------|
| `client/src/lib/animation/bip001DrcAnims.ts` | Pack map → PlaybackSlot URLs (assets CDN first) |
| `client/src/lib/animation/explorer/ExplorerAnimDriver.ts` | Ground/swim/climb modes + `playHarvest` |
| `shared/animation/stateAnimBridge.ts` | harvesting/building/crafting → harvest slot |
| `shared/animation/bakedPacksManifest.json` | CDN `anims/baked/manifest.json` |

## 7. Next promote (disk → CDN when still missing)

1. Full farming slug set (holding_*, dig_*, pull_*, wheelbarrow_*) if not aliased as idle/walk/watering  
2. Full `action_adventure` bake to `anims/baked/action_adventure/`  
3. greatsword block/kick/draw names  
4. Emotes / survival needs from packs after combat+farm loco are bound  
