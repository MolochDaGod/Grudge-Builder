# Airship Solo Zone

**Route:** `/combat` (alias `/airship-zone` · `/airship`)

Warlords 4-character scene: scene (7) islands + airship hull **Object_163_1**.

## Assets (R2 — not git)

| Role | Path |
|------|------|
| Scene | `models/airship-zone/opener-scene.glb` ← `D:\Games\Models\scene (7).glb` |
| Camera + capsule pins | `client/public/models/airship-zone/scene-camera.json` ← `project (6).json` |
| Cabin | `models/airship-zone/cabin.prod.glb` (fallback `boatvoxelinside.glb`) |
| John / Scourge / Racalvin | `models/airship-zone/npcs/*.prod.glb` |

## Deck AI

| Crew | Deck band on `Object_163_1` |
|------|------------------------------|
| Captain John Wayne | **top** — home at `Object_16` / `Object_111` wheels |
| Scourge Faithbearer | **mid** |
| Racalvin | **low** |
| Account heroes (≤4) | Project (6) capsules → wander 163_1 |

Pathfinding = existing `MeshSceneNavMesh` per band (three-pathfinding + grid). Feet = raycast / nav height on 163_1.

**Purged:** Object_163 palm, 72 m whole-pack squash, painted plate / HeroesBlackTide, 90 m green deck pad when 163_1 is present.

## Code

| Module | Role |
|--------|------|
| `shared/definitions/airshipSoloZone.ts` | Paths, NPC defs |
| `client/src/island3d/airship/airshipDeck163.ts` | Hull / wheel / slot bind |
| `client/src/island3d/airship/AirshipSoloZone.ts` | Zone engine |
| `client/src/pages/AirshipZonePage.tsx` | UI + Railway roster (`useCharacters('warlords')`) |
| `client/src/pages/combat.tsx` | Re-export AirshipZonePage |

Account roster: Railway `/api/characters?era=warlords` via `useCharacters` — no second bag DB.
