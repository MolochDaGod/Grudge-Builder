# Heroes airship cinema (`/heroes`)

**SSOT scene:** Puter GrudgeWar airship (“The Grudge”) + grudge6 3D crew.  
**Code:** `client/src/components/heroes/HeroesBlackTideScene.tsx` + `client/src/components/heroes/deck/*`  
**Page:** `client/src/pages/heroes.tsx`

## Skills / best practices used

| Skill | How applied |
|-------|-------------|
| **grudge-production-cinema** | Establish camera, locked cinema lerp on focus, no free orbit fight |
| **grudge-fps-combat (Yuka)** | Goal stack: goto → animate/work → wait/idle → wander replan |
| **three-mesh-bvh-pathfinding** | Deck height sample + stepped stair colliders |
| **grudge-character-correctness** | SI 1.8 m, idle/walk clips, feet on deck Y |

## Deck graph (6 locations)

1. `wheel` — helm work (wheel anim)  
2. `main_battery` — large cannons  
3. `fore_guns` — small cannons  
4. `midship` — scenic idle  
5. `stairs_mid` — transit on ramp  
6. `crow_top` — crow’s line (raised Y)

AI (up to **4** agents) path along `links`, sample height for stairs, then idle/work/wait.

## Selection UX

1. Top **avatar / CNFT** strip (level badge).  
2. Click portrait or 3D body → cinema **zoom** + face camera + lock AI.  
3. Panel shows **stats + equipment**.  
4. **Enter with hero** → `setActive` + localStorage handoff → play dest.  
5. Stays selected until another crewmate is chosen on this scene.

## Modules

| File | Role |
|------|------|
| `deck/DeckLocations.ts` | 6 posts + graph path |
| `deck/DeckPhysics.ts` | Stairs height, colliders, helm wheel mesh |
| `deck/DeckCrewAI.ts` | Yuka-style goals / wander |

## Player crew mesh SSOT

AI crew **are the player's characters** (not random NPCs):

| Source | API / store |
|--------|-------------|
| Voxel / Explorer 4-slot | `GET /api/characters?era=voxel` + `grudge.selectedCharacterByEra` |
| Warlords | `GET /api/characters?era=warlords` (useCharacters) |
| Appearance body | `grudge.avatar.appearance.v1` → height **1.55–2.05 m** |

Loader: `heroesCrewLoader.ts` → `loadCrewHero` (grudge6 kit or blocky explorer + appearance).

## Mesh / scale

- `fitCharacterRootToHeightM` (PLAYER_HEIGHT_M ≈ 1.8 m) for grudge6  
- `applyExplorerAppearanceToRoot` for explorer body ranges  
- Feet re-grounded after scale; deck Y from `sampleDeckHeight`

## npm / deploy notes

| Layer | Stack |
|-------|--------|
| Client 3D | `three@0.185.1`, `three-mesh-bvh`, `three-pathfinding`, `@dimforge/rapier3d-compat` |
| Build | `npm run build:client` → `client/dist` (Vercel `vercel.json`) |
| API | Railway `grudge-api-production` via same-origin `/api/*` rewrites |
| CDN meshes | `assets.grudge-studio.com` via `resolveRaceCdnUrl` / `resolveModelUrl` |

Yuka-style AI is in-repo (`DeckCrewAI`) — no `yuka` npm required.

## QA checklist

- [ ] 0–4 heroes load without capsules  
- [ ] Crew matches signed-in voxel + warlords roster  
- [ ] Explorer appearance height applied  
- [ ] AI walks stairs without floating  
- [ ] Wheel spins when agent works at helm  
- [ ] Portrait click zooms + faces camera  
- [ ] Select persists into zone/lobby/tutorial  
- [ ] Empty slot → Forge create  
