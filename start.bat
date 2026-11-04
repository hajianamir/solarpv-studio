@echo off
chcp 65001 >nul
title SolarPV Studio Desktop Launcher

echo ================================================================================
echo       SolarPV Studio v1.0.3 - راه اندازی خودکار بر روی ویندوز (PC)
echo       Cross-Platform Solar PV Engineering & Simulation Desktop
echo ================================================================================
echo.

:: 1. Check Node.js installation
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js بر روی این رایانه یافت نشد!
    echo [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo لطفا نگارش 18 یا بالاتر Node.js LTS را از پیوند زیر دانلود و نصب فرمایید:
    echo Please download and install Node.js LTS from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Check npm installation
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm در دسترس نیست!
    pause
    exit /b 1
)

:: 3. Prepare .env file if missing
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] در حال ایجاد فایل تنظیمات محیطی .env ...
        copy ".env.example" ".env" >nul
    )
)

:: 4. Check dependencies (node_modules)
if not exist "node_modules\" (
    echo [INFO] وابستگی‌های پروژه یافت نشد. در حال نصب خودکار پکیج‌ها (npm install)...
    echo [INFO] Installing project dependencies, please wait...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] خطا در نصب بسته‌ها! لطفا اتصال اینترنت را بررسی فرمایید.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] بسته‌ها با موفقیت نصب شدند.
    echo.
)

:: 5. Launch the application
echo [INFO] در حال راه اندازی سرور و اجرای اپلیکیشن در مرورگر ویندوز...
echo.
call npm run pc

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] برنامه متوقف شد یا با خطا مواجه گردید.
    pause
)
