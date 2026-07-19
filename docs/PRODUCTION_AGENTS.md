# Production autonomous agents

Warlords ships with three cooperating agents plus an orchestrator.  
Goal: **autonomous production deploys** and continuous **maintenance** as real users generate live data and game experiences.

**Stack (only):** Vercel · Railway · Colyseus · Cloudflare — see [STACK_PATTERN.md](./STACK_PATTERN.md).  
**Not SSOT:** Supabase, MySQL VPS, D1 heroes.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Live Ops Agent │────▶│ Deployment Agent │────▶│ Railway Agent   │
│  probe/report   │     │ plan/ship/verify │     │ deploy/health   │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         ▼                       ▼                        ▼
   experience impact      Vercel + content          grudge-api
   improvement backlog    + CF workers (opt)        Postgres+Colyseus
```

## Lifecycle

| Phase | Owner | Outcome |
|-------|--------|---------|
| **preflight** | live-ops | Know red/yellow before ship |
| **ship** | deploy (+ railway) | Content / API / client updated |
| **verify** | railway + deploy | Hard health gates pass |
| **maintenance** | live-ops | Backlog, experience, watch |
| **incident** | all | Critical probes fail → escalate |

## npm entrypoints

| Script | Agent |
|--------|--------|
| `npm run agent:railway -- <cmd>` | Railway |
| `npm run agent:deploy -- <cmd>` | Deployment |
| `npm run agent:live-ops -- <cmd>` | Live ops |
| `npm run agent:run -- <mode>` | Orchestrator |
| `npm run agent:maintenance` | live-ops report + backlog |

### Common flows

```bash
# Morning health / post-incident
npm run agent:run -- status

# Ship multiplayer REST + Colyseus code to production API
npm run agent:deploy -- ship --yes --api

# Full production ship (content + API + client)
npm run agent:deploy -- ship --yes --full

# Continuous maintenance posture
npm run agent:live-ops -- report
npm run agent:live-ops -- watch --interval 120
```

## Grok skills (auto-invoke)

| Skill | When |
|-------|------|
| `grudge-railway-agent` | Railway, grudge-api, Colyseus deploy/health |
| `grudge-deploy-agent` | Ship production, release, full deploy |
| `grudge-live-ops` | Live users, maintenance, experience, incidents |

Project path: `.grok/skills/grudge-*/SKILL.md`.

## Machine reports

All agents write JSON under `scripts/agents/reports/`:

- `railway-latest.json`
- `deploy-latest.json`
- `live-ops-latest.json`
- `orchestrator-latest.json`

CI and humans can gate on `"ok": true` and hard-fail probe counts.

## SSOT code

| File | Role |
|------|------|
| `shared/agents/productionAgentCatalog.ts` | URLs, agents, backlog, phases |
| `scripts/agents/lib.mjs` | Probe + report helpers |
| `scripts/agents/railway-agent.mjs` | Railway surface |
| `scripts/agents/deploy-agent.mjs` | Multi-surface ship |
| `scripts/agents/live-ops-agent.mjs` | Maintenance + experience |
| `scripts/agents/run-agent.mjs` | Router |

## Safety policy

Agents **may**:

- Probe production HTTP
- Deploy grudge-api / Vercel when user (or CI) passes `--yes`
- Publish sector content scripts
- Write reports and backlog recommendations

Agents **must not**:

- Drop or truncate production DB
- Print secrets
- Force-push main
- Scale multi-replica without Redis presence check
- Deploy unlinked Railway projects (wrong cwd)

## Live users → continuous improvement

Once past “first production”:

1. **Reliability** — reconnect token, drain on deploy, Sentry disconnect codes  
2. **Feel** — 15 Hz move, remote lerp, AssetLoadQueue, net HUD for support  
3. **Content** — sector rewrite pipeline + publish agents  
4. **Telemetry** — room counts from multiplayer/status, weekly experience review  
5. **Smoke** — two-client mp-smoke on schedule  

See also: `docs/INDUSTRY_BEST_PRACTICES_MP_PERF.md`, `docs/DEPLOY_OWNERSHIP.md`.

## GitHub

- `.github/workflows/railway-deploy.yml` — API on push  
- `.github/workflows/vercel-deploy.yml` — client  
- `.github/workflows/live-ops-probe.yml` — scheduled live-ops probe (agent report)

## One-line

**Live-ops watches experience → Deploy ships surfaces → Railway owns grudge-api** — autonomous with human `--yes` on production ship.
