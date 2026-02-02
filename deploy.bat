@echo off
echo ========================================
echo   Deploying COPD GOLD 2026 Assistant
echo ========================================
echo.

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [2/3] Building project...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [3/3] Deploying to Vercel...
call vercel --prod
if errorlevel 1 (
    echo ERROR: Deploy failed
    echo.
    echo Make sure you have:
    echo 1. Installed Vercel CLI: npm install -g vercel
    echo 2. Logged in: vercel login
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Deploy Complete!
echo ========================================
echo.
echo Don't forget to set GEMINI_API_KEY in Vercel Dashboard:
echo Project Settings -^> Environment Variables
pause
