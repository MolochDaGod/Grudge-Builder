# Grudge Warlords Animation System Documentation

## Overview

This document covers the spell animation system, combat effects, and animation techniques used in Grudge Warlords. The system supports sprite sheets, frame sequences, and various animation types for projectiles, impacts, buffs, and status effects.

**3D character packs (Bip001):** baked rotation-only JSON under `/anims/baked/{pack}/`.  
**Greatsword samurai:** `greatsword_samurai` — see [MODELS_AND_RETARGET_BEST_PRACTICES.md](./MODELS_AND_RETARGET_BEST_PRACTICES.md) (naming `gs_samurai_*`, Y-hip lock, XZ pelvis center).  
**SSOT:** `shared/definitions/greatswordSamuraiCombat.ts` · client `game/toon/greatswordSamuraiOverride.ts`.

## Animation Definition Structure

All animations are defined in `shared/definitions/spellAnimations.ts`:

```typescript
interface SpellAnimation {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description: string;           // Description
  basePath: string;              // Sprite path
  frameCount: number;            // Number of frames
  fps: number;                   // Frames per second
  loop: boolean;                 // Loop animation
  type: SpellAnimationType;      // Animation type
  element: DamageElement;        // Damage element
  scale?: number;                // Render scale
  travelSpeed?: number;          // Projectile speed
  opacity?: number;              // Render opacity (0-1)
  isSheet?: boolean;             // Sprite sheet format
  sheetColumns?: number;         // Columns in sheet
  framePattern?: string;         // Frame file pattern
  colorInvert?: boolean;         // Apply color inversion
  hitScale?: number;             // Scale for normal hits
  critScale?: number;            // Scale for critical hits
  usageNotes?: string;           // Implementation notes
}
```

## Animation Types

| Type | Description | Example Use |
|------|-------------|-------------|
| `projectile` | Travels from caster to target | Fireballs, arrows, bullets |
| `impact` | Plays on target when hit | Explosions, slashes |
| `aoe` | Area effect centered on target | Meteor, holy rain |
| `self` | Plays on caster | Buffs, heals |
| `beam` | Continuous line caster→target | Lightning, judgment |
| `slash` | Melee after-effect overlay | Sword slashes |
| `buff` | Persistent aura effect | Shields, DOTs |
| `ground` | Ground-based effect | Tremors, traps |
| `cast` | Cast animation before spell | Channeling |

## Damage Elements

- `fire`, `ice`, `water`, `lightning`, `arcane`, `holy`, `shadow`, `nature`, `physical`

## Sprite Format Types

### 1. Sprite Sheets (isSheet: true)

Single image with frames arranged in columns/rows:

```
public/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/
├── arcanebolt.png      # 1536x1024 (8 columns × 4 rows)
├── flamestrike.png     # 1536x1024
├── frostbolt.png       # 1536x1024
└── holylight.png       # 1536x1024
```

Configuration:
```typescript
{
  isSheet: true,
  sheetColumns: 8,
  frameCount: 8
}
```

### 2. Frame Sequences (isSheet: false)

Individual numbered frames in a folder:

```
public/sprites/spells/fire-ball/
├── frame_1.png
├── frame_2.png
├── ...
└── frame_8.png
```

Configuration:
```typescript
{
  basePath: "/sprites/spells/fire-ball",
  framePattern: "frame_{N}.png",
  frameCount: 8
}
```

### Frame Pattern Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{N}` | Simple number (1, 2, 3...) | `frame_{N}.png` → `frame_1.png` |
| `{NN}` | Zero-padded (01, 02, 03...) | `Frame_{NN}.png` → `Frame_01.png` |

## Animation Categories

### Magic Projectiles (8-Frame Sheets)

| Animation | Element | Type | Path |
|-----------|---------|------|------|
| arcanebolt | arcane | projectile | 8imagespritemagic/arcanebolt.png |
| arcanelightning | lightning | beam | 8imagespritemagic/arcanelighting.png |
| flamestrike | fire | impact | 8imagespritemagic/flamestrike.png |
| frostbolt | ice | projectile | 8imagespritemagic/frostbolt.png |
| holylight | holy | self | 8imagespritemagic/holylight.png |
| tornado | nature | aoe | 8imagespritemagic/tornado.png |
| poison_cloud | nature | aoe | 8imagespritemagic/poison.png |

### Arrow Projectiles (Single Frame)

| Animation | Size | Speed | Use Case |
|-----------|------|-------|----------|
| arrow_standard | 100x100 | 500 | Basic bow attack |
| arrow_piercing | 100x100 | 550 | Armor-piercing shot |
| arrow_heavy | 100x100 | 400 | Stun/bleed arrows |

Arrow behavior:
1. Follows trajectory from bow to target
2. On hit: drops to z-level -1 (behind character)
3. Sticks halfway into enemy center
4. Fades based on effect duration (bleed/stun)

### Gun/Ranged Attacks (Fast Travel)

| Animation | Scale | Speed | Use Case |
|-----------|-------|-------|----------|
| gun_shot | 0.5 | 700 | Pistol bullets |
| magic_bullet | 0.7 | 600 | Wand/staff attacks |
| cannon_shot | 1.5 | 400 | Ship cannons |

### Critical Hit Effects (Anime Flash Style)

| Animation | Frames | FPS | Use Case |
|-----------|--------|-----|----------|
| red_blast_hit | 3 | 18 | Melee crit flash |
| red_crit_bleed | 6 | 16 | Bleed crit effect |
| fire_red_blast | 3 | 18 | Magic crit flash |

### Mana Shield / Barriers

| Animation | Opacity | FPS | Element |
|-----------|---------|-----|---------|
| mana_shield | 0.5 | 10 | water |
| arcane_barrier | 0.5 | 12 | arcane |
| ice_barrier | 0.6 | 8 | ice |
| holy_shield | 0.4 | 14 | holy |

Shield behavior:
- Character renders centered inside spinning bubble
- Loops until shield breaks or spell expires
- Use CSS filters for color variations

### Fire Particle Effects

| Animation | Scale | Use Case |
|-----------|-------|----------|
| fire_particle | 0.2 | Spawn 2-5 after fire hits |
| fire_spray | 0.15 | Spawn 3-6 for sword/gun/bomb |
| fire_ember | 0.25 | Burning DOT indicator (loops) |

### Holy Multi-Pattern Attacks

| Animation | Pattern | Implementation |
|-----------|---------|----------------|
| priest_attack | Single | Normal holy attack |
| holy_rain | Area | Spawn 5-8 beams scattered, 50-150ms stagger |
| judgment | Line | 3-5 beams in sequence, 100ms apart |
| healing_smite | Single | Heal items, basic smite |

## Flash Step Animation Technique

For rapid movement sequences with slash effects:

### Timeline Structure (12 frames @ 24fps)

| Frame | Action | Duration |
|-------|--------|----------|
| 1 | Starting pose (keyframe) | 1 frame |
| 2-4 | First flash step | 3 frames |
| 5-7 | Second flash step | 3 frames |
| 8 | Slash effect appears | 1 frame |
| 9-10 | Slash fades/scales | 2 frames |
| 11-12 | Follow-through pose | 2 frames |

### Layer Organization

```
Layer 1: Character_Movement  (sprite keyframes)
Layer 2: Slash_Effect        (attack overlay)
Layer 3: Particle_Effects    (optional debris)
```

### Implementation Notes

1. **Motion Tweening**: Use for smooth transitions between steps
2. **Frame-by-Frame**: Use for precise rapid movements
3. **Alpha Tweening**: Fade slash effect 1.0 → 0.0 over 2-3 frames
4. **Scale Tweening**: Slash grows slightly then shrinks

## Ability Mapping System

Abilities are mapped to animations in `WEAPON_ABILITY_ANIMATIONS`:

```typescript
export const WEAPON_ABILITY_ANIMATIONS = [
  { abilityId: "fireball", animationId: "fire_ball", notes: "Basic fire spell" },
  { abilityId: "melee_crit", animationId: "red_blast_hit", notes: "Critical hit flash" },
  // ...
];

// Usage
const animation = getAbilityAnimation("fireball");
```

### Ability Categories

| Category | Example Abilities |
|----------|-------------------|
| Elemental Magic | fireball, frostbolt, lightning_bolt |
| Bow Attacks | basic_shot, fire_arrow, pierce_shot |
| Gun Attacks | gun_shot, pistol_shot, cannon_fire |
| Melee Effects | melee_crit, slash_heavy, blade_wave |
| Buffs/Shields | mana_shield, frost_armor, burning |
| Holy Patterns | holy_rain, judgment, divine_storm |

## Rendering Implementation

### Basic Sprite Sheet Animation

```typescript
function renderSpriteSheet(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frameIndex: number,
  columns: number,
  x: number,
  y: number
) {
  const frameWidth = image.width / columns;
  const frameHeight = image.height;
  const col = frameIndex % columns;
  
  ctx.drawImage(
    image,
    col * frameWidth, 0,           // Source x, y
    frameWidth, frameHeight,       // Source size
    x - frameWidth / 2, y - frameHeight / 2,  // Dest position
    frameWidth, frameHeight        // Dest size
  );
}
```

### Frame Sequence Animation

```typescript
function getFramePath(basePath: string, pattern: string, frame: number): string {
  return `${basePath}/${pattern.replace('{N}', String(frame)).replace('{NN}', String(frame).padStart(2, '0'))}`;
}
```

### Opacity and Color Effects

```typescript
// Apply opacity
ctx.globalAlpha = animation.opacity ?? 1.0;

// Apply color inversion (for element variants)
if (animation.colorInvert) {
  ctx.filter = 'hue-rotate(180deg)'; // or specific hue for element
}
```

## Particle System Guidelines

### Fire Spray Pattern

```typescript
function spawnFireParticles(x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI - Math.PI / 2; // Behind target
    const speed = 50 + Math.random() * 100;
    const particle = {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      animation: 'fire_particle',
      frame: 0,
      scale: 0.15 + Math.random() * 0.1
    };
    particles.push(particle);
  }
}
```

### Holy Rain Pattern

```typescript
function spawnHolyRain(centerX: number, centerY: number, radius: number) {
  const beamCount = 5 + Math.floor(Math.random() * 4); // 5-8 beams
  for (let i = 0; i < beamCount; i++) {
    setTimeout(() => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      spawnAnimation('holy_rain', 
        centerX + Math.cos(angle) * dist,
        centerY + Math.sin(angle) * dist
      );
    }, i * (50 + Math.random() * 100)); // 50-150ms stagger
  }
}
```

## Database Storage

Animation definitions are stored in TypeScript for type safety, but runtime animation state can be stored in the database:

```typescript
// Character active effects (in schema)
activeEffects: text("active_effects").array() // ["burning", "mana_shield"]

// Combat log with animation references
combatLog: jsonb("combat_log") // [{action: "attack", animation: "fireball", ...}]
```

## Cloud Storage Integration

For custom/generated animations:

```typescript
// Store generated sprite in object storage
const spriteUrl = await objectStorage.upload(
  `sprites/generated/${characterId}_attack.png`,
  spriteBuffer
);

// Reference in animation definition
{
  id: `custom_${characterId}_attack`,
  basePath: spriteUrl,
  // ...
}
```

## Implementation Files

| Type | File | Description |
|------|------|-------------|
| Definitions | `shared/definitions/spellAnimations.ts` | Animation configs |
| Renderer | `client/src/components/SpellAnimator.tsx` | Animation playback |
| Combat | `client/src/lib/combatRenderer.ts` | Combat animation logic |
| Gallery | `client/src/pages/character-gallery.tsx` | Animation preview |

## Quick Reference: Animation Counts

| Category | Count |
|----------|-------|
| Magic Projectiles | 20+ |
| Physical Effects | 15+ |
| Arrow/Bullet Types | 8 |
| Shield/Barrier Types | 4 |
| Critical Hit Effects | 5 |
| Elemental Slashes | 10 |
| Holy Patterns | 4 |
| Fire Particles | 4 |
| Total Animations | 100+ |

---

## Babylon.js 3D Integration

For 3D character models and advanced animations, Grudge Warlords supports Babylon.js with glTF model loading.

### glTF 2.0 Skinning

Skinning in glTF works differently from standard Babylon.js:

1. **Bones with Linked Nodes**: Skeleton joints point to nodes in the scene hierarchy
2. **Transform Linking**: Bones are linked via `bone.linkTransformNode()` to corresponding scene nodes
3. **Transform Priority**: Joint transforms are applied to skinned mesh; mesh node transform is ignored

```typescript
// Bones are linked to scene nodes
// Modify the linked node, not the bone directly
const linkedNode = bone.getTransformNode();
linkedNode.position.y += 1; // This works
// bone.position.y += 1;    // This gets overwritten
```

### glTF Loader Extensions

Create custom glTF extensions for special handling:

```typescript
import { IGLTFLoaderExtension, registerGLTFExtension } from "@babylonjs/loaders/glTF/2.0";

class GrudgeCharacterExtension implements IGLTFLoaderExtension {
  public readonly name = "grudgeCharacter";
  public enabled = true;
  public order = 100;

  public loadMaterialPropertiesAsync(context, material, babylonMaterial) {
    // Custom material handling for Grudge characters
    return null; // Return null to use default behavior
  }
}

// Register the extension
registerGLTFExtension("grudgeCharacter", false, async (loader) => {
  return new GrudgeCharacterExtension(loader);
});
```

### Extension Options

Pass options when loading models:

```typescript
await LoadAssetContainerAsync("path/to/character.glb", scene, {
  pluginOptions: {
    glTF: {
      extensionOptions: {
        grudgeCharacter: {
          applyGrudgeShading: true,
          skeletonScale: 1.0,
        },
      },
    },
  },
});
```

### Action Manager for Interactive Animations

Babylon.js ActionManager enables interactive sprite/mesh behaviors:

```typescript
// Attach action manager to mesh
mesh.actionManager = new BABYLON.ActionManager(scene);

// Trigger animation on click
mesh.actionManager.registerAction(
  new BABYLON.InterpolateValueAction(
    BABYLON.ActionManager.OnPickTrigger,
    mesh,
    "visibility",
    0.2,
    1000
  )
);

// Chain actions (click toggles)
mesh.actionManager.registerAction(
  new BABYLON.InterpolateValueAction(
    BABYLON.ActionManager.OnPickTrigger,
    mesh,
    "visibility",
    0.2,
    1000
  )
).then(
  new BABYLON.InterpolateValueAction(
    BABYLON.ActionManager.OnPickTrigger,
    mesh,
    "visibility",
    1.0,
    1000
  )
);
```

### Available Triggers

| Trigger | Description |
|---------|-------------|
| `OnPickTrigger` | Touch/click on mesh |
| `OnDoublePickTrigger` | Double touch/click |
| `OnPointerOverTrigger` | Hover over mesh |
| `OnPointerOutTrigger` | Hover exit |
| `OnIntersectionEnterTrigger` | Mesh collision enter |
| `OnIntersectionExitTrigger` | Mesh collision exit |
| `OnKeyDownTrigger` | Key pressed (scene) |
| `OnKeyUpTrigger` | Key released (scene) |
| `OnEveryFrameTrigger` | Every frame (scene) |

### Available Actions

| Action | Description |
|--------|-------------|
| `InterpolateValueAction` | Animate property over time |
| `SetValueAction` | Set property directly |
| `SwitchBooleanAction` | Toggle boolean |
| `PlayAnimationAction` | Play animation on target |
| `StopAnimationAction` | Stop animation |
| `ExecuteCodeAction` | Run custom code |
| `CombineAction` | Execute multiple actions |

### Conditional Actions

```typescript
mesh.actionManager.registerAction(
  new BABYLON.InterpolateValueAction(
    BABYLON.ActionManager.OnPickTrigger,
    camera,
    "alpha",
    0,
    500,
    new BABYLON.PredicateCondition(mesh.actionManager, () => {
      return player.hasAbility("flash_step");
    })
  )
);
```

### Sprite Action Manager

Sprites can also have action managers:

```typescript
spriteManager.isPickable = true;
sprite.isPickable = true;
sprite.actionManager = new BABYLON.ActionManager(scene);

sprite.actionManager.registerAction(
  new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnPickTrigger,
    () => playSpellAnimation("fireball")
  )
);
```

### 3D Integration Files

| File | Purpose |
|------|---------|
| `@davi-ai/bodyengine-three` | 3D character physics |
| Future: `client/src/lib/babylon/` | Babylon.js scene setup |
| Future: `client/src/components/Character3D.tsx` | 3D character renderer |

### Resources

- [Babylon.js glTF Skinning](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF/glTFSkinning/)
- [glTF Extensions Guide](https://babylonjs.medium.com/extending-the-gltf-loader-in-babylon-js-588e48fb692b)
- [Babylon.js Actions](https://doc.babylonjs.com/features/featuresDeepDive/events/actions)
