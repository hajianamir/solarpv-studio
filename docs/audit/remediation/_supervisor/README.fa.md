# ابزار داوری ناظر — فاز ۱

> فقط برای ناظر. اجنت این پوشه را نمی‌بیند و نباید ببیند.

## فایل‌ها
| فایل | کار |
|---|---|
| `gate-check.mjs` | ۱۲ بازرسی مکانیکی + اعتبارسنجی طرح‌وارهٔ `measurements.json` + بازمحاسبهٔ `harnessSha256` |
| `verify-delivery.sh <zip>` | کلونِ تمیز از `dbf0aca` → اعمال زیپ → بررسی دامنه → اجرای gate-check |

## دستورهای عملیاتی

```bash
# ۱) پس از دریافت زیپ از اجنت:
docs/audit/remediation/_supervisor/verify-delivery.sh ~/Downloads/phase01-delivery.zip

# ۲) نمونه‌های بازتولید تصادفی (دانهٔ ثابت 1337) برای آزمون K-07:
cd $(mktemp -d) && git clone -q /home/user/solarpv-studio r && cd r && \
  unzip -qq -o ~/Downloads/phase01-delivery.zip && \
  node /home/user/solarpv-studio/docs/audit/remediation/_supervisor/gate-check.mjs --plot

# ۳) جبرگرایی (DoD-5): اجرای دوباره و مقایسهٔ هش
npx tsx scripts/remediation/run-phase01.ts > /tmp/run1.txt && sha256sum docs/audit/remediation/evidence/phase01/measurements.json
npx tsx scripts/remediation/run-phase01.ts > /tmp/run2.txt && sha256sum docs/audit/remediation/evidence/phase01/measurements.json
diff /tmp/run1.txt /tmp/run2.txt && echo "deterministic"

# ۴) دروازه‌ها (H-07):
npm run lint 2>&1 | tail -5 ; npm test 2>&1 | tail -15 ; npm run build 2>&1 | tail -5
```

## آنچه ابزار **نمی‌تواند** بسنجد (باید دستی انجام شود)

| بازرسی | چرا خودکار نیست |
|---|---|
| **K-10 صحت `file:line`** | ۵ ارجاع تصادفی از `measurements.json` را باید با `sed -n 'A,Bp'` باز کرد و با ادعا مقایسه کرد |
| **K-11 انطباق DoD** | جدول بخش ۲ گزارش پایان باید با DoD فاز تطبیق داده شود؛ `PARTIAL` بدون تشدید = رد |
| **K-12 صداقت «چه نکردم»** | موارد باید واقعی باشند؛ «کارهایی که انجام ندادم: هیچ» = رد |
| **خ-۱ حذف** | باید پرسید: کدام شرط DoD تزئینی بود؟ |
| **خ-۲ جعل** | یک عدد را در `measurements.json` دستی خراب کن؛ اگر چیزی نشکست، شواهد به هم گره نخورده‌اند |
| **خ-۳ بازگشت** | آیا فاز بعد به این فاز وابسته است؟ |
| **کیفیت فرمول (بخش ۷)** | آیا فرمول ثبت‌شده واقعاً همان چیزی است که کد اجرا می‌کند، یا توصیف آرمانی است؟ |
| **H-11 نقض کوری** | آیا اجنت عددی نوشته که فقط در گزارش ممیزی من بود؟ |

## آستانه‌های خط مبنا (یخ‌زده)
```
HEAD                = dbf0aca24e64cb9b19e090cb5bbea62e1cd7c54d
anyWarnings         ≤ 93          (بیشتر = رد)
lintErrors          = 0
testFail            = 0
testSkip            = 0
buildExit           = 0
کمیت‌ها (M-*)       = 45          (A1-A6,B1-B5,C1-C4,D1-D4,E1-E5,F1-F6,G1-G5,H1-H5,I1-I5)
انسجام (C-*)        = 10
خروجی‌ها (D-*)      = 7
```
