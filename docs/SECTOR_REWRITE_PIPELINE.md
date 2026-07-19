# Sector Rewrite Pipeline

**One sector at a time.** Lore first → info pages → build → live flyby proof.

## Order

1. `ethereal_falls` (pilot — dossier complete through **build_spec**)
2. `frostbite_expanse`
3. `thornwood_wilds`
4. `stormbreak_reef`
5. `convergence_nexus`
6. `ashen_wastes`
7. `abyssal_trench`
8. `haven_shore`
9. `ember_depths`

## Stages

| Stage | Meaning |
|-------|---------|
| `queued` | Not started |
| `describe` | Writing dossier (lore, locals, tone) |
| `info_published` | Live on `/lore/sectors` + dossiers JSON |
| `build_spec` | Build wants approved |
| `building` | Implementing meshes / density / systems |
| `proof` | Flyby video + snapshots captured |
| `complete` | Next sector may start |

## Principles

1. Describe lore and locals **before** any rewrite.
2. Publish dossier to grudge.studio lore/info before build.
3. Build only what is right for that sector.
4. Reuse `sectorProductionContent` + biome ecosystem — no fork tables.
5. Prove on **live zone** with flyby + snapshots (animals, NPCs, monsters, harvestables, captains, travelers, nodes, landmarks…).
6. Complete one sector before opening the next.

## Dependencies (do not fork)

- `shared/definitions/sectorDossiers.ts`
- `shared/definitions/sectorProductionContent.ts`
- `shared/definitions/worldMapSectors.ts`
- `shared/definitions/biomeEcosystemCatalog.ts`
- `shared/definitions/zoneServerNodes.ts`
- `Island3DEngine` zone mode · `SectorRoom` Colyseus

## Commands

```bash
npm run production:publish-dossiers
npm run production:publish-sectors
```

## Proof flyby

```
/island-3d?mode=zone&sector=ethereal_falls&worldSeed=grudge-world-1&flyby=1&proof=1
```

Click **Start flyby** → records WebM + PNG snapshots → **Download proof package**.

## URLs

| Surface | Path |
|---------|------|
| Lore index | `/lore/sectors` |
| Ethereal dossier | `/lore/sectors/ethereal_falls` |
| API all | `/api/production/dossiers` |
| API one | `/api/production/dossiers/ethereal_falls` |
| Static | `/production/dossiers-content.json` |

## After Ethereal proof

1. Mark `ethereal_falls` stage → `complete` in `sectorDossiers.ts`
2. Expand `frostbite_expanse` stub into full dossier (`describe` → `info_published` → `build_spec`)
3. Build + prove Frostbite only
