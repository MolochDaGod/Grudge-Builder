<#
.SYNOPSIS
  Starts the Grudge World Server + Cloudflare Tunnel.
  Builds the world server, starts it on port 4321, then runs cloudflared
  to expose it at https://world.grudge-studio.com.

.USAGE
  .\scripts\start-world.ps1              # default: use main config.yml
  .\scripts\start-world.ps1 -Dedicated   # use dedicated grudge-world tunnel
#>

param(
  [switch]$Dedicated,
  [int]$Port = 4321
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "`n=== Grudge World Server ===" -ForegroundColor Cyan
Write-Host "Port: $Port"

# ── Build ──────────────────────────────────────────────────────────────────
Write-Host "`n[1/3] Building world server..." -ForegroundColor Yellow
Push-Location $ProjectRoot
try {
  npm run build:world
  if ($LASTEXITCODE -ne 0) { throw "Build failed" }
} finally {
  Pop-Location
}
Write-Host "[1/3] Build complete -> dist/world-server.cjs" -ForegroundColor Green

# ── Start world server ─────────────────────────────────────────────────────
Write-Host "`n[2/3] Starting world server on port $Port..." -ForegroundColor Yellow

$env:NODE_ENV = "production"
$env:WORLD_PORT = "$Port"

$worldProcess = Start-Process -FilePath "node" `
  -ArgumentList "$ProjectRoot\dist\world-server.cjs" `
  -WorkingDirectory $ProjectRoot `
  -PassThru -NoNewWindow

Write-Host "[2/3] World server PID: $($worldProcess.Id)" -ForegroundColor Green

# Give the server a moment to start
Start-Sleep -Seconds 2

# Verify health
try {
  $health = Invoke-RestMethod -Uri "http://localhost:$Port/health" -TimeoutSec 5
  Write-Host "[2/3] Health check: $($health.status)" -ForegroundColor Green
} catch {
Write-Host "[2/3] Warning: Health check failed - server may still be starting" -ForegroundColor Yellow
}

# ── Start Cloudflare Tunnel ────────────────────────────────────────────────
Write-Host "`n[3/3] Starting Cloudflare Tunnel..." -ForegroundColor Yellow

if ($Dedicated) {
  $configPath = "$env:USERPROFILE\.cloudflared\grudge-world.yml"
  Write-Host "Using dedicated tunnel config: $configPath"
} else {
  $configPath = "$env:USERPROFILE\.cloudflared\config.yml"
  Write-Host "Using main tunnel config: $configPath"
}

Write-Host "`n  https://world.grudge-studio.com -> http://127.0.0.1:$Port" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop both services`n" -ForegroundColor DarkGray

try {
  if ($Dedicated) {
    $token = (Get-Content "$env:USERPROFILE\.cloudflared\grudge-world.token" -Raw).Trim()
    cloudflared tunnel --config $configPath run --token $token
  } else {
    cloudflared tunnel --config $configPath run
  }
} finally {
  # Clean up: kill the world server when tunnel stops
  if (-not $worldProcess.HasExited) {
    Write-Host "`nStopping world server (PID $($worldProcess.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $worldProcess.Id -Force
  }
  Write-Host "Shutdown complete." -ForegroundColor Green
}
