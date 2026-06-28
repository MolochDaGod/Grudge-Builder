# Stop local GrudgeBuilder API processes (dist/index.js / port 5000).
$targets = Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'dist[\\/]index|railway-start' }

foreach ($t in $targets) {
  Write-Host "Stopping PID $($t.ProcessId)"
  Stop-Process -Id $t.ProcessId -Force -ErrorAction SilentlyContinue
}

$portRows = netstat -ano | Select-String ':5000\s+.*LISTENING'
foreach ($row in $portRows) {
  $procId = ($row -split '\s+')[-1]
  if ($procId -match '^\d+$') {
    Write-Host "Stopping listener on :5000 PID $procId"
    Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "Done."