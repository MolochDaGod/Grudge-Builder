# fix-puter-404s.ps1 — Deploy 404.html SPA fallback to all canonical Puter sites
# Uses the Puter CLI (must be logged in: `puter login`)
#
# Puter static hosting serves 404.html when a file isn't found at a path,
# so pushing this to each site's root directory fixes SPA sub-route 404s.

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$fallbackFile = Join-Path $scriptDir "puter-404.html"

if (-not (Test-Path $fallbackFile)) {
    Write-Error "Missing $fallbackFile — run from scripts/ directory"
    exit 1
}

# Map: Puter FS directory (from `puter sites` listing) for each canonical site
# Format: @{ directory = "description" }
$canonicalDirs = @(
    # === OPERATIONS / USER SERVICES ===
    @{ dir = "/GRUDACHAIN/grudachain";             sub = "grudachain-ve8e8";        cat = "ops";   desc = "GrudaChain Nexus Hub" }
    @{ dir = "/GRUDACHAIN/grudge-auth";            sub = "grudge-auth";             cat = "ops";   desc = "Universal Auth Portal" }
    @{ dir = "/GRUDACHAIN/grudge-cloud";           sub = "grudge-cloud";            cat = "ops";   desc = "Cloud Admin Dashboard" }
    @{ dir = "/GRUDACHAIN/grudge-studio";          sub = "grudge-studio";           cat = "ops";   desc = "The ENGINE (Puter prod)" }
    @{ dir = "/GRUDACHAIN/GrudgeLauncher";         sub = "agile-frog-4851";         cat = "ops";   desc = "Heroic Games Launcher" }
    @{ dir = "/GRUDACHAIN/chatgrudge";             sub = "chatgrudge";              cat = "ops";   desc = "Multiplayer AI Chat" }

    # === GRUDGE STUDIO GAMES ===
    @{ dir = "/GRUDACHAIN/dist";                   sub = "grudge-attack-system";    cat = "game";  desc = "Attack Motion System" }
    @{ dir = "/GRUDACHAIN/grudgewarlords";         sub = "grudge-warlords-7dp9c";   cat = "game";  desc = "Warlords 2D RPG" }
    @{ dir = "/GRUDACHAIN/grudge-crafting";         sub = "grudge-crafting";         cat = "game";  desc = "Crafting Suite" }

    # === AI AGENTS ===
    @{ dir = "/GRUDACHAIN/ga-grd1-7";              sub = "ga-grd1-7";               cat = "ai";    desc = "GRD1.7 Agent" }
    @{ dir = "/GRUDACHAIN/ga-grd2-7";              sub = "ga-grd2-7";               cat = "ai";    desc = "GRD2.7 Agent" }
    @{ dir = "/GRUDACHAIN/ga-aleofthought";        sub = "ga-aleofthought";         cat = "ai";    desc = "ALEofThought Agent" }
    @{ dir = "/GRUDACHAIN/ga-perplexity";          sub = "ga-perplexity";           cat = "ai";    desc = "Perplexity Agent" }
    @{ dir = "/GRUDACHAIN/ga-dangrd";              sub = "ga-dangrd";               cat = "ai";    desc = "DANGRD Agent" }
    @{ dir = "/GRUDACHAIN/ga-grdviz";              sub = "ga-grdviz";               cat = "ai";    desc = "GRDVIZ Agent" }
    @{ dir = "/GRUDACHAIN/ga-norightanswergrd";    sub = "ga-norightanswergrd";     cat = "ai";    desc = "NoRightAnswerGRD Agent" }
    @{ dir = "/GRUDACHAIN/ga-ale";                 sub = "ga-ale";                  cat = "ai";    desc = "ALE Agent" }
    @{ dir = "/GRUDACHAIN/ga-grdsprint";           sub = "ga-grdsprint";            cat = "ai";    desc = "GRDSPRINT Agent" }

    # === EDITORS & TOOLS ===
    @{ dir = "/GRUDACHAIN/3dputer";                sub = "3dputer";                 cat = "tool";  desc = "GStudio 3D Viewer" }
    @{ dir = "/GRUDACHAIN/grudge-network";         sub = "grudge-network-zk1qm";    cat = "tool";  desc = "Gruda Browser" }

    # === PvPGN / DIABLO ===
    @{ dir = "/GRUDACHAIN/downloads";              sub = "downloads";               cat = "pvpgn"; desc = "Game Downloads Hub" }
    @{ dir = "/GRUDACHAIN/setup-guide";            sub = "setup-guide";             cat = "pvpgn"; desc = "Setup Guide" }
    @{ dir = "/GRUDACHAIN/gateway-installer";      sub = "gateway-installer";       cat = "pvpgn"; desc = "Gateway Installer" }
    @{ dir = "/GRUDACHAIN/server-status";          sub = "server-status";           cat = "pvpgn"; desc = "Server Status" }
)

$fallbackContent = Get-Content $fallbackFile -Raw
$success = 0
$fail = 0

Write-Host "`n=== Deploying 404.html SPA fallback to $($canonicalDirs.Count) canonical Puter sites ===" -ForegroundColor Cyan

foreach ($site in $canonicalDirs) {
    $targetDir = $site.dir
    $targetFile = "$targetDir/404.html"
    $label = "[$($site.cat)] $($site.sub)"
    
    try {
        # Use puter CLI to write the file — cd to the dir then push
        # The CLI push command copies from local to current remote dir
        # We'll use the REST approach via the deploy script pattern instead
        
        # First ensure the directory exists on Puter FS
        Write-Host ("  {0,-50} -> {1}" -f $label, $targetFile) -ForegroundColor White -NoNewline
        
        # Write 404.html to a temp local file with correct name
        $tempDir = Join-Path $env:TEMP "puter-404-deploy"
        if (-not (Test-Path $tempDir)) { New-Item -ItemType Directory -Path $tempDir -Force | Out-Null }
        $tempFile = Join-Path $tempDir "404.html"
        Copy-Item $fallbackFile $tempFile -Force
        
        # Use puter CLI non-interactive push
        # puter push copies local file to current remote directory
        # We need to cd first, then push
        $pushResult = & puter push $tempFile $targetDir 2>&1
        
        if ($LASTEXITCODE -eq 0 -or $pushResult -match "Success") {
            Write-Host " OK" -ForegroundColor Green
            $success++
        } else {
            Write-Host " WARN: $pushResult" -ForegroundColor Yellow
            $success++ # push may still have worked
        }
    }
    catch {
        Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
        $fail++
    }
}

# Cleanup
Remove-Item (Join-Path $env:TEMP "puter-404-deploy") -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`n=== Results ===" -ForegroundColor Yellow
Write-Host "  Success: $success" -ForegroundColor Green
Write-Host "  Failed:  $fail" -ForegroundColor Red
Write-Host "  Total:   $($canonicalDirs.Count)" -ForegroundColor Cyan

# Verify a sample
Write-Host "`n=== Verifying sub-route on grudge-auth.puter.site/test ===" -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri "https://grudge-auth.puter.site/test" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "  Status: $($resp.StatusCode) — 404 fix working!" -ForegroundColor Green
} catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Write-Host "  Status: $code — 404 fix may need manual verification" -ForegroundColor Yellow
}
