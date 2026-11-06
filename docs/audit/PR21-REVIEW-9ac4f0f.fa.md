# گزارش بررسی و رفع تکمیلی مغایرت‌های کامیت ۹ac۴f۰f در PR #21
**تاریخ:** ۲۰۲۶-۱۱-۰۶  
**شاخه:** `arena/b1ee60dc-solarpv-studio`  
**وضعیت PR:** `OPEN` (Pull Request #21)

---

## ۱. وضعیت شاخه و گیت‌هاب

- شاخهٔ کاری: `arena/b1ee60dc-solarpv-studio`
- وضعیت Pull Request در مخزن گیت‌هاب: **OPEN** (ادغام‌نشده در `main`؛ `mergedAt = null`).
- کلیهٔ اصلاحات مستقیماً روی همین شاخه commit و push می‌شوند.

---

## ۲. خلاصهٔ نتایج آزمون‌های سیستمی و ممیزی

| مجموعه آزمون | تعداد کل | وضعیت | توضیحات |
|---|---:|:---:|---|
| **آزمون‌های ممیزی مهندسی (`test:audit`)** | **۱۵۱ / ۱۵۱** | **پاس ۱۰۰٪** | ۸۵ آزمون R1–R11 + ۶۶ آزمون هندسی و فیزیکی Area 1–7 |
| **بنچ‌مارک‌های هسته (`test`)** | **۶ / ۶** | **پاس ۱۰۰٪** | ۱۶۳ تست واحد هسته، ۶ بردار مهاجرت، SAM، NREL و BIPV/T |
| **جریان‌های ادغام Smoke (`test:smoke`)** | **۵ / ۵** | **پاس ۱۰۰٪** | چرخهٔ کامل کاربر و بارگذاری پروژه‌ها |
| **بررسی انواع TypeScript (`lint:types`)** | **صفر خطا** | **پاس** | حالت سخت‌گیرانه `strict: true` در کلاینت و Node |
| **تحلیل ایستا ESLint (`lint:eslint`)** | **صفر خطا** | **پاس** | ۶۵ هشدار `any` مستند در لایه‌های مرزی |
| **کامپایل نهایی باندل (`build`)** | **موفق** | **پاس** | تولید باندل Vite در ۸٫۵۳ ثانیه بدون خطا |

---

## ۳. تحلیل تفصیلی و رفع نقص‌های سه‌گانهٔ اعلام‌شده

### نقص ۱: مصرف مستقیم `scene.albedo` در شبیه‌ساز و هماهنگی آلبدو در Viewer
- **شرح مسئله:** شبیه‌ساز سالانه `simulateAnnual3dShading` در صورت عدم ارسال `options.albedo` از فال‌بک سخت `0.20` استفاده می‌کرد و مقدار فیزیکی `scene.albedo` را نمی‌خواند (تفاوت ۳۱۹۹۵kWh در برابر ۳۲۷۸۷kWh). همچنین مؤلفهٔ `ThreeJsViewer` در نتیجهٔ اولیه مقدار آلبدوی شهر را در نظر نمی‌گرفت.
- **اصلاح ریشه‌ای مهندسی:**
  1. در `simulateAnnual3dShading`:
     ```ts
     const resolvedAlbedo = options?.albedo ?? scene.albedo ?? 0.20;
     ```
     و در خروجی شبیه‌سازی:
     ```ts
     sceneState: {
       ...scene,
       albedo: resolvedAlbedo,
     }
     ```
  2. در `ThreeJsViewer.tsx`:
     - متغیر `effectiveAlbedo = effectiveCity?.albedo ?? 0.20` تعریف و به `buildSceneFromProjectDesign`، صحنهٔ دمو و فراخوانی اولیهٔ `simulateAnnual3dShading` پاس داده شد.
  3. در `buildSceneFromProjectDesign` و `computeShadingSceneSignature`: پیش‌فرض استاندارد فیزیکی آلبدو به ۰٫۲۰ ست شد.
- **اعتبارسنجی با Probe مستقیم:**
  - فراخوانی `simulateAnnual3dShading` با `scene.albedo = 0.8` بدون `options` و با `options.albedo = 0.8`: هر دو دقیقاً **۳۲۷۸۷ کیلووات‌ساعت** تولید کردند و `sceneState.albedo` برابر ۰٫۸۰ باقی ماند.

---

### نقص ۲: هماهنگی کامل حالت شبیه‌سازی ۸۷۶۰ ساعته بین App و Viewer
- **شرح مسئله:** مؤلفهٔ `App.tsx` امضای صحنه را همواره با `screening_3day` تولید می‌کرد؛ در حالی که در صورت انتخاب حالت سالانهٔ کامل (`hourly_8760`) در Viewer، هش امضا متفاوت می‌شد و پس از `APPLY`، راندن `CHECK_SYNC` بلافاصله وضعیت را `isStale: true` می‌کرد.
- **اصلاح ریشه‌ای مهندسی:**
  1. در `shadingLifecycle.ts`، فیلد `simulationMode?: 'hourly_8760' | 'screening_3day'` به `AppliedShading3dRecord`، `ShadingLifecycleState` و اکشن `APPLY` اضافه شد.
  2. در `ThreeJsViewer.tsx`، پروپ‌های `simulationMode` و `onSimulationModeChange` اضافه شدند و تغییر مود به App مخابره می‌شود؛ همچنین در رکورد `onApplyShading` مود شبیه‌سازی ارسال می‌گردد.
  3. در `App.tsx`، امضای کانونیکال بر اساس مود فعال (`appliedShadingRecord?.simulationMode ?? shadingSimulationMode`) محاسبه می‌شود.
- **اعتبارسنجی با Probe مستقیم:**
  - در حالت ۸۷۶۰ ساعته: `appSig8760 === viewerSig8760`.
  - اجرای چرخهٔ `APPLY` با حالت `hourly_8760` و سپس `CHECK_SYNC`: خروجی `isStale: false` و `appliedMode: 'hourly_8760'`.

---

### نقص ۳: تفکیک شفاف برچسب ظرفیت AC هدف و ظرفیت نامی DC آرایه در Viewer
- **شرح مسئله:** با ارسال مقدار ۱۲۵۰ کیلووات به عنوان `plantCapacityKw` با نوع `ac_target`، در Viewer عبارت گمراه‌کنندهٔ «Target AC Capacity: 1,250 kW AC» نمایش داده می‌شد که در واقع ظرفیت DC با ضریب ۱٫۲۵ بود.
- **اصلاح ریشه‌ای مهندسی:**
  1. در `App.tsx`، پروپ `plantCapacityKw` در حالت نیروگاهی دقیقاً ظرفیت AC هدف (`targetPowerplantCapacityKw || 1000`) را دریافت می‌کند و ظرفیت DC نامی (`1250 kWp`) در `arrayDesign.totalPvCapacityKwp` ارسال می‌شود.
  2. در `ThreeJsViewer.tsx`، نمایشگر برچسب به‌روزرسانی شد تا هم ظرفیت AC هدف و هم ظرفیت نامی آرایهٔ DC را به وضوح نمایش دهد:
     ```tsx
     <span className="text-amber-300">
       {plantCapacityKw.toLocaleString()}{' '}
       {plantCapacityType === 'ac_target' ? 'kW AC' : 'kWp'}
     </span>
     {plantCapacityType === 'ac_target' && arrayDesign?.totalPvCapacityKwp && (
       <span className="text-slate-400 font-normal ml-1">
         ({isEn ? 'Array DC:' : 'آرایه DC:'} {arrayDesign.totalPvCapacityKwp.toLocaleString()} kWp)
       </span>
     )}
     ```
  - خروجی نمایشی: **Target AC Capacity: 1,000 kW AC (Array DC: 1,250 kWp)**.

---

## ۴. پرونده‌های اصلاح‌شده

1. `src/engine/roof3dShadingEngine.ts`:
   - خواندن مستقیم `scene.albedo` در `simulateAnnual3dShading` در غیاب `options.albedo`.
   - پیش‌فرض فیزیکی ۰٫۲۰ برای آلبدوی سایت در `buildSceneFromProjectDesign`.
2. `src/engine/shadingLifecycle.ts`:
   - گنجاندن `simulationMode` در ساختار `AppliedShading3dRecord` و اکشن `APPLY`.
   - هماهنگی پیش‌فرض آلبدو در `computeShadingSceneSignature`.
3. `src/components/ThreeJsViewer.tsx`:
   - همگام‌سازی کنترل‌شدهٔ `simulationMode` با App.
   - تزریق `effectiveAlbedo` در ساخت صحنه و محاسبات اولیه و ثانویهٔ شبیه‌سازی.
   - نمایش همزمان ظرفیت AC هدف و ظرفیت DC آرایه در برچسب وضعیت.
4. `src/App.tsx`:
   - نگهداری حالت `shadingSimulationMode` و انتقال به امضای صحنه و Viewer.
   - تفکیک `plantCapacityKw` (ظرفیت ۱۰۰۰ کیلووات AC) و `arrayDesign.totalPvCapacityKwp` (ظرفیت ۱۲۵۰ کیلووات‌پیک DC).
5. `scripts/engineering-audit-remediation-test.ts`:
   - افزودن پروب‌های تست مستقل برای تضمین مصرف مستقیم `scene.albedo` (برابری ۳۲۷۸۷kWh) و برابری امضا و ماندگاری non-stale در حالت ۸۷۶۰ ساعته (مجموعاً ۶۶ تست Area 1–7 و ۱۵۱ تست کل).
