# Production Arsenal

**Canonical URL:** `https://grudgewarlords.com/arsenal` (also `grudge.studio/arsenal`)  
**Legacy (do not use for new work):** `https://warlord-crafting-suite.vercel.app/arsenal`

## Purpose

Migrate the Warlord Crafting Suite arsenal into the GrudgeBuilder production SPA and use it as the day-to-day surface for:

| Area | What you do in Arsenal |
|------|------------------------|
| **Weapons / prefabs** | Browse 6 styles × production types, CDN/local mesh, status ready/fallback/missing |
| **Stats / tiers** | Inspect T1–T8 visual ladder (same mesh rule); style skins vs power tiers |
| **Systems** | Coverage matrix, class roles, art gaps |
| **Abilities / skills** | Edit damage, CD, tier, name, description per skill (draft overlay) |

## SSOT (code)

| Catalog | Path |
|---------|------|
| Prefab matrix | `shared/definitions/weaponPrefabCatalog.ts` |
| Skill trees | `shared/definitions/weaponSkillsNew.ts` |
| Tier shaders | `shared/definitions/weaponTierVisuals.ts` |
| Mesh-true icons | `client/src/lib/equipmentIconFromMesh.ts` |
| Draft store | `client/src/lib/arsenalDraftStore.ts` |
| Page | `client/src/pages/ArsenalPage.tsx` |

## Edit workflow

1. Open **Production Arsenal** on the product host.
2. Pick weapon type → Prefabs / Skills / Stats / Systems tabs.
3. Edits auto-save to `localStorage` (`grudge_arsenal_drafts_v1`).
4. **Export** tab → download JSON.
5. Merge into shared definitions (agent or PR) and deploy.

Drafts never write the repo automatically — safe for live production browsing.

## Related routes

- `/weapon-skills` — combat reference view
- `/weapon-admin` — model attach / admin
- `/weapon-mastery` — mastery progression

## Redirect policy

`WcsRedirect` maps `/arsenal` (and other suite tabs) to **local** SPA paths. Only unmigrated WCS flows still open the Vercel app.
