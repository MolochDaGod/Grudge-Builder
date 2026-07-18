# Solo tutorial → Home Island → Multiplayer

## Clear separation

| Phase | Room / surface | Multiplayer? |
|-------|----------------|--------------|
| **Solo starting adventure** | Colyseus `tutorial` (alias `shipwreck`) | **No** — `filterBy(characterId)`, `maxClients: 1` |
| **Home Island create** | `/island-reveal` + cNFT | Account setup |
| **Real game** | `home_island`, `lobby`, `sector`, `world`, `town`, `dungeon` | **Yes** |

**Lobby is not the tutorial.** Lobby is a multiplayer hub used after the player has a home island.

---

## Solo adventure (pirate island + shipwreck)

Map: pirate island with a wreck (wash-up).

### First segment (production — in progress)

1. **TI / open movie** → `/tutorial`  
2. **Slow zoom** to shipwreck · unarmed Grudge6 · **harvest mode**  
3. **E / RMB / 1 (auto) / 2 (simple)** gather stick + stone at feet  
4. **Quick Craft** (Main Panel tab) → craft **Flint Pickaxe**  
5. **Inventory → equip MainHand** → tool in hand + harvest anim  
6. **Soft-lock multi-hit** large rock until it **chunks apart**  
7. **Walk forward** to trees, flowers, chest  
8. Then camp props (claim flag, campfire, torch, tent, storage, benches) for refine / over-time harvest  

SSOT: `shared/definitions/tutorialFirstSegment.ts`  
HUD: `TutorialProductionHUD` · harvest: `TutorialHarvestController`

### Full solo loop (server steps)

4–11. Campfire → boar → cook → UI tour → raft → **sail to race faction island** → **meet commander** (see `tutorialFlow.ts` + `travelerTutorialQuest.ts`)

### Dock Quest Traveler (island1 / faction boats)

Every race starting zone has the **same** traveler on the starter boat:

| Field | Value |
|-------|--------|
| Role | `quest_traveler` |
| Name | Dock Quest Traveler |
| Entity | `{race}_quest_traveler_boat` |
| Dialogue set | `starter_quest_boat` |
| Voice pack | Super Dialogue · `sean-lenhart` |

**Quest line is identical for all races** — only destinations change:

1. Meet traveler → move → gather → craft T0 tools → equip → harvest nodes  
2. Claim flag → first fight → UI basics  
3. **Craft raft** → board → **sail to faction island** → **report to commander**

Race shores: Haven Reach (human) · Stormfang (barbarian) · Starleaf (elf) · Anvilspire (dwarf) · Bloodwake (orc) · Gravewake (undead).

SSOT: `shared/definitions/travelerTutorialQuest.ts`  
Also mirrored in Flare: `artifacts/grudge-game/src/data/travelerTutorial.ts` + `TravelerTutorialHUD`

Client: `/tutorial`  
Server: `joinOrCreate("tutorial", { characterId, … })`  
SSOT steps: `shared/definitions/tutorialFlow.ts`  
Opening scene: `shared/definitions/tutorialShipwreckScene.ts`  
Complete map SSOT: `shared/definitions/shipwreckScene.ts` (zones · nodes · NPCs · prefabs · paths)  
Runtime: `ShipwreckSceneRuntime` + pathfinder + TransformControls gizmo + XYZ editor HUD  
Cinematic: `client/src/island3d/tutorial/TutorialWakeCinematic.ts`

---

## After tutorial (real multiplayer)

Player is on **home-island**.

- **Raft travel** → **world map (9 sectors)** → join `sector` rooms  
- **Home-island invites**: press **E** near dock/portal → create or accept invite → join friend’s `home_island`  
- **Lobby**: multiplayer social / party / queue (not the shipwreck)  
- **Zones / instances**: sector, town, dungeon, etc.

---

## Colyseus room names

```
tutorial     Solo shipwreck adventure (private)
shipwreck    Alias of tutorial
lobby        Multiplayer hub (post home-island)
home_island  Owned island + invites
sector       9-sector open world
world        Overworld router
town         Faction towns
dungeon      Instanced dungeons
```

All web game realtime = **Colyseus only** (no Socket.IO game path).
