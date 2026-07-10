# Grudge on Steam

| Field | Value |
|-------|--------|
| **App ID** | **2707990** |
| Store | https://store.steampowered.com/app/2707990/Grudge/ |
| Community | https://steamcommunity.com/app/2707990 |
| Windows depot | **2707991** (SteamDB) |
| Title (Steam) | Grudge |

Code SSOT: `shared/fleet/steam.ts` · local overlay helper: `steam/steam_appid.txt`

---

## What ships where

| Surface | Role |
|---------|------|
| **Web** `grudgewarlords.com` / `client.grudge-studio.com` | Primary live client — 1024 m home island + open-world sectors |
| **Steam App 2707990** | Store listing + depot for desktop launch (same fleet backend) |

**Shared truth (both):**

- Auth: `id.grudge-studio.com` (Grudge ID JWT)
- Game state: Railway Postgres via `grudge-api-production`
- Island scale: **1024 m**, foundations Driftwood Bay / Ironfang Spire
- Open world entry: Haven Shore `worldSeed=grudge-world-1`

Steam does **not** own a second character/island DB. Depots ship the client; accounts stay Railway + Grudge ID.

---

## Local Steam Overlay / SDK

When running a desktop build with Steamworks:

1. Copy `steam/steam_appid.txt` next to the executable (contents: `2707990`).
2. Or set `STEAM_APP_ID=2707990` / `VITE_STEAM_APP_ID=2707990`.
3. Use Partner account with access to App 2707990 for uploads.

---

## Depot / build notes (Partner)

Typical layout (adjust to your actual desktop wrapper — Electron, Unity, native):

```
depot 2707991 (Windows 64-bit)
  ├── Grudge.exe (or launcher)
  ├── steam_appid.txt          → 2707990
  ├── resources/…              → web build or native assets
  └── …
```

**Content build script (SteamCMD sketch):**

```bash
# After partner build config is set for App 2707990
steamcmd +login <user> +run_app_build <app_build.vdf> +quit
```

`app_build.vdf` must reference **AppID 2707990** and depot **2707991**.

---

## Large main island (deploy path)

1. **Web (already live):**  
   - Home: `/home-island` (1024 m)  
   - Open world: `/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1`
2. **Steam depot:** package the same client (or Electron shell loading production web + offline assets) under depot 2707991.
3. **Default launch:** prefer home island or Haven Shore — match web “Play” entry.

Character scale/idle fixes land on web first; Steam build should pull the same `main` client.

---

## Checklist before a Steam build upload

- [ ] AppID **2707990** only (not legacy 1318844)
- [ ] `steam_appid.txt` = `2707990`
- [ ] Depot **2707991** content set
- [ ] Launch points at fleet auth + Railway health
- [ ] Island contract 1024 m / 2 m character
- [ ] Branch: `default` or `beta` as intended in Partner

---

## Related

- Island scale SSOT: `docs/HOME_ISLAND_PIPELINE_CANONICAL.md`
- Fleet URLs: `shared/fleet/manifest.ts`
- Steam constants: `shared/fleet/steam.ts`
