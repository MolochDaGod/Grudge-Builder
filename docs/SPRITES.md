# Grudge Warlords Sprite System Documentation

## Overview

This document covers the sprite asset management, AI generation workflow, and character template system used in Grudge Warlords.

**Related Documentation:**
- [ANIMATIONS.md](ANIMATIONS.md) - Spell animations, combat effects, particle systems

## Directory Structure

```
public/sprites/
├── heroes/              # Playable character race sprites (6 races)
│   ├── barbarian/
│   ├── dwarf/
│   ├── elf/
│   ├── human/
│   ├── orc/
│   └── undead/
├── enemies/             # Enemy sprites organized by theme
│   ├── fantasy/         # Skeleton, Fire Spirit, Plent
│   └── vampire/         # Vampire types
├── topdown/             # 4-direction top-down sprites
│   ├── goblin/          # Goblin variants with modular parts
│   └── animals/
├── magic/               # Spell effect sprites
│   ├── fire_arrow/
│   ├── fire_ball/
│   ├── water_arrow/
│   └── icons/
├── templates/           # AI generation templates
│   └── eris/            # Eris character templates
│       ├── 16x16/
│       └── 16x32/
├── buildings/           # Structure sprites
├── boats/               # Ship/vessel sprites
├── weapons/             # Weapon sprites
├── portraits/           # Character portrait images
├── ui/                  # UI element sprites
└── dampdungeons/        # Dungeon tileset
```

## Craftpix Asset Catalog

All Craftpix assets are cataloged in `client/src/lib/craftpixAssetCatalog.ts`:

```typescript
import { CRAFTPIX_ASSET_CATALOG, getAssetsByCategory, getAssetById } from '@/lib/craftpixAssetCatalog';

// Get all enemy sprites
const enemies = getAssetsByCategory('enemy');

// Get specific asset
const skeleton = getAssetById('enemy-skeleton');

// Get assets used in a feature
const dungeonAssets = getAssetsUsedIn('dungeon-crawler');
```

### Asset Categories

| Category    | Count | Description                          |
|-------------|-------|--------------------------------------|
| hero        | 9     | Playable character sprites           |
| enemy       | 8     | Enemy creature sprites               |
| magic       | 9     | Spell effect animations              |
| ui          | 3     | User interface elements              |
| environment | 3     | Tiles, decorations, props            |
| template    | 2     | AI generation templates              |
| boat        | 1     | Ship/vessel sprites                  |
| building    | 1     | Structure sprites                    |
| weapon      | 1     | Weapon sprites                       |
| animal      | 1     | Animal creature sprites              |

## Eris Character Template System

The Eris template system provides color-coded body part overlays for AI-assisted sprite generation.

### Template Files

Located in `public/sprites/templates/eris/`:

**16x16 Template:**
- 16x16 All Animations-Sheet.png
- Individual sheets: Idle, Walk, Run, Jump, Interact, Rotate

**16x32 Template:**
- 16x32 All Animations.png
- Individual sheets: Idle, Walk, Run, Jump, Interact, Rotate

### Template Features

- **8-Direction Support**: All 8 compass directions for movement
- **Color-Coded Body Parts**: Blue identifies body segments for AI separation
- **Animation Types**: Idle, Walk, Run, Jump, Interact
- **Aseprite Sources**: .aseprite files included for editing

### AI Generation Workflow

1. **Load Template**: Select 16x16 or 16x32 base template
2. **Color Overlay**: Use blue color coding to identify body parts
3. **AI Prompt**: Generate with Puter AI txt2img using template as reference
4. **Post-Process**: Apply generated textures to template regions
5. **Export**: Save as spritesheet for game use

## Avatar Generation System

### Optimization: Skip Redundant Generation

The system now prevents wasteful AI avatar generation:

```typescript
// In character creation route (server/routes.ts)
if (!character.avatarUrl && !req.body.skipAvatarGeneration) {
  const avatarUrl = await generateCharacterAvatar(...);
  // Only generates if no avatar exists
}
```

### Pre-assigned Admin Heroes

Admin heroes come with pre-assigned avatars to avoid generation:

| Hero      | Race      | Class   | Level | Avatar Path                      |
|-----------|-----------|---------|-------|----------------------------------|
| RacaLVIN  | Dwarf     | Worg    | 5     | /sprites/heroes/dwarf/idle.png   |
| Groown    | Barbarian | Ranger  | 3     | /sprites/heroes/barbarian/idle.png |
| Moloch    | Undead    | Mage    | 4     | /sprites/heroes/undead/idle.png  |

## Animation Conventions

### Standard Actions

| Action    | Filename Pattern    | Frame Count |
|-----------|---------------------|-------------|
| Idle      | idle.png / Idle.png | 4-16        |
| Walk      | walk.png / Walk.png | 8-20        |
| Run       | run.png / Run.png   | 6-12        |
| Attack    | attack.png          | 8-10        |
| Hurt      | hurt.png / Hurt.png | 4-10        |
| Dead      | dead.png / Dead.png | 6-10        |
| Jump      | jump.png / Jump.png | 4-8         |

### Spritesheet Layout

Most spritesheets follow horizontal layout:
- Frames arranged left-to-right
- Consistent frame size within sheet
- Transparent backgrounds (PNG)

## Usage in Components

### SpriteAnimator Component

```tsx
import SpriteAnimator, { SpriteAction } from "@/components/SpriteAnimator";

<SpriteAnimator
  raceId="dwarf"
  classId="worg"
  action="Idle"
  size={128}
  onAnimationComplete={() => {}}
/>
```

### Dungeon Crawler Integration

Sprites are configured in `client/src/lib/dungeonSpriteConfig.ts`:

```typescript
export const DUNGEON_SPRITES = {
  player: {
    path: '/sprites/topdown/orc',
    animations: { idle: {...}, walk: {...}, attack: {...} }
  },
  enemies: {
    skeleton: { path: '/sprites/enemies/fantasy/Skeleton', ... }
  }
};
```

## Adding New Sprites

1. **Place Files**: Add to appropriate category folder in `public/sprites/`
2. **Update Catalog**: Add entry to `craftpixAssetCatalog.ts`
3. **Configure Usage**: Update component configs as needed
4. **Test**: Verify in Sprite Library viewer page

## AI Sprite Generation Tips

1. Use template overlays for consistent proportions
2. Provide clear color separation for body parts
3. Generate in batches for animation consistency
4. Post-process to match game's art style
5. Verify frame alignment before export

## Implementation Files

### Backend
| File | Purpose |
|------|---------|
| `shared/schema.ts` | spriteSheets, spriteManifest, spriteUnitSpecs tables |
| `server/storage.ts` | Sprite CRUD operations |
| `server/routes.ts` | Sprite API endpoints |
| `server/aseprite-reader.ts` | Aseprite file parsing |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/pages/sprite-viewer.tsx` | Sprite preview page |
| `client/src/pages/sprite-library.tsx` | Sprite asset browser |
| `client/src/pages/sprite-editor.tsx` | Pixel art editor |
| `client/src/pages/sprite-admin.tsx` | Sprite administration |
| `client/src/components/SpriteAnimator.tsx` | Basic sprite animation |
| `client/src/components/HeroSpriteAnimator.tsx` | Hero animations |
| `client/src/components/SpriteAnimationEngine.tsx` | Advanced animation engine |
| `client/src/components/GrudgeSprite.tsx` | Universal sprite component |
| `client/src/lib/spriteManifest.ts` | Sprite catalog |
| `client/src/lib/craftpixAssetCatalog.ts` | Craftpix asset catalog |
| `client/src/lib/spriteAnimationEngine.ts` | Animation logic |

### Asset Directories
| Directory | Contents |
|-----------|----------|
| `public/sprites/heroes/` | Playable character sprites (6 races) |
| `public/sprites/enemies/` | Enemy creature sprites |
| `public/sprites/magic/` | Spell effect animations |
| `public/sprites/topdown/` | 4-direction top-down sprites |
| `public/sprites/templates/eris/` | AI generation templates |
| `public/sprites/miniworld/` | MiniWorld dungeon sprites |
| `public/sprites/pirate/` | Ship and sailing sprites |
| `public/sprites/ui/` | UI element sprites |
