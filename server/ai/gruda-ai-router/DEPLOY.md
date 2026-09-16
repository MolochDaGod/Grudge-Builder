# gruda-ai-router — Deploy to grudge-api-production-0d46

Target: Railway service `grudge-api-production-0d46` (grudge-api / api.grudge-studio.com)

## 1. Token (one-time)

Source of truth for the MolochDaDev JWT: puter-cli profile  
`%APPDATA%/puter-cli-nodejs/Config/config.json` (never commit, never paste into git).

Accept either env name on Railway `grudge-api` (`grudge-warlords-rpg` / production):
- `PUTER_BACKUP_TOKEN` (preferred)
- `PUTER_DEPLOYER_TOKEN` (alias)

```powershell
# stdin so the JWT never lands in shell history
Get-Content "$env:APPDATA\puter-cli-nodejs\Config\config.json" |
  ConvertFrom-Json |
  ForEach-Object { $_.profiles | Where-Object username -eq 'MolochDaDev' | Select-Object -First 1 -ExpandProperty token } |
  railway variable set PUTER_BACKUP_TOKEN --stdin --service grudge-api --project 92f039ec-2cce-4e1e-b06a-dd0ac6256d70 --environment production
```

Verify host (do **not** use deprecated `api.grudge-studio.com`):

```bash
curl https://grudge-api-production-0d46.up.railway.app/api/ai/models
# expect puterBackup:true
```

## 2. Mount the router (edit the Express app in GrudgeBuilder)
In the main server file (usually `server/src/index.ts` or `src/server.ts`):
```ts
import aiRouter from '../../../.grok/skills/gruda-ai-router/server/ai-router.mjs';
// or copy the file into the repo if you prefer a single bundle
app.use('/api/ai', aiRouter);
```

CORS already allows `*.puter.site`, `grudgewarlords.com`, `character.grudge-studio.com`.

## 3. Deploy
```bash
railway up --service api
```

## 4. Verify (after deploy)
```bash
curl https://grudge-api-production-0d46.up.railway.app/api/ai/models
# expect: { ok:true, legion:"https://ai.grudge-studio.com", puterBackup:true }
```

Then test a cheap call from grudgewarlords.com/craft (or ai_root.html) using the new `/api/ai/chat` endpoint with `page:"warlords_craft"`.

## 5. Migration checklist for pages that still call puter.ai.chat directly
- [ ] ai_root.html
- [ ] grudgewarlords.com/craft (warlord-crafting-suite)
- [ ] sprite tools / Game-Studio-Tool
- [ ] any other static HTML that hits puter.ai

Replace every direct call with a fetch to `/api/ai/chat` (see SKILL.md §6).
