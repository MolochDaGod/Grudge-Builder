# Grudge Warlords — Documentation Index

Organized entry point for APIs, UUID systems, and fleet integration.

---

## Player-facing production

| Topic | Doc |
|-------|-----|
| **Live game** | https://grudgewarlords.com |
| **API routes (auth, characters, island, crafting)** | [API.md](./API.md) |
| **Hero identity (name + GRDG code, create SSOT)** | [CHARACTER_IDENTITY.md](./CHARACTER_IDENTITY.md) |
| **Character progress SSOT (skills, mastery, attrs, bag scope, revisions)** | [CHARACTER_PROGRESS_SSOT.md](./CHARACTER_PROGRESS_SSOT.md) |
| **Home island gameplay** | [ISLANDS.md](./ISLANDS.md) |
| **Professions & crafting** | [PROFESSIONS.md](./PROFESSIONS.md) |
| **Characters, races, classes** | [RACES_CLASSES.md](./RACES_CLASSES.md) |
| **Playtesting, tokens, local dev** | [PLAYTEST.md](./PLAYTEST.md) |
| **Sprites & 2D animation** | [SPRITES.md](./SPRITES.md) · [ANIMATIONS.md](./ANIMATIONS.md) |

---

## UUID & assets (read this before adding items/icons)

| System | Format | Doc |
|--------|--------|-----|
| **ICON-*** (UI images, 9,724 on CDN) | `ICON-XXXX-XXXX-XXXX` | [Icon Library](https://info.grudge-studio.com/ICON_BROWSER.html) · [UUID Guide](../../ObjectStore/docs/API-AND-UUID-GUIDE.md) |
| **Slot-tier item instances** | `helm-t1-0001-…` | [UUID_SYSTEM.md](./UUID_SYSTEM.md) |
| **Player heroes** | Postgres `id` + `grudgeCode` `GRDG-HUMWAR-…` + display `name` | [CHARACTER_IDENTITY.md](./CHARACTER_IDENTITY.md) · [API.md § Characters](./API.md) |
| **HERO/EQIP/ITEM catalog** | `HERO-*`, `EQIP-*` | ObjectStore `master-registry.json` |

**Client resolver:** `client/src/lib/iconResolver.ts` → `@grudge-studio/asset-resolver` / ObjectStore `ICON-*` registry.

---

## Backend & deployment

| Topic | Doc |
|-------|-----|
| Express routes, storage, Railway | [BACKEND.md](./BACKEND.md) |
| Frontend architecture | [FRONTEND.md](./FRONTEND.md) |
| Asset packs & CDN paths | [ASSET_PACKS.md](./ASSET_PACKS.md) |
| Spell/skill icon mapping | [SPELL_SKILL_ICONS.md](./SPELL_SKILL_ICONS.md) |

---

## ObjectStore (game data API)

| Resource | URL |
|----------|-----|
| Browse all JSON datasets | https://info.grudge-studio.com/docs |
| API + UUID master guide | [ObjectStore/docs/API-AND-UUID-GUIDE.md](../../ObjectStore/docs/API-AND-UUID-GUIDE.md) |
| Icon pipeline | [ObjectStore/docs/ICON-ASSET-LIBRARY.md](../../ObjectStore/docs/ICON-ASSET-LIBRARY.md) |
| **Icon browser (search & copy)** | https://info.grudge-studio.com/ICON_BROWSER.html |
| `assets-api.json` manifest | https://objectstore.grudge-studio.com/api/v1/assets-api.json |

---

## Fleet domains

| Service | Domain |
|---------|--------|
| Grudge ID | `id.grudge-studio.com` |
| Game API | `api.grudge-studio.com` |
| ObjectStore | `objectstore.grudge-studio.com` |
| Asset CDN | `assets.grudge-studio.com` |
| Production UI | `grudgewarlords.com` |
| WCS / crafting (Puter) | `grudge-crafting.puter.site` — see [CHARACTER_PROGRESS_SSOT.md](./CHARACTER_PROGRESS_SSOT.md) |
| WCS codex (legacy alias) | `warlord-crafting-suite.vercel.app` |