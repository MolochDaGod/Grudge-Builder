# Complete World Map — 9 Sector Render

**Updated:** 2026-07-17  
**Route:** `/world-map` (default view)  
**Sail:** `/ocean` · `/sailing`  
**SSOT:** `shared/definitions/completeWorldMap.ts` + `worldMapSectors.ts`

---

## What “complete” means

| Layer | Content |
|-------|---------|
| **All 9 macro sectors** | Ethereal Falls · Frostbite · Thornwood · Stormbreak · Convergence · Ashen · Abyssal · **Haven Shore** · Ember Depths |
| **Offline-first** | Renders from client SSOT without `/api/map/world` |
| **Live overlay** | Optional player counts / controlling faction when API is up |
| **Race capitals** | Markers for human/dwarf/elf/orc/undead/demon cities |
| **Land in** | `/play?sector=<zoneId>&mode=zone&worldSeed=…&city=…` |
| **Sail** | `/ocean` with all 9 sector islands labeled on the tactical ocean |

Not the player **home-block** 3×3 (`WorldMapView`) — that is a different map family.

---

## Entry points

```
/world-map          → CompleteWorldMap (3D strategic overview) [default]
  → Tile Sail Map   → legacy canvas tile sailing
/ocean              → ThreeWorldMapManager + all 9 sector islands
```

---

## Files

| File | Role |
|------|------|
| `shared/definitions/completeWorldMap.ts` | `buildCompleteWorldMap()` snapshot |
| `client/src/components/CompleteWorldMap.tsx` | Three.js full map UI |
| `client/src/pages/world-map.tsx` | Mode switch complete ↔ tile |
| `client/src/tactical-ocean/*` | 3D sail with labeled sector islands |
| `client/src/lib/oceanNavigation.ts` | Anchors + deploy URLs |

---

## Controls (strategic map)

- **Click** sector → detail panel + soft zoom  
- **Scroll** zoom · **Shift-drag** / middle / right pan  
- **Land In Sector** → open-world zone  
- **Sail Ocean** → tactical 3D sail  
- Mini **3×3 legend** bottom-left  

---

## Layout (lore)

```
        col0              col1              col2
row0    Ethereal Falls    Frostbite         Thornwood
row1    Stormbreak        Convergence       Ashen Wastes
row2    Abyssal Trench    Haven Shore ★     Ember Depths
```

★ Starter PVE trade · Fruzer foundation · safe zone
