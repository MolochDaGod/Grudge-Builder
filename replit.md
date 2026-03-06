# Grudge Warlords

## Overview
Grudge Warlords is a dark fantasy RPG web application featuring character creation, turn-based combat, crafting, and island exploration. It includes multiple races, factions, four distinct character classes, sprite-based animations, an item/equipment database, a tiered profession system, and dungeon exploration. The project aims to provide an immersive online RPG experience with rich lore and engaging mechanics.

## Documentation Index

Comprehensive documentation is available in the `docs/` directory:

| Document | Description |
|----------|-------------|
| [docs/FRONTEND.md](docs/FRONTEND.md) | Page routes, components, UI patterns, state management |
| [docs/BACKEND.md](docs/BACKEND.md) | API routes, storage interface, database schema |
| [docs/ATTRIBUTES.md](docs/ATTRIBUTES.md) | 8 core attributes, 19 secondary stats, diminishing returns system |
| [docs/COMBAT.md](docs/COMBAT.md) | 8-step combat flow, damage formulas, block/crit mechanics |
| [docs/PROFESSIONS.md](docs/PROFESSIONS.md) | Gathering & Crafting professions, level 1-100 progression |
| [docs/ITEMS.md](docs/ITEMS.md) | Equipment slots, item tiers, weapon/armor categories |
| [docs/RACES_CLASSES.md](docs/RACES_CLASSES.md) | 6 races, 4 classes, starting bonuses |
| [docs/DUNGEONS.md](docs/DUNGEONS.md) | Procedural generation, fog of war, AI combat |
| [docs/ISLANDS.md](docs/ISLANDS.md) | Home island, resource nodes, RTS camera controls |
| [docs/SAILING.md](docs/SAILING.md) | World map, ship navigation, cannon combat |
| [docs/SPRITES.md](docs/SPRITES.md) | Sprite asset pipeline and Craftpix integration |
| [docs/ANIMATIONS.md](docs/ANIMATIONS.md) | Spell animations, combat effects, particle systems |
| [docs/UUID_SYSTEM.md](docs/UUID_SYSTEM.md) | Grudge UUID format, UUID Ledger, anti-cheat validation |
| [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md) | Colyseus multiplayer server integration |
| [puter.md](puter.md) | Puter AI agent integration, SDK setup, development patterns |

All documentation files include "Implementation Files" sections with organized tables referencing Backend, Frontend, Data Definitions, and Sprite Assets.

## User Preferences
Preferred communication style: Simple, everyday language.

## Quick Start

1. **Run Development Server**: `npm run dev`
2. **Database Migrations**: `npm run db:push`
3. **View Application**: Open the webview on port 5000

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Routing**: Wouter
- **State Management**: TanStack React Query (server state), React useState (local state)
- **Animation**: Framer Motion (UI), custom SpriteAnimator (character sprites)
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM)
- **Build**: esbuild (server), Vite (client)
- **API**: RESTful

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: `shared/schema.ts`
- **Migrations**: `drizzle-kit push`

### Key Design Patterns
- **Shared Types**: `shared/` directory for client/server schema definitions.
- **Path Aliases**: `@/` for client/src, `@shared/` for shared.
- **Dual-Account System**: Admin and Guest accounts with isolated data.
- **Character Manager**: Client-side abstraction for character CRUD.
- **Account-Level Shared Inventory System**: Items shared across characters or character-bound.
- **Game Data**: Database-backed for core entities, seeded from TypeScript definitions.
- **Artisan Guild Profession System**: Tiered Gathering and Crafting professions with XP and decay mechanics.
- **Equipment System**: Slots for various item types, distinct armor categories.
- **Attribute Allocation System**: 8 core attributes (STR, VIT, END, INT, WIS, DEX, AGI, TAC) with flat+percent bonuses, diminishing returns after 25 points, and 19 secondary stats. Character heroes level 0-20 (20 starting + 7/level = 160 max points). See `shared/attributeSystem.ts`.
- **Dungeon Crawler Sprite System**: Canvas-based MiniWorldRenderer using 16x16 MiniWorld RPG sprites. Ground tilesets (grass, winter, deadland, shore), hero sprites (swordsman, knight, mage, bowman, assassin, axeman), and monster sprites (goblins, orcs, trolls, undead, dragons, demons). See `client/src/lib/miniworldTileset.ts` and `client/src/components/MiniWorldRenderer.tsx`.
- **Sprite Asset Management**: Central manifest, viewer, and categorization of 2D RPG sprites.
- **AI Sprite Generation System**: Admin tool for generating sprites using AI (Puter AI txt2img).
- **Island Gameplay System**: Home island with procedural generation, resource nodes, RTS camera controls. AFK harvesting with stamina system (max 100, rarity multipliers, profession-level discounts). Characters sleep at camp when stamina depleted (90%+ to wake). Activity log tracks harvest/loot/level/sleep/wake events. IslandSidebar shows Heroes tab with stamina bars and Activity Log tab. Profession progression trees accessible via clicking profession badges. Canvas-based HarvestPopup and SleepingZZZ animations. See `client/src/lib/characterState.ts`, `client/src/components/IslandSidebar.tsx`, `client/src/components/HarvestPopup.tsx`.
- **Island Engine V2 (Matter.js Physics)**: Modular tile-grid island engine using Matter.js 2D physics with gravity disabled for top-down gameplay. Key modules:
  - `IslandEngine.ts`: Physics world management, body creation, collision event handling (60 FPS deterministic stepping)
  - `CameraController.ts`: 2D camera with pan/zoom controls, smooth following, world-to-screen coordinate transforms
  - `CharacterActor.ts`: Character state machine (idle→walking→harvesting→sleeping), stamina consumption, movement physics
  - `ResourceNodeActor.ts`: Static resource nodes with collision bodies, loot generation, respawn timing
  - `HarvestController.ts`: Collision-based auto-harvesting with profession XP gains and stamina costs by rarity
  - `SpriteAnimator.ts`: Configurable frame sequences for idle/walk/harvest/sleep animations
  - `IslandRenderer.tsx`: Canvas-based rendering with Y-depth sorting, drag-to-pan, scroll-to-zoom
  Demo page at `/island-v2` showcases the new engine with character selection, activity logging, and engine controls. See `client/src/island/` directory.
- **World Map Sailing System**: Procedural ocean map, ship navigation, fog of war, cannon combat, island discovery.
- **AI Unit Library System**: Converts player characters to AI-controlled enemies for testing and combat.
- **Hero Sprite System**: Gallery for previewing hero animations.
- **Character Abilities System**: Database-tracked equipped abilities, starting abilities, and slot management.
- **Google Sheets Data Integration**: Centralized game data (weapons, armor, items, recipes) from Google Sheets.
- **AI Mission System**: Lore-aware mission generation using OpenAI with draft→pending→approved workflow. Missions integrate with dungeon combat for objective tracking. Mission Board UI at `/missions` with tabs for available/active/completed quests.
- **Lore Entity System**: Database-backed gods, factions, heroes, and locations based on Grudge Warlords lore (3 gods: Odin/Madra/The Omni, 3 factions: Crusade/Legion/Fabled).
- **Faction Reputation System**: Player reputation tracked per faction with tiers from Hostile (-1000) to Exalted (+1000).
- **Solana Wallet Integration**: Crossmint for server-side custodial wallets, WalletConnect for external wallets. Characters can be minted as compressed NFTs (cNFTs) for ~$0.01 each. See `server/services/crossmintWallet.ts` and `server/services/nftMinting.ts`.
- **Class Skill Tree System**: Each class has a unique skill tree with skills unlocking at levels 0, 1, 5, 10, 15, 20. Players choose ONE skill per tier. Each class also has a "special ability" granted at character creation. Skills are persisted via `selectedSkills` field on character. See `shared/definitions/classSkillTrees.ts`.
- **UUID Ledger System**: Append-only transaction log for anti-cheat validation. Tracks item lifecycle (CREATED → ACTIVE → CONSUMED/ARCHIVED/DESTROYED). Event type validation, state machine enforcement, and ownership checks. See `shared/grudgeUUID.ts` and `docs/UUID_SYSTEM.md`.
- **Spell Animation System**: Comprehensive animation definitions for 100+ effects including projectiles, impacts, AOEs, buffs, shields, and particles. Supports sprite sheets and frame sequences. Ability-to-animation mapping for combat. Flash step techniques for rapid movement. See `shared/definitions/spellAnimations.ts` and `docs/ANIMATIONS.md`.

## Key Files Reference

### Core Game Logic
| File | Purpose |
|------|---------|
| `shared/attributeSystem.ts` | Attribute calculations, combat formulas, stat caps |
| `shared/schema.ts` | Database schema with Drizzle ORM |
| `server/storage.ts` | Database CRUD operations |
| `server/routes.ts` | REST API endpoints |

### Client Components
| Directory | Purpose |
|-----------|---------|
| `client/src/pages/` | Page components (routing via Wouter) |
| `client/src/components/` | Reusable UI components |
| `client/src/lib/` | Utility functions, game data |
| `client/src/hooks/` | Custom React hooks |

## External Dependencies

### Third-Party Services
- **Puter SDK**: Cloud platform for AI features and deployment.
- **Puter AI**: Chat API for AI integration.
- **Puter KV**: Key-value storage.
- **Google Sheets API**: For game data integration.

### Database
- **PostgreSQL**: Primary database.

### UI Libraries
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **cmdk**: Command palette.

### Build & Development
- **Vite Plugins**: React, Tailwind CSS, Replit-specific plugins.
- **Custom Plugin**: `vite-plugin-meta-images.ts` for OpenGraph tags.

## Game Data Summary

| Entity | Count | Storage |
|--------|-------|---------|
| Races | 6 | Database |
| Classes | 4 | Database |
| Items | 634 | Database |
| Spells | 15 | Database |
| Skills | 21 | Database |
| Monsters | 16 | Database |
| Dungeons | 5 | Database |
