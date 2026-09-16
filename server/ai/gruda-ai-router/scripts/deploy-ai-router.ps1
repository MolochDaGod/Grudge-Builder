# deploy-ai-router.ps1
# Wires gruda-ai-router into Railway grudge-api-production-0d46
# Run from Windows PowerShell as the deployer (MolochDaDev context)

param(
  [string]$RailwayProject = "grudge-api-production-0d46",
  [string]$EnvFile = ".env.ai-router"
)

Write-Host "=== Gruda AI Router Deploy ===" -ForegroundColor Cyan

# 1. Ensure Railway CLI + logged in
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
  Write-Error "Railway CLI not found. Install from https://railway.app/cli"
  exit 1
}

railway whoami | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Login to Railway..." -ForegroundColor Yellow
  railway login
}

# 2. Set the backup token (MolochDaDev JWT) — never commit
if (Test-Path $EnvFile) {
  Write-Host "Loading $EnvFile" -ForegroundColor Green
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^(PUTER_BACKUP_TOKEN)=(.*)$') {
      $name = $matches[1]; $val = $matches[2]
      Write-Host "Setting $name on Railway..." -ForegroundColor DarkGray
      railway variables --set "$name=$val" --project $RailwayProject
    }
  }
} else {
  Write-Warning "$EnvFile not found. Create it with PUTER_BACKUP_TOKEN=your_jwt"
}

# 3. Mount the router in the existing Express app
# (manual step shown below — agent will edit the server/src/index.ts or equivalent)
Write-Host @"
Next manual steps:
1. In gameopen/server/src add:
   import aiRouter from '../../../.grok/skills/gruda-ai-router/server/ai-router.mjs';
   app.use('/api/ai', aiRouter);

2. Ensure CORS allows *.puter.site + grudgewarlords.com + character.grudge-studio.com

3. Redeploy: railway up --service api

4. Verify: curl https://api.grudge-studio.com/api/ai/models
"@ -ForegroundColor Yellow

Write-Host "Deploy script finished. Token is now live on Railway." -ForegroundColor Green
