# Tutorial rewrite v2 — `/tutorial` (client.grudge-studio.com)

## Goal

Replace the fragmented tutorial chrome (Production HUD only + optional iframe Grudge6 shell) with a **native** production stack:

| Layer | Module | Role |
|-------|--------|------|
| Character vitals / mode / hotbar | `client/src/tutorial/TutorialGameHUD.tsx` | In-world HUD |
| Main panel | `client/src/tutorial/TutorialMainPanel.tsx` | Character · Inventory · Craft · Skills · Quests |
| Traveler missions | `client/src/tutorial/useTravelerMissions.ts` | SSOT-driven quest state |
| Compose | `client/src/tutorial/TutorialShell.tsx` | Wired from `pages/tutorial.tsx` |

## Source of truth (do not fork)

- Missions: `shared/definitions/travelerTutorialQuest.ts` (`TRAVELER_TUTORIAL_STEPS`)
- Flow / room: `shared/definitions/tutorialFlow.ts` (room `tutorial`, not lobby)
- First segment craft: `shared/definitions/tutorialFirstSegment.ts`
- Shipwreck map: `shared/definitions/shipwreckScene.ts` + pirate-islands lobby map
- Characters: Grudge6 unarmed load via `buildGrudge6LoadConfig` in `tutorial.tsx`

## Player UX

1. Cinematic wash-up → unarmed Grudge6 race model  
2. **Dock Quest Traveler** objective chip (top center)  
3. **P** opens Main Panel (quests default) · **I** inventory · **K** skills · **L** quests · **Esc** close  
4. **E** completes “meet traveler” when that step is active  
5. Harvest / craft / equip events advance the shared race-agnostic traveler chain  
6. Destinations ({island}, {commander}) resolve from race  

## Related repos

| Repo | Remote | Notes |
|------|--------|--------|
| **Grudge-Builder** | `https://github.com/MolochDaGod/Grudge-Builder.git` | Canonical client + shared SSOT (this tree) |
| Local pull | `C:\Users\david\Desktop\grudge-builder` | `main` @ post-`0b7164f1` |

Other grudge-studio.com surfaces (drive, grudge6 lab, warlords) remain separate deploys; this rewrite is **native in builder**, not an iframe of grudge6.grudge-studio.com.

## Deploy

`client.grudge-studio.com` is the Grudge-Builder Vercel client. After merge:

```bash
cd C:\Users\david\Desktop\grudge-builder
# verify
# deploy via grudge-deploy-agent / vercel production
```

## Follow-ups

- [ ] Server `tutorial` room step ids ↔ `TRAVELER_TUTORIAL_STEPS` 1:1  
- [ ] Claim flag (C) / raft board / sail / commander talk → `missionEventRef`  
- [ ] Voice pack `sean-lenhart` barks on step complete  
- [ ] Optional: keep `TutorialProductionHUD` as debug-only flag  
