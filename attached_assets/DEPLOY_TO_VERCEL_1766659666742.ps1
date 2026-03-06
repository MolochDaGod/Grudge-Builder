# 🚀 GRUDGE Infiniti Islands - Vercel Deployment Script
# This script deploys your GDevelop HTML5 export to Vercel

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   GRUDGE - Vercel Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$exportDir = "C:\Users\nugye\Documents\ummorpgdev\web-export"
$projectDir = "C:\Users\nugye\Documents\ummorpgdev"

# Check if export directory exists
if (-not (Test-Path $exportDir)) {
    Write-Host "❌ Export directory not found: $exportDir" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Please export your game from GDevelop first:" -ForegroundColor Yellow
    Write-Host "   1. Open GDevelop 5" -ForegroundColor White
    Write-Host "   2. File → Export → Web (HTML5)" -ForegroundColor White
    Write-Host "   3. Export to: $exportDir" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check if index.html exists
if (-not (Test-Path "$exportDir\index.html")) {
    Write-Host "❌ index.html not found in export directory" -ForegroundColor Red
    Write-Host "   Please ensure your game was exported correctly" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Export directory found" -ForegroundColor Green
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "🔍 Checking for Vercel CLI..." -ForegroundColor Cyan
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "⚠️  Vercel CLI not found" -ForegroundColor Yellow
    Write-Host ""
    $install = Read-Host "Would you like to install Vercel CLI now? (y/n)"
    
    if ($install -eq "y" -or $install -eq "Y") {
        Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Cyan
        npm install -g vercel
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install Vercel CLI" -ForegroundColor Red
            Write-Host "   Please run: npm install -g vercel" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "✅ Vercel CLI installed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Vercel CLI is required for deployment" -ForegroundColor Red
        Write-Host "   Install it with: npm install -g vercel" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✅ Vercel CLI found" -ForegroundColor Green
}

Write-Host ""

# Copy vercel.json to export directory
Write-Host "📋 Setting up Vercel configuration..." -ForegroundColor Cyan
if (Test-Path "$projectDir\vercel.json") {
    Copy-Item "$projectDir\vercel.json" "$exportDir\vercel.json" -Force
    Write-Host "✅ vercel.json copied to export directory" -ForegroundColor Green
} else {
    Write-Host "⚠️  vercel.json not found, creating default..." -ForegroundColor Yellow
    
    $vercelConfig = @"
{
  "version": 2,
  "builds": [
    {
      "src": "**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/`$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        }
      ]
    }
  ]
}
"@
    
    Set-Content -Path "$exportDir\vercel.json" -Value $vercelConfig
    Write-Host "✅ Default vercel.json created" -ForegroundColor Green
}

Write-Host ""

# Ask deployment type
Write-Host "🚀 Ready to deploy!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Choose deployment type:" -ForegroundColor White
Write-Host "  1. Preview deployment (test before production)" -ForegroundColor White
Write-Host "  2. Production deployment (live site)" -ForegroundColor White
Write-Host ""
$deployType = Read-Host "Enter choice (1 or 2)"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   Deploying to Vercel..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Change to export directory and deploy
Set-Location $exportDir

if ($deployType -eq "2") {
    Write-Host "🌐 Deploying to PRODUCTION..." -ForegroundColor Yellow
    vercel --prod
} else {
    Write-Host "🔍 Deploying PREVIEW..." -ForegroundColor Cyan
    vercel
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "   ✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎮 Your game is now live!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Next steps:" -ForegroundColor White
    Write-Host "   - Test your game at the URL shown above" -ForegroundColor White
    Write-Host "   - Check Vercel dashboard: https://vercel.com/dashboard" -ForegroundColor White
    Write-Host "   - Add custom domain (optional)" -ForegroundColor White
    Write-Host "   - Set up environment variables if needed" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host "   Check the error message above for details" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Return to project directory
Set-Location $projectDir
