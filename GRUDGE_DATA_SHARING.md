# GRUDGE Data Sharing Guide

This guide explains how to share game data between all GRUDGE games using Google Sheets as the centralized data source.

## Overview

All GRUDGE games can share the same game data (weapons, armor, items, recipes, etc.) through:
1. **Google Sheets API** - Read-only access to game data with 5-minute caching
2. **Shared Database** - Direct PostgreSQL access for account/character data

---

## Option 1: API Access (Recommended)

Use REST endpoints to fetch game data from Google Sheets. Best for:
- Read-only game data (weapons, armor, items)
- External apps that just need to display data
- Mobile/web clients

### Base URL
Once published: `https://your-repl-name.replit.app`

### Available Endpoints

| Endpoint | Description | Data Source |
|----------|-------------|-------------|
| `GET /api/sheets/weapons` | All weapons (96+ items) | GOOGLE_SHEET_WEAPONS |
| `GET /api/sheets/armor` | All armor (240+ items) | GOOGLE_SHEET_ARMOR |
| `GET /api/sheets/items` | Misc items (97+ items) | GOOGLE_SHEET_ITEMS |
| `GET /api/sheets/chef` | Chef recipes (240+ foods) | GOOGLE_SHEET_CHEF |
| `GET /api/sheets/crafting` | Crafting recipes | GOOGLE_SHEET_CRAFTING |
| `GET /api/sheets/all` | All data combined | All sheets |
| `GET /api/sheets/status` | Connection status | - |

### Response Format

```json
{
  "data": [...],     // Array of objects (sheet rows)
  "count": 96,       // Number of items
  "cached": true,    // Whether response is cached
  "source": "google_sheets"
}
```

### Example: Fetch Weapons

```javascript
// JavaScript/TypeScript
async function fetchWeapons() {
  const response = await fetch('https://your-app.replit.app/api/sheets/weapons');
  const result = await response.json();
  console.log(`Loaded ${result.count} weapons`);
  return result.data;
}
```

### Example: Fetch All Data

```javascript
async function fetchAllGameData() {
  const response = await fetch('https://your-app.replit.app/api/sheets/all');
  const result = await response.json();
  
  console.log('Weapons:', result.sheets.weapons?.count);
  console.log('Armor:', result.sheets.armor?.count);
  console.log('Chef:', result.sheets.chef?.count);
  
  return result.sheets;
}
```

### Caching

- All sheet data is cached for **5 minutes**
- Cache is server-side (in-memory)
- No additional caching needed on client

---

## Option 2: Direct Database Access

Share the PostgreSQL database connection for account/character data. Best for:
- Apps that need write access to player data
- Admin panels
- Analytics dashboards

### Setup in Other Replit Projects

1. **Copy the DATABASE_URL secret**
   - In this project: Go to Secrets tab → Copy `DATABASE_URL` value
   - In other project: Add secret `DATABASE_URL` with copied value

2. **Install required packages**
   ```bash
   npm install drizzle-orm pg drizzle-zod
   ```

3. **Copy these files to your project**
   - `shared/schema.ts` - Database table definitions
   - `server/db.ts` - Database connection

4. **Import and use**
   ```typescript
   import { db } from './server/db';
   import { characters, users } from './shared/schema';
   
   // Query characters
   const allCharacters = await db.select().from(characters);
   ```

### Shared Tables

| Table | Purpose |
|-------|---------|
| `users` | GRUDGE accounts (shared identity) |
| `characters` | Player characters |
| `islands` | Island data |
| `battle_history` | Combat records |
| `account_assets` | Shared items across games |
| `unlocked_skills` | Character progression |
| `inventory_items` | Character inventory |
| `crafted_items` | Items crafted by characters |
| `shop_transactions` | Purchase/sell history |

---

## Setting Up Google Sheets (Admin Only)

### Required Secrets

Add these secrets to your Replit project:

| Secret Name | Description |
|-------------|-------------|
| `GOOGLE_SHEET_WEAPONS` | Sheet ID for weapons data |
| `GOOGLE_SHEET_ARMOR` | Sheet ID for armor data |
| `GOOGLE_SHEET_ITEMS` | Sheet ID for misc items |
| `GOOGLE_SHEET_CHEF` | Sheet ID for chef recipes |
| `GOOGLE_SHEET_CRAFTING` | Sheet ID for crafting recipes |

### Sheet ID Location

For a Google Sheet URL like:
```
https://docs.google.com/spreadsheets/d/1ABC123xyz/edit
```
The Sheet ID is: `1ABC123xyz`

### Sheet Format Requirements

Each sheet should have:
- **Row 1**: Column headers (will become object keys)
- **Row 2+**: Data rows

Headers are converted to lowercase with underscores:
- "Weapon Name" → `weapon_name`
- "Base Damage" → `base_damage`

### Sharing Sheets

1. Open your Google Sheet
2. Click "Share" button
3. Add the Google service account email (or make sheet public)
4. Grant "Viewer" access

---

## API Helper Functions

Copy this to your project for easy API access:

```typescript
// api-client.ts
const API_BASE = process.env.GRUDGE_API_URL || 'https://your-app.replit.app';

export async function fetchWeapons() {
  const res = await fetch(`${API_BASE}/api/sheets/weapons`);
  return (await res.json()).data;
}

export async function fetchArmor() {
  const res = await fetch(`${API_BASE}/api/sheets/armor`);
  return (await res.json()).data;
}

export async function fetchChefRecipes() {
  const res = await fetch(`${API_BASE}/api/sheets/chef`);
  return (await res.json()).data;
}

export async function fetchItems() {
  const res = await fetch(`${API_BASE}/api/sheets/items`);
  return (await res.json()).data;
}

export async function fetchCrafting() {
  const res = await fetch(`${API_BASE}/api/sheets/crafting`);
  return (await res.json()).data;
}

export async function fetchAllGameData() {
  const res = await fetch(`${API_BASE}/api/sheets/all`);
  return (await res.json()).sheets;
}
```

---

## Character Endpoints

These endpoints require the shared database connection to work across apps:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/characters` | GET | List all characters |
| `/api/characters/:id` | GET | Get specific character |
| `/api/characters` | POST | Create character |
| `/api/skills/:characterId` | GET | Get unlocked skills |
| `/api/skills` | POST | Unlock a skill |

---

## Best Practices

1. **Use API for game data, DB for player data**
   - Weapons, armor, items → API (Google Sheets)
   - Characters, inventory, progress → Database

2. **Cache on the client** (optional)
   - Server caches for 5 minutes
   - Client can cache longer if data doesn't change often

3. **Handle errors gracefully**
   ```typescript
   try {
     const weapons = await fetchWeapons();
   } catch (error) {
     console.error('Failed to load weapons, using fallback');
     return FALLBACK_WEAPONS;
   }
   ```

4. **Check /api/sheets/status first**
   - Verify which sheets are configured before fetching

---

## Troubleshooting

### "GOOGLE_SHEET_X not configured"
- Add the missing secret to your Replit project

### "Google Sheets not connected"
- Go to Replit → Integrations → Connect Google Sheets

### Empty data returned
- Check that the sheet has data in "Sheet1"
- Verify the range "A:Z" covers your columns

### Old data showing
- Data is cached for 5 minutes
- Restart the app to clear cache

---

## File Structure for Other Projects

```
your-project/
├── shared/
│   └── schema.ts          # Copy from main project
├── server/
│   ├── db.ts              # Copy from main project
│   └── api-client.ts      # Copy helper functions above
└── package.json           # Add drizzle-orm, pg, drizzle-zod
```

---

Generated: 2025-12-29
Version: 2.3.0
