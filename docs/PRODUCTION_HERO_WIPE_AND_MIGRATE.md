# Production transition: wipe + migrate 27 heroes → grudachain

**Status:** planned — **do not wipe** until cNFT escrow is verified on Railway and this checklist is signed off.  
**Date:** 2026-07  
**Related:** [CNFT_ESCROW_OWNERSHIP.md](./CNFT_ESCROW_OWNERSHIP.md) · `shared/definitions/lore.ts` · `shared/definitions/heroCodex.ts`

---

## 1. Goals

| Goal | Detail |
|------|--------|
| Clean slate | Wipe existing **grudachain** account character rows (and related progress/NFT links as scoped) so admin inventory is only the canonical cast |
| Canonical cast | **27 heroes** under admin account **`grudachain`** (master operator) |
| Playtest | **`molochdadev`** remains admin for live playtest; **not** the permanent home of the 27 |
| Chain | New rows use **escrow-first cNFT** (admin wallet custody; account owns in game) |
| **World role** | Seeded heroes are **production NPCs** (`isProductionNpc`) that **grudachain deploys** as quest givers |
| **Campaign** | Each hero → **3 quests**; finish all 8 faction heroes (24) → **mounted commander** end-game ([FACTION_HERO_CAMPAIGN.md](./FACTION_HERO_CAMPAIGN.md)) |
| **AI** | Per-hero `aiSystemPrompt` from codex for prompted NPC dialogue |
| Assets later | Racalvin, Cpt. John Wayne, Scourge Faithbearer get production baked meshes + AI brain when assets are delivered |

**Accounts (fleet allowlist)**

| Username | Role |
|----------|------|
| `grudachain` | **Master** — owns the 27 production heroes after migrate |
| `molochdadev` | **Admin** — playtest account (empty or personal slots; not the canon vault) |

See `shared/fleet/adminAllowlist.ts`.

---

## 2. cNFT process (ready gate)

Must be green before wipe:

- [x] Escrow-first mint code on `main` (PR #27)
- [ ] Railway env: `CROSSMINT_SERVER_API_KEY`, `AI_AGENT_WALLET`, `CROSSMINT_COLLECTION_ID`
- [ ] Smoke: create throwaway character on staging/prod → `character_nfts.owner_wallet_address` starts with `escrow:`
- [ ] Smoke: hero playable **without** claim
- [ ] `/heroes` loads JWT roster; `?error=load` shows recovery

Only after these: run wipe + migrate.

---

## 3. The 27 heroes (SSOT)

**Source:** `HERO_ROSTER` (24) + legends (3) = `HERO_CODEX_WITH_LEGENDS` in `heroCodex.ts`.

### Crusade (8)

| id | Name | Class |
|----|------|-------|
| aurion | Aurion Solbrand | Mage |
| sigurd | Sigurd Ironcrown | Warrior |
| kael | Kael Nightwhisper | Ranger |
| theron | Theron Greyclaw | Worges |
| thrax | Thrax Bloodmaw | Warrior |
| grok | Grok Stormhowl | Shaman |
| kira | Kira Redfang | Worges |
| vox | Vox Skysplit | Ranger |

### Legion (8)

| id | Name | Class |
|----|------|-------|
| gruk | Gruk Blacktusk | Warrior |
| nazgrim | Nazgrim Voidhand | Necromancer |
| vexol | Vexol Quietblade | Ranger |
| morgash | Morgash Ashborn | Mage |
| silesh | Silesh Dreadmire | Mage |
| bone | Bone Rattlebone | Warrior |
| whisper | Whisper Pale | Rogue |
| dredge | Dredge Gravewake | Cleric |

### Fabled (8)

| id | Name | Class |
|----|------|-------|
| aelindor | Aelindor Swiftwind | Warrior |
| silvaine | Silvaine Moonsong | Mage |
| lyra | Lyra Threadweaver | Cleric |
| fenwick | Fenwick Darkbough | Rogue |
| durgin | Durgin Stonefist | Warrior |
| brenna | Brenna Forgehammer | Warrior |
| thordak | Thordak Runebinder | Mage |
| helga | Helga Hearthhand | Cleric |

### Pirate legends (3) — special assets + NPC AI later

| id | Name | Notes |
|----|------|--------|
| **racalvin** | Racalvin Tidebreaker | Pirate King — free port / deck NPC / cinema |
| **john_wayne** | Cpt. John Wayne | Sky Captain — air lanes / secret legend |
| **scourge_faithbearer** | Scourge Faithbearer | Flame of Judgement — arena / free-port fire |

**Do not** invent alternate names (no Sir Aldric / Grommash substitutes). Codex identity only.

---

## 4. Wipe scope (grudachain only)

**In scope (admin vault clean):**

- `characters` where `user_id` / account maps to **grudachain**
- Linked `character_nfts` for those character IDs
- Optional: progress / party / island bindings for those character IDs only

**Out of scope (do not wipe globally):**

- All other players’ accounts
- ObjectStore definitions, lore JSON, CDN assets
- `molochdadev` characters (unless you explicitly empty for a clean playtest)

**Safety:** script must require `--confirm-wipe-grudachain` and print counts before delete.

---

## 5. Migrate / seed procedure

1. Resolve Railway account for username `grudachain` (or `grudge_id` / email `grudgedev@gmail.com`).
2. Wipe grudachain characters (confirmed).
3. For each of 27 codex entries:
   - `INSERT` character with race/class/level/attributes from codex + class defaults
   - `gameEra: warlords` (or multi-era slots if required)
   - `model3d` placeholder from race grudge6 until baked assets land
   - Tag `codexId` / `isCanonical: true` in metadata if column/JSON available
   - Escrow-mint cNFT (non-blocking)
4. Cap UI slots: production may show 4 active slots; **vault** holds all 27 under admin (admin UI / codex / AI unit pool), not 4-slot player limit.
5. Export JSON backup of inserted UUIDs → `docs/backups/grudachain-heroes-<date>.json`

**Playtest path:** log in as **`molochdadev`**, create/test freely; pull reference from codex or admin inspect of grudachain vault — do not move the 27 onto molochdadev.

---

## 6. Asset intake (when you deliver files)

For **Racalvin**, **John Wayne**, **Scourge Faithbearer** (then rest of cast as ready):

| Deliverable | Best practice |
|-------------|----------------|
| Mesh | Production **GLB** via `grudge-asset-convert` (SI scale, 1.8 m human yardstick) |
| Textures | WebP/atlas; race albedo + optional unique overrides |
| Anims | Baked Bip001 / pack roles: idle, walk, run, attack, skill, death |
| Colliders | Capsule + optional mesh colliders baked |
| Portrait | Unique `/hero-codex/` PNG; no shared portraits |
| CDN | `assets.grudge-studio.com` + D1 registry paths |
| Prefab | Wire via `loadGrudge6Player` / character prefab pipeline |
| **NPC AI brain** | Personality + goals + combat style from codex dialogues/quests; Yuka/GOAP or fleet AI unit row |
| cNFT image | High-res portrait absolute URL for mint metadata |

Pipeline refs: `docs/CHARACTER_PREFAB_PIPELINE.md`, skills `grudge-asset-convert` + `grudge-character-correctness` + `grudge6-full-stack`.

---

## 7. Execution order (when you say go)

```
1. Verify Railway cNFT env + escrow smoke
2. Backup DB (Railway snapshot / characters dump)
3. Dry-run: scripts/migrate-canonical-heroes-to-grudachain.ts
4. Wipe grudachain chars (--confirm-wipe-grudachain)
5. Seed 27 + escrow mint
6. Verify /heroes as grudachain + admin tools list 27
7. Playtest on molochdadev (create/combat/island)
8. Asset drop for Racalvin / Wayne / Scourge → bake → bind model3d → re-mint metadata if needed
```

---

## 8. Explicit non-actions (until green light)

- No production wipe from agents without user **“go wipe”**
- No force-push / drop of non-grudachain player data
- No mint-to-user on create (escrow only)

---

## 9. Sign-off

| Check | Owner | Done |
|-------|-------|------|
| cNFT escrow live on Railway | Ops | ☐ |
| Backup taken | Ops | ☐ |
| Dry-run OK | Agent/Ops | ☐ |
| Wipe + seed 27 | Agent/Ops | ☐ |
| molochdadev playtest OK | Racalvin / Moloch | ☐ |
| Legend assets uploaded | Pipeline | ☐ |
