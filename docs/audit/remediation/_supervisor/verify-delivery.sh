#!/usr/bin/env bash
# verify-delivery.sh — داوری یک بستهٔ تحویل (zip) از اجنت، بدون آلوده‌کردن مخزن اصلی
# usage: ./verify-delivery.sh /path/to/delivery.zip
set -uo pipefail
ZIP="${1:?usage: verify-delivery.sh <delivery.zip>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
BASE="$(cd "$REPO" && git rev-parse HEAD)"
WORK="/tmp/audit-verify-$(date +%s)"
mkdir -p "$WORK"
LINE=$(printf '─%.0s' {1..72})

echo "$LINE"; echo "🏗  ساخت کلونِ پایه در $WORK (از $BASE)"; echo "$LINE"
git clone -q --no-hardlinks "$REPO" "$WORK/repo" 2>/dev/null || { echo "❌ کلون شکست خورد"; exit 1; }
cd "$WORK/repo" || exit 1
git reset -q --hard "$BASE"
[ -d "$REPO/node_modules" ] && ln -s "$REPO/node_modules" node_modules

echo "📦 استخراج بستهٔ تحویل…"
mkdir -p "$WORK/unz"
unzip -qq -o "$ZIP" -d "$WORK/unz" || { echo "❌ استخراج شکست خورد"; exit 1; }
SRC="$WORK/unz"
entries=$(ls -A "$WORK/unz" | grep -v __MACOSX | wc -l)
if [ "$entries" -eq 1 ] && [ -d "$(ls -d "$WORK/unz"/*/ | head -1)" ]; then SRC="$(ls -d "$WORK/unz"/*/ | head -1)"; fi

echo "🔀 اعمال بسته روی کلون…"
(cd "$SRC" && find . -type f -not -path './.git/*' -not -path './node_modules/*' -not -name '.DS_Store' -print0 | while IFS= read -r -d '' f; do
  mkdir -p "$WORK/repo/$(dirname "$f")"
  cp "$f" "$WORK/repo/$f"
done)

echo "$LINE"; echo "📋 فایل‌های افزوده/تغییرکرده نسبت به پایه:"; echo "$LINE"
git -C "$WORK/repo" add -A -N >/dev/null 2>&1
git -C "$WORK/repo" status --porcelain | sed 's/^/  /'
echo "$LINE"
echo "🚦 بررسی دامنه (باید خالی باشد):"
SCOPE=$(git -C "$WORK/repo" status --porcelain -- src/ server.ts package.json package-lock.json tsconfig.json vite.config.ts .eslintrc.cjs .eslintrc.js .github/ benchmarks/)
if [ -z "$SCOPE" ]; then echo "  ✅ هیچ تغییری در src/سرور/پیکربندی/بنچمارک نیست"; else echo "$SCOPE" | sed 's/^/  🛑 /'; fi
echo "$LINE"

echo "🔎 اجرای gate-check روی کلونِ آلوده‌شده:"
(cd "$WORK/repo" && node "$SCRIPT_DIR/gate-check.mjs" ${2:-}) | sed 's/^/  /'
echo "$LINE"
echo "📂 مسیر بازرسی دستی: $WORK/repo"
echo "   برای اجرای هارنس خودِ اجنت:  cd $WORK/repo && npx tsx scripts/remediation/run-phase01.ts"
