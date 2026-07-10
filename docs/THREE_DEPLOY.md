# Three.js Deploy Path (canonical)

**Primary play surface for Grudge Warlords / Steam 2707990 content.**

Code SSOT: `shared/fleet/gameDeployments.ts`  
Engine: `client/src/island3d/` (`Island3DEngine`)  
Race cities: `shared/definitions/raceCities.ts`  
Auth: `id.grudge-studio.com` · State: Railway `grudge-api` · Realtime: Colyseus on same Railway

---

## Ordered path

| Step | Mode | URL | Engine |
|------|------|-----|--------|
| 1 | Tutorial | `/tutorial` | Island3D 3-state HUD |
| 2 | **Home island** | `/home-island` | **1024 m** procedural + Railway seed |
| 3 | **World map** | `/world-map` | Unity-style hub: **6 race cities** + sail canvas |
| 4 | **Open world** | `/play?sector=…&mode=zone&worldSeed=grudge-world-1&city=…` | Zone: race capital + harvest + dungeon portals + Colyseus |
| 5 | Ocean sail | `/ocean?worldSeed=grudge-world-1` | Lands back into `/play` |
| 6 | Sail satellite | `water.grudge-studio.com` | External |
| 7 | PvP lobby | `/rts-grudge` | Separate map family |

**Play Now** (has hero) → step **2** home island.  
**World Map** → step **3** pick a race capital.  
**Open World** → step **4** Haven Port (human capital) by default.

Constants:

```ts
THREE_HOME_ISLAND_PATH  // /home-island
THREE_WORLD_MAP_PATH    // /world-map
THREE_OPEN_WORLD_PATH   // /play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port
THREE_PORT_PLAY_URL     // grudge-three-port satellite
threePlayNowPath()      // default Play Now destination
threeOpenWorldUrl({ sector, city, worldSeed })
raceCityPlayUrl(city)   // from shared/definitions/raceCities.ts
```

---

## Unity world content (zone mode)

What ships with each sector land:

| Layer | Source | In Three zone |
|-------|--------|----------------|
| **6 race capitals** | `RACE_CITIES` | Plaza + optional faction town compose + capital GLB |
| **Harvestables** | `zoneServerNodes` + `spawnZoneHarvestNodes` | Trees, rocks, crystals, hemp, flowers, scrap |
| **Dungeon portals** | `dungeon_entrance` nodes | `CavePortal3D` · Press E → `/dungeon` tiled |
| **Faction camps** | `NpcCampSystem` | Ally / enemy camps |
| **Wildlife** | `CreatureManager` | Biome palette |
| **9 macro sectors** | `WORLD_SECTORS` / `worldMapSectors` | Haven Shore … Ember Depths |

### Race capitals

| Race | City | Sector | Showcase dungeon |
|------|------|--------|------------------|
| Human | Haven Port | `haven_shore` | Pirate's Crypt |
| Dwarf | Runeforge Hold | `frostbite_expanse` | Glacial Depths |
| Elf | Starweave Canopy | `thornwood_wilds` | Thornwood Labyrinth |
| Orc | The Pit Foundry | `ember_depths` | Magma Core |
| Undead | Drowned Sepulcher | `abyssal_trench` | Drowned Cathedral |
| Demon | Ashen Throne | `ashen_wastes` | Sunken Tomb |

World map UI: left panel on `/world-map` → **Enter {city}** uses `raceCityPlayUrl`.

---

## Production hosts

| Host | Role |
|------|------|
| https://grudgewarlords.com | Primary Vercel SPA (this path) |
| https://client.grudge-studio.com | Alias SPA |
| https://grudge-three-port.vercel.app | Lightweight sector client (alt) |
| https://rts-grudge.vercel.app | RTS/PvP satellite |

---

## What deploys with “Three path”

| Layer | Deploy target |
|-------|----------------|
| Client GL + HUD | Vercel (`main` → grudgewarlords.com) |
| Island seeds / progress | Railway Postgres `home_islands` |
| Sector multiplayer | Colyseus rooms on Railway |
| GLB / anim / nature | `assets.grudge-studio.com` R2 |
| Definitions | ObjectStore `/api/v1/*` |
| Steam 2707990 | Shell around this client (`docs/STEAM.md`) |

---

## Deploy commands

```bash
# From GrudgeBuilder — client goes live via Vercel on push to main
git push origin main

# Optional: force Vercel
# npx vercel --prod

# Game API / Colyseus (if server changes)
# GitHub Actions → railway-deploy.yml
```

Smoke:

```bash
curl -sI https://grudgewarlords.com/home-island
curl -sI https://grudgewarlords.com/world-map
curl -sI "https://grudgewarlords.com/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port"
curl -s https://grudge-api-production-0d46.up.railway.app/api/island/spec | head
```

---

## Character scale / idle

Heroes must be **~2 m**, feet on terrain, Mixamo idle (not T-pose).  
See `fitCharacterRootToHeightM` in `client/src/island3d/zoneWorldScale.ts`.

---

## Do not mix

| Wrong | Right |
|-------|--------|
| Home-block cell IDs as Warlords sector IDs | `map-registry` families |
| D1 as island SSOT | Railway `home_islands` |
| Second Steam-only character DB | Same JWT + Railway account |
| Only Haven Shore as “the world” | 6 race cities + 9 sectors + harvest + dungeons |
