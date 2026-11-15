# راهنمای تفسیر شواهد ذخیره‌شده

فایل‌های `test-output.txt` و `coverage-output.txt`، خروجی‌های ذخیره‌شدهٔ داخلی‌اند. آن‌ها ممکن است نشان دهند یک harness چه PASS/coverageای را در اجرای ثبت‌شده گزارش کرده است؛ اما raw field data، اجرای مستقل NREL SAM، صحت مقدارهای هدف hard-coded، دقت فیزیکی مدل، یا انطباق با کد را به‌تنهایی ثابت نمی‌کنند.

در این ممیزی، benchmark اجرا نشد: `npm run test:benchmark` با exit 127 و پیام `tsx: not found` خاتمه یافت. بنابراین خروجی‌های موجود در این پوشه در این بررسی دوباره تولید/تأیید نشدند و نباید به‌عنوان نتیجهٔ اجرای جاری تلقی شوند.

برای تفکیک claim-by-claim و فهرست شواهد/محدودیت‌ها، به [`../audit/INDEPENDENT_EVIDENCE_AUDIT_1.0.3.md`](../audit/INDEPENDENT_EVIDENCE_AUDIT_1.0.3.md) رجوع کنید.
