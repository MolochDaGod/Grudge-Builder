# Upload weapon-specific animation GLBs to R2 (grudge-assets bucket)
# Preserves original filenames (spaces, casing) since the model manifest references them.
param([switch]$DryRun)

$BUCKET = "grudge-assets"
$GrudgeReposRoot = if ($env:GRUDGE_REPOS_ROOT) { $env:GRUDGE_REPOS_ROOT } else { "D:\GrudgeRepos" }
$GrudgeArenaRoot = if ($env:GRUDGE_ARENA_ROOT) { $env:GRUDGE_ARENA_ROOT } else { "C:\Users\david\Desktop\grudge-arena" }
$ArenaAnims = Join-Path $GrudgeArenaRoot "public\assets\animations"

# Source dir -> R2 prefix (pick the most complete set for each weapon type)
$mappings = @(
    @{ Source = (Join-Path $ArenaAnims "sword_shield"); Prefix = "models/animations/sword-shield" }
    @{ Source = (Join-Path $ArenaAnims "greatsword"); Prefix = "models/animations/greatsword" }
    @{ Source = (Join-Path $ArenaAnims "longbow"); Prefix = "models/animations/longbow" }
    @{ Source = (Join-Path $ArenaAnims "magic"); Prefix = "models/animations/magic" }
    @{ Source = (Join-Path $ArenaAnims "axe"); Prefix = "models/animations/axe" }
    @{ Source = (Join-Path $ArenaAnims "rifle"); Prefix = "models/animations/rifle" }
    @{ Source = (Join-Path $ArenaAnims "unarmed"); Prefix = "models/animations/unarmed" }
    @{ Source = (Join-Path $ArenaAnims "generic"); Prefix = "models/animations/generic" }
    @{ Source = (Join-Path $ArenaAnims "action"); Prefix = "models/animations/action" }
    @{ Source = (Join-Path $ArenaAnims "racalvin_sword_shield"); Prefix = "models/animations/racalvin-sword-shield" }
    @{ Source = (Join-Path $ArenaAnims "racalvin_magic"); Prefix = "models/animations/racalvin-magic" }
    @{ Source = (Join-Path $ArenaAnims "racalvin_melee_axe"); Prefix = "models/animations/racalvin-axe" }
    @{ Source = (Join-Path $ArenaAnims "longbow-alt"); Prefix = "models/animations/longbow-alt" }
    @{ Source = (Join-Path $ArenaAnims "magic-alt"); Prefix = "models/animations/magic-alt" }
    @{ Source = (Join-Path $ArenaAnims "sword_shield"); Prefix = "models/animations/sword-shield-arena" }
)

$totalFiles = 0; $uploaded = 0; $failed = 0

foreach ($map in $mappings) {
    $src = $map.Source; $prefix = $map.Prefix
    if (-not (Test-Path $src)) { Write-Host "SKIP (not found): $src" -ForegroundColor DarkGray; continue }
    $files = Get-ChildItem -Path $src -Filter "*.glb" -File -ErrorAction SilentlyContinue
    if (-not $files -or $files.Count -eq 0) { continue }

    Write-Host "`n-- $prefix ($($files.Count) files) --" -ForegroundColor Yellow

    foreach ($file in $files) {
        $totalFiles++
        # PRESERVE original filename for animations (manifest uses exact names)
        $r2Key = "$prefix/$($file.Name)"
        $sizeMB = [math]::Round($file.Length / 1MB, 2)

        if ($DryRun) { Write-Host "   [DRY] $r2Key ($sizeMB MB)" -ForegroundColor Cyan; $uploaded++; continue }

        Write-Host "   PUT $r2Key ($sizeMB MB)... " -NoNewline
        try {
            $result = wrangler r2 object put "$BUCKET/$r2Key" --file $file.FullName --content-type "model/gltf-binary" --remote 2>&1
            if ($LASTEXITCODE -eq 0) { Write-Host "OK" -ForegroundColor Green; $uploaded++ }
            else { Write-Host "FAIL" -ForegroundColor Red; $failed++ }
        } catch { Write-Host "ERROR: $_" -ForegroundColor Red; $failed++ }
    }
}

Write-Host "`n======================================="
Write-Host "Total: $totalFiles | Uploaded: $uploaded | Failed: $failed"
if ($DryRun) { Write-Host "(DRY RUN)" -ForegroundColor Magenta }
Write-Host "======================================="
