# Grudge Builder

Dark fantasy RPG game builder — character creation, turn-based combat, dungeons, islands, professions, and skill trees.

## Live

- **Web**: [grudgewarlords.com](https://grudgewarlords.com)

## Architecture

```
Browser → Vercel (static SPA)
          └─ client/dist (Vite React build)
```

```
grudge-builder/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── pages/           # Route pages (login, home, character, combat, etc.)
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Game data, APIs, utilities
│   │   └── contexts/        # React contexts
│   ├── public/              # Static assets (sprites, icons, audio)
│   └── vite.config.ts       # Client Vite config
├── server/                  # Express backend (dev only, not deployed to Vercel)
├── shared/                  # Shared types, schemas, game definitions
├── attached_assets/         # Large asset library (not deployed)
├── vercel.json              # Vercel build config
└── package.json             # Dependencies
```

## Game Features

- **Character Builder** — Race/class selection, attribute allocation, equipment
- **Turn-Based Combat** — Party vs enemy encounters with abilities
- **Dungeon Explorer** — Procedural tiled dungeons
- **Island System** — Build and manage your base
- **Professions** — Mining, foresting, cooking, engineering, mysticism
- **Skill Trees** — Class-specific ability progression
- **World Map** — Explore interconnected islands
- **Sprite System** — Dynamic sprite loading from Object Storage

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, TailwindCSS 4, Radix UI
- **Animation**: Framer Motion, Phaser (dungeon engine)
- **State**: TanStack Query, localStorage persistence
- **Backend** (dev): Express, Drizzle ORM, PostgreSQL

## Deploy

Push to `main` → Vercel auto-builds `client/` and deploys:

```bash
git push origin main
```

Vercel runs: `cd client && npx vite build` → serves `client/dist/`
