# Airship Solo Zone

**Route:** `/airship-zone` (alias `/airship`)

Solo game zone: voxel cabin create → walk onto airship deck → meet three captains.

## Assets

| Role | Path |
|------|------|
| Hull | `public/models/airship-zone/airship.glb` (from steampunk / lowpoly airship) |
| Cabin | `public/models/airship-zone/boatvoxelinside.glb` |
| Camera | `scene-camera.json` + `PerspectiveCamera.json` (from `project (1).json` / PerspectiveCamera) |
| John Wayne | `npcs/cptjohnwayne.fbx` (Mixamo/Meshy, 2 m) |
| Scourge Faithbearer | `npcs/scourgefaith.fbx` (2 m, bow patrol) |
| Racalvin King | `npcs/racalvinking.glb` (2 m, cabin mentor → deck wander) |

Source files:

- `D:\Games\Models\project (1).json` — camera/controls extract (full scene is floating islands, too heavy for runtime hull)
- `D:\Games\Models\PerspectiveCamera.json`
- `D:\Games\Models\cptjohnwayne\…\*.fbx`
- `D:\Games\Models\scourgefaith\…\*.fbx`
- `C:\Users\nugye\Desktop\grudgeproduction\racalvinking.glb`
- `D:\Games\Models\boatvoxelinside.glb`

## Music

Scene load: `playBGM('silents')` → `/audio/music/soundssilents.mp3` (from `D:\Games\soundssilents.mp3`).  
Also used on `/island-3d` boot (ethereal / lobby / zones).

## Flow

1. **First visit** (no `grudge_airship_has_character`): start **inside cabin** with Racalvin.
2. Create grudge6 captain (race + class + name) or open **GCS** full studio.
3. **Accept** → load race kit (2 m, safe deploy) → walk out to **deck**.
4. **John Wayne** fixed at helm · **Scourge** patrols front top deck only · **Racalvin** wanders deck after create.
5. **E** near NPC = chat · **E** at gold hatch = cabin/deck toggle.
6. Top bar: click crew → camera focus · **+ New grudge6** → cabin create.

## Code

| Module | Role |
|--------|------|
| `shared/definitions/airshipSoloZone.ts` | Paths, NPC defs, storage |
| `client/src/island3d/airship/AirshipSoloZone.ts` | Three.js zone engine |
| `client/src/pages/AirshipZonePage.tsx` | UI + create panel |

## Height / anim

- All three heroes + player: **`AIRSHIP_HERO_HEIGHT_M = 2.0`**
- Mixamo FBX captains: skeletonClass `mixamo` (no Bip001 pack force)
- Player: grudge6 CDN race GLB + `deploySafeCharacter` / atlas

## Next polish

- Bake FBX → GLB with `grudge-convert` for faster load
- Upload airship-zone pack to R2
- Wire full GCS return handoff into `completeCharacterCreate`
- Navmesh pathfind for Racalvin/Scourge (currently waypoint lerp)
