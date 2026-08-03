# Warlords Production Deployment Flow

**Canonical player journey SSOT (hosts + loops):** [GAME_FLOW_SSOT.md](./GAME_FLOW_SSOT.md)  
**Code SSOT:** `shared/definitions/warlordsProductionFlow.ts`  
**Short happy path:** [HAPPY_PATH.md](./HAPPY_PATH.md)

## Hosts (do not confuse)

| Host | Role |
|------|------|
| `id.grudge-studio.com` | Login only |
| `character.grudge-studio.com` | Foundry create + 4-slot heroes — **not** 3D play |
| `client.grudge-studio.com` | **Canonical play runtime** |
| `grudgewarlords.com` | Same SPA as client (product alias) |
| `grudgewarlords.com/craft/` | **Canonical craft suite** (inventory, recipes, item DB) |
| `grudge-studio.com` | Studio portal — not login, not play SSOT |
| `grudge-crafting.puter.site` | **Legacy redirect** → `grudgewarlords.com/craft/` |

## Pipeline (happy path 2026)

```
Sign in (id.*)
    ↓
Create / pick hero (character.*/foundry or /)
    ↓
/airship?characterId=&from=gcs   (client.* handoff)
    ↓
/home-island                     (immediate — no level-20 gate)
    ↓
/world-map  ·  /play?mode=zone&sector=haven_shore&…
    ↓
/tutorial                        (optional side path)
```

**Entry marketing:** https://grudgewarlords.com or product landings → same SPA as client.

## Level gates (code)

| Destination | Min level |
|-------------|-----------|
| Home island, open world, world map, tutorial | **0 / 1** after first hero (`WARLORDS_HOME_ISLAND_MIN_LEVEL = 1`) |
| ~~Home island only at 20~~ | **Superseded** — do not reintroduce in new docs |

Foundry may still **create heroes at level 20** for content unlocks; that is not a home-island entry gate.

## Local flags

| Key | Meaning |
|-----|---------|
| `warlords_opening_seen_v1` | Opening scene finished |
| `warlords_airship_seen_v1` | Airship handoff seen |
| `warlords_tutorial_complete_v1` | Tutorial finished |

## Related

- Full host matrix + anti-patterns: [GAME_FLOW_SSOT.md](./GAME_FLOW_SSOT.md)
- Identity: [CANONICAL_IDENTITY.md](./CANONICAL_IDENTITY.md)
- Character create redirect: `/create-character` → Foundry → client `/airship` or `/home-island`
- Ops zone map: https://info.grudge-studio.com/WORLD_MAP.html → Play deep-links to **client.***
