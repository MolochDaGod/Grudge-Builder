# Sharing GRUDGE Warlords Database & API

## Option 1: Share Database Connection (Direct Access)

This lets your other Replit project connect directly to the same database.

### Steps:

1. **In this project**, go to the **Secrets** tab (lock icon)
2. Copy the value of `DATABASE_URL`
3. **In your other project**, add a new secret:
   - Name: `DATABASE_URL`
   - Value: (paste the copied value)

4. Copy these files to your other project:
   - `shared/schema.ts` - Database table definitions
   - `server/db.ts` - Database connection setup

5. Install required packages in your other project:
   ```bash
   npm install drizzle-orm pg drizzle-zod
   ```

### Important Notes:
- Both projects will share the SAME data
- Changes in one project affect the other
- Good for: Admin panels, analytics dashboards, companion apps

---

## Option 2: API Access (HTTP Requests)

This lets your other project read/write data through API calls.

### Your App URL:
Once published, your API is available at:
`https://your-repl-name.replit.app`

### Available Endpoints:

#### Read-Only Data (Google Sheets - cached 5 min)
- `GET /api/sheets/weapons` - All weapons (96 items)
- `GET /api/sheets/armor` - All armor (239 items)
- `GET /api/sheets/chef` - Chef recipes (240 items)
- `GET /api/sheets/items` - Misc items (97 items)
- `GET /api/sheets/crafting` - Crafting recipes

#### Characters
- `GET /api/characters` - List all characters
- `GET /api/characters/:id` - Get specific character
- `POST /api/characters` - Create character

#### Skills
- `GET /api/skills/:characterId` - Get unlocked skills
- `POST /api/skills` - Unlock a skill

#### Shop
- `POST /api/shop/buy-recipe` - Purchase recipe
- `POST /api/shop/buy-material` - Buy materials
- `POST /api/shop/sell-material` - Sell materials
- `GET /api/shop/transactions/:characterId` - Transaction history

### Example Usage (JavaScript):
```javascript
// Fetch all weapons
const response = await fetch('https://your-app.replit.app/api/sheets/weapons');
const data = await response.json();
console.log(data.data); // Array of 96 weapons
```

### Important Notes:
- API access doesn't require database setup
- Good for: Mobile apps, external tools, public data access
- Consider adding API authentication for production use

---

## Files to Copy

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Database schema (for Option 1) |
| `server/db.ts` | DB connection (for Option 1) |
| `data-exports/api-access-guide.ts` | API helper functions (for Option 2) |
