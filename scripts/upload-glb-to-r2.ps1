# ─────────────────────────────────────────────────────────────────────
# Bulk GLB → R2 Uploader for grudge-assets bucket
# Uploads .glb files from local Grudge directories to Cloudflare R2
# with organized key prefixes.
#
# Usage:  .\scripts\upload-glb-to-r2.ps1 [-DryRun] [-Category <name>]
#   -DryRun      Print what would be uploaded without uploading
#   -Category    Upload only a specific category (e.g. "characters")
# ─────────────────────────────────────────────────────────────────────
param(
    [switch]$DryRun,
    [string]$Category = ""
)

$BUCKET = "grudge-assets"

# ── Source directory → R2 prefix mapping ──────────────────────────────
$mappings = @(
    # Characters
    @{ Source = "D:\Grudge\3DCharacters\characters";       Prefix = "models/characters" }
    @{ Source = "D:\grudge-studio-dash\public\models\characters"; Prefix = "models/characters/races" }
    @{ Source = "D:\Grudge\puterale\biped";                Prefix = "models/characters/animated-biped" }
    @{ Source = "F:\GitHub\Grudge-Studio-Game\new";        Prefix = "models/characters/new-races" }
    @{ Source = "F:\GitHub\Grudge-Studio-Game\grudge-threejs-player-and-grass\character\races"; Prefix = "models/characters/race-base" }

    # Buildings
    @{ Source = "D:\Grudge\3DCharacters\Buildings";        Prefix = "models/buildings" }
    @{ Source = "D:\Grudge\3DCharacters\_MEDIEVAL-SCENE-BUILD"; Prefix = "models/buildings/medieval" }

    # Items / RPG
    @{ Source = "D:\Grudge\3DCharacters\items";            Prefix = "models/items" }
    @{ Source = "D:\Grudge\3DCharacters\Ultimate RPG Items Bundle-glb"; Prefix = "models/items/rpg-bundle" }
    @{ Source = "D:\Grudge\3DCharacters\racalvin";         Prefix = "models/items/racalvin" }

    # Effects / VFX
    @{ Source = "D:\Games\grudge-effects-glb";             Prefix = "models/effects" }
    @{ Source = "F:\GitHub\GrudgeBably\public\effects";    Prefix = "models/effects/babylon" }

    # Creatures / Animals / Fish
    @{ Source = "D:\Games\grudge-voxel\_extracted_chars\animals"; Prefix = "models/creatures/survival-items" }
    @{ Source = "D:\Games\grudge-voxel\_extracted_chars\fish";   Prefix = "models/creatures/fish" }
    @{ Source = "D:\Grudge\3DCharacters\Animated Fish Bundle-glb"; Prefix = "models/creatures/fish-animated" }

    # Environment / Scenes
    @{ Source = "D:\GrudgeWorld-Action-RPG\assets\easybuildanddungeon"; Prefix = "models/environment/dungeon" }
    @{ Source = "D:\GrudgeWorld-Action-RPG\assets\env";    Prefix = "models/environment/world" }
    @{ Source = "D:\Grudge\1";                             Prefix = "models/environment/misc" }

    # Animations
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\animations"; Prefix = "models/animations" }
    @{ Source = "F:\GitHub\RTS-Grudge\Models\models\characters"; Prefix = "models/characters/rts" }

    # Arena
    @{ Source = "F:\GitHub\GrudgeBably\public\assets\arena"; Prefix = "models/arena" }
    @{ Source = "F:\GitHub\grudge-arena\public\models";    Prefix = "models/arena/base" }

    # Space RTS
    @{ Source = "F:\GitHub\GrudgeSpaceRTS\assets";         Prefix = "models/space" }
)

# ── Category filter ──────────────────────────────────────────────────
$categoryMap = @{
    "characters"  = "models/characters"
    "buildings"   = "models/buildings"
    "items"       = "models/items"
    "effects"     = "models/effects"
    "creatures"   = "models/creatures"
    "environment" = "models/environment"
    "animations"  = "models/animations"
    "arena"       = "models/arena"
    "space"       = "models/space"
}

if ($Category -and $categoryMap.ContainsKey($Category)) {
    $filterPrefix = $categoryMap[$Category]
    $mappings = $mappings | Where-Object { $_.Prefix.StartsWith($filterPrefix) }
    Write-Host "Filtering to category: $Category ($filterPrefix)" -ForegroundColor Cyan
}

# ── Upload logic ─────────────────────────────────────────────────────
$totalFiles = 0
$uploaded = 0
$skipped = 0
$failed = 0

foreach ($map in $mappings) {
    $src = $map.Source
    $prefix = $map.Prefix

    if (-not (Test-Path $src)) {
        Write-Host "SKIP (not found): $src" -ForegroundColor DarkGray
        continue
    }

    $files = Get-ChildItem -Path $src -Filter "*.glb" -File -ErrorAction SilentlyContinue
    if (-not $files -or $files.Count -eq 0) {
        Write-Host "SKIP (no .glb): $src" -ForegroundColor DarkGray
        continue
    }

    Write-Host "`n── $prefix ($($files.Count) files) ──" -ForegroundColor Yellow
    Write-Host "   Source: $src" -ForegroundColor DarkGray

    foreach ($file in $files) {
        $totalFiles++
        # Sanitize filename: replace spaces with hyphens, lowercase
        $safeName = $file.Name -replace '\s+', '-' -replace '[^\w\-\.]', ''
        $safeName = $safeName.ToLower()
        $r2Key = "$prefix/$safeName"
        $sizeMB = [math]::Round($file.Length / 1MB, 2)

        if ($DryRun) {
            Write-Host "   [DRY] $r2Key ($sizeMB MB)" -ForegroundColor Cyan
            $uploaded++
            continue
        }

        Write-Host "   PUT $r2Key ($sizeMB MB)... " -NoNewline
        try {
            $result = wrangler r2 object put "$BUCKET/$r2Key" --file $file.FullName --content-type "model/gltf-binary" --remote 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "OK" -ForegroundColor Green
                $uploaded++
            } else {
                Write-Host "FAIL" -ForegroundColor Red
                Write-Host "     $result" -ForegroundColor DarkRed
                $failed++
            }
        } catch {
            Write-Host "ERROR: $_" -ForegroundColor Red
            $failed++
        }
    }
}

# ── Summary ──────────────────────────────────────────────────────────
$divider = "======================================="
Write-Host "`n$divider" -ForegroundColor White
Write-Host "Total files:  $totalFiles" -ForegroundColor White
Write-Host "Uploaded:     $uploaded" -ForegroundColor Green
Write-Host "Skipped:      $skipped" -ForegroundColor Yellow
$failColor = if ($failed -gt 0) { "Red" } else { "Green" }
Write-Host "Failed:       $failed" -ForegroundColor $failColor
if ($DryRun) {
    Write-Host "`n(DRY RUN -- no files were actually uploaded)" -ForegroundColor Magenta
}
Write-Host $divider -ForegroundColor White
