# GrudgeWar Puter Scenes → Client Port

Canonical skill (agent): `~/.agents/skills/grudgewar-puter-scenes/SKILL.md`  
Source app: https://puter.com/app/grudgewar  
Source repo: `GrudgeWars`

## Quick reference

### Airship / boat (“The Grudge”) — PURGED from product `/heroes` (2026-07-28)
- Plate: `/backgrounds/scene_airship.png` — **never mount on client heroes**
- Puter archive only: `AirshipScene.jsx`
- Client **was** `HeroesBlackTideScene` — **replaced** by `HeroesSeasideCinemaScene`
- Product `/heroes`: 4-slot warlord roster + seaside sector cinema

### Boss
- Puter: `BossWalkupScene` walk → confront → charging → battle
- **Client:** `/boss-walkup?characterId=&returnTo=/rpg-battle&boss=malachar`
  - Plate: `/backgrounds/lava_boss_walkup.png`
  - grudge6 hero + larger boss race mesh
  - Challenge → rpg-battle; Retreat → /heroes

### Characters
- 2D: spriteMap + SpriteAnimation (frame formula, flip, tier overlays)
- 3D: grudge6 GLB + equip + `fitCharacterRootToHeightM` + idle on roster scene
- 8 WCS attributes only; Foundry for empty slots
- Layers: `client/src/lib/grudgewarSceneLayers.ts`

See skill for full checklists and anti-patterns.
