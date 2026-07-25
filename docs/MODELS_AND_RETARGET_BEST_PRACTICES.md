# Models & retarget best practices (in-game)

**Updated:** 2026-07-25  
**Law:** One CDN, one skeleton family per kit, rotation-only packs on grounded heroes.

## 1. World frame (never re-argue)

| Concept | Value |
|---------|--------|
| Up | **+Y** |
| Ground | **XZ plane**, feet at `y = groundY` |
| Units | **1 = 1 m** |
| Human yardstick | **1.8 m** average adult |
| Art-forward | local **+Z** when body yaw = 0 |
| grudge6 FBX forward | often **+X** → add **+π/2** yaw once |

## 2. Character deploy order (mandatory)

```
1. Load race KIT (FBX SSOT or approved GLB)
2. unifySkeletons
3. fitCharacterHeight(~1.8 m) — skinned body only
4. Materials / race atlas
5. Equip mesh_ids (never swap whole body for gear)
6. reGroundAfterEquip
7. applyArtForwardPlusZ when needed
8. centerXZOnPelvis (Bip001 Pelvis) — NOT full prop bbox
9. groundFeetLocal from bodyBox.min.y  — NEVER pelvis.y = 0 as feet
10. Load anim pack (rotation-only) → requestOneShot for attacks
11. Sample once → re-ground feet
```

### Y hip (hip-float ban)

- **Cause:** `.position` tracks on hips/root after idle/attack play, or grounding by pelvis world Y.
- **Bake:** strip all position tracks → **quaternion-only** JSON under `/anims/baked/{pack}/`.
- **Runtime:** `loadBakedAnimationClip` keeps quat tracks; re-ground after sample.

### XZ center

- Center on **Bip001 Pelvis** (or Hips on Mixamo), not multipack AABB.
- Controller owns root motion on XZ; clips do not drift the mesh sideways.

## 3. Naming conventions

| Layer | Pattern | Example |
|-------|---------|---------|
| Source art clip | vendor names OK | `1Attack`, `2Combo_1` |
| Baked fleet key | `{weapon}_{theme}_{role}` | `gs_samurai_combo_a` |
| Pack folder | snake_case | `greatsword_samurai/` |
| Bone after bake | Bip001 underscores | `Bip001_Pelvis`, `Bip001_R_Hand` |
| CDN key | mirror local path | `anims/baked/greatsword_samurai/gs_samurai_idle.json` |
| R2 bucket | `grudge-assets` | `https://assets.grudge-studio.com/...` |

**Never** bind combat UI / hotbar to raw vendor clip names. Always fleet keys.

## 4. Samurai greatsword pack (reference)

| Field | Value |
|-------|--------|
| Source | `sworattackssamurai.glb` (Core_01 skeleton) |
| Target | Bip001 grudge6 |
| Baked | `/anims/baked/greatsword_samurai/*.json` |
| CDN | `https://assets.grudge-studio.com/anims/baked/greatsword_samurai/` |
| SSOT code | `shared/definitions/greatswordSamuraiCombat.ts` |
| Client load | `client/src/game/toon/greatswordSamuraiOverride.ts` |
| Combat | `weaponSkillCombatCatalog` + `TWO_HAND_TO_SAMURAI_ANIM` |

### Hotbar slots

| Slot | Skill id | Clip | Movement |
|------|----------|------|----------|
| 1 | `gs_samurai_cleave_combo` | combo_a → combo_b | none |
| 2 | `gs_samurai_teleport_strike` | teleport_strike | teleport |
| 3 | `gs_samurai_dash_opener` | dash_opener | dash |
| 4 | `gs_flaming_fissure` | `magic_cast` | none + fire fissure VFX |

### Bone map (Core_01 → Bip001)

See `SAMURAI_TO_BIP001_BONES` in `greatswordSamuraiCombat.ts` (Pelvis/Spine/Arms/Legs).

## 5. Non-character models (props, buildings, weapons)

| Kind | Fit to 1.8 m? | Notes |
|------|---------------|--------|
| character | yes | human yardstick |
| weapon / arrow | **never** | category scale |
| building / fortress | no | SI relative to human |
| multipack | extract **named node** | never spawn whole multipack root |

Ingest layers live under `public/models/warlords/ingest/{layer}/` with `_layer.json` + registry. Upload priority: combat anims, weapons, rocks, fortress (under size caps); multipacks deferred for mesh isolation.

## 6. Upload & deploy

```powershell
# Always cwd writable (NOT Program Files). WRANGLER_HOME to user profile.
$env:WRANGLER_HOME = "C:\Users\nugye\.wrangler"
$env:XDG_CACHE_HOME = "C:\Users\nugye\.cache"
Set-Location F:\GitHub\GrudgeBuilder

npx wrangler r2 object put "grudge-assets/anims/baked/greatsword_samurai/manifest.json" `
  --file="client/public/anims/baked/greatsword_samurai/manifest.json" --remote
```

Verify:

```powershell
Invoke-WebRequest -Method Head -Uri "https://assets.grudge-studio.com/anims/baked/greatsword_samurai/manifest.json"
```

Deploy app code (Vercel/Railway) after manifest + catalog edits. Binary-only R2 puts do not need app redeploy if same-origin already ships `public/anims/baked`.

## 7. Anti-patterns (reject)

| Bad | Good |
|-----|------|
| Pelvis Y = 0 as feet | feet from body bbox min.y |
| Position tracks on grounded kit | rotation-only bake |
| mixamorig tracks on Bip001 kit | bake to Bip001 names |
| Fit weapons to 1.8 m | category scale |
| Raw `1Attack` in hotbar | `gs_samurai_dash_opener` |
| Wrangler from Program Files cwd | cwd `F:\GitHub\GrudgeBuilder` + `WRANGLER_HOME` |

## Sibling docs

- [WARLORDS_ASSET_SSOT.md](./WARLORDS_ASSET_SSOT.md) — CDN / resolve
- [ANIMATIONS.md](./ANIMATIONS.md) — VFX / spell sprites
- Skills: `grudge-character-correctness`, `grudge-animation`, `grudge6-combat-runtime`
