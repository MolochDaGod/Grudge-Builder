# Warlords MMO product — what `grudgewarlords.com` is

**Status:** Product law (confirm with ops).  
**Deploy:** Vercel project **grudge-builder** (team grudgenexus) → apex **`https://grudgewarlords.com`**  
**Code:** this monorepo (GrudgeBuilder) · domains `shared/fleet/warlordsDomains.ts`  
**Related:** [WARLORDS_ACCOUNT_CHARACTER_SSOT.md](./WARLORDS_ACCOUNT_CHARACTER_SSOT.md) (attrs / skills / bag / camps / home-island cNFT) · [GAME_FLOW_SSOT.md](./GAME_FLOW_SSOT.md) · [WARLORDS_DOMAIN_SSOT.md](./WARLORDS_DOMAIN_SSOT.md) · [COMPLETE_WORLD_MAP.md](./COMPLETE_WORLD_MAP.md) · [CNFT_ESCROW_OWNERSHIP.md](./CNFT_ESCROW_OWNERSHIP.md)

---

## One sentence

**`grudgewarlords.com` is the single production deployment of the full Grudge Warlords MMO** — GrudgeBuilder SPA + Railway player SSOT — carrying the best of WCS, island/RTS content, open water & boats, deck walking, Unity-sourced monsters/bosses, weapon skills, professions, home/conquerable islands, 9 sectors, lobbies, tutorial, auto-harvest, claim flags, main panel, lore via info.*, and related gameplay.

It is **not** Mine-Loader / mineloader. Those are the **voxel era** game. Warlords-era characters play **only** on Warlords hosts.

---

## Architecture (unified stack)

| Layer | Source | Role on grudgewarlords.com |
|-------|--------|----------------------------|
| **SPA deploy** | GrudgeBuilder → Vercel `grudge-builder` | All 3D/2D play routes |
| **Shell / craft UX DNA** | WCS (Warlord-Crafting-Suite) | Craft suite `/craft/`, profession/UI patterns |
| **Player API** | Railway `grudge-api-production-0d46` | characters, account, island, wallet, nfts, professions |
| **Realtime** | Colyseus on same Railway HTTP | home island, sector, town rooms |
| **3D systems lineage** | Island3D / RTS-Grudge / tactical ocean / water | terrain, boats, deck, open water, sectors |
| **Assets** | R2 `assets.grudge-studio.com` | grudge6, creatures, weapons, nature, audio |
| **Definitions / lore** | **info.** / objectstore `/api/v1` | recipes, biomes, world map, lore JSON |
| **Create hero** | Foundry `character.grudge-studio.com` | create only → handoff here with `characterId` |
| **Login** | `id.grudge-studio.com` | JWT only |

Legacy alias of the **same SPA:** `client.grudge-studio.com` (prefer `*.grudgewarlords.com` for brand).

---

## In-scope gameplay (product surface)

### Identity & heroes
- Foundry create → Railway `era=warlords` · default ~L20 for home-island unlock  
- 4-slot select · `/heroes` · active `characterId` on every play entry  
- cNFT: **escrow mint non-blocking** (play without chain possession); optional claim later  

### Islands & ownership
- **Home island** (`/home-island`) — personal base, buildings, harvest nodes  
- **Auto-harvest** — profession-weighted AI gather loops  
- **Claim flags / camp claim** — ownership & conquest patterns (`CAMP_CLAIM_*`, conquest systems)  
- **Conquerable islands** — PvE/PvP island contest modes  
- **Tutorial island / shipwreck** (`/tutorial`, shipwreck cinema)  

### World structure
- **9 macro sectors** — Ethereal Falls · Frostbite · Thornwood · Stormbreak · Convergence · Ashen · Abyssal · **Haven Shore** · Ember Depths (`/world-map`, `/ocean`)  
- Open zone land-in: `/play?mode=zone&sector=…`  
- World map sailing / ocean tactical  
- Airship opener / deck posts (`/airship`)  

### Water, boats, deck
- Open water & boat fighting (tactical ocean / water lineage — *Tactical Infinity* content absorbed into Warlords water SPA paths where live, e.g. production water/home patterns)  
- Deck walking (airship cabin → deck, boat decks, dock deck Y rules)  
- Ship / pirate / tower defense systems where shipped on this SPA  

### Combat & content
- Weapon skills (`/weapon-skills`, skill trees, mastery)  
- Unity-sourced / fleet creatures, bosses, traps, skeleton residual  
- Dungeons, boss walkups, combat labs that are product (not pure studio)  
- RTS-adjacent island content (planning, reveal, enemy BT) where merged into client  

### Economy & panel
- Professions (gather + craft T0–T8, five stations) — **XP per character**  
- **Main panel** (`main-panel.tsx`) — hub UX  
- Arsenal, recipes, shop, wallet, exchange  
- **Account bag + resources + claimed camps shared** across all warlords heroes; home island one-per-account with guest hosting — see [WARLORDS_ACCOUNT_CHARACTER_SSOT.md](./WARLORDS_ACCOUNT_CHARACTER_SSOT.md)

### Lore & defs
- **info.grudge-studio.com** — definitions, ops maps, lore/docs surfaces  
- ObjectStore catalogs for items/recipes/biomes  

### Lobbies & social
- Chicken-gun / combat lobby surfaces where present on SPA  
- Open zone lobby modes, town, treaty, mission board  

---

## Explicitly **not** this deploy

| Host / product | Why not “the Warlords MMO SPA” |
|----------------|--------------------------------|
| **mineloader.grudge-studio.com** | Voxel era maps — **separate** playable roster |
| **character.grudge-studio.com** | Create / 4-slot only |
| **forge.grudge-studio.com** | Editor, not player progress |
| **open.grudge-studio.com** | Launcher library — hands off to Warlords with `characterId` |
| **grudge-studio.com** apex | Studio portal / marketing |

---

## Character rule (with Voxel)

| Era | Play host | Body |
|-----|-----------|------|
| **warlords** | **grudgewarlords.com** (this product) | grudge6 |
| **voxel** | mineloader only | explorer / box_hero |

Same account login. **Different heroes.** Warlords characters do **not** play Mine-Loader maps.

---

## Deploy checklist (production)

```
[ ] Vercel grudge-builder production → grudgewarlords.com (+ www)
[ ] Railway grudge-api healthy: /api/health, characters, island, wallet
[ ] Colyseus WS on same Railway (island/sector rooms)
[ ] Foundry create → handoff ?characterId=&from=gcs → /home-island or /play
[ ] info.* + assets CDN green for defs and meshes
[ ] Craft: grudgewarlords.com/craft/ (WCS lineage)
[ ] Optional DNS: play|home|map|airship|scenes.grudgewarlords.com
[ ] Do not require cNFT claim to enter play
```

---

## Agent one-liner

When the user says “the Warlords game” or “the MMO,” they mean **grudgewarlords.com = full GrudgeBuilder production SPA**, not Mine-Loader, not Foundry, not Open alone.
