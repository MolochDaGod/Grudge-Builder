# Ethereal Falls — destruction half + cold band

**SSOT**
| Piece | Path |
|-------|------|
| Diagonal rules | `shared/definitions/etherealDestructionZone.ts` |
| Cold assets | `shared/definitions/coldBiomeAssets.ts` |
| Runtime | `client/src/island3d/zone/EtherealDestructionSystem.ts` |
| Terrain | `ZoneTerrainGenerator` `heightmapModifier: ethereal_falls` |
| Engine | `Island3DEngine` when `sectorId === ethereal_falls` |

## Map position

Ethereal Falls is **top-left (NW)** of the 9-sector world:

```
        col0                 col1              col2
row0    Ethereal Falls ★     Frostbite         Thornwood
row1    Stormbreak (cold)    Nexus             Ashen
row2    Abyssal (ice-rim)    Haven             Ember
```

## Diagonal cut (instance-local)

Map-aligned `u` = west→east, `v` = north→south.

| Region | Condition | Behaviour |
|--------|-----------|-----------|
| **NW destruction half** | `u + v < 1` | Water lifts, islands float toward tip, surface physics broken |
| **SE playable shelf** | `u + v ≥ 1` | Sane ethereal terrain, Crusade cold garrison |
| **Tip** | `u≈0, v≈0` | Cosmic Waterfall / Madra void — top-left destruction hole |

## Rules (hard)

1. **Ships do not return** once they enter the destruction half.
2. **Character death** in the field **voids all drops** (no corpse loot).
3. **Ally NPCs** that die in the field are **permanent death** for that instance.
4. **Surface physics broken** in the field (ground, ships, water).
5. **Flight exempt**: flying mounts, flying creatures, and airborne players keep usable physics.

## Cold biomes + Crusade

| Sector | Role |
|--------|------|
| `frostbite_expanse` (N) | Primary frozen — ice kit, arctic scene, dwarf kit (Fabled capital) |
| `ethereal_falls` (NW) | Cold-magic + destruction — Crusade front |
| `stormbreak_reef` (W / mid-left) | Frozen storm shelf — Crusade cold patrols |
| `abyssal_trench` (SW / bottom-left) | Deep + northern ice-rim (western cold band) |

Crusade mainly operates in **cold**: Ethereal Falls + Stormbreak ice approaches (see `CRUSADE_COLD_SECTORS`).

### Attached / downloaded packs

| Source | Game path |
|--------|-----------|
| `D:\Games\Models\dwarf_modelkit.glb` | `/models/biomes/cold/dwarf_modelkit.glb` |
| `D:\Games\Models\low_poly_arctic_scene.glb` | `/models/biomes/cold/low_poly_arctic_scene.glb` |
| `D:\Games\Models\wizards_house.glb` | `/models/biomes/cold/wizards_house.glb` |
| ice multipack | `/models/biomes/ice/ice_biome_kit.glb` |
| snowbiomes | `/models/nature/stylized/biome/snowbiomes.glb` |

```bash
node scripts/copy-cold-biome-assets.mjs
```

## Play entry

```
/play?mode=zone&sector=ethereal_falls&worldSeed=grudge-world-1
```

Spawn prefers **SE shelf** (playable). Crossing the glowing diagonal into the NW half triggers destruction field prompts.

## Events

```ts
window.addEventListener('grudge:ethereal-destruction', (e) => {
  console.log(e.detail.prompt);
});
```
