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
