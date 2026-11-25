# Warlords test deployment

Target: https://test.grudge-studio.com

This change prepares the existing Grudge-Builder MMO client for a stable test
host. It does not implement a new MMO or establish gameplay readiness.

## Changes

- Recognize the exact test domain as a Warlords game host.
- Keep Foundry returns, airship links, and absolute zone links on the test build.
- Preserve production defaults and reject arbitrary preview hosts as game hosts.
- Build a Vercel preview and assign only the existing test domain after HTTP checks.
- Require the test domain to already belong to the configured Vercel project;
  the workflow does not move it from another project or change DNS.

The workflow runs on `codex/warlords-test-realm` pushes and can be dispatched
manually once present on the default branch. It needs the existing
`VERCEL_TOKEN` repository secret with access to the team/project already used
by `vercel-deploy.yml`. Preview deployment protection additionally needs
`VERCEL_AUTOMATION_BYPASS_SECRET` for automated HTTP checks. Configure preview
environment values in that Vercel project, including the monorepo vendor token
if required by the full client build. No production promotion is performed.

## Existing services

| Layer | Existing authority |
|---|---|
| Game client | Grudge-Builder React / Three.js / Rapier |
| Grudge ID, account, character and island persistence | Railway grudge-api / Postgres |
| Multiplayer | Colyseus on Railway |
| Lore and game definitions | Existing ObjectStore / lore routes |
| Asset registry | Cloudflare D1 |
| Binary terrain, models, animation and audio | Cloudflare R2 CDN |

This is a test **client** against the existing fleet services, not an isolated
test database. The domain change does not create D1/R2 resources, migrate player
records, reset progress, or deploy server changes.

## Verification

Run `node --experimental-strip-types --test scripts/test-warlords-test-domain.mjs`
on Node 22 or later. `node scripts/probe-warlords-test.mjs <preview-url>` checks
the intro, tutorial, home island, world map, open-world and lore shells plus
game API and Colyseus health. These are HTTP gates, not rendered gameplay tests.

Before declaring the MMO test-ready, verify with two owned test characters:

1. Grudge ID sign-in and Foundry return to the test domain.
2. Leviathan opening, Shipwreck Cove tutorial entry, and visible peer movement.
3. Authoritative tutorial progress, gathering, crafting and inventory persistence
   across reconnect; invalid/duplicate rewards must be rejected by the server.
4. Home-island unlock, world-map travel, sector transitions and combat.
5. Real R2 terrain/character/animation assets load, and lore/NPC content matches
   the canonical game definitions; no substituted placeholder islands.
6. Disconnect/rejoin, browser performance and a measured concurrent-player load.

## Session evidence (2026-09-06)

Four domain regression tests passed locally. Full-client build and authenticated
gameplay have not been run. GitHub connector reads succeeded; direct private-repo
clone was unavailable. The Vercel connector returned no teams and failed to list
the configured team's projects. A HEAD request to the test host returned 200;
GET probes returned 403 from this environment, so service/game health is unverified.
The existing repository contains the Leviathan, multiplayer shipwreck contract,
island systems and lore routes. Their presence is not evidence of working gameplay.
