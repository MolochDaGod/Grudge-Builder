# Faction Hero Campaign — 27 production NPCs

**SSOT:** `shared/definitions/factionHeroCampaign.ts`  
**Progress (client):** `client/src/lib/factionHeroCampaignProgress.ts`  
**Missions merged into:** `MISSION_CATALOG` (`missionSystem.ts`)

---

## Production deploy

| Item | Value |
|------|--------|
| Deploy account | **`grudachain`** (master admin) |
| Playtest account | **`molochdadev`** |
| Cast size | **27** NPCs (24 roster + Racalvin, Cpt. John Wayne, Scourge Faithbearer) |
| Role | World **quest-giver NPCs** with prompted AI + campaign missions |
| 3D tags | `isCanonical`, `isProductionNpc`, `codexId`, `gameEra: warlords` |

Migrate / seed: `scripts/migrate-canonical-heroes-to-grudachain.ts` + [PRODUCTION_HERO_WIPE_AND_MIGRATE.md](./PRODUCTION_HERO_WIPE_AND_MIGRATE.md).

```ts
import { PRODUCTION_HERO_NPCS, exportProductionHeroDeployManifest } from '@shared/definitions/factionHeroCampaign';
// Each entry: aiSystemPrompt, campaignMissionIds[3], sectorSpawn, racePrefixHint, …
```

---

## Player loop

```
1. Join a war faction (from race → crusade | legion | fabled)
2. Visit each of the 8 faction heroes in the open world
3. Complete exactly 3 campaign quests per hero  (8 × 3 = 24)
4. Unlock mounted faction COMMANDER in faction city
5. Commander end-game:
     - Slay the OTHER factions' dragons (not your own)
     - Beat 3 world bosses
     - Sack enemy faction island (also a daily)
     - Turn in resources to faction for rewards
6. Daily board (3 missions / UTC day): sack · tribute · patrol · world-boss pulse · aid a hero
```

Pirate legends (Racalvin / Wayne / Scourge) are **production NPCs** with their own 3-quest chains under Free Port; they do **not** replace war-faction commander unlock.

---

## Campaign math

| Layer | Count |
|-------|-------|
| Quests per hero | **3** |
| Heroes per war faction | **8** |
| Quests to unlock commander | **24** |
| Campaign missions total | **81** (27 × 3) |
| End-game commander missions | dragons + 3 world bosses + sack + tribute |
| Daily templates | 5 (board picks 3/day) |

---

## Prompted AI

Each `ProductionHeroNpcDeploy.aiSystemPrompt` is built from codex lore, dialogue pack, combat style, and faction.  
Client helper: `getNpcAiPrompt(codexId)`.  
Wire to AI gateway / NPC chat with that system prompt + short player message.

Commanders have separate `FACTION_COMMANDERS[faction].aiSystemPrompt`.

---

## Progress API (client envelope)

```ts
loadCampaignProgress()
setPlayerFactionFromRace(raceId)
completeCampaignMission(missionId)
campaignStatusForUi() // completed/total, commanderUnlocked, daily, commander missions
```

Storage key: `warlords_faction_hero_campaign_v1`  
Server should later persist the same `FactionHeroCampaignProgress` shape on Railway.

---

## End Game (two different systems)

| System | File | Meaning |
|--------|------|---------|
| **Home island End Game** | `endGameMission.ts` | Lv20 captain → abandon ship → home island |
| **Commander war end-game** | `factionHeroCampaign.ts` | After 24 hero quests → dragons / world bosses / sack / tribute |

Both are production; do not merge them into one flag.

---

## Validation

```ts
import { assertProductionHeroCoverage, productionHeroDeploySummary } from '@shared/definitions/factionHeroCampaign';
assertProductionHeroCoverage(); // ok + errors[]
```
