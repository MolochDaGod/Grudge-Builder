# Upload 2D images (PNG/JPG/GIF/WebP/SVG) from ObjectStore to R2 grudge-assets bucket.
# Usage: .\scripts\upload-images-to-r2.ps1 [-DryRun] [-Category backgrounds|professions|all]

param(
    [switch]$DryRun,
    [string]$Category = "all"
)

$BUCKET = "grudge-assets"
$ObjectStoreRoot = if ($env:OBJECT_STORE_ROOT) { $env:OBJECT_STORE_ROOT } else { "C:\Users\david\Desktop\ObjectStore" }

# Wrangler cache breaks when cwd is a system directory (e.g. C:\Windows\System32)
$env:WRANGLER_HOME = Join-Path $env:USERPROFILE ".wrangler"

$GrudgeBuilderPublic = if ($env:GRUDGE_BUILDER_ROOT) {
    Join-Path $env:GRUDGE_BUILDER_ROOT "client\public"
} else {
    "E:\Grudge-Builder\client\public"
}

$mappings = @(
    @{ Source = Join-Path $ObjectStoreRoot "backgrounds"; Prefix = "backgrounds" }
    @{ Source = Join-Path $ObjectStoreRoot "images\professions"; Prefix = "images/professions" }
    @{ Source = Join-Path $ObjectStoreRoot "images\events"; Prefix = "images/events" }
    @{ Source = Join-Path $ObjectStoreRoot "images\ui"; Prefix = "images/ui" }
    @{ Source = Join-Path $ObjectStoreRoot "icons\sigils"; Prefix = "icons/sigils" }
    @{ Source = Join-Path $ObjectStoreRoot "videos"; Prefix = "videos" }
    @{ Source = Join-Path $GrudgeBuilderPublic "assets\skill-icons"; Prefix = "images/skill-icons" }
)

$extContentType = @{
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".webp" = "image/webp"
    ".svg"  = "image/svg+xml"
    ".mp4"  = "video/mp4"
    ".webm" = "video/webm"
}

if ($Category -eq "backgrounds") {
    $mappings = $mappings | Where-Object { $_.Prefix -eq "backgrounds" }
} elseif ($Category -eq "professions") {
    $mappings = $mappings | Where-Object { $_.Prefix -eq "images/professions" }
} elseif ($Category -eq "skill-icons") {
    $mappings = $mappings | Where-Object { $_.Prefix -eq "images/skill-icons" }
} elseif ($Category -eq "sigils") {
    $mappings = $mappings | Where-Object { $_.Prefix -eq "icons/sigils" }
}

$uploaded = 0
$skipped = 0
$failed = 0

foreach ($map in $mappings) {
    if (-not (Test-Path $map.Source)) {
        Write-Host "SKIP missing source: $($map.Source)" -ForegroundColor Yellow
        continue
    }

    $files = Get-ChildItem -Path $map.Source -Recurse -File | Where-Object {
        $extContentType.ContainsKey($_.Extension.ToLower())
    }

    Write-Host "`n$($map.Prefix): $($files.Count) files from $($map.Source)" -ForegroundColor Cyan

    foreach ($file in $files) {
        $relative = $file.FullName.Substring($map.Source.Length).TrimStart('\', '/')
        $r2Key = "$($map.Prefix)/$($relative -replace '\\','/')"
        $contentType = $extContentType[$file.Extension.ToLower()]

        if ($DryRun) {
            Write-Host "  [dry-run] $r2Key ($contentType)"
            $uploaded++
            continue
        }

        try {
            $null = wrangler r2 object put "$BUCKET/$r2Key" --file $file.FullName --content-type $contentType --remote 2>&1
            Write-Host "  OK $r2Key" -ForegroundColor Green
            $uploaded++
        } catch {
            Write-Host "  FAIL $r2Key : $_" -ForegroundColor Red
            $failed++
        }
    }
}

Write-Host "`nDone: $uploaded uploaded, $skipped skipped, $failed failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })