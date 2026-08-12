# Dock Quest Traveler · scene wiring · liveservers pattern

**Status:** Review SSOT (2026-08) — how Dock Quest maps to live deploy + migration to all new maps / water.  
**Liveservers law:** `Desktop/grudgeproduction/liveservers.html` (Carrier pattern — generalized below).  
**Quest SSOT:** `shared/definitions/travelerTutorialQuest.ts`  
**Scene SSOT:** `shared/definitions/shipwreckScene.ts` + `client/src/island3d/tutorial/ShipwreckSceneRuntime.ts`  
**Flow SSOT:** `shared/definitions/warlordsProductionFlow.ts` · `docs/GAME_FLOW_SSOT.md`

---

## 1. What Dock Quest is

| Field | Value |
|-------|--------|
| **Name** | Dock Quest Traveler |
| **Role** | Tutorial opener on starter boat / shipwreck cove |
| **NPC** | Neutral guide (`TRAVELER_NPC`) — WK human outline / grudge6, not race-locked |
| **Dialogue** | `starter_quest_boat` |
| **Entity pattern** | `{raceId}_quest_traveler_boat` |
| **Steps** | Same chain for all 6 races; only `{island}` / `{commander}` / faction tokens change |
| **Ends** | Craft raft → board → **sail** to faction island → talk commander → **Opener Complete** |

### Step chain (kinds)

```
meet_traveler (dialogue)
  → learn_move
  → gather_basics (harvest)
  → craft_tools
  → equip_tool
  → harvest_node
  → claim_flag
  → first_fight (combat)
  → ui_basics (panels)
  → craft_raft
  → board_raft
  → sail_faction (water)
  → meet_commander   ← Opener Complete
```

Client state: `useTravelerMissions` · keys `warlords_traveler_mission_v1` · complete `warlords_tutorial_complete_v1`.

---

## 2. Liveservers.html → Warlords rule (do not invent a second server)

`liveservers.html` is written for **Carrier**, but the law is fleet-wide:

| Carrier lesson | Warlords Dock Quest / maps |
|----------------|----------------------------|
| **One process, two doors** (HTTP + WS upgrade) | Railway `grudge-api` = REST **and** Colyseus WS — not a rented second game box |
| Path-scoped room (`/api/carrier`) | Colyseus rooms: `tutorial` / `shipwreck` / `sector` / `home_island` / … |
| **Shared sim** client + server | Island3D / sector step + Colyseus room authority (intent in, snapshot out) |
| **Deterministic seed** | `worldSeed` / sector seed / shipwreck cove resolve — same layout for fair tests |
| **Auto protocol** from `location.host` | `colyseusEndpoint.ts` · fleet manifest — no hardcode per env |
| Deploy = one publish | `npm run build` + Vercel SPA **and** Railway API already live |

### Live truth (smoked)

```
Colyseus health: https://grudge-api-production-0d46.up.railway.app/api/colyseus/health
  ok: true · matchMakerReady: true
  rooms: tutorial, shipwreck, lobby, dungeon, sector, world, town, home_island

tutorial/shipwreck notes: SOLO · filterBy characterId · maxClients 1
SPA: https://grudgewarlords.com/tutorial · /world-map · /airship · /home-island
Legacy alias: https://client.grudge-studio.com/tutorial
```

**Do not** stand up a parallel “dock quest server.” Join the room type that already exists.

---

## 3. Player journey (happy path)

```
id.grudge-studio.com (login)
  → character.grudge-studio.com/foundry (create grudge6 hero)
  → grudgewarlords.com/leviathan-cinema  (leviathan opener film; /shipwreck-cinema redirects)
  → /tutorial?from=shipwreck-intro       (Dock Quest + ShipwreckSceneRuntime)
  → complete meet_commander
  → flag warlords_tutorial_complete_v1
  → AFTER_TUTORIAL_PATH (airship / home-island)
  → /world-map · /play?mode=zone&sector=…
  → water / camps / RTS on production maps
```

Code flags: `WARLORDS_FLOW_FLAGS.tutorialComplete` · `markTutorialComplete()` in `warlordsOnboarding.ts`.

---

## 4. Scene creation (shipwreck → template for all maps)

### Layers (same as production-world skill)

```
[Shell GLB on CDN]     looks / height / water volume   e.g. pirate-islands, startingfalls
        +
[Scene def JSON/TS]    zones · nodes · NPCs · prefabs · paths  (shipwreckScene.ts)
        +
[Seed / cove resolve]  deterministic pins  (resolveShipwreckCove)
        +
[Runtime]              Island3DEngine + ShipwreckSceneRuntime + harvest + traveler
        =
 PLAYABLE TUTORIAL MAP
```

| Piece | Path |
|-------|------|
| Scene graph SSOT | `shared/definitions/shipwreckScene.ts` |
| Runtime | `ShipwreckSceneRuntime.ts` (zones, harvest, NPCs, pathfinder, gizmo, export JSON) |
| Traveler spawn | `TravelerNpcSpawner.ts` |
| Cove world mesh | `resolveShipwreckCove.ts` · chicken-gun pirate-islands |
| Cinema before | `LeviathanOceanCinema` · `/leviathan-cinema` |
| Engine host | `pages/tutorial.tsx` → `Island3DEngine` |

### Character mesh (owner admin)

- **Outline look:** `D:\Games\Models\_anim_packs\30characters.glb` (allowed) **or** race `WK_Characters.glb` CDN  
- **Weapon / loco:** `D:\Games\Models\_anim_packs\{sword_shield,longbow,magic_spell,…}` → Bip001 packs  
- Tutorial load: `buildGrudge6LoadConfig` · unarmed harvest · weapon combat mode  

---

## 5. Migration: shipwreck pattern → all new content maps / water

Every **new map** (sector, camp, water arena, event island) should reuse the same contract — not a new “Dock2” system.

| Capability | Tutorial today | New map must provide |
|------------|----------------|----------------------|
| **Scene def** | `SHIPWRECK_SCENE` pins | Map def: zones + harvest + water edge + spawns |
| **Runtime** | `ShipwreckSceneRuntime` | Same shape: `root`, nodes, NPCs, path, harvestNearest |
| **Traveler steps** | kinds in `TravelerStepKind` | Reuse kinds; only change targets / tokens |
| **Water** | board_raft + sail_faction | Water volume layer · boat deploy · sail to pin |
| **Multiplayer** | room `tutorial` max 1 | `sector` / `home_island` / `world` when shared |
| **Complete handoff** | `AFTER_TUTORIAL_PATH` | `world-map` / zone deep-link with `characterId` |
| **Deploy** | Vercel SPA + Railway rooms | Same — no extra server |

### Water gameplay handoff

Dock Quest **is** the first water lesson:

1. Place raft **in water** near dock  
2. Board (E)  
3. Sail to `{island}` faction shore  
4. Report to commander  

Later water systems (Aethermoor event islands, sector seas, fishing) must use the **same** board/sail events:

```ts
missions.onGameEvent({ type: 'board' });
missions.onGameEvent({ type: 'sail' });
```

### Camps / RTS after opener

| After complete | Route | Room |
|----------------|-------|------|
| Home base / camp | `/home-island` | `home_island` |
| Strategic map | `/world-map` | client-only + later world room |
| Open sector / RTS lanes | `/play?mode=zone&sector=…` | `sector` |
| Pirate hub | `/island-3d?mode=lobby` | `lobby` |

---

## 6. Wiring checklist (what must be green)

### A. Quest definition

- [x] `TRAVELER_TUTORIAL_STEPS` complete through `meet_commander`  
- [x] Race tokens via `raceTravelerDest` / `fillTravelerTokens`  
- [ ] Railway persist of step progress (today: **localStorage only** — fail open offline)

### B. Scene runtime

- [x] Shipwreck zones + harvest nodes + traveler spawn  
- [ ] Traveler mesh = outline SSOT (`30characters` isolate **or** WK kit) + idle pack  
- [ ] Sail step actually transitions camera/map to faction island pin (often soft-complete only)  
- [ ] Water colliders / raft physics on cove shell (Rapier water layer)

### C. Liveservers / multiplayer

- [x] Colyseus rooms registered: tutorial + shipwreck  
- [x] Health `matchMakerReady: true`  
- [ ] Tutorial page always joins `tutorial` with `characterId` (verify join path in `tutorial.tsx`)  
- [ ] After complete: leave room cleanly → home_island / lobby join  

### D. Handoff routing

- [x] `AFTER_TUTORIAL_PATH` defined  
- [x] Skip if home island already claimed  
- [ ] Single host brand: prefer `grudgewarlords.com` over mixed `client.*` deep-links in new UI  
- [ ] Foundry `returnTo` never lands on `character.*` after create first hero → shipwreck/tutorial  

### E. Migration to new maps

- [ ] Extract **map contract** interface shared by shipwreck + sector + event island  
- [ ] Register new maps in world-content / Aethermoor / sector seed only  
- [ ] Dock Quest step kinds stay; map packs supply pins  

---

## 7. Gap analysis (honest)

| Area | Status | Risk |
|------|--------|------|
| Quest copy + steps SSOT | Strong | Low |
| Shipwreck scene runtime | Strong for solo cove | Medium — procedural mats vs full CDN shell QA |
| Traveler NPC presence | Spawner exists | Medium — mesh/anim may still look wrong if wrong kit |
| Water sail completion | Defined in quest | **High** — often UI-only complete without real sail sim |
| Opener Complete → world | Flags + routes exist | Medium — race conditions if island API 401 |
| Colyseus tutorial room | Live on Railway | Low if client always joins |
| New maps reuse contract | Partial (sector rooms live) | **High** — agents invent parallel scenes |
| 30characters + anim packs | Policy unbanned | Wire outline + packs on traveler/player |

---

## 8. Recommended build order (smallest correct)

1. **Verify** `/tutorial` with real `characterId` + Colyseus join (`tutorial` room).  
2. **Traveler visual** — outline from `30characters` or WK + idle; dialogue E works → complete `meet_traveler`.  
3. **Hard-wire events** — harvest / craft / claim / combat all call `onGameEvent` (no silent steps).  
4. **Sail step** — real water board + nav to faction pin or fade + teleport with same event.  
5. **Opener Complete** — set flags, leave room, go `AFTER_TUTORIAL_PATH` → home-island.  
6. **Extract map contract** — next sector/camp/event island implements same node/NPC/water edge API.  
7. **Deploy** — Vercel SPA only when tutorial path changed; Railway only if room schema changes (liveservers: one process).

---

## 9. Smoke commands

```bash
# Liveservers pattern health
curl -s https://grudge-api-production-0d46.up.railway.app/api/colyseus/health

# SPA routes
curl -sI https://grudgewarlords.com/tutorial
curl -sI https://grudgewarlords.com/leviathan-cinema
curl -sI https://grudgewarlords.com/home-island
curl -sI https://grudgewarlords.com/world-map

# Local
cd Grudge-Builder/client
npm run dev
# /leviathan-cinema → /tutorial?from=shipwreck-intro&characterId=…
```

---

## 10. Related docs

| Doc | Role |
|-----|------|
| `liveservers.html` (Desktop grudgeproduction) | One HTTP+WS deploy law |
| `docs/MULTIPLAYER_DEPLOY_PATTERN.md` | Room table + Railway |
| `docs/SHIPWRECK_TUTORIAL_CINEMA.md` | Cinema beats |
| `docs/OPEN_WORLD_PRODUCTION_ENTRY.md` | After-opener entry |
| `docs/GAME_FLOW_SSOT.md` | Host brands |
| `docs/WORLD_MAP_RAILWAY_SSOT.md` (warlord-genesis / gameopen) | Aethermoor after opener |

**Bottom line:** Dock Quest is the **solo seed** of all later map gameplay. Liveservers says: keep it on the **same Railway Colyseus + SPA** stack; grow by **scene defs + seeds + water pins**, not new servers or parallel quest engines.
