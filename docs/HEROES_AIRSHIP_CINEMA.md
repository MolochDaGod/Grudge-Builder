# Heroes cinema — airship painting PURGED

**Status (2026-07-28):** The painted airship plate (`/backgrounds/scene_airship.png`) and
`HeroesBlackTideScene` deck/balloon cinema are **removed from product** `/heroes`.

| Surface | Production |
|---------|------------|
| **Route** | `client.grudge-studio.com/heroes` |
| **Scene** | `HeroesSeasideCinemaScene` (sector seaside / treasure cave) |
| **Page** | `client/src/pages/heroes.tsx` |
| **Purged** | `scene_airship.png` CSS plate, “Pirate Airship” title, BlackTide as default |

## Do not reintroduce

- Soft underlay `url(/backgrounds/scene_airship.png)` on heroes
- “The Grudge — Pirate Airship” branding on the roster page
- Airship balloon envelope as the default heroes backdrop

Archive only: `HeroesBlackTideScene.tsx` + `deck/*` (optional demos).

## QA

- [ ] `/heroes` loads seaside/sector cinema (no airship painting visible)
- [ ] 0–4 warlord slots still select + enter play
- [ ] No reference to `scene_airship` in the production heroes bundle path
