# Pins Gruda Wallet as a Windows connected web app (Edge --app).
param([switch]$Update)
$ErrorActionPreference = "Stop"
$url = "https://wallet.grudge-studio.com"
$edge86 = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$edge64 = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
$edge = if (Test-Path $edge86) { $edge86 } elseif (Test-Path $edge64) { $edge64 } else { $null }
$desk = [Environment]::GetFolderPath("Desktop")
$start = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$ws = New-Object -ComObject WScript.Shell
function Pin($dir, $name) {
  $lnk = $ws.CreateShortcut((Join-Path $dir $name))
  if ($edge) {
    $lnk.TargetPath = $edge
    $lnk.Arguments = "--app=$url"
  } else {
    $lnk.TargetPath = $url
  }
  $lnk.WindowStyle = 1
  $lnk.Description = "Gruda Wallet — Play + linked bags + trader"
  $lnk.Save()
}
Pin $desk "Gruda Wallet.lnk"
if (Test-Path $start) { Pin $start "Gruda Wallet.lnk" }
if (-not $Update) {
  Write-Host "Pinned Gruda Wallet. Open the Desktop shortcut. Same site: $url"
  if ($edge) { Start-Process $edge -ArgumentList "--app=$url" }
}
