# Character prefab pipeline (uMMORPG parity)

Account character → Three.js player prefab, same responsibilities as Unity race player prefabs.

## Flow

```
characterAPI / CharacterManager (Warlords UUID)
        │
        ▼
applyGrudge6PlayerToController()     ← loadGrudge6Player.ts
        │
        ├─ resolve raceId / classId / equipment / model3d
        ├─ weaponTypeFromModel3d
        └─ character.loadCharacterFromManifest(...)
                │
                ├─ RACE_GRUDGE6.cdnPath race GLB
                ├─ setupGrudge6Equipment (mesh wardrobe + weapons)
                ├─ applyGrudge6RaceTextures (full race albedo)
                ├─ ensureCharacterTextureColorSpace + color tints
                ├─ fit to 2m world scale
                ├─ reloadWeaponAnimations (idle/walk/run/attack/…)
                ├─ CharacterIK (foot plant + dash pulse)
                ├─ WeaponHolsterController (draw/holster by mode)
                └─ loadHotbar (weapon skills 1–5 + class Shift+1–5)
```

## Systems

| Concern | Module |
|---------|--------|
| Account / UUID | `characterAPI`, `CharacterManager` |
| Race prefab apply | `loadGrudge6Player.applyGrudge6PlayerToController` |
| Mesh equip | `grudge6Equipment.setupGrudge6Equipment` |
| Textures | `grudge6Textures.applyGrudge6RaceTextures` |
| Locomotion / combat clips | `AnimationManager` + Mixamo packs |
| Weapon skills | `hotbarLayout` + `weaponSkillSelections` |
| Control modes | harvest / combat / build (`setControlMode`) |
| Foot IK + dash | `CharacterIK` · `pulseDashFootIK` · `dash_foot` VFX |
| timeScale slow-mo | `?ikdebug=1` · LMB freeze · RMB 0.1× |

## Island / zone wiring

`Island3DRenderer` effect on `characterId` / race / class / equipment calls `applyGrudge6PlayerToController` after engine ready. Zone/lobby/procedural all share the same path.

## IK debug (threejs-games style)

```
/island-3d?mode=zone&sector=ethereal_falls&ikdebug=1
```

- **LMB hold** → `timeScale = 0` (freeze)
- **RMB hold** → `timeScale = 0.1` (slow-mo)
- Foot phase: `characterIk.getFootPhaseDebugText('left'|'right')`
