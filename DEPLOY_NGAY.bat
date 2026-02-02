@echo off
chcp 65001 >nul
cls
color 0A
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║     🚀 DEPLOY COPD GOLD 2026 - Tự Động                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo [1/3] Kiểm tra đăng nhập...
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo ❌ Chưa đăng nhập trong terminal này!
    echo.
    echo Đang mở trình đăng nhập...
    echo (Nếu đã login ở browser, chỉ cần xác nhận)
    echo.
    vercel login
    if errorlevel 1 (
        echo.
        echo ❌ Đăng nhập thất bại
        pause
        exit /b 1
    )
)
vercel whoami
echo ✅ Đã đăng nhập!

echo.
echo [2/3] Đang build project...
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ Build thất bại!
    pause
    exit /b 1
)
echo ✅ Build thành công!

echo.
echo [3/3] Đang deploy lên Vercel Production...
echo.
vercel --prod
if errorlevel 1 (
    echo.
    echo ❌ Deploy thất bại!
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║              ✅ DEPLOY THÀNH CÔNG! 🎉                    ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 📝 QUAN TRỌNG: Set GEMINI_API_KEY
echo.
echo    Vào: https://vercel.com/dashboard
echo    → Chọn project → Settings → Environment Variables
echo    → Add: GEMINI_API_KEY = [API key của bạn]
echo    → Redeploy
echo.
pause
