# Production UI — ui.grudge-studio.com

**Landing:** https://ui.grudge-studio.com/  
**Editor:** https://ui.grudge-studio.com/studio  
**Games packs:** https://ui.grudge-studio.com/games  

## What ships in GrudgeBuilder

| Piece | Path | Role |
|-------|------|------|
| Config / pack IDs | `client/src/lib/uiKit/uiStudioConfig.ts` | Origin, packs, main-panel URL |
| Craftpix frames/slots/icons | `client/src/lib/uiKit/craftpixAssets.ts` | CDN URLs under `/assets/craftpix/` |
| Runtime loader | `client/src/lib/uiKit/loadGrudgeGameUI.ts` | Loads `game-ui-runtime.js` |
| Pack layer | `client/src/components/uiKit/GrudgeGameUiLayer.tsx` | Mounts water-island / warlords pack |
| Slot / frame atoms | `UiKitActionSlot` · `UiKitPlayerFrame` | Interactive HUD chrome |
| CSS | `client/src/styles/ui-kit-production.css` | Layout for frames + slots |
| ModePlayHUD | `island3d/render/ModePlayHUD.tsx` | Combat/harvest/build with craftpix slots |
| Main panel (I) | `MainPanelHost` → main-panel.html | Equipment paperdoll + bag |
| Home island wire | `pages/home-island.tsx` | Pack layer + HUD + I key |

## Asset sources (do not invent)

```
https://ui.grudge-studio.com/assets/craftpix/
  Unit Frames/Main/…
  Action Bar/Slots/…
  Character Window/Slots/…
  Inventory/…
  Icons 128x128/…
https://assets.grudge-studio.com/ui/craftpix-rpg/craftpix-rpg-ui.css
```

Packs:

```
https://ui.grudge-studio.com/game-ui-packs/index.json
https://ui.grudge-studio.com/game-ui-packs/water-island.json  # home island
https://ui.grudge-studio.com/game-ui-packs/warlords.json      # zone / combat
```

## Player flow

```
/heroes → select grudge6 → Home Island
  → /home-island?characterId=…&from=heroes
  → GrudgeGameUiLayer (water-island pack)
  → ModePlayHUD (frames + slots)
  → I → MainPanelHost equipment (ui.grudge-studio.com)
```

## Hotkeys

| Key | Action |
|-----|--------|
| Q | Combat ↔ harvest |
| R | Harvest tool radial |
| I | Equipment / inventory main panel |
| Esc | Close panel / cancel place |

## Deploy

1. **UI kit** — push `grudge-ui-editor` → Vercel ui.grudge-studio.com (packs + craftpix assets).  
2. **Client** — deploy GrudgeBuilder (ModePlayHUD + home-island).  
3. Smoke: open home-island, confirm unit frame + action slots load PNGs (Network 200), I opens main panel.

## Rules

- Prefer **ui.grudge-studio.com** + R2 craftpix CSS over Lucide-only slots for production chrome.  
- Keep ModePlayHUD **interactive**; pack layer is **pointer-events: none**.  
- Equipment paperdoll SSOT remains main-panel on the UI host (tactical paperdoll).  
- Icons for skills: craftpix 128s first; ObjectStore icons when wired per-item.
