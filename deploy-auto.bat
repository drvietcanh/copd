@echo off
chcp 65001 >nul
echo ========================================
echo   🚀 COPD GOLD 2026 - Auto Deploy
echo ========================================
echo.

echo [1/4] Checking Vercel CLI...
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI not found. Installing...
    call npm install -g vercel
    if errorlevel 1 (
        echo ❌ Failed to install Vercel CLI
        pause
        exit /b 1
    )
    echo ✅ Vercel CLI installed
) else (
    echo ✅ Vercel CLI found
)

echo.
echo [2/4] Checking login status...
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  Not logged in. Please login first:
    echo.
    echo    1. Run: vercel login
    echo    2. Open the link in browser
    echo    3. Login and confirm
    echo    4. Press ENTER in terminal
    echo.
    echo    Then run this script again.
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Already logged in
)

echo.
echo [3/4] Building project...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)
echo ✅ Build successful

echo.
echo [4/4] Deploying to Vercel...
echo.
vercel --prod --yes
if errorlevel 1 (
    echo.
    echo ❌ Deploy failed
    echo.
    echo Try running manually:
    echo   vercel --prod
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ Deploy Complete!
echo ========================================
echo.
echo 📝 IMPORTANT: Set GEMINI_API_KEY in Vercel Dashboard
echo    1. Go to: https://vercel.com/dashboard
echo    2. Select your project
echo    3. Settings → Environment Variables
echo    4. Add: GEMINI_API_KEY = your_api_key
echo    5. Redeploy
echo.
pause
