# Upload weapon-specific animation GLBs to R2 (grudge-assets bucket)
# Preserves original filenames (spaces, casing) since the model manifest references them.
param([switch]$DryRun)

$BUCKET = "grudge-assets"

# Source dir -> R2 prefix (pick the most complete set for each weapon type)
$mappings = @(
    # Sword & Shield (51 files from RTS-Grudge - most complete sword_shield set)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\sword_shield"; Prefix = "models/animations/sword-shield" }
    # Greatsword (12 from RTS-Grudge racalvin_greatsword)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\racalvin_greatsword"; Prefix = "models/animations/greatsword" }
    # Longbow (39 from Arena - much more complete than RTS 12)
    @{ Source = "F:\GitHub\grudge-arena\dist\assets\animations\longbow"; Prefix = "models/animations/longbow" }
    # Magic (56 from Arena - much more complete than RTS 14)
    @{ Source = "F:\GitHub\grudge-arena\dist\assets\animations\magic"; Prefix = "models/animations/magic" }
    # Axe (47 from Arena - only source)
    @{ Source = "F:\GitHub\grudge-arena\dist\assets\animations\axe"; Prefix = "models/animations/axe" }
    # Rifle (49 from Arena)
    @{ Source = "F:\GitHub\grudge-arena\dist\assets\animations\rifle"; Prefix = "models/animations/rifle" }
    # Unarmed (9 from RTS-Grudge racalvin_unarmed)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\racalvin_unarmed"; Prefix = "models/animations/unarmed" }
    # Generic base (10 from RTS racalvin_base)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\racalvin_base"; Prefix = "models/animations/generic" }
    # Action-adventure generic (18 from RTS action)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\action"; Prefix = "models/animations/action" }
    # Racalvin sword_shield variant (14)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\racalvin_sword_shield"; Prefix = "models/animations/racalvin-sword-shield" }
    # Racalvin magic variant (10)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\racalvin_magic"; Prefix = "models/animations/racalvin-magic" }
    # Racalvin melee axe (10)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\racalvin_melee_axe"; Prefix = "models/animations/racalvin-axe" }
    # RTS longbow (12 - secondary source, different filenames)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\longbow"; Prefix = "models/animations/longbow-alt" }
    # RTS magic (14 - secondary source)
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations\magic"; Prefix = "models/animations/magic-alt" }
    # Arena sword_shield (51 - mirror of RTS for redundancy check)
    @{ Source = "F:\GitHub\grudge-arena\dist\assets\animations\sword_shield"; Prefix = "models/animations/sword-shield-arena" }
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
