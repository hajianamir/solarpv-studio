@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title SolarPV Studio Desktop Launcher
chcp 65001 >nul 2>&1
echo ================================================================================
echo       SolarPV Studio v1.0.3 - Windows PC Launcher
echo ================================================================================
echo.

node -v >nul 2>&1 || goto :NoNode
for /f "tokens=1 delims=v." %%v in ('node -v') do set "NODE_MAJOR=%%v"
if not defined NODE_MAJOR goto :NoNode
if %NODE_MAJOR% LSS 20 (
    echo [ERROR] Node.js v%NODE_MAJOR% is not supported. Node.js v20.x or v22.x LTS is required.
    echo [ERROR] Modern tooling requires Node.js ^>= 20 (Node 18 results in EBADENGINE).
    echo [ERROR] نسخه Node.js باید حداقل 20 باشد (نسخه 18 پشتیبانی نمی شود).
    goto :PauseExit
)

call npm -v >nul 2>&1 || goto :NoNpm

if not exist ".env" if exist ".env.example" (
    echo [INFO] Creating .env from .env.example ...
    copy /y ".env.example" ".env" >nul
)

set "APP_PORT="
if defined PORT set "APP_PORT=%PORT%"
if not defined APP_PORT if exist ".env" (
    for /f "usebackq eol=# tokens=1,2 delims==" %%A in (".env") do (
        set "LINE_KEY=%%A"
        set "LINE_VAL=%%B"
        for /f "tokens=* delims= " %%K in ("!LINE_KEY!") do set "LINE_KEY=%%K"
        for /f "tokens=* delims= " %%V in ("!LINE_VAL!") do set "LINE_VAL=%%V"
        if /i "!LINE_KEY!"=="PORT" if defined LINE_VAL (
            set "LINE_VAL=!LINE_VAL:"=!"
            set "LINE_VAL=!LINE_VAL:'=!"
            set "APP_PORT=!LINE_VAL!"
        )
        if /i "!LINE_KEY!"=="APP_PORT" if not defined APP_PORT if defined LINE_VAL (
            set "LINE_VAL=!LINE_VAL:"=!"
            set "LINE_VAL=!LINE_VAL:'=!"
            set "APP_PORT=!LINE_VAL!"
        )
    )
    findstr /R /C:"^[ ]*VITE_REAL_INTERNET=false" ".env" >nul 2>&1 && (
        echo [WARN] .env disables live internet data ^(VITE_REAL_INTERNET=false^).
    )
)
if not defined APP_PORT set "APP_PORT=3000"

set "PORT_VALID=1"
for /f "delims=0123456789" %%X in ("!APP_PORT!") do set "PORT_VALID=0"
if "!PORT_VALID!"=="0" set "APP_PORT=3000"
if !APP_PORT! LSS 1 set "APP_PORT=3000"
if !APP_PORT! GTR 65535 set "APP_PORT=3000"

netstat -ano | findstr LISTENING | findstr /R /C:":!APP_PORT![ ]" >nul 2>&1 && (
    echo [ERROR] Port !APP_PORT! is already in use. Close the other instance first.
    echo [ERROR] پورت !APP_PORT! اشغال است. ابتدا نمونه دیگر را ببندید.
    goto :PauseExit
)

set "NEEDS_INSTALL=0"
if not exist "node_modules" set "NEEDS_INSTALL=1"
if not exist "node_modules\.bin\tsx.cmd" set "NEEDS_INSTALL=1"
if not exist "node_modules\esbuild" set "NEEDS_INSTALL=1"
if not exist "node_modules\dotenv" set "NEEDS_INSTALL=1"
if not exist "node_modules\exceljs" set "NEEDS_INSTALL=1"
if not exist "node_modules\uuid" set "NEEDS_INSTALL=1"
if !NEEDS_INSTALL! EQU 1 goto :InstallDeps
goto :ReadyToLaunch

:InstallDeps
echo [INFO] Installing or synchronizing dependencies (please wait)...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 goto :InstallFailed
echo [SUCCESS] Dependencies synchronized.

:ReadyToLaunch
echo [INFO] Starting SolarPV Studio at http://localhost:!APP_PORT!/
echo [INFO] مرورگر پس از آماده شدن سرور باز می شود. برای خروج: Ctrl + C
echo.
start "" /min powershell -NoProfile -WindowStyle Hidden -Command ^
  "$port = '!APP_PORT!'; for($i=0;$i -lt 90;$i++){ try{ $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 ('http://localhost:' + $port + '/api/health'); if($r.StatusCode -eq 200){ Start-Process ('http://localhost:' + $port + '/'); break } }catch{}; Start-Sleep -Seconds 1 }"
call npm run dev
if errorlevel 1 (
    echo.
    echo [WARNING] npm run dev failed. Trying npm start ...
    call npm start
)
goto :End

:NoNode
echo [ERROR] Node.js is NOT installed. Download Node.js 20 LTS or 22 from https://nodejs.org
goto :PauseExit

:NoNpm
echo [ERROR] npm not found in PATH. Reinstall Node.js from https://nodejs.org
goto :PauseExit

:InstallFailed
echo [ERROR] npm install failed. Check internet / proxy settings.
goto :PauseExit

:PauseExit
echo.
pause >nul
exit /b 1

:End
echo.
echo Application closed / برنامه متوقف شد.
pause >nul
