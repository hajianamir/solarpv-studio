# گزارش بررسی و رفع کامل مغایرت‌های کامیت ۸۹d۱c۷۶ در PR #21
**تاریخ:** ۲۰۲۶-۱۱-۰۶  
**شاخه:** `arena/b1ee60dc-solarpv-studio`  
**وضعیت PR:** `OPEN` (Pull Request #21)

---

## ۱. وضعیت شاخه و گیت‌هاب

- شاخهٔ کاری: `arena/b1ee60dc-solarpv-studio`
- وضعیت Pull Request در مخزن گیت‌هاب: **OPEN** (ادغام‌نشده در `main`؛ `mergedAt = null`).
- کامیت‌های جدید مستقیماً روی همین شاخه push می‌شوند و هیچ تغییری در نام یا ماهیت شاخه اعمال نشده است.

---

## ۲. خلاصهٔ نتایج آزمون‌های سیستمی و ممیزی

| مجموعه آزمون | تعداد کل | وضعیت | توضیحات |
|---|---:|:---:|---|
| **آزمون‌های ممیزی مهندسی (`test:audit`)** | **۱۴۸ / ۱۴۸** | **پاس ۱۰۰٪** | ۸۵ آزمون R1–R11 + ۶۳ آزمون هندسی و فیزیکی Area 1–7 |
| **بنچ‌مارک‌های هسته (`test`)** | **۶ / ۶** | **پاس ۱۰۰٪** | ۱۶۳ تست واحد هسته، ۶ بردار مهاجرت، SAM، NREL و BIPV/T |
| **جریان‌های ادغام Smoke (`test:smoke`)** | **۵ / ۵** | **پاس ۱۰۰٪** | چرخهٔ کامل کاربر و بارگذاری پروژه‌ها |
| **بررسی انواع TypeScript (`lint:types`)** | **صفر خطا** | **پاس** | حالت سخت‌گیرانه `strict: true` در کلاینت و Node |
| **تحلیل ایستا ESLint (`lint:eslint`)** | **صفر خطا** | **پاس** | ۶۵ هشدار `any` مستند در لایه‌های مرزی |
| **کامپایل نهایی باندل (`build`)** | **موفق** | **پاس** | تولید باندل Vite در ۷٫۸۴ ثانیه بدون خطا |

---

## ۳. تحلیل تفصیلی و رفع نقص‌های بازتولیدشده

### نقص ۱: پوشش کامل امضای استاندارد صحنه برای تمام ورودی‌های مؤثر (Canonical Signature Completeness)
- **شرح مسئله:** امضای استاندارد `computeShadingSceneSignature` شامل موقعیت مختصات جغرافیایی (`anchorLocation`)، آلبدو (`albedo`) و حالت شبیه‌سازی (`simulationMode`) نبود؛ در نتیجه تغییر عرض جغرافیایی با `cityId` ثابت یا تغییر آلبدو از ۰ به ۰٫۸، همان هش را برمی‌گرداند در حالی که انرژی خروجی تغییر می‌کرد.
- **اصلاح ریشه‌ای مهندسی:** ساختار `canonicalObj` در `shadingLifecycle.ts` بازنویسی شد تا تمام ورودی‌های تعیین‌کنندهٔ مدل فیزیکی را در خود جای دهد:
  ```ts
  const anchor = s.anchorLocation
    ? {
        lat: Number((s.anchorLocation.latitude ?? 0).toFixed(4)),
        lng: Number((s.anchorLocation.longitude ?? 0).toFixed(4)),
        elev: Number((s.anchorLocation.elevationM ?? 0).toFixed(1)),
      }
    : null;

  const canonicalObj = {
    engineVersion,
    cityId: params.cityId || 'default',
    anchor,
    albedo: albedoVal !== null && albedoVal !== undefined ? Number(Number(albedoVal).toFixed(2)) : null,
    simMode: params.simulationMode ?? null,
    psh: params.peakSunHours ? Number(params.peakSunHours.toFixed(2)) : null,
    cap: Number(((s.totalPvCapacityKwp ?? params.capacityKwp) || 0).toFixed(2)),
    modCount: s.totalModulesCount ?? null,
    tilt: Number(((s.tiltDeg ?? params.tiltDeg) || 0).toFixed(1)),
    az: Number(((s.azimuthDeg ?? params.azimuthDeg) || 0).toFixed(1)),
    pitch: Number(((s.interRowSpacingM ?? params.pitchM) || 0).toFixed(2)),
    env: s.installationEnvironment || 'rooftop',
    roof,
    tables,
    obstacles,
  };
  ```
- **نتایج سنجش با Probeهای مستقل:**
  1. تغییر عرض جغرافیایی از ۳۵٫۶۸۹۲ به ۳۳٫۸۶۸۸- درجه با `cityId` و PSH یکسان: هش امضا تغییر کرد (`sigTehran !== sigSydney`).
  2. تغییر آلبدوی زمین از ۰٫۲۰ به ۰٫۸۰: هش امضا تغییر کرد (`sigAlbedo02 !== sigAlbedo08`).

---

### نقص ۲: انطباق کامل ظرفیت و ساختار صحنه بین App و ThreeJsViewer در حالت Powerplant
- **شرح مسئله:** در حالت نیروگاهی (`systemMode === 'powerplant'`)، مؤلفهٔ `App.tsx` امضا را بر اساس ظرفیت AC هدف (مثلاً ۱۰۰۰ کیلووات) محاسبه می‌کرد، اما به `ThreeJsViewer` ظرفیت نامی DC با ضریب ۱٫۲۵ (۱۲۵۰ کیلووات‌پیک) پاس داده می‌شد. در نتیجه هش‌های دو صحنه متفاوت بودند و بلافاصله پس از `APPLY`، در اولین رندر با اجرای `CHECK_SYNC`، امضا ناسازگار شناخته شده و تحلیل به حالت `stale` می‌رفت.
- **اصلاح ریشه‌ای مهندسی:**
  - در `App.tsx`، ظرفیت فعال نیروگاه `activePlantCapacityKwp` به‌طور یکنواخت به `targetPowerplantCapacityKw * 1.25` تعریف شد:
    ```ts
    const activePlantCapacityKwp =
      systemMode === 'powerplant'
        ? (targetPowerplantCapacityKw || 1000) * 1.25
        : arrayDesign.totalPvCapacityKwp;

    const activeModulesCount =
      systemMode === 'powerplant'
        ? Math.round((activePlantCapacityKwp * 1000) / (selectedModule.pmpWatts || 550))
        : arrayDesign.totalModulesCount;
    ```
  - همان ظرفیت و تعداد ماژول در `currentShadingSignature` و نیز پروپ‌های `ThreeJsViewer` پاس داده شد.
- **اعتبارسنجی با Probe مستقل:**
  - هر دو صحنه ظرفیت ۱۲۵۰ کیلووات‌پیک و تعداد ماژول ۲۲۷۳ تولید می‌کنند.
  - هش امضای تولیدشده در `App` و `Viewer` صددرصد یکسان است (`appSig === viewerSig`).
  - توالی `APPLY -> CHECK_SYNC` در ردیوسر بررسی شد و حالت `isStale: false` پایدار باقی ماند.

---

### نقص ۳: مدیریت خطا و بازنشانی تضمینی Loading در `setTimeout`
- **شرح مسئله:** در `handleRunShadingAnalysis` در `ThreeJsViewer.tsx`، بلوک `try/catch` دور `setTimeout` قرار داشت و خطاهای داخل کال‌بک ناهمگام را دریافت نمی‌کرد. در صورت بروز هرگونه خطا در حین شبیه‌سازی، `setLoading(false)` هرگز فراخوانی نمی‌شد و رابط کاربری در حالت لودینگ ابدی قفل می‌شد.
- **اصلاح ریشه‌ای مهندسی:** ساختار مدیریت استثنا به داخل کال‌بک `setTimeout` منتقل شد و بلوک `finally` اضافه گردید:
  ```ts
  const handleRunShadingAnalysis = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const result = simulateAnnual3dShading(activeScene, city?.peakSunHours ?? 5.2, 40.0, {
          simulationMode,
          albedo: city?.albedo,
        });
        const rayTraced = calculateRayTracedShadingFactor(activeScene, undefined, {
          includeInterRow: true,
        });
        setAnnualResult(result);
        setRayTracedResult(rayTraced);
        setCalculatedSignature(
          computeShadingSceneSignature({
            scene: result.sceneState,
            cityId: city?.id,
            peakSunHours: city?.peakSunHours,
            albedo: result.sceneState.albedo ?? city?.albedo,
            simulationMode,
          })
        );
      } catch (err) {
        console.error('Shading analysis execution error:', err);
      } finally {
        setLoading(false);
      }
    }, 120);
  };
  ```
- **اعتبارسنجی:** تحت هر شرایطی (موفقیت یا شکست شبیه‌سازی)، وضعیت `loading` با تضمین ۱۰۰٪ به `false` بازنشانی می‌شود.

---

## ۴. پرونده‌های اصلاح‌شده

1. `src/engine/shadingLifecycle.ts`:
   - گنجاندن `anchorLocation`، `albedo`، و `simulationMode` در ساختار امضای استاندارد صحنه.
2. `src/engine/roof3dShadingEngine.ts`:
   - افزودن فیلد اختیاری `albedo` به `Scene3DState` و `ProjectArrayDesignInputs`.
   - ذخیره و انتقال صحیح `albedo` در `buildSceneFromProjectDesign` و `simulateAnnual3dShading`.
3. `src/App.tsx`:
   - یکپارچه‌سازی ظرفیت DC و تعداد ماژول‌ها در حالت نیروگاهی بین امضای صحنه و پروپ‌های ۳D Viewer.
4. `src/components/ThreeJsViewer.tsx`:
   - مدیریت ایمن خطا درون کال‌بک `setTimeout` با `finally { setLoading(false); }`.
   - ارسال `albedo` و `simulationMode` در تمام محاسبات امضای صحنه.
5. `scripts/engineering-audit-remediation-test.ts`:
   - افزودن آزمون‌های سنجش حساسیت امضا به تغییر عرض جغرافیایی و آلبدو، و آزمون تطابق کامل صحنه و عدم بروز Stale میان App و Viewer.
