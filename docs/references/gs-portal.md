# `/gs` — Reference Surface

`https://grudge-studio.com/gs` is the **most polished public Grudge surface**
("Rec0deD:88 — Grudge Studio Gaming Portal"), served from the `The-ENGINE`
repo and mapped to `svc:gaming-portal` in `client/src/data/systemMap.ts`.

Per the owner directive (2026-04-26): **do not refactor `/gs`**. Other Grudge
surfaces (this repo's `grudgewarlords.com`, `grudgeplatform.io`, the planned
`launcher.grudge-studio.com`) should mirror its login + account UI patterns,
not the other way around.

This document captures what to copy from `/gs` into the rest of the stack.

## Probed identity (2026-04-26)

| Field | Value |
|---|---|
| URL | `https://grudge-studio.com/gs` |
| HTTP | 200 |
| Title | `Rec0deD:88 — Grudge Studio Gaming Portal` |
| og:image | `https://grudgewarlords.com/opengraph.jpg` |
| og:site_name | `Grudge Studio` |
| Twitter | `@grudgewarlords` |
| Description | "AI-Powered retro gaming portal with 1,360+ classic games, custom 3D engines, PvP Arena, and more. Part of the Grudge Warlords universe." |
| Loads | `https://js.puter.com/v2/` (per probe of `grudgewarlords.com/gs` SPA shell) |

## What `/gs` does that we mirror

1. **Single Puter SDK script tag.** All Grudge frontends should load
   `https://js.puter.com/v2/` with `defer`. Do not bundle a copy.
2. **Account = Puter UUID.** Sign-in is `puter.auth.signIn()` →
   `puter.auth.getUser()` → POST `{ puterUuid, puterUsername }` to the canonical
   bridge `https://id.grudge-studio.com/auth/puter`. The bridge returns
   `{ token, user }`. Store as `grudge_auth_token` in `localStorage`. This is
   already implemented in `client/src/lib/grudgeBackend.ts` and proxied by
   `vercel.json` for `grudgewarlords.com`, and by `grudge-platform/api/puter.js`
   for `grudgeplatform.io`.
3. **Branding stays Grudge.** Even though Puter does the auth, the user never
   sees Puter chrome. The login button reads "Sign in with Grudge ID" or
   shows the Grudge logo, never the Puter logo (per project rule
   `i5j4NUBegZNoyEEBjTkREl`).
4. **OG image is shared.** All Grudge surfaces should set
   `og:image = https://grudgewarlords.com/opengraph.jpg` and
   `og:site_name = Grudge Studio` so social embeds look identical.
5. **One canonical Twitter handle.** `@grudgewarlords`.

## Visual tokens to mirror

The `systems-master.html` outline at
`C:\Users\nugye\Desktop\MouseWithoutBorders\corrected\corrected\systems-master.html`
captures the canonical design tokens. Surfaces that copy them get the `/gs`
look "for free":

| Token | Value | Use |
|---|---|---|
| `--g-fire` | `#ff3d00` | primary CTA |
| `--g-neon` | `#00ffcc` | accent / positive |
| `--g-volt` | `#ffe600` | GBux / currency |
| `--g-sky` | `#00b4ff` | info / links |
| `--g-violet` | `#9d4edd` | NFT / premium |
| `--g-rose` | `#ff006e` | danger / rare |
| `--g-bg` | `#05050f` | page background |
| `--g-paper` | `#0c0c1e` | cards |
| `--g-lift` | `#12122a` | raised cards |
| `--g-edge` | `#1e1e3a` | borders |
| `--g-font-display` | `Bebas Neue` | headings |
| `--g-font-body` | `Outfit` | body |
| `--g-font-mono` | `Fira Code` | code, numbers, status pills |

When `grudgeplatform.io` and the eventual `launcher.grudge-studio.com` adopt
these tokens, all three sites will read as one studio.

## Account flow to mirror

```
[ User clicks "Sign In" ]
        |
        v
[ puter.auth.signIn() popup ]
        |
   (Puter UUID + username)
        |
        v
[ POST /auth/puter on id.grudge-studio.com ]
        |
   ( { token, user } — token signed by JWT_SECRET shared with grudge-backend )
        |
        v
[ localStorage.grudge_auth_token = token ]
        |
        v
[ Window.dispatchEvent("grudge:auth:success") ]
        |
        v
[ App routes to /home (or whatever protected page) ]
```

This flow is identical on `grudgewarlords.com`, `grudge-studio.com/gs`, and
should be identical on `grudgeplatform.io`. The bridge is the single point of
truth — every account, regardless of provider (Discord, Google, GitHub,
Phone, Solana wallet, Puter, guest), resolves to **one** Grudge ID linked to
**one** Puter UUID.

## What NOT to do

- Do not introduce Supabase, NextAuth, or any other identity layer in any
  Grudge surface. The bridge is the only source of truth.
- Do not hardcode the Puter SDK version. Always `https://js.puter.com/v2/`.
- Do not strip `og:image` or `og:site_name` from any Grudge frontend's
  `<head>`. Social previews must look like one studio.
- Do not refactor `/gs` to look like `grudgewarlords.com`; refactor
  `grudgewarlords.com` (and `grudgeplatform.io`, and the launcher) to look
  like `/gs`.

## Related

- `docs/audit-report.md` — full system audit (this doc is referenced in §11
  and §12).
- `docs/puter-registry.json` — Puter deployments and naming convention.
- `client/src/data/systemMap.ts` — `route:/gs` and `svc:gaming-portal` nodes.
- `client/src/lib/grudgeConfig.ts` — `AUTH_GATEWAY`, `GRUDGEDOT_LAUNCHER_URL`,
  `GRUDGE_PLATFORM_URL`.
- `~/.agents/skills/puter/SKILL.md` — Puter SDK usage and identity rules.
