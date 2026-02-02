@echo off
chcp 65001 >nul
title COPD GOLD 2026 - Deploy Helper
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║     🚀 COPD GOLD 2026 Assistant - Deploy Helper         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:menu
echo.
echo Chọn hành động:
echo.
echo   [1] Đăng nhập Vercel (chỉ cần làm 1 lần)
echo   [2] Deploy lên Vercel Production
echo   [3] Xem thông tin đăng nhập hiện tại
echo   [4] Thoát
echo.
set /p choice="Nhập số (1-4): "

if "%choice%"=="1" goto login
if "%choice%"=="2" goto deploy
if "%choice%"=="3" goto whoami
if "%choice%"=="4" goto end
echo.
echo ❌ Lựa chọn không hợp lệ!
goto menu

:login
echo.
echo ═══════════════════════════════════════════════════════════
echo   Đăng nhập Vercel
echo ═══════════════════════════════════════════════════════════
echo.
echo Đang mở trình đăng nhập...
echo.
vercel login
if errorlevel 1 (
    echo.
    echo ❌ Đăng nhập thất bại
    pause
    goto menu
)
echo.
echo ✅ Đăng nhập thành công!
pause
goto menu

:whoami
echo.
echo ═══════════════════════════════════════════════════════════
echo   Thông tin đăng nhập
echo ═══════════════════════════════════════════════════════════
echo.
vercel whoami
if errorlevel 1 (
    echo.
    echo ❌ Chưa đăng nhập. Vui lòng chọn [1] để đăng nhập.
)
echo.
pause
goto menu

:deploy
echo.
echo ═══════════════════════════════════════════════════════════
echo   Kiểm tra đăng nhập...
echo ═══════════════════════════════════════════════════════════
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ Chưa đăng nhập Vercel!
    echo.
    echo Vui lòng chọn [1] để đăng nhập trước.
    pause
    goto menu
)

echo.
echo ═══════════════════════════════════════════════════════════
echo   [1/3] Đang build project...
echo ═══════════════════════════════════════════════════════════
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ Build thất bại! Kiểm tra lỗi ở trên.
    pause
    goto menu
)
echo ✅ Build thành công!

echo.
echo ═══════════════════════════════════════════════════════════
echo   [2/3] Đang deploy lên Vercel Production...
echo ═══════════════════════════════════════════════════════════
echo.
vercel --prod
if errorlevel 1 (
    echo.
    echo ❌ Deploy thất bại!
    pause
    goto menu
)

echo.
echo ═══════════════════════════════════════════════════════════
echo   [3/3] Deploy hoàn tất! 🎉
echo ═══════════════════════════════════════════════════════════
echo.
echo 📝 QUAN TRỌNG: Set GEMINI_API_KEY trong Vercel Dashboard
echo.
echo   1. Vào: https://vercel.com/dashboard
echo   2. Chọn project vừa deploy
echo   3. Settings → Environment Variables
echo   4. Add: GEMINI_API_KEY = your_api_key
echo   5. Redeploy (chạy lại script này)
echo.
pause
goto menu

:end
echo.
echo 👋 Tạm biệt!
timeout /t 2 >nul
exit
