# sync-railway-env.ps1
# Reads the local .env and sets all server-needed vars on Railway.
# VITE_* vars are skipped (frontend-only, go to Vercel).
# Railway-managed vars (RAILWAY_*) are skipped.
# Usage: pwsh scripts/sync-railway-env.ps1

$ErrorActionPreference = "Continue"
$envFile = Join-Path $PSScriptRoot ".." ".env"

if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found at $envFile"
    exit 1
}

# Keys that should ONLY go to Railway (server-side)
# Skip VITE_* (frontend), RAILWAY_* (managed), NIXPACKS_* (already set),
# comments, empty lines, and vars only needed locally.
$skipPrefixes = @(
    "VITE_",
    "RAILWAY_",
    "NIXPACKS_",
    "RAILPACK_"
)

$skipExact = @(
    "PORT"  # Already set on Railway
)

$lines = Get-Content $envFile -Encoding UTF8
$setCount = 0
$skipCount = 0
$errorCount = 0

foreach ($line in $lines) {
    $trimmed = $line.Trim()

    # Skip comments and empty lines
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }

    # Parse KEY=VALUE
    $eqIdx = $trimmed.IndexOf("=")
    if ($eqIdx -le 0) { continue }

    $key = $trimmed.Substring(0, $eqIdx).Trim()
    $value = $trimmed.Substring($eqIdx + 1).Trim()

    # Skip frontend-only, Railway-managed, and already-set vars
    $skip = $false
    foreach ($prefix in $skipPrefixes) {
        if ($key.StartsWith($prefix)) { $skip = $true; break }
    }
    if ($skipExact -contains $key) { $skip = $true }
    if ($skip) {
        $skipCount++
        continue
    }

    # Skip placeholder values
    if ($value -match "^NOT_YET_" -or $value -eq "") {
        Write-Host "  SKIP (placeholder): $key" -ForegroundColor Yellow
        $skipCount++
        continue
    }

    Write-Host "  SET: $key" -ForegroundColor Cyan -NoNewline

    # Use railway variables set with proper quoting
    $result = & railway variables set "${key}=${value}" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        $setCount++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "    $result" -ForegroundColor DarkRed
        $errorCount++
    }
}

Write-Host ""
Write-Host "=== Railway Env Sync Complete ===" -ForegroundColor White
Write-Host "  Set:     $setCount" -ForegroundColor Green
Write-Host "  Skipped: $skipCount" -ForegroundColor Yellow
Write-Host "  Errors:  $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
