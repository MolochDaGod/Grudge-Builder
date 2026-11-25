# Warlords domain zone SSOT — `*.grudgewarlords.com`

**Status:** Product law (2026-08).  
**Code:** `shared/fleet/warlordsDomains.ts` · `shared/fleet/manifest.ts` · `authReturn.ts`  
**Journey:** [GAME_FLOW_SSOT.md](./GAME_FLOW_SSOT.md)

**Preferred play host:** **`warlords.grudge.studio`** (4 characters on airship).  
**Live today:** **`grudgewarlords.com`** (same SPA; alias until DNS cutover).  
**Account / apps hub:** **`grudge.studio`**.  
**Nexus 4 characters:** **`nexus.grudge.studio/heroes`**.  
Studio platform (login, forge, assets CDN, Foundry) stays on **`*.grudge-studio.com`**.  
Full matrix: [GRUDGE_STUDIO_ERA_DOMAINS_SSOT.md](./GRUDGE_STUDIO_ERA_DOMAINS_SSOT.md).

---

## 1. Product zone (Warlords)

| Host | Role | Status |
|------|------|--------|
| **`grudgewarlords.com`** | Apex marketing + **game SPA** (live) | ✅ Live |
| **`www.grudgewarlords.com`** | Apex alias | ✅ Live |
| **`play.grudgewarlords.com`** | **Canonical game client** host (same SPA) | 🔧 Wire DNS → Vercel |
| **`client.grudgewarlords.com`** | Alias of play | 🔧 Wire DNS |
| **`airship.grudgewarlords.com`** | Pretty host → `/airship` | 🔧 Wire + optional 301 |
| **`home.grudgewarlords.com`** | Pretty host → `/home-island` | 🔧 Wire + optional 301 |
| **`map.grudgewarlords.com`** | Pretty host → `/world-map` | 🔧 Wire + optional 301 |
| **`scenes.grudgewarlords.com`** | Pretty host → `/island-3d` (cinema / scene plate) | 🔧 Wire + optional 301 |
| **`grudgewarlords.com/craft/`** | **Craft suite** (recipes, bag, item DB) | ✅ Live |
| **`craft.grudgewarlords.com`** | Pretty host → `/craft/*` (same suite) | ✅ Vercel domain + host rewrites |
| **`foundry.grudgewarlords.com`** | Optional 302 → `character.grudge-studio.com` | 🔧 Wire later |

### SPA paths (same deploy on apex / play)

| Path | Loop |
|------|------|
| `/airship` | Foundry handoff cinema |
| `/home-island` | Personal base |
| `/world-map` | 9-sector overview |
| `/play?mode=zone&sector=…` | Open world |
| `/tutorial` | Optional shipwreck |
| `/island-3d` | Scene / lobby / cinema plates |
| **`/craft/`** | WCS craft suite (inventory, recipes, item database) |

**Canonical craft URL:** `https://grudgewarlords.com/craft/`  
Legacy Puter `grudge-crafting.puter.site` redirects to that URL.

Until `play.*` DNS is live, **absolute play links use apex** `https://grudgewarlords.com{path}` via `warlordsPlayOrigin()`.

Set `WARLORDS_PLAY_ORIGIN=https://play.grudgewarlords.com` (or `VITE_WARLORDS_PLAY_ORIGIN`) after DNS.

---

## 2. Studio zone (keep on grudge-studio.com)

| Host | Role |
|------|------|
| `id.grudge-studio.com` | Fleet-wide login |
| `character.grudge-studio.com` | Foundry create + 4-slot (CF Pages) |
| `client.grudge-studio.com` | **Legacy** — permanent redirect → `grudgewarlords.com` (not production brand) |
| `forge.grudge-studio.com` | Map editor |
| `assets.grudge-studio.com` | R2 CDN |
| `info.grudge-studio.com` | Definitions + ops map |
| `grudge-studio.com` | Studio portal — **not** Warlords play SSOT |

### Deprecated for Warlords

| Host | Note |
|------|------|
| `play.grudge.studio` | 404 — not Warlords; use `play.grudgewarlords.com` / apex |
| Treating `client.grudge-studio.com` as preferred brand | Prefer `*.grudgewarlords.com` |

---

## 3. DNS / Vercel ops checklist

```
[x] Vercel DNS zone: grudgewarlords.com (ns1/ns2.vercel-dns.com)
[x] craft.grudgewarlords.com added to grudge-builder (+ host rewrites → /craft/*)
[ ] CNAME play → cname.vercel-dns.com (or apex target)
[ ] CNAME client, airship, home, map, scenes → same
[ ] Vercel project grudge-builder: add domains play|client|airship|home|map|scenes.grudgewarlords.com
[ ] Optional edge redirects:
      airship.* → https://play.grudgewarlords.com/airship
      home.*    → https://play.grudgewarlords.com/home-island
      map.*     → https://play.grudgewarlords.com/world-map
      scenes.*  → https://play.grudgewarlords.com/island-3d
[x] AUTH return allowlist: already includes .grudgewarlords.com + craft.*
[ ] Set WARLORDS_PLAY_ORIGIN after play.* is green
[ ] Foundry returnTo defaults → warlords apex/play (gcsRedirect uses warlordsPlayOrigin)
```

---

## 4. Code helpers

```ts
import {
  warlordsPlayUrl,
  warlordsAirshipUrl,
  warlordsDefaultReturnTo,
  warlordsZoneUrl,
  WARLORDS_SUBDOMAINS,
} from "@shared/fleet";

warlordsPlayUrl("/home-island", { characterId, from: "gcs" });
warlordsAirshipUrl(characterId);
warlordsZoneUrl({ sector: "haven_shore", characterId });
```

---

## 5. Separation of concerns

```
*.grudgewarlords.com     → Warlords ERA product (play, maps, airship, craft brand)
*.grudge-studio.com      → Studio platform (id, forge, assets, multi-era foundry host)
puter.site               → Guest/static satellites (crafting until craft.* is live)
```

Identity stays **id.grudge-studio.com** for all eras (one account).  
Characters stay era-scoped on Railway (`gameEra=warlords`).
