# Fabled Zone Foundation

**Core GLB:** `client/public/models/warlords/fabled/fabledzone.glb`  
**Source (local):** `OneDrive\Desktop\MouseWithoutBorders\fabledzone.glb`  
**Castle / dwarf main city:** `models/warlords/fabled/dwarf_main_city.glb`  
**SSOT:** `shared/definitions/fabledZoneFoundation.ts`  
**Loader:** `client/src/island3d/zone/FabledZoneFoundationLoader.ts`  
**Engine:** `Island3DEngine` when `isFabledZoneSector(sectorId)`

---

## Design

| Layer | Role |
|-------|------|
| **Core** | `fabledzone.glb` — multi-island forge village (landscape, rocks, forge, buildings) |
| **Extra islands** | Procedural zone population still spawns satellite islands around the core |
| **Castle** | uMMORPG-style **dwarf main city** — not free-walk exterior only; enter via portals |
| **Building entrances** | Cave-doorway / rock-mouth / forge portals → interiors (hearth, library, lodge, castle) |

Primary sector: **`frostbite_expanse`** (Runeforge Hold · Fabled / dwarf capital).  
Satellite: **`ethereal_falls`** (same core, slightly smaller scale).

### Play URL

```
/play?sector=frostbite_expanse&mode=zone&worldSeed=grudge-world-1&city=runeforge_hold
```

---

## Portals (Press E)

| Portal | Destination GLB |
|--------|-----------------|
| Runeforge Hold · Dwarf Main City | `dwarf_main_city.glb` |
| Dwarf Hearth | `towns/fabled/cottage.glb` |
| Great Library | `towns/fabled/library.glb` |
| Wind Lodge | `towns/fabled/forest_lodge.glb` |
| Glacial Depths | cave dungeon mesh |
| Auto cave doorways | unused `Rock_main` / forge meshes → main city |

Mesh match patterns: `Rock_main`, `Furnace`, `Storage`, `Chimney`, `ForgeScene`, plus building roofs.

---

## CDN upload

```bash
# After local copy under client/public/models/warlords/fabled/
# Upload to R2:
#   models/warlords/fabled/fabledzone.glb
#   models/warlords/fabled/dwarf_main_city.glb
```

Replace `dwarf_main_city.glb` with the real **uMMORPG dwarf main city / castle** export when ready (currently staged from `medieval_town.glb`).

---

## Related

- Haven Shore pattern: `havenShoreFoundation.ts` + `HavenShoreFoundationLoader.ts`
- Faction town SSOT: `factionTowns.ts` → fabled
- Race city: `raceCities.ts` → `runeforge_hold`
