# Grudge Warlords / Grudge Studio / Puter — Consolidation Audit
Date: 2026-04-21
Owner: Racalvin The Pirate King
Scope: reconcile deployments, accounts, URLs, and Puter integration to a single verified truth.
Out of scope: `thc-labz-battle`, `doepbudz` (per user policy).
## 1. Source of Truth
- **Deployment graph**: `client/src/data/systemMap.ts` (+ mirrored `docs/system-map.json`). Extended in this audit with four Puter nodes: `svc:puter-worker`, `svc:puter-crafting`, `svc:puter-sdk`, `svc:puter-auth-bridge`, plus three Puter domains.
- **Puter registry**: `docs/puter-registry.json` (new). Holds workers, frontends, SDKs, auth-bridge, CORS allowlist references, key convention, and open gaps.
- **Identity SSOT**: `id.grudge-studio.com` — every auth path (Discord, Google, GitHub, phone, Puter, Solana wallet, guest) converges here.
- **Game data SSOT**: `https://molochdagod.github.io/ObjectStore/api/v1` (55+ static JSON endpoints), consumed via `lib/assetConfig.ts::apiUrl()`.
- **Binary asset SSOT**: `https://assets.grudge-studio.com` (Cloudflare R2), consumed via `lib/assetConfig.ts::assetUrl()`.
- **Auth token**: single key `grudge_auth_token` in localStorage. Legacy alias `grudge_session_token` still written by `grudgeBackend.ts` for backward compatibility.
## 2. Live health snapshot (curl at audit time)
- `id.grudge-studio.com` — **502 Bad Gateway** ❌ (auth SSOT is currently down)
- `api.grudge-studio.com/api/health` — 200 ✅
- `account.grudge-studio.com/health` — 200 ✅
- `objectstore.grudge-studio.com/health` — 200 ✅
- `molochdagod.github.io/ObjectStore/api/v1/master-items.json` — 200 ✅
- `grudge-server.puter.work/api/health` — 200 ✅
- `grudgewarlords.com` — 200 ✅
- `grudgeplatform.io` — 200 ✅
The `id.grudge-studio.com` 502 is the single most important item to resolve — every Grudge frontend will fail SSO until it is restored.
## 3. Identity flow verification
Validated path (read, not E2E):
1. Frontend calls `/api/auth/puter` (Vercel rewrite in `GrudgeBuilder/vercel.json` → `https://id.grudge-studio.com/auth/puter`).
2. On grudgeplatform.io, the equivalent entry point is `grudge-platform/api/puter.js` (+ `puter-link.js`) using `_grudge-proxy::proxyToGrudge`.
3. `grudge-sdk.js::auth.puter()` and `grudgeBackend.ts::loginWithPuter()` both POST `{ puterUuid, puterUsername }` to `/auth/puter` — shapes match.
4. Token stored under `grudge_auth_token`, user cached as `grudge_user` (SDK) / `grudge-session` (GrudgeBuilder legacy). Both read `grudge_auth_token`.
Account tiers (master admin Racalvin, admin, member, pleb) are not yet represented in frontend code. TODO: expose tier on `GrudgeUser` interface in `grudgeBackend.ts`.
## 4. Drift fixes applied in this audit
- `GrudgeBuilder/client/src/lib/puterIntegration.ts:443` — fixed domain typo `grudgestudio.com` → `grudge-studio.com` (canonical hyphenated form).
- `GrudgeBuilder/client/src/lib/puterIntegration.ts:446-450` — replaced broken fallback chain. Previous expression `VITE_PUTER_SERVER_URL || '/api/game' || 'https://grudge-server.puter.work'` never reached the legacy Puter URL (non-empty string is always truthy). New behavior: env var > gated legacy flag > same-origin `/api/game` proxy.
- `grudge-platform/api/_grudge-proxy.js:8-24` — added `https://grudge-crafting.puter.site` and `https://grudge-server.puter.work` to `ALLOWED_ORIGINS`. Points the CORS allowlist at the canonical Puter registry in `docs/puter-registry.json`.
- `GrudgeBuilder/client/src/data/systemMap.ts` — added Puter group: three domains, four services, seven edges, three readiness rows.
## 5. Drift still standing (no code change yet)
- `GrudgeBuilder/docs/system-map.json` is out of date relative to `systemMap.ts`. Regenerate with the existing export script (owner: frontend) before the next `/organizer` deploy.
- `GrudgeBuilder/client/src/lib/assetConfig.ts:17` uses `VITE_ASSET_CDN_URL`; `grudge-platform/.env.example` calls the same thing `VITE_ASSETS_URL`. Both repos use different spellings — pick one and alias the other (`VITE_ASSETS_URL` is the SDK canon).
- `GrudgeBuilder/client/src/lib/assetConfig.ts:22` uses `VITE_OBJECT_STORE_URL`; `grudge-platform/.env.example` uses `VITE_OBJECTSTORE_URL` (no underscore). Same fix needed.
- No repo currently declares account tiers (master admin / admin / member / pleb) as a shared enum.
## 6. Puter — concrete state (as of audit)
- Worker: `grudge-server.puter.work` live (health 200). 12 endpoints catalogued in `docs/puter-registry.json`.
- Frontend: `grudge-crafting.puter.site` live. Should consume ObjectStore per rule `n4qBEKIS1FgTYKxF1JHUHy` — not audited end-to-end; flagged open.
- SDK: `js.puter.com/v2/` loaded in `GrudgeBuilder` (via `puterIntegration.ts` type declarations) and `grudge-platform` (`grudge-sdk.js`).
- KV key convention: `grudge:<domain>:<id>:<field>` already used for islands, account, world blocks in `puterIntegration.ts`. Codified in registry as policy.
- Auth bridge: `id.grudge-studio.com /auth/puter` — cannot verify behavior until the 502 clears.
## 7. Open action items (lowest cost first)
1. **Resolve `id.grudge-studio.com` 502.** Owner: backend. Every Grudge frontend SSO is blocked until this clears. No code change required on our side.
2. Regenerate `docs/system-map.json` from the extended `systemMap.ts`. Owner: frontend. Single script run.
3. Normalize `VITE_ASSET_CDN_URL` ↔ `VITE_ASSETS_URL` and `VITE_OBJECT_STORE_URL` ↔ `VITE_OBJECTSTORE_URL`. Add aliases in `assetConfig.ts` that read either name. Owner: frontend.
4. Update `GrudgeBuilder/puter.md` to point at `docs/puter-registry.json` as canonical and delete duplicated endpoint tables. Owner: frontend.
5. Add `tier` / `role` field to `GrudgeUser` in `grudgeBackend.ts`. Owner: backend + frontend jointly.
6. Confirm no divergent token validation between `id.grudge-studio.com/auth/verify` and `grudge-server.puter.work/api/auth/verify`. Owner: backend.
7. Confirm `grudge-crafting.puter.site` consumes ObjectStore, not local copies. Owner: whoever ships `grudge-crafting`.
## 8. PRs to open (from Phase 3 fixes)
- **GrudgeBuilder**: one PR — `systemMap.ts` extension, `puterIntegration.ts` domain + fallback fixes, new `docs/puter-registry.json`, new `docs/audit-report.md`.
- **grudge-platform**: one PR — `api/_grudge-proxy.js` `ALLOWED_ORIGINS` extension.
Both PRs should reference this report and the `/organizer` readiness tab.
## 9. Puter name mismatches and shadow deployments (probe dated 2026-04-21)
### 9a. Live Grudge-owned Puter deployments NOT referenced by current code
- `https://grudgewarlords.puter.site` — 200, title `Grudge Warlords`. No code references. Owner TBD.
- `https://grudgestudio.puter.site` — 200, title `GRUDGE Warlords - GRUDACHAIN`. No code references. Non-hyphenated slug — differs from canonical `grudge-studio.com`.
- `https://grudge-studio.puter.site` — 200, title `Grudge Studio - Cloud Dashboard`. Referenced only in archived `grudge-platform/public/legacy-auth.html`. The HTML file is archived but the deployment is live.
Action: for each, decide keep-and-register or retire-and-redirect. All three are captured in `docs/puter-registry.json::frontends` with `action` notes, and added to `systemMap.ts` with `status: broken` until an owner claims them.
### 9b. Name-break traps (code-vs-deployment mismatches that silently 404)
- `https://grudgecrafting.puter.site` — 404. The real slug is the hyphenated `grudge-crafting.puter.site`. `client/src/pages/crafting.tsx:6` already uses the correct form; do not rename without a sweep of `CRAFTING_ORIGIN`, `ALLOWED_ORIGINS`, and `GrudgeAccountSDK.ts` references.
- `https://grudge-warlords.puter.site` — 404. The real slug is the NON-hyphenated `grudgewarlords.puter.site` (mirrors `grudgewarlords.com`). A developer assuming the `grudge-studio.com`-style hyphenation will silently 404.
- `https://grudge-platform.puter.site`, `https://grudge-launcher.puter.site`, `https://grudge-admin.puter.site`, `https://grudge-dash.puter.site`, `https://grudge-ai.puter.site`, `https://grudge-legion.puter.site` — all 404. Do NOT reference these in code or docs. If a future deployment is planned, reserve the slug first and add a `status: planned` entry to the Puter registry.
### 9c. Reserved but empty
- `https://grudge.puter.site` — 200 but shows Puter's default landing page. Hold as a reserved namespace or deploy a real redirect to `grudge-studio.com`.
### 9d. Naming convention going forward
Puter slugs for Grudge apps are inconsistent (some hyphenated, some not). Until a rename pass is run, treat the **actual live slug** as authoritative and record it in `docs/puter-registry.json` before referencing it anywhere. The registry's `nameBreakRisks` section is the definitive list of "do not type this" URLs.
## 10. Engine stack decision (2026-04-22)
**Babylon is out of the Grudge stack entirely.** Canonical engine surface is Three.js + glTF + Rapier + Cannon + 3D motion + three loaders + three retargeting (all already in `GrudgeBuilder/client/src/island3d/**`, `components/ThreeScene.tsx`, `components/CharacterModel3D.tsx`).
Deprecated in this audit (flipped to `status: deprecated` in `systemMap.ts`):
- Domain `engine.grudge-studio.com`
- Domain `grudge-engine-web.vercel.app`
- Service `svc:engine-web` (Grudge-Engine-Web Babylon editor)
- Repo `Grudge-Engine-Web`
Follow-up actions (separate from this audit):
- Retire the two Babylon deployments (VPS container + Vercel preview).
- Archive `Grudge-Engine-Web` repo on GitHub.
- Scrub any remaining links to `engine.grudge-studio.com` / `grudge-engine-web.vercel.app` from docs, README files, and marketing surfaces. No Grudge repo currently links to either — verified via grep during this audit — but future commits must not reintroduce them.
## 11. Grudge Game Engine — one tool, two surfaces (2026-04-22)
**Repo (planned):** `grudge-game-engine` — fork of `github.com/mrdoob/three.js/tree/master/editor`, improved.
**Stack (fixed):** Three.js, glTF, Rapier, Cannon, 3D motion, three loaders, three retargeting. No Babylon anywhere.
**Two deployments, one build:**
- `https://engine.grudge-studio.com` (Vercel) — canonical.
- `https://grudgestudio.puter.site` (Puter-hosted) — same artifact, different env.
Env differences are limited to storage base and auth hint; code is identical.
### Scene layer (unified)
Canonical store: new `/api/scenes` CRUD on `api.grudge-studio.com`, scene JSON persisted to R2 under `grudge-scenes/{grudgeId}/{sceneId}.json`.
Puter surface reads the canonical store by default and additionally caches each scene under Puter KV/FS (`grudge:scene:<sceneId>:state`, `:dirty`). Writes go to VPS first; if the VPS is unreachable the write is queued in `grudge:scene:<sceneId>:dirty` and retried — same dirty-write pattern `GrudgeBuilder/client/src/lib/puterIntegration.ts::puterIslandKV.saveState` already uses for islands.
Net effect: a scene saved in either place opens in the other within one round-trip to VPS; offline edits made on the Puter side sync on reconnect.
### Account layer (unified)
Both surfaces share `grudge_auth_token` and `id.grudge-studio.com` SSO. Tier enum — master admin (Racalvin), admin, member, pleb — gates:
- Scene ownership + delete.
- Cross-user share and publish.
- Asset upload caps.
First-touch on the Puter surface mints a Grudge ID from the user's puter_uuid via `/auth/puter` so a scene created before email-claim stays attached to the final account.
### Landing / launcher
Puter surface defaults to a `/launcher` route that is the **GrudgeDot** login entry. Per rule `Od9ViAGDSIkzlUacJ2wqpq` the launcher must be branded GrudgeDot (not GDevelop) and not require a separate login on top of `id.grudge-studio.com`.
### Follow-up (separate from this audit)
1. Create repo `grudge-game-engine` and vendor mrdoob's `three.js/editor` as the base.
2. Stand up `/api/scenes` CRUD on `grudge-backend`; define R2 bucket `grudge-scenes`.
3. Add `https://grudgestudio.puter.site` and `https://engine.grudge-studio.com` to the SSO return-URL allowlist and (for engine.g-s.com) to `ALLOWED_ORIGINS` in `grudge-platform/api/_grudge-proxy.js`. The Puter origin is already in the CORS allowlist from §4 of this report.
4. Wipe existing content at `grudgestudio.puter.site` before deploy.
5. Build once, deploy to both; verify a scene saved on one surface opens on the other with identical Grudge ID.
## 12. Repos deliberately not touched
- `thc-labz-battle`, `doepbudz` — per user rule `11Cw4GX7NbtgVzGGutY9iF`.
- `grudge-backend`, `grudge-studio-dash`, `grudge-ai-hub`, `The-ENGINE`, `Grudge-Engine-Web`, `grudge-arena`, `Grudge-Studio-Game`, `grim-armada-web`, `GrudgeSpaceRTS`, `TGE-Billing`, `RPG-MODULAR` — out of audit write scope. Registered in `systemMap.ts` only.
## 13. Production parity for grudgeplatform.io, /gs, GrudgeDot, Puter (2026-04-26)
### 13a. Live surfaces (probed 2026-04-26)
- `https://grudgewarlords.com` — 200 ✅ (this repo's SPA, Three.js, loads `js.puter.com/v2/`).
- `https://grudgewarlords.com/gs` — 200, but it's the SPA catch-all on this repo, **not** a real `/gs` route here.
- `https://grudge-studio.com/gs` — 200, title `Rec0deD:88 — Grudge Studio Gaming Portal`. Served by `The-ENGINE` (`svc:gaming-portal`). This is the **canonical** `/gs` surface.
- `https://grudgeplatform.io` — 200, title `RPG Maker Studio — Grudge Studios`. Served by `grudge-platform` repo. Now registered as `dom:grudgeplatform.io` + `svc:grudge-platform`.
- `https://grudgeplatform.io/play` — 200. Now registered as `route:/play` (host: grudgeplatform.io).
- `https://grudgedot-launcher.vercel.app` — **404** ❌ (probed). Stale. Removed from frontend code and registered in `systemMap.ts` as `dom:grudgedot-launcher` with `status: broken`.
- `https://grudge-server.puter.work/api/health` — 200 ✅.
- `https://launcher.grudge-studio.com` — 404 (planned, not yet deployed).
- `https://grudge-studio.com/api/status` — 404 (the systems-master.html live status endpoint does not yet exist on `The-ENGINE`; tracked in §14b and §15b).
- `https://api.grudge-studio.com/api/health` — **404 (regression).** The 2026-04-21 audit recorded this as 200; current probe returns 404. Flag for backend owner; not addressed in this pass.
- Full probe results: 20/24 OK. Re-run any time via `node scripts/probe-deployments.mjs`.
### 13b. Owner directives (2026-04-26)
1. Canonical GrudgeDot launcher destination is `https://launcher.grudge-studio.com`. Until that's live, UI tiles linking to it are visually disabled.
2. `grudgeplatform.io` is the **Web3 / cNFT / wallet / games hub**. It is **not** merged into the GrudgeDot launcher — it shares only the auth and data layers (Puter SDK → `id.grudge-studio.com /auth/puter`, ObjectStore for items, R2 for binary assets).
3. `/gs` is the polished visual + auth reference. **Do not refactor it.** Other Grudge surfaces mirror its patterns. See `docs/references/gs-portal.md`.
### 13c. Drift fixes applied in this pass
- `client/src/data/systemMap.ts` — added `dom:grudgeplatform.io`, `dom:grudgedot-launcher` (broken), `svc:grudge-platform`, `repo:grudge-platform`, `route:/play` (host: grudgeplatform.io), `route:/gs` (host: grudge-studio.com), nine new edges, and two readiness rows. Extended `RouteSeed` with optional `host`. The default `route → svc:frontend` edge skips host-anchored routes.
- `docs/puter-registry.json` — added `frontends` entry for `grudgeplatform.io`; added `namingConvention` block; expanded `corsAllowlistedIn` and `openGaps` to track the dead `grudgedot-launcher.vercel.app` and the missing-art/gameplay gap.
- `client/src/lib/grudgeConfig.ts` — added `GRUDGEDOT_LAUNCHER_URL` (default `https://launcher.grudge-studio.com`), `isGrudgedotLauncherLive()`, and `GRUDGE_PLATFORM_URL`.
- `client/src/pages/home.legacy.tsx` — replaced the dead `grudgedot-launcher.vercel.app` constant with `GRUDGEDOT_LAUNCHER_URL`; the launcher tile now renders disabled until the canonical host is live.
- `docs/references/gs-portal.md` — new doc capturing the visual + auth conventions of `/gs` to mirror across surfaces.
- `scripts/probe-deployments.mjs` — new script that hits every registered domain and `/api/status`. Run via `node scripts/probe-deployments.mjs`.
## 14. Cross-repo checklist (Phase 5)
Work that must happen in repos other than `GrudgeBuilder` to complete production parity. None of this is done in this pass.
### 14a. `grudge-platform` (grudgeplatform.io + /play)
- `api/_grudge-proxy.js::ALLOWED_ORIGINS` — must include exactly: `https://grudgewarlords.com`, `https://www.grudgewarlords.com`, `https://grudge-studio.com`, `https://grudgeplatform.io`, `https://launcher.grudge-studio.com`, `https://grudge-crafting.puter.site`, `https://grudge-server.puter.work`.
- `api/puter.js` and `api/puter-link.js` — already proxy to `id.grudge-studio.com /auth/puter` (+ `/puter-link`); leave as-is.
- `public/index.html` — `og:image` = `https://grudgewarlords.com/opengraph.jpg`, `og:site_name` = `Grudge Studio`, `twitter:site` = `@grudgewarlords` (per `docs/references/gs-portal.md`). Load `https://js.puter.com/v2/` exactly once with `defer`.
- Pull items / icons / recipes from `https://molochdagod.github.io/ObjectStore/api/v1/master-items.json` (and siblings) — no hardcoded copies.
- Pull binary assets (sprites, models, audio) from `https://assets.grudge-studio.com` via the same `assetUrl()` helper this repo uses (or its grudge-sdk equivalent).
- Add Crossmint embed for cNFT + custodial wallet flows. Server keys live in Vercel project env vars (see `docs/audit-report.md` §14d).
- `/play` should redirect to `https://grudgewarlords.com/?sso_token=…` for consistent identity until `/play` has its own client. Long-term: render its own client and reuse the same SSO token mechanism.
- Remove `public/legacy-auth.html` references to deployments other than the canonical Puter ones from `docs/puter-registry.json`.
### 14b. `The-ENGINE` (grudge-studio.com + `/gs`)
- **Do not refactor `/gs`.** It is the visual + auth reference per owner directive.
- Confirm `/api/status` exposes the keys `id`, `api`, `ws`, `launcher`, `assets` so the live status bar in `systems-master.html` keeps working across the studio.
- Add `https://grudgeplatform.io`, `https://launcher.grudge-studio.com`, and `https://grudgewarlords.com` to its CORS allowlist.
- Add the same hosts to its SSO return-URL allowlist on `id.grudge-studio.com`.
### 14c. `grudgedot-launcher` (canonical: launcher.grudge-studio.com)
- The legacy `grudgedot-launcher.vercel.app` host returns 404 (probed). Either redeploy it under `https://launcher.grudge-studio.com` or archive the repo.
- Until redeployed, this repo's `home.legacy.tsx` renders the launcher tile in a disabled state via `isGrudgedotLauncherLive()`.
- When redeployed, set `VITE_GRUDGEDOT_LAUNCHER_LIVE=true` in `GrudgeBuilder` Vercel env vars to flip the tile back on without a code change.
### 14d. `grudge-backend` (id.grudge-studio.com / api.grudge-studio.com)
- Confirm `/auth/puter` and `/auth/puter-link` accept the canonical `{ puterUuid, puterUsername }` payload from all three frontends (already true per `puter-registry.json::authBridge.clientFlow` — verify on next deploy).
- SSO return-URL allowlist must include `https://grudgewarlords.com`, `https://grudge-studio.com`, `https://grudgeplatform.io`, `https://launcher.grudge-studio.com`, `https://engine.grudge-studio.com`, `https://grudgestudio.puter.site`.
- `JWT_SECRET` rotation must coordinate with this repo's `.env` to avoid cross-app auth breakage.
- Add `/api/status` (5-key health summary) for the systems-master live status bar (id, api, ws, launcher, assets).
## 15. Alignment with `systems-master.html`
User provided `C:\Users\nugye\Desktop\MouseWithoutBorders\corrected\corrected\systems-master.html` as the architectural outline (2026-04-26). Reconciled below.
### 15a. What matches
- **Layered architecture.** `systems-master.html` describes Vercel (Next.js) + Puter (Apps/Sites/Workers) + Shared Packages. This repo already enforces that layering: Vercel-hosted SPA on `grudgewarlords.com`, Puter SDK loaded from `js.puter.com/v2/`, Puter Worker at `grudge-server.puter.work`, Puter site at `grudge-crafting.puter.site`, ObjectStore as a shared data package.
- **Shared auth.** `systems-master.html`'s `useGrudgeAuth()` hook pattern matches what `client/src/lib/grudgeBackend.ts` already does (Puter UUID → `/auth/puter` → `grudge_auth_token`). Documented in `docs/references/gs-portal.md`.
- **Crossmint, custodial wallets, cNFT.** Already wired in this repo via `server/services/crossmintWallet.ts` and `/api/wallet`, `/api/nfts`, `/api/island-nfts` rewrites. `grudge-platform` is the right home for the user-facing embeds.
- **Visual tokens.** `--g-fire #ff3d00`, `--g-neon #00ffcc`, `--g-volt #ffe600`, `--g-sky #00b4ff`, `--g-violet #9d4edd`, `--g-rose #ff006e`, Bebas Neue + Outfit + Fira Code — codified in `docs/references/gs-portal.md` for cross-surface adoption.
- **AI routing.** `systems-master.html` recommends routing user-facing generative AI through `puter.ai.*` (user pays) and studio-only AI (moderation, lore Q&A) through server keys. This repo already does that: `server/services/aiPersonality.ts` uses server-side OpenAI; client-side avatar/sprite generation goes through `puterIntegration.ts`.
### 15b. Discrepancies to reconcile (no change in this pass)
- **DB engine.** `systems-master.html` labels the canonical DB as **MySQL 8**, but this repo's schema is **Postgres** via Drizzle (`shared/schema.ts`, `drizzle.config.ts`). The VPS `.env` declares both a `MYSQL_*` block (game data) and a `DATABASE_URL` Postgres URL (account/character spine via Neon). Reconcile in a follow-up audit: clarify which engine owns which table set, and update `systems-master.html` or migrate accordingly.
- **Status bar keys.** `systems-master.html` calls `https://grudge-studio.com/api/status` and expects keys `id / api / ws / launcher / assets`. This endpoint must exist on `The-ENGINE` (Phase 5 §14b). It does not exist on `api.grudge-studio.com` — do not move it without updating the HTML.
- **Planned Puter Sites.** `systems-master.html` lists `characters.grudge.puter.site`, `islands.grudge.puter.site`, `lore.grudge.puter.site` as planned. None exist yet (`grudge.puter.site` itself is the default Puter welcome page). When deployed, register them in `docs/puter-registry.json::frontends` first to avoid the same shadow-deployment problem documented in §9.
- **Bull/BullMQ + Redis 7.** `systems-master.html` proposes Redis 7 (Docker) + BullMQ for rate limiting + background NFT mint jobs. The VPS `.env` already declares `REDIS_PASSWORD`; the actual queue infrastructure is not yet in this repo. Track as a `grudge-backend` follow-up.
### 15c. systems-master.html → systemMap.ts cross-reference
| Master HTML node | systemMap.ts id |
|---|---|
| Vercel (Next.js) main app | `svc:frontend` |
| Puter Apps / Sites / Workers | `svc:puter-worker`, `svc:puter-crafting`, `svc:puter-sdk`, `svc:puter-auth-bridge` |
| Grudge Backend (DB) | `svc:game-api` + `data:pg-characters`, `data:pg-accounts`, `data:pg-inventory` |
| Crossmint | `svc:wallet-svc` (server-side) + `svc:grudge-platform` (client embed) |
| Redis 7 (Docker) | not yet a node — add when the queue ships |
| Web3 hub | `svc:grudge-platform` + `dom:grudgeplatform.io` |
| Reference portal | `svc:gaming-portal` + `route:/gs` |
| GrudgeDot launcher | `dom:launcher.g-s.com` (planned) + `dom:grudgedot-launcher` (broken/legacy) |
## 16. Backend route shape change — login + game-flow regression (2026-04-27)
### 16a. Symptom
User reported "can't login" and "game flows aren't working" on `grudgewarlords.com`. Login page rendered, but every authenticated request returned 404 / 502.
### 16b. Root cause
`grudge-backend` dropped the `/api/` prefix from its public routes between the 2026-04-21 audit and 2026-04-27. Probed shape:
- `https://api.grudge-studio.com/health` — 200 ✅ (was `/api/health`).
- `https://api.grudge-studio.com/characters` — 401 ✅ auth-required (was `/api/characters`).
- `https://api.grudge-studio.com/professions/list` — 401 ✅ (was `/api/professions/list`).
- `https://api.grudge-studio.com/api/*` — **404** for every prior `/api/*` path.
- `https://account.grudge-studio.com/health` — 200 ✅ (account API is on its own host; the prior rewrite pointed `/api/account/*` at `api.grudge-studio.com/api/account/*`, which was 404).
- `https://id.grudge-studio.com/auth/puter` (POST) — 400 ✅ endpoint alive, expects body.
- `https://id.grudge-studio.com/auth/login` (POST) — 400 ✅ endpoint alive.
### 16c. Endpoints still missing on the auth host (probe 2026-04-27)
These return 404 on `id.grudge-studio.com` and need backend attention. Listed for the owner; not addressed in this pass.
- `/auth/verify` — client-side `verifyToken()` calls this on every page load (returns invalid → logout).
- `/auth/sso-check` — was the cross-app SSO bootstrap target. Auto-redirect from `grudgeBackend.ts` has been disabled in this pass to break the redirect loop.
- `/auth/google/start` — OAuth start. The Vercel rewrite is wired but the upstream returns 404. Discord/Google/GitHub OAuth from `grudgewarlords.com` will fail until restored.
### 16d. Fixes applied in this pass (this repo)
- `vercel.json` — every game-API rewrite destination now drops the `/api/` segment to match the new backend shape: `/api/health` → `https://api.grudge-studio.com/health`, `/api/characters` → `/characters`, `/api/island/*` → `/island/*`, `/api/wallet/*` → `/wallet/*`, `/api/professions/*` → `/professions/*`, `/api/inventory/*` → `/inventory/*`, `/api/nfts*` → `/nfts*`, `/api/island-nfts*` → `/island-nfts*`, `/api/party*` → `/party*`, `/api/tools/*` → `/tools/*`, `/api/game/:path*` → `/:path*`. `/api/account/:path*` retargeted from `api.grudge-studio.com/api/account/*` to `account.grudge-studio.com/*`. `/api/auth/:path*` already strips `/api/` and adds `/auth/` — unchanged.
- `client/src/lib/grudgeBackend.ts` — disabled the auto-redirect to `id.grudge-studio.com/auth/sso-check` (currently 404). Removing the redirect breaks the loop on first load; the login page (`/`) and `isAuthenticated()` guards handle unauthenticated state explicitly. Comment block left in source so it can be re-enabled when the endpoint is restored.
### 16e. Required follow-ups in `grudge-backend`
1. Restore `GET /auth/sso-check` (or rename and update `grudgeBackend.ts` to match) so cross-app SSO works.
2. Restore `GET /auth/verify` (or document the new path) so `verifyToken()` doesn't silently log every user out.
3. Restore the OAuth `/auth/google/start`, `/auth/discord/start`, `/auth/github/start` endpoints, or update this repo's `login.tsx` + `vercel.json` to point at the new shape.
4. Decide whether the `/api/` prefix removal is permanent. If it is, update `AGENTS.md` and `README.md` to reflect the new shape (currently they still document `/api/*`). If the change is provisional, restore `/api/` aliases.
5. Add `account.grudge-studio.com/account` (or whatever path replaces it) so `/api/account/*` rewrites resolve to a real endpoint; root and `/account` currently return 404 there.
