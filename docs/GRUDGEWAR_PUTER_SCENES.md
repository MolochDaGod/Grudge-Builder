# GrudgeWar Puter Scenes → Client Port

Canonical skill (agent): `~/.agents/skills/grudgewar-puter-scenes/SKILL.md`  
Source app: https://puter.com/app/grudgewar  
Source repo: `GrudgeWars`

## Quick reference

### Airship / boat (“The Grudge”)
- Plate: `/backgrounds/scene_airship.png`
- Puter: `AirshipScene.jsx` — % deck placement, gold chrome, pirate shop NPCs
- Client: `/heroes` → `HeroesBlackTideScene` — same plate + 4 grudge6 crew stations

| Slot | Station | Role |
|------|---------|------|
| 0 | Helm | At the wheel |
| 1 | Main battery | Large cannons |
| 2 | Fore guns | Smaller cannons |
| 3 | Crow's line | Rope to crow's nest |

### Boss
- `BossWalkupScene`: walk → confront → charging → `startBossBattle`
- Boss larger, higher on plate; hero walks up from bottom
- Quote + Challenge / Retreat

### Characters
- 2D: spriteMap + SpriteAnimation (frame formula, flip, tier overlays)
- 3D: grudge6 GLB + equip + `fitCharacterRootToHeightM` + idle on ship
- 8 WCS attributes only; Foundry for empty slots

See skill for full checklists and anti-patterns.
