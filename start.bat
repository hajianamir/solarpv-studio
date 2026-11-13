@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SolarPV Studio Desktop Launcher
echo ================================================================================
echo       SolarPV Studio v1.0.3 - Windows PC Launcher
echo ================================================================================
echo.

where node >nul 2>&1
if errorlevel 1 goto :NoNode
node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)"
if errorlevel 1 goto :UnsupportedNode
where npm >nul 2>&1
if errorlevel 1 goto :NoNpm

if exist ".env" goto :EnvReady
if not exist ".env.example" goto :EnvReady
echo [INFO] Creating .env from .env.example ...
copy /y ".env.example" ".env" >nul
if errorlevel 1 goto :EnvFailed
:EnvReady

if not exist "node_modules\.bin\tsx.cmd" goto :InstallDependencies
if not exist "node_modules\dotenv" goto :InstallDependencies
if not exist "node_modules\exceljs" goto :InstallDependencies
if not exist "node_modules\uuid" goto :InstallDependencies
goto :DependenciesReady
:InstallDependencies
echo [INFO] Installing project dependencies. This may take a few minutes...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 goto :InstallFailed
:DependenciesReady

echo [INFO] Starting SolarPV Studio with the managed PC launcher...
echo [INFO] The launcher will open your browser when the server is ready.
echo.
call npm run pc
set "APP_EXIT_CODE=%ERRORLEVEL%"
if not "%APP_EXIT_CODE%"=="0" echo [ERROR] SolarPV Studio launcher exited with code %APP_EXIT_CODE%.
goto :Finish

:NoNode
echo [ERROR] Node.js is not installed. Install Node.js 20 LTS or 22 from https://nodejs.org
goto :Failure
:UnsupportedNode
echo [ERROR] Node.js 20 or newer is required. Detected: 
echo [ERROR] Current node version:
node -v
goto :Failure
:NoNpm
echo [ERROR] npm was not found in PATH. Repair or reinstall Node.js.
goto :Failure
:EnvFailed
echo [ERROR] Could not create .env from .env.example. Check folder permissions.
goto :Failure
:InstallFailed
echo [ERROR] npm install failed. Check the network/proxy and retry.
goto :Failure
:Failure
set "APP_EXIT_CODE=1"
:Finish
echo.
echo Press any key to close this window.
pause
exit /b %APP_EXIT_CODE%
