# تحویل مرحله۴۰
2026-11-03؛ شاخه `arena/237e6ea2-solarpv-studio`؛ مبنا55f014d؛ بدونmerge.

## دامنه
موتور1.14.0؛ سقفصادراتبازه‌ای باsource/quality،CSV timestamp,limitW، تطابقUTC، حد۸۷۸۴ردیف، ثابت/scheduleمتنافی وبدونfill. اعمالminپسازplantفقطرویصادرات؛ importsبدونتغییر. rootonlyبرایچنداینورتر. UI/review/restore،نتیجه/reportماهانه،JSON/CSV،explorer،ledger/capability وguard/archive/bundle/clone تکمیلشدند. guardسقفثابتنیز اکنون انرژیپیشازسقف/افت را ازنمونه‌ها انتگرال می‌گیرد؛ افزایشهمزماندوsummaryباوجودترازجمع رد می‌شود.

برنامهپیشازکد: `PVLIB-STEP-40-PLAN.fa.md`؛ راهنما/منبع/محدودیت‌ها: `../PVLIB-STEP-40-EXPORT-LIMIT-SCHEDULE.fa.md`.

## شواهد محلی
- Pythonکامل **۱۴۲تست PASS**؛ شامل۳تستfoundationمحلی نامرتبط وخارجازتحویل؛ مجموعهٔنسخه‌شدهٔقابل‌انتساب **۱۳۹تست**. هفتتستجدیدschedule همگیPASS.
- `test:study:workflow` باPythonواقعی PASS؛ suiteجدیدCSV/UTC/dualmode/min/energy/tamper/monthly/child/import/bundle/clone/report/ledger/explorer اجراشد.
- `test:study`HTTP/process PASS؛JWT،بدنه/ظرفیت/rate/timeout/kill/abort/runtime/outputbound.
- `test:study:browser` direct+storage PASS؛ ورودCSVبد/اصلاح،چنداینورتر+مصرفکمکی+سقفمتغیر،دانلود،archiveوIDBreloadrestore. `test:browser`قدیمی نیز سری وباtimeout۱۸۰ثانیه PASS.
- build،tsc،npmtest PASS؛lintصفرerrorو۹۵warning؛auditباPHYSICS_DIFF_BASE=55f014d PASS؛gitdiffcheckPASS.
- workerقبلی55f014dدر۵fixture baseline/plant/blocks/mppt/auxiliaryScheduleباworkerجدیدمقایسهشد: samples،summaryوmonthlyدقیقاًبرابر.
- اجرای۸۷۸۴بازهٔمصنوعیتماماًشب زیر16MiB و رد۸۷۸۵ردیف؛ شاهددامنه/اندازه، نه دادهٔعملیاتی یااعتبارسالانه.

## محدودیت/حفظ محیط
سقفرویتوانمیانگینبازه است؛ clippingاینورترجدا وبدونDCfeedbackیاکنترلگذراست. تلفاتترانسپسازcurtailmentبازحل‌نمی‌شوند؛ بنابراین مدلکنترلواقعی/توانلحظه‌اینیست.۳۸/۴۱/۴۲وفاندیشنناتمام۳۱–۳۴ تکمیل‌شده اعلامنمی‌شوند. دادهٔعملیاتی اختراع/صفرپرنشده؛ Docker/fieldvalidationتستنشده. PASSگواهیایمنی/کالیبراسیون/bankabilityنیست.

اشاره‌گرمحلیGitدرشروعروی5438fb5بود،ولیفایل‌هابایت‌به‌بایتبا55f014dبرابربودند. snapshotحفاظتیstashگرفتهشد،همانشاخهff-onlyشدوششفایلنامرتبطfoundationبازگرداندهشدند؛هیچhistoryبازنویسینشد. اینفایل‌هاstageنمی‌شوند. CIدقیقSHAپسازpushدرپاسختحویلگزارشمی‌شود؛موفقیتCIقبلیبه‌ایننسخهنسبتداده‌نمی‌شود.
