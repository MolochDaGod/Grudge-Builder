# probe-puter-sites.ps1 — Probe every Puter site, extract title, classify content
# Output: TSV to console + JSON to probe-results.json

$sites = @(
  "dapp-nft-grudge-sjnq4","grudge-launcher-xu9q5","grudachain-ve8e8","brave-fish-9182",
  "tge","diligent-rain-7944","agile-bicycle-9847","colorful-puppy-4769-zilvf",
  "clever-panda-9749","creative-puppy-9315","active-meerkat-8204","optimistic-dog-4415",
  "polite-ocean-7534","ga-grd1-7","ga-grd2-7","ga-aleofthought","ga-perplexity",
  "ga-dangrd","ga-grdviz","ga-norightanswergrd","ga-ale","ga-grdsprint",
  "grudge-launcher-1-h38fg","grudaailegion-s9kqf","grudgegameengine-1-ln4hp",
  "brave-room-6097","gge-bl4d7","agile-frog-4851","meta-build-jb36g",
  "grudgecloud-85c9p","avid-zebra-1033","polite-koala-1379","grudge-auth",
  "grudge-cloud","strong-ocean-7021","crafting-vdz7h","strong-game-8916",
  "grudge-apps","gruda-search-k7ilxk5jdxn","nice-sun-1614","bold-wind-904",
  "elegant-river-5347","grudge-network-zk1qm","witty-panda-583","young-puppy-2675",
  "creative-spider-1846","relaxed-bee-4205","platformtest-wn11oh","capable-deer-5348",
  "victorious-idea-4950","relaxed-mouse-3425","active-camel-784","optimistic-cow-5660",
  "silly-idea-5187","strong-puppy-947","grudge","young-spider-9867","helpful-ant-682",
  "fancy-penguin-6914","sensible-snake-8785","optimistic-lion-7949","fancy-morning-7078",
  "smart-road-3590","bold-island-436","helpful-room-4807","polite-whale-1446",
  "bold-frog-1097","smart-wind-871","polite-car-9159","merry-crab-3757",
  "victorious-seal-3327","honest-rabbit-2754","gateway-installer","downloads",
  "setup-guide","server-status","pvpgn-downloads-jolly-","pvpgn-setup-happy-",
  "pvpgn-gateway-charmi","pvpgn-status-loyal-","young-tree-498",
  "pvpgn-downloads-clever","pvpgn-setup-creati","pvpgn-gateway-bold-k",
  "pvpgn-status-active","victorious-car-215","calm-house-2576","intelligent-sea-311",
  "grudge-server-ambkk","jolly-sun-1625","jolly-panda-1821","chatgrudge",
  "3dputer","grudgechain-ai-email-fixed-ffb919a4","sensible-mouse-1616-st9xz",
  "grudgeweb-vh3c","grudge-client-exi57","grudge-attack-system",
  "victorious-lion-8099","zealous-butterfly-6883","islands-lxzcll",
  "grudgetoons-ohk4k","grudgetoons-vilumg","kind-monkey-980","capable-snow-4029",
  "young-tv-9393","rampgrudge-4gv43","authgrudge","grudge-warlords-7dp9c",
  "grudgechain-ai-email-system-eihtfh","app-connection-26p04","helpful-street-3694",
  "optimistic-snail-5713","colorful-shrimp-7248","clever-clock-1298",
  "grudge-ai-cloud-mm636","grudgestudio-1-m3p7","genius-ant-7181","game-35-03bzd",
  "bold-sun-3560","kind-star-1186","grudgechain-ai-email-fixed-bnwef",
  "generated-islands-l731yi","pvpgn-downloads-loyal-","pvpgn-setup-polite",
  "pvpgn-gateway-colorf","grudaputer-nkkza","gruda-code","silly-zebra-2632",
  "grudgesozne-uvtggj","fancy-roof-2425","witty-harp-3824","grudgedev-nlpqf",
  "grudgegruda-5b72ol","witty-otter-7146","jolly-table-5628",
  "grudgegameengine-fltks","grudaway-1eek9","young-roof-7419","bold-book-7810",
  "grudgechain-fixed-v2-wx18h"
)

# Also the canonical named ones
$sites += @(
  "grudgestudio","grudge-studio","grudgewarlords"
)

$outFile = Join-Path $PSScriptRoot "probe-results.json"
$results = @()

Write-Host "Probing $($sites.Count) Puter sites..." -ForegroundColor Cyan
Write-Host ("{0,-45} {1,-5} {2,-12} {3}" -f "SUBDOMAIN","CODE","TYPE","TITLE") -ForegroundColor Yellow
Write-Host ("-" * 120)

foreach ($sub in $sites) {
    $url = "https://$sub.puter.site"
    try {
        $resp = Invoke-WebRequest -Uri $url -TimeoutSec 8 -MaximumRedirection 3 -ErrorAction Stop -UseBasicParsing
        $code = $resp.StatusCode
        $body = $resp.Content
        
        # Extract title
        $title = ""
        if ($body -match '<title>([^<]+)</title>') { $title = $Matches[1].Trim() }
        
        # Classify by content
        $type = "unknown"
        if ($body -match 'canvas|three\.js|babylon|webgl|game-container|phaser') { $type = "game" }
        elseif ($body -match 'login|auth|sign.?in|password|oauth') { $type = "auth" }
        elseif ($body -match 'express|node|api|server|worker|endpoint|health') { $type = "service" }
        elseif ($body -match 'editor|code|monaco|codemirror|ide') { $type = "editor" }
        elseif ($body -match 'chat|message|conversation|ai.chat') { $type = "chat/ai" }
        elseif ($body -match 'crafting|inventory|items|recipe') { $type = "crafting" }
        elseif ($body -match 'launcher|download|install|setup') { $type = "launcher" }
        elseif ($body -match 'dashboard|admin|status|monitor') { $type = "dashboard" }
        elseif ($body -match 'pvpgn|battle\.net|bnet|warcraft') { $type = "pvpgn" }
        elseif ($body -match 'island|map|terrain|sprite') { $type = "game" }
        elseif ($title -match 'Welcome to .+\.puter\.site') { $type = "empty/default" }
        elseif ([string]::IsNullOrWhiteSpace($body) -or $body.Length -lt 200) { $type = "empty" }
        else { $type = "info" }
        
        $color = switch ($type) {
            "game" { "Green" }
            "auth" { "Magenta" }
            "service" { "Blue" }
            "editor" { "Cyan" }
            "chat/ai" { "Yellow" }
            "crafting" { "DarkYellow" }
            "launcher" { "DarkCyan" }
            "dashboard" { "DarkGreen" }
            "pvpgn" { "DarkMagenta" }
            "empty/default" { "DarkGray" }
            "empty" { "DarkGray" }
            default { "White" }
        }
        
        Write-Host ("{0,-45} {1,-5} {2,-12} {3}" -f $sub, $code, $type, ($title.Substring(0, [Math]::Min($title.Length, 50)))) -ForegroundColor $color
        
        $results += @{
            subdomain = $sub
            url = $url
            status = $code
            title = $title
            type = $type
            bodyLength = $body.Length
        }
    }
    catch {
        $errCode = 0
        if ($_.Exception.Response) { $errCode = [int]$_.Exception.Response.StatusCode }
        Write-Host ("{0,-45} {1,-5} {2,-12} {3}" -f $sub, $errCode, "ERROR", $_.Exception.Message.Substring(0, [Math]::Min($_.Exception.Message.Length, 50))) -ForegroundColor Red
        $results += @{
            subdomain = $sub
            url = $url
            status = $errCode
            title = ""
            type = "error"
            bodyLength = 0
            error = $_.Exception.Message
        }
    }
}

# Summary
$grouped = $results | Group-Object -Property type
Write-Host "`n=== SUMMARY ===" -ForegroundColor Yellow
foreach ($g in ($grouped | Sort-Object Count -Descending)) {
    Write-Host ("  {0,-15} {1}" -f $g.Name, $g.Count) -ForegroundColor White
}
Write-Host ("  {0,-15} {1}" -f "TOTAL", $results.Count) -ForegroundColor Cyan

# Save JSON
$results | ConvertTo-Json -Depth 3 | Set-Content $outFile -Encoding UTF8
Write-Host "`nResults saved to $outFile" -ForegroundColor Green
