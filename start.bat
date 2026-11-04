@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SolarPV Studio Desktop Launcher
chcp 65001 >nul 2>&1

echo ================================================================================
echo       SolarPV Studio v1.0.3 - Windows PC Launcher
echo       پلتفرم جامع مهندسی و شبیه سازی نیروگاه های خورشیدی
echo ================================================================================
echo.

:: 1. Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
    goto :NoNode
)

:: 2. Check npm
call npm -v >nul 2>&1
if errorlevel 1 (
    goto :NoNpm
)

:: 3. Prepare .env configuration
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example ...
        copy /y ".env.example" ".env" >nul
    )
)

:: 4. Check dependencies (node_modules)
if not exist "node_modules\express" (
    goto :InstallDeps
)
if not exist "node_modules\.bin	sx.cmd" (
    goto :InstallDeps
)
goto :ReadyToLaunch

:InstallDeps
echo ================================================================================
echo [INFO] Dependencies not found. Installing packages with npm install...
echo [INFO] وابستگی های پروژه یافت نشد. در حال نصب خودکار بسته‌ها...
echo [INFO] لطفا تا پایان نصب شکیبا باشید (این عملیات فقط بار اول زمان می برد).
echo ================================================================================
echo.
call npm install
if errorlevel 1 (
    goto :InstallFailed
)
echo.
echo [SUCCESS] بسته‌ها با موفقیت نصب شدند.
echo.

:ReadyToLaunch
echo ================================================================================
echo [INFO] در حال راه اندازی سرور محلی SolarPV Studio ...
echo [INFO] Starting local server at http://localhost:3000/
echo [INFO] مرورگر وب شما تا چند لحظه دیگر به صورت خودکار باز خواهد شد.
echo [INFO] برای خروج از برنامه، کلیدهای Ctrl + C را در این پنجره فشار دهید.
echo ================================================================================
echo.

:: Launch background timer to open default browser after server initializes (3 seconds)
start "" /min cmd /c "ping 127.0.0.1 -n 4 >nul 2>&1 & start http://localhost:3000/"

:: Start application server
call npm run dev
if errorlevel 1 (
    echo.
    echo [WARNING] npm run dev exited with error. Trying standard start...
    call npm start
)

goto :End

:NoNode
echo.
echo ================================================================================
echo  [ERROR] Node.js is NOT installed on this computer!
echo  [ERROR] نرم افزار Node.js بر روی این رایانه یافت نشد!
echo ================================================================================
echo.
echo  SolarPV Studio requires Node.js version 18 or newer to run.
echo  برای اجرای این اپلیکیشن، نیاز به نصب نگارش 18 یا بالاتر Node.js دارید.
echo.
echo  1. Please download Node.js LTS from official website:
echo     دانلود رایگان نسخه رسمی LTS از پیوند زیر:
echo.
echo     https://nodejs.org
echo.
echo  2. Install it with default options.
echo     نصب را با گزینه های پیش فرض انجام دهید.
echo.
echo  3. After installation, double-click this file (start.bat) again.
echo     پس از نصب، این فایل (start.bat) را مجدداً اجرا فرمایید.
echo.
echo ================================================================================
goto :PauseExit

:NoNpm
echo.
echo ================================================================================
echo  [ERROR] npm is not found in system PATH!
echo  [ERROR] ابزار npm در متغیرهای سیستم یافت نشد.
echo ================================================================================
echo  Please reinstall Node.js from https://nodejs.org
goto :PauseExit

:InstallFailed
echo.
echo ================================================================================
echo  [ERROR] npm install failed!
echo  [ERROR] نصب بسته های npm با خطا مواجه شد.
echo ================================================================================
echo  لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش فرمایید.
echo  Please check your internet connection and try running 'npm install' manually.
goto :PauseExit

:PauseExit
echo.
echo Press any key to exit / برای خروج کلیدی را فشار دهید...
pause >nul
exit /b 1

:End
echo.
echo Application closed / برنامه متوقف شد.
echo Press any key to exit...
pause >nul
