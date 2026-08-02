# Production Arsenal (weapons + armour)

**URL:** https://grudgewarlords.com/arsenal

Migrate from warlord-crafting-suite.vercel.app/arsenal.

## Tabs
**Catalog T0–T8**, Prefabs, Skills, Stats/Tiers, Systems, **Armour**, Export.

## SSOT
| Layer | Source |
|-------|--------|
| Item icons, names, stats, T0–T8 | `info.grudge-studio.com/api/v1/master-items.json` + `master-weapons.json` |
| Weapon skills + icons | `master-weaponSkills.json` via `loadMasterWeaponSkills.ts` |
| Prefab meshes (6 styles) | `weaponPrefabCatalog.ts` |
| Armour pieces | `armorPrefabCatalog.ts` |
| Local drafts | `arsenalDraftStore.ts` v2 |
| Codex export | `arsenalCodexExport.ts` |

Loader: `client/src/lib/arsenalMasterCatalog.ts` · UI: `ArsenalPage.tsx`

## Deploy
1. Sync info.* on /arsenal (or auto on mount)
2. Edit drafts · Export → Codex production package
3. Save to client/public/codex/equipment-production.json
4. Upload R2 codex/equipment-production.json
