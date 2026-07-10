# Grudge Studio — Deploy Ownership (ONE TRUTH)

**Rule:** One public hostname → one owning repo + deploy command.  
Other repos may **call** the service; they must not re-attach its Cloudflare route / custom domain.

Regenerate published truth after ownership changes:

```bash
cd GrudgeBuilder
npm run gen:fleet-truth
# publish ObjectStore api/v1/_meta/fleet-truth.json to R2 (static-json/_meta/…)
```

Gate:

```bash
npm run probe:gate          # hard fail critical surfaces
npm run probe:golden        # auth golden path (public)
npm run check:ownership     # wrangler deny-list (sibling repos)
```

---

## Canonical ownership table

| Public surface | Owner repo | Worker / project | Deploy | Forbidden |
|----------------|------------|------------------|--------|-----------|
| `ai.grudge-studio.com` | `grudge-ai-hub` + UI `GrudaNode/grudge-agent` | CF `grudge-ai-hub` (domain) + `grudge-legion-ai` (`/v1/*`,`/health`) · Vercel `grudge-agent` | `cd grudge-ai-hub && npm run deploy` · `cd GrudaNode/grudge-agent && npx vercel --prod` | ObjectStore `workers/ai` custom domain; studio-backend `cloudflare/workers/ai-hub` routes; ALE attaching `ai.*` |
| `id.grudge-studio.com` | GrudgeBuilder / id-gateway | CF `grudge-identity-api` or Vercel alias → Railway auth | `cd workers/id-gateway && npx wrangler deploy` + Railway `grudge-api-production` | Split `api.grudge-studio.com` auth; see `docs/ID_SSO_PRODUCTION.md` |
| Game state API | GrudgeBuilder `server/` | Railway `grudge-api-production-0d46` | Railway auto / `npm run start:production` | D1 as character SSOT |
| `objectstore.grudge-studio.com` | ObjectStore | CF Pages + worker | ObjectStore wrangler / Pages | Claiming AI domain |
| `assets.grudge-studio.com` | GrudgeBuilder `workers/cdn` or ObjectStore CDN worker | CF Worker + R2 | wrangler deploy CDN | — |
| `browse.grudge-studio.com` | ObjectStore | CF Pages `grudge-objectstore` | `npm run deploy:browse` | Minimal deploy that wipes pages |
| `launcher.grudge-studio.com` | grudgedot-launcher | CF Pages `grudgedot` | Pages deploy | — |
| `grudgewarlords.com` / client | GrudgeBuilder | Vercel | `vercel --prod` + `sync-vercel-fleet` | Hardcoded Railway in client |
| `grudge-crafting.puter.site` | GrudgeBuilder `client/public/grudge-crafting.html` | Puter hosting | `npm run deploy:puter:crafting` | Local-only character bag |
| `character.grudge-studio.com` | character studio / GCS | Vercel / Pages | project-specific | Merging into Warlords `/character` as sole SSOT |

---

## AI hub topology (intentional dual worker)

| Worker name | Role |
|-------------|------|
| **grudge-ai-hub** | Custom domain `ai.grudge-studio.com` + `legion-ai…` — UI proxy (`UI_ORIGIN` → grudge-agent.vercel.app) + catch-all |
| **grudge-legion-ai** | Path routes `/v1/*`, `/health`, `/api/health` — Gemini BYOK secrets historically first |

**Clients must only use** `https://ai.grudge-studio.com`.

Secrets: `grudge-ai-hub/scripts/set-gemini-secret.ps1` → both workers.

---

## Deprecated (do not wire new apps)

| Host | Status |
|------|--------|
| `api.grudge-studio.com` | Old tunnel / split-brain — use Railway or same-origin `/api/*` |
| Puter 404 shells (`grudgewarlords.puter.site`, etc.) | See puter-registry |

---

## CI

- `.github/workflows/fleet-production-gate.yml` — schedule + push + manual  
- Jobs: `probe:gate`, `probe:golden`, `check:ownership` (when monorepo root available)

---

## Incident: AI root returns `{"error":"unauthorized"}`

1. Something redeployed **non-Legion** code as `grudge-ai-hub`.  
2. Fix: `cd grudge-ai-hub && npx wrangler deploy --config wrangler.domain.toml`  
3. Confirm: `curl -sI https://ai.grudge-studio.com/` → 200 HTML, CORS includes `X-Request-Id`.  
4. Run `npm run probe:gate`.
