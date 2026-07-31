# Play mode + Q input SSOT

**Code:** `client/src/island3d/player/PlayModeStateManager.ts`  
**HUD:** `client/src/island3d/render/ModePlayHUD.tsx`  
**Engine:** `Island3DEngine` combat/harvest + weapon pair  
**UI chrome:** `ui.grudge-studio.com` craftpix (frames/slots)

## Modes

| Mode | ControlMode | Hands |
|------|-------------|--------|
| **Combat** | `combat` | MainHand weapon(s), skills 1–5 |
| **Harvest** | `harvest` or `build` | Radial tools; `toolkit` = build hammer → `build` free-move |

Build is **not** a top-level HUD mode — it is harvest + hammer.

## Q contract (verified)

| Input | Combat | Harvest |
|-------|--------|---------|
| **Tap Q** (&lt; 200 ms) | Swap **MainHand ↔ SecondaryWeapon** (non-drop 2nd weapon) | Swap **last tool ↔ build hammer** |
| **Hold Q** (≥ 200 ms) | Radial: W1 / W2 / → Harvest | Radial: hatchet·pick·knife·rod·hammer / → Combat |
| **R** | — | Tool radial only (no mode chips) |
| **Esc** | Close radial | Close radial · cancel place |

## Non-drop 2nd weapon

- Equipment field: **`SecondaryWeapon`** (not a paperdoll drop slot)
- Bag UIs must treat it as **locked / non-drop** reserve
- Engine SSOT: `primaryWeaponId`, `secondaryWeaponId`, `combatWeaponSet`
- Hydrate: `engine.hydrateCombatWeaponsFromEquipment()` after character load
- Assign 2nd weapon: `pm.setWeaponPair(primary, secondary)` or equipment.SecondaryWeapon

## Wiring checklist

```
[x] PlayModeStateManager hold vs tap
[x] ModePlayHUD connects bridge to Island3DEngine
[x] enterCombatMode / enterHarvestMode / setHarvestRadialTool
[x] applyCombatWeapons + swapHarvestHammerTool
[x] RadialWheel craftpix slots
[ ] Inventory UI: mark SecondaryWeapon non-drop
[ ] After loadGrudge6Player: hydrateCombatWeaponsFromEquipment
[ ] Toast when no secondary weapon assigned
```

## Do not

- Use plain Q keydown toggle for combat↔harvest (replaced by hold radial)
- Drop SecondaryWeapon into ground loot without confirmation
- Open build as a third top-level mode dock tab
