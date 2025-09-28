Write-Host "Building and deploying Avalon - The Resistance to GitHub Pages..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Building the application..." -ForegroundColor Yellow
Set-Location client
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 2: Deploying to gh-pages branch..." -ForegroundColor Yellow
npm run deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✅ Successfully deployed to GitHub Pages!" -ForegroundColor Green
Write-Host "Your site will be available at: https://amartyacsb.github.io/avalon-voice-agent/" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
