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

1. **Intro video** → land on beach  
2. **Collect sticks (×3)** and **stones (×2)**  
3. **Main panel quick-craft → campfire**  
4. **Boar spawns** → combat → skin → **cook meat** at fire  
5. **UI/UX + basic gameplay** walkthrough  
6. **Quick-craft raft** → deploy in water → **E to board**  
7. **End tutorial cutscene**  
8. → **Home-island video + creation + home-island cNFT**

Client: `/tutorial`  
Server: `joinOrCreate("tutorial", { characterId, … })`  
SSOT steps: `shared/definitions/tutorialFlow.ts`

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
