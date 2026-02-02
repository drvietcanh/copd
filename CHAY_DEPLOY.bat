@echo off
chcp 65001 >nul
title Deploy COPD GOLD 2026
color 0B

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║          🚀 DEPLOY COPD GOLD 2026 ASSISTANT              ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Step 1: Check login
echo [BƯỚC 1/3] Kiểm tra đăng nhập Vercel...
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  Chưa đăng nhập!
    echo.
    echo 📋 Làm theo các bước sau:
    echo.
    echo    1. Sẽ có link hiện ra (dạng: https://vercel.com/oauth/device?user_code=XXXX)
    echo    2. Copy link đó
    echo    3. Mở browser và paste vào
    echo    4. Đăng nhập/đăng ký Vercel (miễn phí)
    echo    5. Xác nhận trong browser
    echo    6. Quay lại đây và nhấn ENTER
    echo.
    echo    Đang mở trình đăng nhập...
    echo.
    pause
    vercel login
    if errorlevel 1 (
        echo.
        echo ❌ Đăng nhập thất bại. Vui lòng thử lại.
        pause
        exit /b 1
    )
    echo.
    echo ✅ Đăng nhập thành công!
) else (
    echo ✅ Đã đăng nhập
)

echo.
echo [BƯỚC 2/3] Đang build project...
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ Build thất bại! Kiểm tra lỗi ở trên.
    pause
    exit /b 1
)
echo ✅ Build thành công!

echo.
echo [BƯỚC 3/3] Đang deploy lên Vercel Production...
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
echo 📝 BƯỚC CUỐI CÙNG - QUAN TRỌNG:
echo.
echo    Set GEMINI_API_KEY trong Vercel Dashboard:
echo.
echo    1. Vào: https://vercel.com/dashboard
echo    2. Click vào project vừa deploy
echo    3. Vào tab "Settings"
echo    4. Click "Environment Variables"
echo    5. Click "Add New"
echo    6. Điền:
echo       Key:   GEMINI_API_KEY
echo       Value: [API key của bạn - lấy tại https://aistudio.google.com/app/apikey]
echo       Environments: ✓ Production ✓ Preview ✓ Development
echo    7. Click "Save"
echo    8. Vào tab "Deployments" → Click "Redeploy"
echo.
echo    Hoặc chạy lại script này để redeploy sau khi set env var.
echo.
pause
