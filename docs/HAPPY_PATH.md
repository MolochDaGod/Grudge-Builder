# Warlords Happy Path (2026-07)

## Surface roles

| Surface | URL | Owns |
|---------|-----|------|
| **Ops / zone test frontend** | https://info.grudge-studio.com/WORLD_MAP.html | 3×3 sectors, lore, assets, health, Play deep-links |
| **3D runtime** | https://client.grudge-studio.com | Island3DEngine: airship, home-island, play, tutorial |
| **Character create** | https://character.grudge-studio.com | Foundry create only → handoff |
| **Sail satellite** | https://water.grudge-studio.com | Ocean/captain — not sector intro iframe |

**client `/home` is deprecated.** It redirects to `/airship`. Use `?ops=1` for info WORLD_MAP, `?legacy=1` for old multi-CTA stub.

## Player journey

```
Sign in → Foundry create → /airship?from=gcs
  → /home-island (immediate, no level 20)
  → /world-map or info WORLD_MAP
  → /play?mode=zone&sector=…&worldSeed=grudge-world-1&skipIntro=1
```

Tutorial shipwreck (`/tutorial`) is **optional**.

## Play deep-link contract (info WORLD_MAP)

```
https://client.grudge-studio.com/play?mode=zone&sector={id}&worldSeed=grudge-world-1&skipIntro=1&from=info-world-map
https://client.grudge-studio.com/island-3d?mode=zone&sector={id}&worldSeed=grudge-world-1&skipIntro=1&from=info-world-map
https://client.grudge-studio.com/home-island?characterId={id}&from=info-world-map
```

- **Default for ops Play:** always `skipIntro=1` (no TI storm iframe).
- **Force storm intro (QA only):** `?intro=1` or `?intro=storm`.

## Map families (do not mix)

See [WORLD_MAP_TRUTH.md](./WORLD_MAP_TRUTH.md):

1. **warlords_era_open_world** — 9 sectors (`haven_shore`, `convergence_nexus`, …)
2. **player_home_block** — personal home island
3. Pirate lobby / RTS — separate product modes

## Code SSOT

- Flow: `shared/definitions/warlordsProductionFlow.ts`
- Intro defaults: `shared/definitions/productionIntro.ts` (`playStormIntro: false`)
- Handoff: `client/src/lib/gcsRedirect.ts`, `characterHandoff.ts`
- Home island page: no level gate (`pages/home-island.tsx`)

## Cinema (next phase)

Zone land-in must not iframe `water.grudge-studio.com/intro`.  
Native Three cinema catalog (Open ProductionCinema pattern) is the target overhaul.
