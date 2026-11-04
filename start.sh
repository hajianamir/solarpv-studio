#!/usr/bin/env bash
# ==============================================================================
# SolarPV Studio v1.0.3 — One-Click PC Launcher for Linux & macOS
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "================================================================================"
echo "      SolarPV Studio v1.0.3 — راه‌اندازی خودکار بر روی لینوکس و مک (PC)"
echo "      Cross-Platform Solar PV Engineering & Simulation Desktop"
echo "================================================================================"
echo ""

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js بر روی این رایانه یافت نشد!"
    echo "[ERROR] Node.js is required but not installed."
    echo "لطفاً نگارش 18 یا بالاتر Node.js LTS را از https://nodejs.org نصب فرمایید."
    exit 1
fi

# 2. Check npm
if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm بر روی این سیستم در دسترس نیست."
    exit 1
fi

# 3. Prepare .env if missing
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "[INFO] ایجاد فایل تنظیمات محیطی .env از روی .env.example ..."
    cp .env.example .env
fi

# 4. Check dependencies
if [ ! -d "node_modules/express" ] || [ ! -d "node_modules/.bin" ]; then
    echo "[INFO] در حال نصب خودکار وابستگی‌های پروژه (npm install)..."
    npm install
    echo ""
    echo "[SUCCESS] بسته‌ها با موفقیت نصب شدند."
    echo ""
fi

# 5. Launch PC runner
echo "[INFO] در حال اجرای SolarPV Studio در مرورگر سیستم..."
exec npm run pc
