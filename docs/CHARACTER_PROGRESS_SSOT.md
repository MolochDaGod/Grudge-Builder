# Character Progress SSOT (fleet-wide)

> **Canonical contract** for per-character progression across Grudge Studio.  
> Last updated: 2026-08-02 · Schema version: **1**  
> Code: `shared/characterProgress.ts` · Server: `PATCH/POST /api/characters/:id` · Client: `grudge-fleet.js` **≥ 2.8.0**  
> Identity law: [CANONICAL_IDENTITY.md](./CANONICAL_IDENTITY.md)  
> **Warlords ownership matrix (bag / camps / home island / cNFT):** [WARLORDS_ACCOUNT_CHARACTER_SSOT.md](./WARLORDS_ACCOUNT_CHARACTER_SSOT.md)

---

## 1. Scope matrix (do not blur these)

| Data | Scope | Storage | Who writes |
|------|--------|---------|------------|
| Inventory / resources | **Account** | `/api/account/inventory`, `/api/account/resources` | Any character of the account |
| Claimed camps | **Account** | `ownerAccountId` on claim flag + zone/island state | Any warlords hero of the account |
| Home island + island cNFT | **Account** | `home_islands` (unique `account_id`) · `island_nfts` | One island; host guests via Colyseus |
| Profession XP / levels / skill nodes | **Character UUID** | `characters.profession_levels` · `character_professions` | Active character only |
| Class skill tree picks | **Character UUID** | `characters.selected_skills`, `skill_loadouts` | Active character only |
| Weapon mastery ranks / charms | **Character UUID** | `characters.weapon_skill_selections.mastery` | Active character only |
| Weapon skill level | **Character UUID** | `characters.weapon_skill_level` | Active character only |
| Attributes | **Character UUID** | `characters.attributes` | Active character only |
| Equipment | **Character UUID** | `characters.equipment` | Active character only |
| Skill / attr unspent points | **Character UUID** | `skill_points`, `unspent_attribute_points` | Active character only |
| Hero cNFT | **Character UUID** | `character_nfts` | Mint non-blocking; claim optional |

**Identity keys**

| Field | Example | Use |
|-------|---------|-----|
| `characters.id` | Postgres UUID | **SSOT key** for all progress APIs |
| `grudgeCode` | `GRDG-HUMWAR-…` | Human display only — never as sole join key |
| `users.grudge_id` | Account SSO id | Account bag / login — not character progress |

See also: [CHARACTER_IDENTITY.md](./CHARACTER_IDENTITY.md), [UUID_SYSTEM.md](./UUID_SYSTEM.md).

---

## 2. Authority model

```
Client UI  →  proposes progress  →  Railway validates  →  Postgres commits
localStorage / Puter KV  =  CACHE ONLY (never sole truth in production)
```

| Layer | Role |
|-------|------|
| **Railway Postgres** | Source of truth |
| **grudge-fleet.js** | Cross-app client; revision cache; SSO |
| **Puter KV / localStorage** | Offline cache, scoped by `characterId` |
| **Definition packs** | `shared/definitions/weaponMastery.ts`, profession trees — IDs only on character |

### Never

- Write account inventory into `PATCH /api/characters/:id`
- Share profession XP / mastery / attributes across characters
- Pass long-lived JWTs in query strings when avoidable (prefer **hash** SSO — fleet default)

---

## 3. Schema version & revision

Stored on the character under:

```json
skillLoadouts.__progress = {
  "schemaVersion": 1,
  "revision": 14,
  "updatedAt": 1710000000000,
  "recentIdempotencyKeys": ["craft:uuid:recipe:…"]
}
```

API responses also surface:

```json
{
  "progressRevision": 14,
  "progressSchemaVersion": 1
}
```

| Field | Purpose |
|-------|---------|
| `schemaVersion` | Wire format version (`CHARACTER_PROGRESS_SCHEMA_VERSION`) |
| `revision` | Monotonic; optimistic concurrency |
| `idempotencyKey` | Dedupes craft / spend retries |

### Client write (required for multi-tab safety)

```http
POST /api/characters/:id/progress
Authorization: Bearer <jwt>
X-Progress-Revision: 14
If-Match: 14
Content-Type: application/json

{
  "schemaVersion": 1,
  "expectedRevision": 14,
  "idempotencyKey": "craft:charId:recipeId:timestamp",
  "professionLevels": { "miner": { "level": 3, "xp": 40, "unlockedNodes": [1, 2] } },
  "weaponMastery": { "allocations": { "swords": { "sw_honed": 2 } }, "sockets": {} },
  "attributes": { "strength": 12, "vitality": 10, ... },
  "selectedSkills": { "1": "Power Strike" },
  "equipment": { "weapon": "…", "head": null }
}
```

### 409 Conflict

```json
{
  "error": "progress_revision_conflict",
  "errors": ["expectedRevision 14 !== server revision 15"],
  "progressRevision": 15,
  "characterId": "…"
}
```

**Client must:** `GET` character (or `getCharacterDetail`), take new revision, merge or discard local draft, retry once.

Fleet helper: `GrudgeFleet.saveCharacterProgress(id, payload)` handles `expectedRevision`, `If-Match`, one automatic retry on 409, and events:

- `grudge:progress:conflict`
- `grudge:progress:error`
- `grudge:character:updated`

---

## 4. Weapon mastery validation (server)

| Rule | Value |
|------|--------|
| Pool cap | `MASTERY_POOL_CAP` = 100 (`shared/definitions/weaponMastery.ts`) |
| Ranks | Non-negative integers; hard max 10 per node without catalog |
| Per-tree soft ceiling | `MASTERY_TREE_FILL_POINTS + 15` (charm headroom) |
| Storage | `weaponSkillSelections.mastery = { allocations, sockets }` |

Invalid mastery → **400** `invalid_weapon_mastery`.

---

## 5. Safer SSO between fleet apps

| Mode | Usage |
|------|--------|
| `tokenMode: 'hash'` (**default**) | Token in `#token=…` — not sent as Referer query |
| `tokenMode: 'query'` | Legacy; avoid for new links |
| `tokenMode: 'none'` | Character deep link only; user already sessioned |

```js
GrudgeFleet.buildSSOUrl('https://grudge-crafting.puter.site/', {
  characterId: GrudgeFleet.getActiveId(),
  // tokenMode: 'hash' is default
});
```

Pickup: `pickupUrlTokens()` reads query **and** hash, then strips secrets via `history.replaceState`.

Long-term target: httpOnly cookies + `/api/auth/session/exchange` (already registered on auth routes). Prefer launch/exchange tokens over raw JWTs in links when minting server-side launch codes.

---

## 6. Storage key conventions (client cache)

| Domain | Key pattern |
|--------|-------------|
| Class skill tree | `gw-selector-v3:{characterUUID}` |
| Weapon mastery | `grudge-weapon-mastery-v2:{characterUUID}` |
| Crafting sheets | Puter KV `grudge-crafting-save` → `characterSheets[uuid]` |
| Account bag | Puter KV `grudge-account-inventory` + `/api/account/*` |
| Progress cache helper | `grudge-progress:v1:{domain}:{characterUUID}` |

**Never** use a global unscoped key for character progress in new code.

---

## 7. App checklist (every Grudge surface)

When adding a game / editor / Puter site:

1. Load `grudge-fleet.js` ≥ **2.8.0** (hard-fail account mismatch; `era=warlords` roster)
2. On boot: `init` → `ensureSession` → `syncFromBackend` → `getCharacterDetail(activeId)`
3. All progress writes: `saveCharacterProgress` (not raw inventory on character)
4. Inventory: `getAccountInventory` / `saveAccountInventory` only
5. SSO links: `buildSSOUrl` with `characterId`
6. Listen for `grudge:character:selected` and reload **only** character-scoped state
7. Show `VERSION` + fleet version in UI footer when practical
8. Document new fields in this file + [DOCS-INDEX.md](./DOCS-INDEX.md)

### Reference implementations

| App | Path |
|-----|------|
| Fleet bridge | `public/grudge-fleet.js`, `client/public/grudge-fleet.js` |
| Crafting (Puter) | `client/public/grudge-crafting.html` → `grudge-crafting.puter.site` |
| Class skill tree | `shared/definitions/classSkillTrees.ts` (viewer: `public/skill-tree.html`) |
| Weapon mastery | `public/weaponmastery.html` |
| Shared types/validation | `shared/characterProgress.ts` |
| Mastery definitions | `shared/definitions/weaponMastery.ts` |
| API routes | `server/routes.ts` (`PATCH /api/characters/:id`, `POST …/progress`) |

---

## 8. Deploy notes

| Surface | How |
|---------|-----|
| Railway API | Deploy GrudgeBuilder server (validation + `/progress`) |
| Puter crafting | `puter site deploy dist-puter grudge-crafting` (includes fleet, skill-tree, mastery) |
| Warlords Vercel | Ship fleet copy used by client if dual-hosted |
| Definition-only changes | Bump content version in ObjectStore / shared definitions; player stores IDs only |

After deploy, smoke:

1. Login → select char A → spend mastery → revision increments  
2. Two tabs: second save gets 409 or auto-retry  
3. Switch to B → A’s mastery unchanged; bag shared  
4. Craft with double-submit → single apply via idempotency key  

---

## 9. Related docs

- [WARLORDS_ACCOUNT_CHARACTER_SSOT.md](./WARLORDS_ACCOUNT_CHARACTER_SSOT.md) — full account vs character matrix (camps, home island, hosting)  
- [CHARACTER_IDENTITY.md](./CHARACTER_IDENTITY.md) — UUID vs GRDG code  
- [PROFESSIONS.md](./PROFESSIONS.md) — profession XP  
- [ATTRIBUTES.md](./ATTRIBUTES.md) — 8 attributes  
- [API.md](./API.md) — route catalogue  
- [BACKEND.md](./BACKEND.md) — Railway layout  
- [puter-registry.json](./puter-registry.json) — Puter hosts  

---

## 10. Changelog

| Version | Date | Notes |
|---------|------|--------|
| 1 | 2026-07-09 | Initial SSOT: revision meta, mastery validation, `/progress`, hash SSO default, fleet 2.4, crafting 5.2 |
