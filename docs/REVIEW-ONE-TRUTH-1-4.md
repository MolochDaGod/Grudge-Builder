# Review: ONE TRUTH items 1–4 (do not merge 5–7 yet)

Branch: `audit/one-truth-1-4` on MolochDaGod/Grudge-Builder

## 1. Single bootstrap artifact
- Canonical file: `client/public/grudge-game-bootstrap.js`
- Same bytes also at `client/public/js/grudge-game-bootstrap.js` so a future R2 sync of `js/` is real JS, not the info-hub HTML.
- Header now names the three hosts. Live `assets.grudge-studio.com/js/grudge-game-bootstrap.js` is still HTML until R2 is overwritten after merge.

## 2. Mount fleet on the play client
- `client/index.html` loads `/grudge-fleet.js` immediately after bootstrap.
- Harvest `window.GrudgeFleet.depositHarvestLoot` / `flushOfflineHarvestQueue` will resolve on client.grudge-studio.com.

## 3. Token keys
- Warlords write/read: `grudge_auth_token`, `grudge_session_token`, `grudge.token`, `sso_token`, `grudge_token`
- `grudge.open.token` is read-only fallback (Open product only).
- Shared list: `shared/fleet/tokenKeys.ts`
- Fleet JS bumped to 2.11.0 with the same write set.

## 4. Catalog fetch
- Canonical JSON host: `https://info.grudge-studio.com/api/v1`
- Browser still uses `/api/objectstore/v1` (existing rewrite).
- Point that rewrite at info (see vercel.json in this branch if present).
- Fleet games-library no longer third-hops objectstore.

## Not in this PR (5–7)
Three r186, Rapier 0.20, lazy Puter, public source maps.

## After merge (ops)
1. Copy `client/public/js/grudge-game-bootstrap.js` to R2 `js/grudge-game-bootstrap.js` with `Content-Type: application/javascript`.
2. Copy `client/public/grudge-fleet.js` to R2 `js/grudge-fleet.js`.
3. Sync the same bootstrap bytes onto `id.grudge-studio.com/grudge-game-bootstrap.js`.
