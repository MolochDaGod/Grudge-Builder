# Grudge Lore Books

Shared static design system: `/assets/grudge-static-system.css`  
Fonts: Cinzel (display) · Source Serif 4 (body) · Jost (UI)  
Tailwind CDN with `tome.*` theme tokens on the Black Tome page.

| Page | Path |
|------|------|
| **Lore hub** | `/lore/` · `/lore/index.html` |
| **Tome of Seasons and Gods** | `/lore/tome-of-seasons-and-gods.html` |
| Hero Codex | `/hero-codex/` |
| Hotkeys | `/hotkeys.html` |

## Calendar (Black Tome SSOT)

| Unit | Game | Real |
|------|------|------|
| Day | 6 bells | **6 hours** |
| Week | 8 gods' days | **2 days** |
| Season | **96 days** (12 weeks) | 24 days |
| Year | **384 days** (4 seasons) | 96 days |

Gods' days: Oathday · Gravesday · Forge Day · Tide Day · Balance Day · Ashday · Skywatch · Night's End  

Bells: Dawn · Rise · Heat · Ash · Dusk · Night  

Seasons: Dawnfall Spring · Iron Sun Summer · Hollow Harvest Autumn · Black Frost Winter

## Visual system

- **Looks:** Illuminated black tome — void backdrop, gold chrome nav, parchment content, faction-accent cards
- **Images:** faction emblems, event art, season plates, map / main-menu hero bands
- **Animations:** chapter fade-up, staggered cards, live bell highlight, pulse sigils (`prefers-reduced-motion` respected)
- **Tailwind:** CDN + extended `fontFamily` / `colors.tome` / keyframes on the tome page

Production clock: `shared/definitions/gameClock.ts`
