# Weapon tier shaders (Three.js)

**Yes — this is the production path.** We use progressive Three.js materials (not a single flat color), so **T1 looks rough** and each tier adds polish, glow, particles, and blade edge work.

## Ladder

| Tier | Material | Look |
|------|----------|------|
| **T1 Crude** | `MeshStandardMaterial` flatShading | High roughness (~0.92), low metal, heavy forge noise — **rough scrap** |
| **T2 Iron** | Standard | Still rough, more metal |
| **T3 Steel** | `MeshPhysicalMaterial` | Clearcoat starts, cool emissive, less noise |
| **T4 Hardened** | Physical + **spark_trail** | Edge rim, polish, first particles |
| **T5 Runic** | Physical + **onBeforeCompile** rim/sheen | Purple glow pulse, rune trail + aura |
| **T6 Infernal** | Physical + flame trail/aura | Hot emissive pulse, strong rim |
| **T7 Legendary** | High clearcoat + gold trail | Mirror polish, strong sheen |
| **T8 Mythic** | Max metal/clearcoat + mythic FX | Full rim + pulse + violet glow |

## Enhancement + infusion (stacked on tier)

| Enhancement | Effect on shaders |
|-------------|-------------------|
| sharpened | −roughness, +edge rim, +sheen |
| reinforced | +metalness |
| balanced | cleaner roughness |
| masterwork | big polish + rim |

| Infusion | Glow / trail / rim |
|----------|---------------------|
| fire / frost / lightning / arcane / holy / nature / void | overrides emissive + trail particle + fresnel color |

SSOT: `buildWeaponShaderStack(tier, enhancement, infusion)` in `weaponTierVisuals.ts`.

## Runtime API

```ts
import { WeaponTierShaderSystem } from '@/island3d/vfx/WeaponTierShaderSystem';
import { buildWeaponShaderStack } from '@shared/definitions/weaponTierVisuals';

// After loading weapon GLB into `weaponRoot` (hand bone child):
const shaders = new WeaponTierShaderSystem(scene, worldFx);
shaders.applyToWeapon(weaponRoot, {
  tier: 6,
  enhancement: 'sharpened',
  infusion: 'fire',
});

// In game loop:
shaders.update(dt);
```

### What the shader does (T4+)

`MeshPhysicalMaterial.onBeforeCompile`:

1. **Surface noise** — procedural forge scars (stronger on low tiers)  
2. **Emissive pulse** — infusion / mythic breathing glow  
3. **Fresnel edge rim** — blade edge catch light (tier + infusion color)  
4. **Blade sheen** — specular streak along the edge  

T1–T2 stay **Standard + noise** so crude gear stays matte and dirty without expensive physical clearcoat.

## Particles

From `WeaponShaderStack.trail` / `.aura` → existing `WorldFxBus` trail ribbons + aura presets (`spark_trail`, `flame_trail`, `rune_trail`, `golden_trail`, `mythic_trail`, …).

## Why not full custom GLSL from T1?

- **Performance** — hundreds of equipped weapons; Physical + light `onBeforeCompile` is the Three.js production sweet spot (r185+).  
- **Map preservation** — keeps albedo/normal maps from converted codex GLBs.  
- **Readable ladder** — rough→polish is mostly **roughness/metalness**, not a different mesh.

## Files

| File | Role |
|------|------|
| `shared/definitions/weaponTierVisuals.ts` | Tier + enhancement + infusion numbers |
| `client/src/island3d/vfx/WeaponTierShaderSystem.ts` | Apply materials + update pulse |
| Prefab mesh | `weaponPrefabCatalog` style GLB |
| Style icon colors | `STYLE_ICON_MATCH` (icons should track same palette) |
