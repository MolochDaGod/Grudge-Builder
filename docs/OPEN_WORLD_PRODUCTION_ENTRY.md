# Open World Production Entry

**Primary production start:** `https://client.grudge-studio.com/island-3d`  
**Entry shell:** `/open-world` (alias `/openworld`)  
**Live:** `https://client.grudge-studio.com/open-world` · `https://grudgewarlords.com/open-world`

## Intro variants (do not mix)

| Intro | Scene | Destination |
|-------|--------|-------------|
| **Storm ship attack** | TI Three.js `IntroScene` — Stonewisp attacks ship in storm | **`/island-3d`** production open |
| **Overboard float** | Character tossed / float zoom | **`/island-reveal` · `/home-island` only** |

SSOT: `shared/definitions/productionIntro.ts`  
Gate UI: `client/src/island3d/intro/StormShipIntroGate.tsx`  
TI host: `https://water.grudge-studio.com/intro`

## Flow

```
client.grudge-studio.com/island-3d
  → StormShipIntroGate (TI embed · options ON · UI ON)
  → Skip / auto-enter (cut before overboard)
  → Pirate Lobby | Tutorial | Zone
  → full ModePlayHUD + Grudge6 shell

Home island path (separate):
  /island-reveal?from=overboard-intro  ← overboard float, not storm open
```

```
/open-world
  → pick Warlords character (30grudge6 / Grudge6 race)
  → destination: Pirate Hub | Play | Zone | Tutorial
  → optional Editor mode (edit=1)
  → Enter World
  → island-3d / play / tutorial with full HUD
```

## Editor mode deployables

Registered into **Build** tabs via `shared/definitions/ummorpgDeployables.ts`:

| Tab | Content | CDN |
|-----|---------|-----|
| **Units** | Captains (6 races), travelers, bandits, cavalry mounts | grudge6 races + toon-soldiers + mounts |
| **Siege** | Human/Orc catapult, Elf bolt-thrower | `models/vehicles/siege/*` |
| **Monsters** | Wolf, boar, bear, deer | `models/creatures/land/*` |

In world: **Build** → Units / Siege / Monsters → LMB place (same ghost pipeline as props).

Asset pipeline: `grudge-assets-sync.bat characters|vehicles|toon-soldiers|verify`

## Related routes

| Route | Role |
|-------|------|
| `/open-world` | **Production entry** (this doc) |
| `/rts-grudge` | Legacy RTS mode picker + lobby 3D |
| `/island-3d?mode=lobby` | Pirate hub (no entry shell) |
| `/play` | Colyseus open world |
| `/tutorial` | Solo shipwreck starter |
| `/scene` | Opening scene / model viewer |
| `/editor` | WebContainer Node/Three.js build test |

## Build / push to production client

```bat
cd Desktop
grudge-assets-sync.bat verify
cd grudge-builder
npm run build
npx vercel --prod
```

Or: `grudge-assets-sync.bat deploy:builder`

## Code SSOT

- Entry UI: `client/src/pages/open-world.tsx`
- Deployables: `shared/definitions/ummorpgDeployables.ts`
- Vehicles: `shared/fleet/vehicles.ts`
- Build catalog: `BuildAssetManifest.ts` (registers deployables)
- Tabs: `shared/definitions/buildHammer.ts` → `units` / `siege` / `monsters`
