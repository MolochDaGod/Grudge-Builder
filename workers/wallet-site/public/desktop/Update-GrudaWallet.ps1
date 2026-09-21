$repoRaw = "https://raw.githubusercontent.com/MolochDaGod/Grudge-Builder/main/workers/wallet-site/public/desktop/Install-GrudaWallet.ps1"
$tmp = Join-Path $env:TEMP "Install-GrudaWallet.ps1"
Invoke-WebRequest -UseBasicParsing -Uri $repoRaw -OutFile $tmp
powershell -NoProfile -ExecutionPolicy Bypass -File $tmp -Update
