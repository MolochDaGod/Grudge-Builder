# Production map package

Canonical open-world map for Forge + runtime.

| File | Role |
|------|------|
| `grudge-open-world.gmap.json` | Full production package (layers, AI, network, missions, tide clock) |
| `grudge-open-world.studio.json` | Forge MapProject import (auto-loaded) |
| `manifest.json` | Version + entity counts |
| `maps/` | Copy of the same package |

## Rebuild

```bash
npm run map:build-gmap
# then re-copy public/maps/grudge-open-world/* → production/
```

## Game clock

- 1 game day = **6 real hours**
- 1 game week = **8 game days** = **2 real days**
- Tides = **2× per game day**, amplitude **±0.22 m**, mean Y **−0.85**

## Forge auto-load

Files are mirrored to `RTS-Grudge/studio/public/production/`.  
Map Editor loads them on open via `loadProductionMap.ts`.
