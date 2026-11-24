@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SolarPV Studio Installer
set "INSTALL_EXIT_CODE=1"
echo ================================================================================
echo                  SolarPV Studio - Windows Dependency Installer
echo ================================================================================
echo.

where node >nul 2>&1
if errorlevel 1 goto :NoNode
node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)"
if errorlevel 1 goto :UnsupportedNode
where npm >nul 2>&1
if errorlevel 1 goto :NoNpm
if not exist "package.json" goto :MissingProject
if not exist "package-lock.json" goto :MissingLock

echo [INFO] Installing all application dependencies, including launcher/build tools...
echo [INFO] This requires internet access and may take several minutes.
call npm ci --include=dev --no-audit --no-fund
if errorlevel 1 goto :InstallFailed
node scripts\check-pc-dependencies.mjs
if errorlevel 1 goto :VerifyFailed

if exist ".env" goto :Configured
if not exist ".env.example" goto :Configured
copy /y ".env.example" ".env" >nul
if errorlevel 1 goto :EnvFailed
echo [INFO] Created .env from .env.example.
:Configured
set "INSTALL_EXIT_CODE=0"
echo.
echo [OK] Installation complete. Double-click start.bat to open SolarPV Studio.
echo [INFO] Existing .env settings and project data have not been replaced.
echo [INFO] Optional Python research engines are separate; they are not needed to start the app.
goto :Finish

:NoNode
echo [ERROR] Node.js was not found. Install Node.js LTS from https://nodejs.org
echo [INFO] Include npm during setup, then close this window and run install.bat again.
goto :Finish
:UnsupportedNode
echo [ERROR] Node.js 20 or newer is required. Install a supported LTS version.
node -v
goto :Finish
:NoNpm
echo [ERROR] npm was not found. Repair your Node.js installation with npm enabled.
goto :Finish
:MissingProject
echo [ERROR] package.json is missing. Extract or clone the complete project and retry.
goto :Finish
:MissingLock
echo [ERROR] package-lock.json is missing. Restore it from the project repository.
goto :Finish
:InstallFailed
echo [ERROR] Dependency installation failed. Check the npm output above and your network/proxy.
echo [INFO] Close any running SolarPV Studio server before retrying this installer.
goto :Finish
:VerifyFailed
echo [ERROR] Installation verification failed. Review the missing package messages above.
goto :Finish
:EnvFailed
echo [ERROR] Could not create .env. Check permissions on this project folder.
goto :Finish
:Finish
echo.
if /i "%~1"=="--no-pause" goto :Exit
pause
:Exit
exit /b %INSTALL_EXIT_CODE%
