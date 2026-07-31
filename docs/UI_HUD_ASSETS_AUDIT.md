# UI / HUD / Settings asset audit (2026-07-28)

## SSOT host

| Source | Role |
|--------|------|
| **ui.grudge-studio.com/assets/craftpix/** | Production RPG chrome (unit frames, slots, menu, sliders) |
| **assets.grudge-studio.com/ui/craftpix-rpg/craftpix-rpg-ui.css** | `.cpx-*` 9-slice RPG skin |
| **ui.grudge-studio.com/game-ui-packs/** | Layout packs (warlords, grudge6, …) |
| Lucide icons in ModePlayHUD | Mode dock labels only (Combat/Harvest) — OK hybrid |

## What we use now (wired)

| Surface | Assets |
|---------|--------|
| Player frame | `UnitFrame_Background` / Elite + **HP/MP bar fills** (`Bars/UnitFrame_HP_Fill_Red`, `MP_Fill_Green`) |
| Action slots | ActionBar slot bg/hover/press |
| Mode dock | Window_Background panel + craftpix **settings gear** button |
| Settings panel | GameMenu_Background, slider/toggle craftpix, quality pills |
| Spellbook (ui host) | Spell Book pack + Icons 128 |
| Skill icons | 6× craftpix 128 (fallback); ObjectStore preferred when present |

## Verified live (HEAD 200)

- ActionBar_Main_Background, UnitFrame_Background, Icon_Sword_128  
- GameMenu_Background, Window_Background, Slider_Horizontal_Background  
- ActionBar_Buttons_Icon_Settings  
- UnitFrame_HP_Fill_Red (under `Unit Frames/Main/Bars/`)  
- craftpix-rpg-ui.css on assets CDN  

## Gaps / improvements

| Gap | Better approach |
|-----|-----------------|
| Only 6 skill icons | Map `weaponSkillsNew` / ObjectStore `icons/` per skillId; craftpix as last resort |
| Harvest tools reuse combat icons | Dedicated tool icons on ObjectStore (`icons/tools/`) |
| Lucide on mode dock | Optional: craftpix ActionBar flame/book/profile icons for modes |
| Settings not on all pages | Only ModePlayHUD — mount same panel on play/tutorial |
| Pack layer decorative only | `bindData` live HP into warlords pack each frame |
| Kenney vs craftpix | Keep craftpix for Warlords/grudge6; Kenney for VoxGrudge |

## Play settings (new)

`UiKitSettingsPanel` + localStorage `grudge:play-graphics`:

- **Graphics** low/medium/high → PostProcessing + shadows  
- **Ocean** off/low/high → dual-pass reflect/refract  
- Toggles: shadows, post FX  

## Code entrypoints

- `client/src/lib/uiKit/craftpixAssets.ts` — URL SSOT  
- `client/src/styles/ui-kit-production.css` — chrome + settings CSS  
- `client/src/components/uiKit/*` — React pieces  
- `ModePlayHUD` — settings gear + apply quality to engine  
