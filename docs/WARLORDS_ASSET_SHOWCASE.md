# Warlords Asset Showcase

**Live page:** [/asset-showcase](https://grudgewarlords.com/asset-showcase) · aliases `/assets`, `/showcase/assets`

**SSOT:** `shared/definitions/warlordsAssetShowcase.ts`  
**Merge:** `client/src/lib/mergeBuildAssetShowcase.ts` (+ full `BuildAssetManifest`)

## What it lists

| Family | Contents | Cost / recipe | HP / combat | Attachments |
|--------|----------|---------------|-------------|-------------|
| **Mounts** | 6 race cavalry (human…undead) | cloth/iron + gold (stable) | HP, armor, m/s | Rider bone, saddle offset |
| **Boats** | Rowboat, sloop, galleon, waveboard, enemy damage set, class stats | wood/iron/cloth/gold or T0 scraps | hull HP, speed, crew, cannons | sails, cannons, sectional damage |
| **Benches** | Workbench, anvil, grind, cook, mystic, lumbermill | per piece cost | station HP | profession, hammer/paper nodes |
| **Towers** | Medieval A/B/C, camp tower, wood watchtower | stone/wood | high HP + defense | T0 sword/armor + weapon skills on units |
| **Camps** | Outpost, claim flag, tent stages, race homes | wood/cloth/stone | camp HP | F1–F5 orders, bench unlocks |
| **Docks** | Foundation, plank, fishing stand | wood/rope | floating pad HP | waterY+0.2 deck |
| **Modular** | Floor, wall, roof, fence, chest… | wood-heavy | structural HP | snap layer |
| **Siege** | Catapult / bolt-thrower per race | wood/iron/rope | siege HP | fire ability |
| **Buildings** | Full BuildAssetManifest extras | cost[] | derived | traps, furniture, farms |

## Camp unit rules (on page)

- **Claim flag** → 3 unarmed race recruits  
- **Tower** → equip `t0_sword` + `t0_padded_vest`, skills `warrior_0_strike` / `basic_slash` / `basic_block`, +armor/+HP  
- **Storage / fire / barricade** → haul & morale buffs (see `campUnits.ts`)  
- **Orders:** F1 Defend · F2 Follow · F3 Home · F4 Attack · F5 Group  

## Repair (boats / buildings)

Sectional hide-chunk damage + build hammer: **RMB** damaged section → **LMB** spend **1 wood** (bag or boat cargo).  
See `docs/SECTIONAL_DAMAGE.md`.

## Export

Use **JSON** on the page to download the full catalog for design / AI agents.

## Related

- `/arsenal` — weapons & armor prefabs  
- `/crafting` — profession recipes  
- `/systems` — fleet truth + links  
- `docs/BUILD_SYSTEM_SSOT.md` · `docs/CAMP_CLAIM_UNITS.md` · `docs/FANTASY_VILLAGE_BUILD_ASSETS.md`
