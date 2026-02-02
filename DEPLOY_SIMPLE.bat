@echo off
chcp 65001 >nul
cls
echo.
echo ========================================
echo   🚀 Deploy COPD GOLD 2026
echo ========================================
echo.

REM Check if logged in
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Chưa đăng nhập Vercel!
    echo.
    echo Đang mở trình đăng nhập...
    echo.
    echo 📋 HƯỚNG DẪN:
    echo    1. Sẽ có link hiện ra (ví dụ: https://vercel.com/oauth/device?user_code=XXXX)
    echo    2. Copy link đó và mở trong browser
    echo    3. Đăng nhập/đăng ký Vercel
    echo    4. Xác nhận trong browser
    echo    5. Quay lại đây và nhấn ENTER
    echo.
    pause
    vercel login
    if errorlevel 1 (
        echo.
        echo ❌ Đăng nhập thất bại. Vui lòng thử lại.
        pause
        exit /b 1
    )
)

echo ✅ Đã đăng nhập Vercel
echo.

echo [1/2] Đang build...
call npm run build
if errorlevel 1 (
    echo ❌ Build thất bại!
    pause
    exit /b 1
)
echo ✅ Build thành công!
echo.

echo [2/2] Đang deploy...
echo.
vercel --prod
if errorlevel 1 (
    echo.
    echo ❌ Deploy thất bại!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ DEPLOY THÀNH CÔNG!
echo ========================================
echo.
echo 📝 QUAN TRỌNG: Set GEMINI_API_KEY
echo.
echo   1. Vào: https://vercel.com/dashboard
echo   2. Chọn project vừa deploy  
echo   3. Settings → Environment Variables
echo   4. Add: GEMINI_API_KEY
echo   5. Value: API key của bạn
echo   6. Save và Redeploy
echo.
pause
