# ==============================================================================
# SolarPV Studio v1.0.3 — Desktop Launcher (PowerShell)
# ==============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
 = "Continue"
Set-Location -Path $PSScriptRoot

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "      SolarPV Studio v1.0.3 — Windows Desktop Launcher" -ForegroundColor Yellow
Write-Host "      پلتفرم مهندسی و شبیه‌سازی سیستم‌های خورشیدی" -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
try {
    $nodeVer = & node -v 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($nodeVer)) {
        throw "Node not found"
    }
    Write-Host "[INFO] Node.js is installed: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Red
    Write-Host " [ERROR] Node.js is not found on this system / یافت نشد Node.js" -ForegroundColor Red
    Write-Host "================================================================================" -ForegroundColor Red
    Write-Host " SolarPV Studio requires Node.js version 18 or higher."
    Write-Host " برای اجرای برنامه، نیاز به نصب نگارش 18 یا بالاتر Node.js دارید:"
    Write-Host "   https://nodejs.org" -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit..."
    exit 1
}

# 2. Check npm
try {
    $npmVer = & npm -v 2>$null
    Write-Host "[INFO] npm is available: $npmVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm is not available in PATH!" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

# 3. Prepare .env if missing
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[INFO] Configuration file .env created from .env.example" -ForegroundColor Green
}

# 4. Check dependencies (node_modules)
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Dependencies not found. Installing packages with npm install..." -ForegroundColor Yellow
    Write-Host "[INFO] در حال نصب بسته‌ها، لطفاً شکیبا باشید..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed! Please check your internet connection." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
    Write-Host "[SUCCESS] Dependencies installed successfully." -ForegroundColor Green
}

# 5. Launch application
Write-Host "[INFO] Starting SolarPV Studio and opening web browser..." -ForegroundColor Cyan
Write-Host ""
npm run pc
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] npm run pc failed. Retrying with npm run dev..." -ForegroundColor Yellow
    Start-Process "http://localhost:3000/"
    npm run dev
}

Write-Host ""
Read-Host "Application closed. Press Enter to exit..."
