# Grudge Warlords — Game Trailer Pipeline

**Catalog version:** `trailerShotCatalog` 1.0.0  
**Surfaces:** 9 sectors + tutorial shipwreck + home island + lobby + world map overview  

## Surfaces (trailer order)

| Order | ID | Title |
|------:|----|--------|
| 0 | `tutorial_shipwreck` | Shipwreck Wake |
| 1 | `world_map_overview` | World Map — Nine Sectors |
| 2 | `home_island` | Home Island |
| 3 | `lobby_open_world` | Open World Lobby |
| 4 | `haven_shore` | Haven Shore |
| 5 | `stormbreak_reef` | Stormbreak Reef |
| 6 | `frostbite_expanse` | Frostbite Expanse |
| 7 | `thornwood_wilds` | Thornwood Wilds |
| 8 | `convergence_nexus` | Convergence Nexus |
| 9 | `ashen_wastes` | Ashen Wastes |
| 10 | `ember_depths` | Ember Depths |
| 11 | `abyssal_trench` | Abyssal Trench |
| 12 | `ethereal_falls` | Ethereal Falls |

## Live record (browser)

1. Open a surface with cinematic HUD:

```
/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&trailer=1
/play?mode=lobby&trailer=1
/play?mode=procedural&trailer=1
# also: ?flyby=1 or ?proof=1
```

2. Use **Game trailer** tab → **Record this surface**  
   - WebM downloads automatically  
   - PNG snaps per waypoint  
   - Segment stored in session  

3. Click **open** next to the next missing surface (or navigate manually).

4. When enough segments are done → **Cut list JSON**  
   - Imports into CapCut / Premiere / DaVinci as the assembly guide  

## Code

| Module | Role |
|--------|------|
| `shared/definitions/trailerShotCatalog.ts` | SSOT surfaces + shot templates |
| `island3d/cinematic/CinematicCamera.ts` | Sole camera writer during flyby |
| `island3d/cinematic/SurfaceFlyby.ts` | Live waypoints + record |
| `island3d/cinematic/GameTrailer.ts` | Multi-surface package |
| `island3d/render/ZoneFlybyHUD.tsx` | UI (flyby + trailer tabs) |
| `Island3DEngine.setCameraMode` | `cinematic` freezes TPC/Orbit |

## Camera law

During flyby: `beginCinematicCamera()` → only `playCinematicPath` moves the lens.  
After: `endCinematicCamera()` → restore play_tps or orbit_edit.

Tutorial wake uses the same begin/end hooks.

## NLE tips

1. Import all `*-flyby.webm` in cut-list order.  
2. Use establish/close snaps as title cards if WebM has no burned text.  
3. Music bed ~2:00–2:30 for full 13-surface package; short trailer = 0–4 only.  
4. Canonical seed: **grudge-world-1**.
