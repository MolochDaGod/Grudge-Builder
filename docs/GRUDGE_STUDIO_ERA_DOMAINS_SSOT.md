# grudge.studio — era clients + account hub SSOT

**Status:** Product law (2026-09).  
**Code:** `shared/fleet/warlordsDomains.ts` · `authReturn.ts` · `docs/CHARACTER_ERAS.md`  
**Does not invent a second SPA repo** — same GrudgeBuilder deploy, host selects era surface.

---

## 1. Intent

**`*.grudge.studio` = client systems only.**  
**`*.grudge-studio.com` = platform** (id, assets, foundry, forge, info).

| Host | Client role |
|------|-------------|
| **`play.grudge.studio`** | Account / sales / auction / chat / community / **game launcher hub** |
| **`warlords.grudge.studio`** | **Warlords** game client (4 characters on **airship**) |
| **`nexus.grudge.studio`** | **Nexus** game client (4 characters on **`/heroes`**) |
| **`open.grudge.studio`** | Open library client |
| **`grudox.grudge.studio`** | GRUDOX client |
| **`grudge.studio`** | Optional apex door into play hub (not platform SSOT) |

**Crew** = RTS units on ships/camps — never the 4 character slots.

---

## 2. Brand vs platform (do not collapse)

| Zone | Domain | Owns |
|------|--------|------|
| **Account hub** | `grudge.studio` | Roster links, era pick, app directory, return after login |
| **Era play clients** | `*.grudge.studio` | One host per era SPA surface |
| **Marketing / legacy Warlords** | `grudgewarlords.com` | Alias → `warlords.grudge.studio` when DNS live |
| **Platform (keep for now)** | `*.grudge-studio.com` | `id.` SSO, `assets.` CDN, `character.` Foundry, `forge.`, `info.` |

Identity stays **`id.grudge-studio.com`** until an explicit `id.grudge.studio` cutover.

Foundry create stays **`character.grudge-studio.com`** (create-only) → handoff `returnTo` → era client host.

---

## 3. Era → host → 4 characters (one surface each)

| Era | 4 characters live on | Not |
|-----|----------------------|-----|
| **Warlords** | `warlords.grudge.studio` **airship** (`/combat`) | `/heroes` on warlords |
| **Nexus** | `nexus.grudge.studio/heroes` (today: `client.grudge-studio.com/heroes` until DNS) | Warlords airship |
| **Voxel** | GRUDOX / `voxel.grudge.studio` | Warlords / Nexus hosts |

No duplicate 4-character UIs per era.

---

## 4. Deploy map (unchanged repos)

| Layer | Repo | Deploy | Points at |
|-------|------|--------|-----------|
| Warlords + Nexus SPA code | `MolochDaGod/Grudge-Builder` | Vercel `grudge-builder` | Add domains `warlords.grudge.studio`, `nexus.grudge.studio`, apex `grudge.studio` |
| API / Railway | Same repo `server/` | Railway | Proxied `/api/*` on each client host |
| Foundry | `grudge-character-animator` | CF Pages | `character.grudge-studio.com` |
| Binaries | R2 | CDN | `assets.grudge-studio.com` |

Host-based routing in the SPA (already pattern for craft.* / heroes):

- `warlords.grudge.studio` → Warlords journey (airship characters)
- `nexus.grudge.studio` → Nexus `/heroes`
- `grudge.studio` → account / apps hub (not a second play runtime)

---

## 5. DNS / Vercel checklist

```
[ ] DNS zone grudge.studio → Vercel (or Cloudflare → Vercel)
[ ] Add to Vercel project grudge-builder:
      grudge.studio
      www.grudge.studio
      warlords.grudge.studio
      nexus.grudge.studio
[ ] Optional: voxel.grudge.studio → grudox or same SPA with era gate
[ ] Auth allowlist: *.grudge.studio (EXACT + suffix)
[ ] Set WARLORDS_PLAY_ORIGIN=https://warlords.grudge.studio when green
[ ] Alias grudgewarlords.com → 301/302 → warlords.grudge.studio (or keep dual until traffic moves)
[ ] client.grudge-studio.com/heroes stays Nexus until nexus.grudge.studio is live, then 301
```

---

## 6. Code hooks (extend, don’t fork)

```ts
// Target once DNS live — env overrides live apex today
WARLORDS_PLAY_ORIGIN=https://warlords.grudge.studio
// Nexus heroes origin helper (add beside warlordsPlayOrigin)
// nexusPlayOrigin() → https://nexus.grudge.studio
```

`isWarlordsPlayHost`: include `warlords.grudge.studio`; **exclude** Nexus heroes host.  
`canonicalSsoReturnOrigin`: map era clients to their stable apex, not ephemeral Vercel hashes.
