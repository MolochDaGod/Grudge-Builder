# Grudge Warlords Frontend Documentation

## Technology Stack
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7
- **Styling:** TailwindCSS 4 + shadcn/ui components (New York style)
- **Routing:** Wouter (lightweight router)
- **State Management:** TanStack React Query (server state) + React useState (UI state)
- **Animation:** Framer Motion + Custom SpriteAnimator
- **Assets:** ObjectStore CDN (`assetUrl()`) + GitHub Pages JSON API (`apiUrl()`)
- **Auth:** Grudge ID (JWT via grudgeBackend.ts, SSO across Grudge Studio apps)

---

## Project Structure

```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # shadcn/ui components
│   │   └── profession/  # Profession-specific components
│   ├── data/            # Game data definitions
│   │   └── crafting/    # Crafting recipes and profession data
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and game logic
│   │   ├── grudaDB.ts           # Client-side game database
│   │   ├── islandSystem.ts      # Island gameplay logic
│   │   ├── spriteManifest.ts    # Sprite catalog
│   │   ├── dungeonGenerator.ts  # Dungeon procedural generation
│   │   └── miniworldTileset.ts  # MiniWorld dungeon sprites
│   ├── pages/           # Route components
│   └── App.tsx          # Main app with routing
├── index.html           # Entry HTML
└── vite.config.ts       # Vite configuration
```

---

## Routes & Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `pages/login.tsx` | Entry point / login screen |
| `/intro` | `pages/intro.tsx` | Game introduction sequence |
| `/home` | `pages/home.tsx` | Main hub / navigation |
| `/character` | `pages/character-builder.tsx` | Character roster & management |
| `/professions` | `pages/professions.tsx` | Artisan Guild with gathering/crafting |
| `/database` | `pages/database.tsx` | Item/recipe browser |
| `/island` | `pages/island.tsx` | Resource gathering with animated sprites |
| `/combat` | `pages/combat.tsx` | Turn-based battle system |
| `/rpg-battle` | `pages/rpg-battle.tsx` | Alternative combat interface |
| `/skills` | `pages/skill-tree.tsx` | Weapon skill tree (alias route) |
| `/skill-tree` | `pages/skill-tree.tsx` | Weapon skill tree system |
| `/admin` | `pages/admin.tsx` | Developer/testing tools |
| `/dungeon` | `pages/dungeon-tiled.tsx` | Procedural dungeon exploration |
| `/sprites` | `pages/sprite-engine.tsx` | Sprite engine testing |
| `/sprite-editor` | `pages/sprite-editor.tsx` | Pixel art sprite editor |
| `/sprite-viewer` | `pages/sprite-viewer.tsx` | Sprite preview and testing |
| `/sprite-library` | `pages/sprite-library.tsx` | Sprite asset browser |
| `/sprite-admin` | `pages/sprite-admin.tsx` | Sprite administration panel |
| `/world-map` | `pages/world-map.tsx` | World map sailing system |
| `/missions` | `pages/mission-board.tsx` | AI mission board |
| `/arsenal` | `pages/ArsenalPage.tsx` | Weapon arsenal display |
| `/wallet` | `pages/WalletPage.tsx` | Solana wallet integration |
| `/hero-sprites` | `pages/hero-sprites.tsx` | Hero sprite gallery |
| `/templates` | `pages/template-viewer.tsx` | Sprite template viewer |

### Login (`/`)
Entry point with guest login option and admin access via footer key icon.

### Admin System
The app uses a dual-account system for complete data isolation:
- **Admin Mode**: Click key icon in footer, enter admin password
- **Guest Mode**: Default mode for regular users
- **Transition Screen**: Loading overlay during account switch
- **Navigation Gating**: Nav items hidden until account has characters

### Character Builder (`/character`)
Main character management interface:
- Character roster (left sidebar)
- Character sheet with equipment paper doll
- Attribute management
- Inventory display
- Animation controls for sprite preview

### Combat (`/combat`)
Turn-based battle system with:
- Party management (up to 3 characters)
- Enemy encounters
- Skill-based combat with weapon hotkeys (1-4)

### Dungeon (`/dungeon`)
Procedural dungeon exploration:
- AI-generated or fallback dungeon layouts
- Tile-based movement with DirectionalSprite
- Enemy encounters
- Treasure collection

### Island (`/island`)
Resource gathering area:
- AI-generated island map background
- Clickable resource nodes (9 types)
- Animated character gathering
- Profession XP progression

### Professions (`/professions`)
Artisan Guild interface with three tabs:
- **Gathering Tab:** Mining, Logging, Skinning, Fishing, Herbalism, Scavenging
- **Crafting Tab:** Miner, Forester, Mystic, Engineer, Chef — with profession art banners from ObjectStore
- **Skill Trees Tab:** Visual skill tree per crafting profession
- T1-T8 tier progression
- Recipe browser with synergy mappings
- Contained single-screen layout with scrollable panels
- Profession icons and background art from `assets.grudge-studio.com/images/professions/`

### Skills (`/skills`, `/skill-tree`)
Weapon skill tree system:
- 5 weapon types: Sword, Axe, Bow, Staff, Dagger
- 4 hotkey slots per weapon
- Upgradeable abilities

### Sprite Editor (`/sprite-editor`)
Custom sprite creation tool:
- Pixel art editor canvas
- AI sprite generation via Grudge AI Gateway (ai.grudge-studio.com)
- Aseprite file import
- Animation preview

### Admin (`/admin`)
Developer tools:
- Sprite testing panel
- Animation previews
- Character sprite viewer

### Database (`/database`)
Item and recipe browser for game content.

---

## Key Components

### Animation Components
| Component | File | Purpose |
|-----------|------|---------|
| SpriteAnimator | `components/SpriteAnimator.tsx` | Basic sprite sheet animator |
| HeroSpriteAnimator | `components/HeroSpriteAnimator.tsx` | Hero character animations |
| DirectionalSprite | `components/DirectionalSprite.tsx` | 4/8-direction movement sprites |
| MiniWorldRenderer | `components/MiniWorldRenderer.tsx` | Dungeon tileset renderer |
| GrudgeSprite | `components/GrudgeSprite.tsx` | Universal sprite wrapper |

### Combat Components
| Component | File | Purpose |
|-----------|------|---------|
| CombatEffects | `components/CombatEffects.tsx` | Combat visual effects |
| CombatUnitStatus | `components/CombatUnitStatus.tsx` | Unit health/status display |
| AbilityBar | `components/AbilityBar.tsx` | Hotkey ability bar |

### Island Components
| Component | File | Purpose |
|-----------|------|---------|
| IslandSidebar | `components/IslandSidebar.tsx` | Island UI with heroes/activity tabs |
| IslandTileRenderer | `components/IslandTileRenderer.tsx` | Tile-based island rendering |
| HarvestPopup | `components/HarvestPopup.tsx` | Resource harvest feedback |
| IslandChat | `components/IslandChat.tsx` | AI chat on island |

### UI Components
| Component | File | Purpose |
|-----------|------|---------|
| PlayerStatusBars | `components/PlayerStatusBars.tsx` | HP/MP/Stamina bars |
| Layout | `components/Layout.tsx` | Page wrapper with navigation |
| AttributeAllocation | `components/AttributeAllocation.tsx` | Attribute point allocation |
| InventoryModal | `components/InventoryModal.tsx` | Inventory display |

### Profession Components
| Component | File | Purpose |
|-----------|------|---------|
| TreeVisualizer | `components/profession/TreeVisualizer.tsx` | Skill tree visualization |
| CraftingInterface | `components/profession/CraftingInterface.tsx` | Crafting UI |
| UpgradeInterface | `components/profession/UpgradeInterface.tsx` | Item upgrade UI |

### Example Usage
```tsx
<SpriteAnimator 
  spriteSet="Wizard"       // Sprite manifest ID
  action="Attack"          // Idle | Walk | Attack | Hurt | Death | Victory | Cast
  scale={2}               // Size multiplier
  flip={false}            // Mirror horizontally
  palette="fire"          // Color filter preset
/>
```

---

## State Management

### Server State (React Query)
```tsx
// Fetch characters
const { data: characters } = useQuery({
  queryKey: ["/api/characters"],
  queryFn: () => fetch("/api/characters").then(r => r.json())
});

// Update character
const mutation = useMutation({
  mutationFn: (data) => fetch(`/api/characters/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  })
});
```

### Local State
- Active character selection
- Current animation action
- UI toggles (admin mode, tabs)

---

## Styling Conventions

### Faction Colors
```tsx
const FACTION_COLORS = {
  Crusade: { bg: "bg-red-900", text: "text-red-200", border: "border-red-500" },
  Legion: { bg: "bg-green-900", text: "text-green-200", border: "border-green-500" },
  Fabled: { bg: "bg-blue-900", text: "text-blue-200", border: "border-blue-500" }
};
```

### Dark Fantasy Theme
- Background: slate-900/950
- Accents: amber-400/500 (gold)
- Borders: slate-700/800
- Font: Cinzel for headings

---

## Asset Locations

All assets are served from **ObjectStore** (R2 CDN + GitHub Pages), NOT from `public/`.

### Asset URL Helpers
```typescript
import { assetUrl, cdnAssetUrl, apiUrl } from "@/lib/assetConfig";

// Binary assets (images, sprites, audio) → R2 CDN
assetUrl('/icons/weapons/swords/bloodfeud_blade.png');
// → https://assets.grudge-studio.com/icons/weapons/swords/bloodfeud_blade.png

// JSON game data → ObjectStore
apiUrl('/weapons.json');
// → https://objectstore.grudge-studio.com/api/v1/weapons.json
```

### ObjectStore Categories (R2 CDN)
- **Sprites:** `/sprites/characters/`, `/sprites/bosses/`, `/sprites/enemies/`, `/sprites/effects/`
- **Icons:** `/icons/weapons/`, `/icons/armor/`, `/icons/resources/`, `/icons/skills/`
- **Profession Art:** `/images/professions/` (icons + background art)
- **UI Assets:** `/images/ui/`, `/images/misc/`
- **Backgrounds:** `/backgrounds/`
- **Portraits:** `/images/portraits/`

### ObjectStore Data Hooks
```typescript
import { useWeapons, useClasses, useProfessions } from "@/hooks/use-object-store";
const { data, isLoading, error, refetch } = useWeapons();
```

---

## Path Aliases

```typescript
// vite.config.ts
"@/": "./client/src/"
"@shared/": "./shared/"
"@assets/": "./attached_assets/"
```
