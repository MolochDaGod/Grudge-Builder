# Unified R2 asset uploader — delegates to category-specific scripts.
# Usage:
#   .\scripts\upload-assets-to-r2.ps1 [-DryRun] [-Category all|images|glb|animations|backgrounds|professions|skill-icons|sigils]

param(
    [switch]$DryRun,
    [string]$Category = "all"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dryRunFlag = if ($DryRun) { "-DryRun" } else { "" }

$env:WRANGLER_HOME = Join-Path $env:USERPROFILE ".wrangler"

function Invoke-UploadScript {
    param([string]$Name, [string[]]$ExtraArgs)
    Write-Host "`n========== $Name ==========" -ForegroundColor Magenta
    $args = @("-NoProfile", "-File", (Join-Path $scriptDir $Name)) + $ExtraArgs
    if ($DryRun) { $args += "-DryRun" }
    & pwsh @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

switch ($Category) {
    "images" {
        Invoke-UploadScript "upload-images-to-r2.ps1" @("-Category", "all")
    }
    "backgrounds" {
        Invoke-UploadScript "upload-images-to-r2.ps1" @("-Category", "backgrounds")
    }
    "professions" {
        Invoke-UploadScript "upload-images-to-r2.ps1" @("-Category", "professions")
    }
    "skill-icons" {
        Invoke-UploadScript "upload-images-to-r2.ps1" @("-Category", "skill-icons")
    }
    "sigils" {
        Invoke-UploadScript "upload-images-to-r2.ps1" @("-Category", "sigils")
    }
    "glb" {
        Invoke-UploadScript "upload-glb-to-r2.ps1" @()
    }
    "animations" {
        Invoke-UploadScript "upload-animations-to-r2.ps1" @()
    }
    "all" {
        Invoke-UploadScript "upload-images-to-r2.ps1" @("-Category", "all")
        Invoke-UploadScript "upload-animations-to-r2.ps1" @()
        Invoke-UploadScript "upload-glb-to-r2.ps1" @()
    }
    default {
        Write-Error "Unknown category: $Category. Use all|images|glb|animations|backgrounds|professions|skill-icons|sigils"
        exit 1
    }
}

Write-Host "`nAll requested uploads complete." -ForegroundColor Green