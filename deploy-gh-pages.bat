@echo off
echo Building and deploying Avalon - The Resistance to GitHub Pages...
echo.

echo Step 1: Building the application...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Deploying to gh-pages branch...
call npm run deploy
if %errorlevel% neq 0 (
    echo Deployment failed!
    pause
    exit /b 1
)

echo.
echo ✅ Successfully deployed to GitHub Pages!
echo Your site will be available at: https://amartyacsb.github.io/avalon-voice-agent/
echo.
pause
