# Where to open the production map in Forge

## Auto-open (easiest)

1. Deploy / run Forge: https://forge.grudge-studio.com/ **or** local `cd studio && npm run dev`
2. Click **Map Editor**
3. Banner: `Production · Grudge_Open_World…`  
   Files are loaded from:

```
RTS-Grudge/studio/public/production/grudge-open-world.studio.json
RTS-Grudge/studio/public/production/grudge-open-world.gmap.json
```

## Manual open (any machine)

| File | Open how |
|------|----------|
| `grudge-open-world.studio.json` | Forge toolbar → **Import** |
| `grudge-open-world.gmap.json` | Forge toolbar → **Import** (also accepted) |

### Canonical disk locations

```
# Source of truth (grudge-builder)
C:\Users\david\Desktop\grudge-builder\production\grudge-open-world.studio.json
C:\Users\david\Desktop\grudge-builder\production\grudge-open-world.gmap.json

# What Forge serves (must match for auto-load)
D:\repos\RTS-Grudge\studio\public\production\grudge-open-world.studio.json
D:\repos\RTS-Grudge\studio\public\production\grudge-open-world.gmap.json

# Also published under client static maps
C:\Users\david\Desktop\grudge-builder\public\maps\grudge-open-world\
```

## Save → update production package?

| Action | What it does |
|--------|----------------|
| **💾 Save** | Browser `localStorage` only — **not** disk / deploy |
| **📤 Export** | Downloads one `.studio.json` |
| **🏭 Export Production** | Downloads **3 files**: `.studio.json` + `.gmap.json` + `manifest.json` |

### Workflow after editing in Forge

1. Edit entities / rules in Map Editor  
2. Click **🏭 Export Production**  
3. Copy the 3 downloads into **both**:
   - `grudge-builder/production/`
   - `RTS-Grudge/studio/public/production/`
4. (Optional) If you also changed TypeScript SSOT:  
   `npm run map:build-gmap` in grudge-builder  
5. Redeploy Forge (or refresh local `studio` public files)

> Browser cannot write your repo folders. Export Production + copy is the intentional loop until a signed “publish API” exists.

## Rebuild from code SSOT (no Forge edit)

```bash
cd grudge-builder
npm run map:build-gmap
# then copy public/maps/grudge-open-world/* → production/ and studio/public/production/
```

## Publish API (preferred)

Forge toolbar **🚀 Publish** → `POST /api/production/map/publish`

```bash
# Server env
PRODUCTION_PUBLISH_TOKEN=your-secret
# optional auto deploy after publish
VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/...
# or FORGE_DEPLOY_HOOK / PRODUCTION_DEPLOY_HOOK
```

Forge env:

```
VITE_GRUDGE_API_URL=https://client.grudge-studio.com
VITE_PRODUCTION_PUBLISH_TOKEN=your-secret
# or localStorage forge.publish.token / forge.publish.apiBase
```

Hot-reload in game: `Island3DEngine.reloadProductionGmap()` fetches
`/api/production/map/gmap` then static `/production/…gmap.json`.
