# Warlords Systems + CDN (Unity / uMMORPG → Three.js)

**SSOT code:** `shared/definitions/warlordsSystemsCatalog.ts`  
**Published JSON:** `shared/definitions/published/warlords-systems-catalog.json`  
**R2 layout:** `shared/fleet/r2Layout.ts`  
**CDN:** `https://assets.grudge-studio.com`  
**Regenerate:** `npx tsx scripts/export-warlords-systems-catalog.mjs`

---

## Goal

Move Unity / uMMORPG gameplay assets onto CDN and drive Warlords Three.js systems:

| System | Unity idea | Three.js target |
|--------|------------|-----------------|
| Quick craft | Bag craft, no station | `buildSystem` layer `quick` |
| Benches | CraftingStation | Survival multipack **node instances** |
| Dungeons | Instanced rooms | `DungeonInstanceSystem` + kit pieces |
| Weapon skills | Skill trees / hotbar | `weaponSkillsNew` + character progress |
| Scriptable skills | ScriptableObjects | `ScriptableSkillRuntime` + VFX catalog |
| Mesh equipment | Skinned / child mesh slots | `grudge6Equipment` |
| Mounts | Mount prefab + rider bone | `MountSystem` + uMMORPG catalog |
| Flight | Flying mounts | `FlightSystem` + `models/vehicles/flight/` |
| Boats | Ship prefabs | `shipCatalog` + `game/sailing/*` |
| Enemy / neutral NPCs | AI agents | camps, creatures, towns |
| World bosses | Multi-phase bosses | `orcWarriorBoss` + boss CDN packs |

---

## Status snapshot

| Status | Systems |
|--------|---------|
| **live** | quick_craft, weapon_skills, mesh_equipment, boats, wildlife, heroes_codex |
| **partial** | benches, camp, modular, rts, dungeons, vfx, anims, mounts, siege, enemy/neutral NPCs, world bosses |
| **planned** | scriptable_skills (full data-driven), flight meshes |

---

## CDN taxonomy (upload only here)

```
models/
  buildings/survival|benches|towers|village/
  warlords/mines|rts|faction/
  characters/races/
  grudge6/races/
  equipment/
  animations/{weapon}/
  vehicles/mounts|siege|flight|anims/
  ships/
  creatures/land|fish|monsters|bosses/
  npcs/hostile|neutral/
  dungeons/pieces|entrances|props/
  projectiles/
vfx/
  skills|weapons|hits|auras/
  warlords-vfx-catalog.json
```

**Already live examples**

- `models/ummorpg-vehicles-catalog.json` + cavalry / catapult packs  
- `models/ships/ship-small.glb` (+ medium/large in catalog)  
- `models/characters/races/human.glb`  
- `models/creatures/land/crab.glb`, bear, etc.  
- Grudge6 race multipacks for mesh equip  

**Missing / next uploads**

- `vfx/warlords-vfx-catalog.json` + skill FX packs  
- `models/dungeons/warlords-dungeon-kit.json` + modular pieces  
- `models/vehicles/flight/*`  
- `models/creatures/bosses/*`, dark-elf camp units  
- Full weapon animation packs under `models/animations/{sword|bow|…}/`  

---

## Runtime scaffolds (new)

| Module | Path |
|--------|------|
| MountSystem | `client/src/island3d/systems/MountSystem.ts` |
| FlightSystem | `client/src/island3d/systems/FlightSystem.ts` |
| DungeonInstanceSystem | `client/src/island3d/systems/DungeonInstanceSystem.ts` |
| ScriptableSkillRuntime | `client/src/island3d/systems/ScriptableSkillRuntime.ts` |

Wire into `Island3DEngine` / play mode when ready:

```ts
import { MountSystem, DungeonInstanceSystem, ScriptableSkillRuntime } from './systems';
```

---

## Upload batches (priority order)

1. **Survival kit + benches** — multipack node extract (PackModelLoader)  
2. **uMMORPG mounts/siege/anims** — mostly done; fill missing races  
3. **Ships** — ensure medium/large + enemy ships  
4. **Weapon anim packs** — freeform equip combat  
5. **Skill VFX catalog** — scriptable skills  
6. **Dungeon kit** — instanced floors  
7. **NPC/boss meshes** — dark elf camps, rhinos, raptors, wisps  
8. **Flight packs**  

Local vehicle source often: `Desktop/ObjectStore/public/vehicles/ummorpg/`  
Pipeline reference: `ObjectStore/scripts/process-ummorpg-vehicles.mjs`  
Build packs: `npm run upload:build-packs` / `upload:warlords-assets` (see package.json)

---

## Benches & quick craft (rules)

Do **not** collapse layers:

1. **Quick craft** — bag only  
2. **Camp stages** — tent/fire/bedroll  
3. **Benches** — world station + profession XP  
4. **Modular** — snap build  
5. **RTS** — train units → hero promote  

See `docs/BUILD_SYSTEM_SSOT.md`.

---

## Dungeons as node instances

Today: portals via mountain triad / mines; definitions in `lore.DUNGEON_DEFINITIONS`.  

Target:

1. Entrance mesh from CDN  
2. On enter → Colyseus dungeon room  
3. Floor built from `models/dungeons/pieces/*` instances (seeded)  
4. Boss from `bossId`  

`DungeonInstanceSystem` implements portal spawn + placeholder floor until kit JSON exists.

---

## Skills pipeline

```
weaponSkillsNew (options)
    → ScriptableSkillRuntime.registerMany(...)
    → cast() → animKey + vfxKey + damage hooks
    → CDN vfx/skills/{id}/ + SkillEffects shaders
```

Character progress fields: `weaponSkillSelections`, `weaponSkillLevel` (Railway).

---

## Mounts / flight / boats

| Mode | Catalog | Runtime |
|------|---------|---------|
| Ground mount | ummorpg-vehicles-catalog | MountSystem |
| Flight | flight CDN (planned) | FlightSystem |
| Water | shipCatalog | game/sailing/* |

Rider attach: bone `Bip001` + `riderOffsetY` from vehicle catalog.

---

## NPCs & bosses

| Kind | Definitions | Assets |
|------|-------------|--------|
| Hostile camps | npcCamps, zoneServerNodes | grudge6 bandits + creatures |
| Neutral / vendors | factionTowns, lobby islands | toon soldiers / race prefabs |
| Heroes | heroCodex | portraits + race meshes |
| World boss | orcWarriorBoss + bosses.json | models/creatures/bosses/ |

---

## ObjectStore publish

After export, upload JSON:

```
objectstore …/api/v1/warlords-systems-catalog.json
# and/or info.grudge-studio.com/api/v1/warlords-systems-catalog.json
```

Keep binaries on R2 only; catalogs may dual-publish.

---

## Agent rules

1. Warlords client = `grudge-builder` → grudgewarlords.com  
2. Do not mix GRUDGES/Nexus voxel Codex into Warlords play CDN requirements  
3. New GLBs only under taxonomy prefixes  
4. Prefer multipack **node instances** (PackModelLoader) over whole-scene dumps  
5. Scriptable skills: data first, no new hard-coded skill classes unless needed  
