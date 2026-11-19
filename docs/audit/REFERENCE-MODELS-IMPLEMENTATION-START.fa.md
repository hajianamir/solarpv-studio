# گزارش شروع پیاده‌سازی مدل‌های مرجع — snow / soiling / air BIPV/T

**شاخه:** `arena/cfc20741-solarpv-studio`؛ **baseline:** `3b908227df34b5cfd744c26e607378f0de7933dd`.
**وضعیت:** موجودی و تصمیم طراحی پیش از تغییر کد؛ هیچ مدل مرجع جدیدی در این commit پیاده نشده است. بستهٔ provenance قبلی حفظ شده است. این گزارش تأیید علمی یا ادعای تکمیل دستور نیست.

## ۱. exportها و مسیرهای فعلی

```text
src/engine/bipv/bipvThermalEngine.ts:52:export type BipvVentilationMode = 'unventilated_insulated' | 'natural_buoyancy' | 'forced_convection';
src/engine/bipv/bipvThermalEngine.ts:54:export interface BipvThermalConfig {
src/engine/bipv/bipvThermalEngine.ts:95:export interface BipvThermalSliceResult {
src/engine/bipv/bipvThermalEngine.ts:103:export interface BipvThermalSimulationResult {
src/engine/bipv/bipvThermalEngine.ts:131:export const DEFAULT_BIPV_CONFIG: BipvThermalConfig = {
src/engine/bipv/bipvThermalEngine.ts:157:export function simulateBipvThermalStep(
src/engine/snow/marionSnowEngine.ts:37:export interface HourlySnowWeatherStep {
src/engine/snow/marionSnowEngine.ts:51:export function evaluateSheddingFraction(
src/engine/snow/marionSnowEngine.ts:98:export function calculateSnowStep(
src/engine/snow/marionSnowEngine.ts:180:export function simulateAnnualSnowShedding(
src/engine/snow/marionSnowEngine.ts:249:export function calculateSnowStructuralLoad(
src/engine/soiling/kimberSoilingEngine.ts:35:export interface DiscreteRainCleaningBin {
src/engine/soiling/kimberSoilingEngine.ts:52:export const KIMBER_STANDARD_RAIN_BINS: ReadonlyArray<DiscreteRainCleaningBin> = [
src/engine/soiling/kimberSoilingEngine.ts:60:export interface DailyWeatherSoilingStep {
src/engine/soiling/kimberSoilingEngine.ts:69:export function evaluateRainCleaningFraction(
src/engine/soiling/kimberSoilingEngine.ts:100:export function simulateAnnualSoiling(
```

نام‌ها حفظ می‌شوند و screening legacy باقی می‌مانند؛ جایگزینی درجا، goldenهای داخلی قبلی را ناگهان reference validation نمی‌کند. APIهای جدید در ماژول‌های مجزا و نسخه‌دار اضافه خواهند شد. import استفاده‌نشدهٔ soiling در BIPV/T، اتصال واقعی Kimber نیست: frontSoilingPercent همچنان 3.50 ثابت است.

### موجودی call-siteهای مستقیم repository

جست‌وجوی `src` و `scripts` روی شناسهٔ تمام exportهای تابع سه موتور، wrapperهای physicalLoss و suite برف؛ شامل declarationها برای قابلیت بازبینی. این لیست یافته‌های استاتیک است، نه تضمین نبود consumer خارج repository یا فراخوانی reflection. جست‌وجوی importهای سه ماژول نیز با این مسیرها تطبیق داده شد؛ BIPV/T فقط در benchmarkها و runner مستقیم مصرف می‌شود، نه مسیر اصلی UI.

```text
src/engine/waterfallArgs.ts:121:  const phys = i.physicalLossConfig ? evaluatePhysicalLossModels(i.physicalLossConfig) : null;
src/engine/soiling/kimberSoilingEngine.ts:69:export function evaluateRainCleaningFraction(
src/engine/soiling/kimberSoilingEngine.ts:100:export function simulateAnnualSoiling(
src/engine/soiling/kimberSoilingEngine.ts:148:      const cleanFraction = evaluateRainCleaningFraction(weather.rainfallMm, mergedConfig);
src/engine/snow/marionSnowRecalibration.ts:132:export function runMarionSnowRecalibrationSuite(): MarionRecalibrationReport {
src/engine/snow/marionSnowRecalibration.ts:205:    const sim = simulateAnnualSnowShedding(
src/engine/snow/marionSnowRecalibration.ts:246:    const s1 = simulateAnnualSnowShedding({ tiltDeg: hub.arrayTiltDeg, groundClearanceM: hub.groundClearanceM, moduleBottomClearanceM: hub.groundClearanceM }, w1.weather);
src/engine/snow/marionSnowRecalibration.ts:250:    const s2 = simulateAnnualSnowShedding({ tiltDeg: hub.arrayTiltDeg, groundClearanceM: hub.groundClearanceM, moduleBottomClearanceM: hub.groundClearanceM }, w2.weather);
src/engine/snow/marionSnowRecalibration.ts:254:    const s3 = simulateAnnualSnowShedding({ tiltDeg: hub.arrayTiltDeg, groundClearanceM: hub.groundClearanceM, moduleBottomClearanceM: hub.groundClearanceM }, w3.weather);
src/engine/snow/marionSnowEngine.ts:51:export function evaluateSheddingFraction(
src/engine/snow/marionSnowEngine.ts:98:export function calculateSnowStep(
src/engine/snow/marionSnowEngine.ts:180:export function simulateAnnualSnowShedding(
src/engine/snow/marionSnowEngine.ts:205:    const stepRes = calculateSnowStep(weather, mergedConfig, currentCover);
src/engine/snow/marionSnowEngine.ts:249:export function calculateSnowStructuralLoad(
src/engine/core/physicalLossContract.ts:179:export function evaluatePhysicalSnowLoss(
src/engine/core/physicalLossContract.ts:184:  return simulateAnnualSnowShedding(config, weather);
src/engine/core/physicalLossContract.ts:190:export function evaluatePhysicalSoilingLoss(
src/engine/core/physicalLossContract.ts:194:  return simulateAnnualSoiling(config, weatherDaily);
src/engine/core/physicalLossContract.ts:200:export function evaluatePhysicalLossModels(
src/engine/core/physicalLossContract.ts:236:    snowSummary = evaluatePhysicalSnowLoss(input.snow.config ?? {}, weather);
src/engine/core/physicalLossContract.ts:242:    soilingSummary = evaluatePhysicalSoilingLoss(input.soiling.config ?? {}, input.soiling.weatherDaily);
src/engine/core/benchmarks/sensitivityAnalysis.ts:164:      const sim = simulateAnnualSoiling(
src/engine/core/benchmarks/sensitivityAnalysis.ts:215:      const sim = simulateAnnualSnowShedding(
src/engine/core/benchmarks/sensitivityAnalysis.ts:312:    const sim = simulateAnnualSnowShedding(
src/engine/core/benchmarks/sensitivityAnalysis.ts:343:    const sim = simulateAnnualSnowShedding(
src/engine/core/benchmarks/sensitivityAnalysis.ts:381:    const sim = simulateAnnualSnowShedding(
src/engine/core/benchmarks/externalValidation.ts:244:  const mesaSoilingSim = simulateAnnualSoiling(
src/engine/core/benchmarks/externalValidation.ts:303:  const phxSoilingSim = simulateAnnualSoiling(
src/engine/core/benchmarks/externalValidation.ts:336:  const munichSoilingSim = simulateAnnualSoiling(
src/engine/core/benchmarks/externalValidation.ts:341:  const munichSnowSim = simulateAnnualSnowShedding(
src/engine/core/benchmarks/externalValidation.ts:366:  const sgSoilingSim = simulateAnnualSoiling(
src/engine/core/benchmarks/crossValidation.ts:193:    const soilingSim = simulateAnnualSoiling(
src/engine/core/benchmarks/crossValidation.ts:225:    snowCalc = evaluateSheddingFraction(
src/engine/core/benchmarks/crossValidation.ts:281:    const bipvRes = simulateBipvThermalStep(
src/engine/bipv/bipvThermalEngine.ts:157:export function simulateBipvThermalStep(
src/engine/core/benchmarks/unitTestsCore.ts:310:  const cleanTrace = evaluateRainCleaningFraction(0.5, binConfig);
src/engine/core/benchmarks/unitTestsCore.ts:311:  const cleanLight = evaluateRainCleaningFraction(2.0, binConfig);
src/engine/core/benchmarks/unitTestsCore.ts:312:  const cleanMod = evaluateRainCleaningFraction(3.5, binConfig);
src/engine/core/benchmarks/unitTestsCore.ts:313:  const cleanHeavy = evaluateRainCleaningFraction(8.0, binConfig);
src/engine/core/benchmarks/unitTestsCore.ts:314:  const cleanTorrential = evaluateRainCleaningFraction(15.0, binConfig);
src/engine/core/benchmarks/unitTestsCore.ts:331:  const simpUnder1 = evaluateRainCleaningFraction(0.8, simpConfig);
src/engine/core/benchmarks/unitTestsCore.ts:332:  const simpPartial = evaluateRainCleaningFraction(2.5, simpConfig);
src/engine/core/benchmarks/unitTestsCore.ts:333:  const simpFull = evaluateRainCleaningFraction(6.0, simpConfig);
src/engine/core/benchmarks/unitTestsCore.ts:344:  const simNormal = simulateAnnualSoiling({ dailySoilingRatePercent: 0.20, dustStormVulnerabilityFactor: 2.5, maxSoilingCeilingPercent: 30 }, normalDays);
src/engine/core/benchmarks/unitTestsCore.ts:345:  const simStorm = simulateAnnualSoiling({ dailySoilingRatePercent: 0.20, dustStormVulnerabilityFactor: 2.5, maxSoilingCeilingPercent: 30 }, stormDays);
src/engine/core/benchmarks/unitTestsCore.ts:357:  const simCeiling = simulateAnnualSoiling({ dailySoilingRatePercent: 0.25, maxSoilingCeilingPercent: 28.0, scheduledWashIntervalDays: 0 }, dryYear);
src/engine/core/benchmarks/unitTestsCore.ts:367:  const simWash = simulateAnnualSoiling({ dailySoilingRatePercent: 0.20, scheduledWashIntervalDays: 15 }, dryYear);
src/engine/core/benchmarks/unitTestsCore.ts:381:  const coldShed = evaluateSheddingFraction(25.0, -3.0, 0.8, 0, 1.0, 0.5);
src/engine/core/benchmarks/unitTestsCore.ts:382:  const warmShed = evaluateSheddingFraction(25.0, 1.5, 0.8, 0, 1.0, 0.5);
src/engine/core/benchmarks/unitTestsCore.ts:391:  const flatShed = evaluateSheddingFraction(1.0, 2.0, 0.8, 0, 1.0, 0.5);
src/engine/core/benchmarks/unitTestsCore.ts:401:  const undammedShed = evaluateSheddingFraction(25.0, 1.5, 0.80, 10, 1.0, 0.5, 0.50);
src/engine/core/benchmarks/unitTestsCore.ts:402:  const dammedShed = evaluateSheddingFraction(25.0, 1.5, 0.80, 50, 1.0, 0.5, 0.50);
src/engine/core/benchmarks/unitTestsCore.ts:411:  const snowStepRes = calculateSnowStep(
src/engine/core/benchmarks/unitTestsCore.ts:430:  const severeDamSim = simulateAnnualSnowShedding({ groundClearanceM: 0.80, dammingRiskThresholdM: 0.50 }, severeDamWeather);
src/engine/core/benchmarks/unitTestsCore.ts:655:  const recalReport = runMarionSnowRecalibrationSuite();
src/engine/core/benchmarks/unitTestsCore.ts:741:  const bipvtForced = simulateBipvThermalStep(
src/engine/core/benchmarks/unitTestsCore.ts:795:  const bipvtUnvent = simulateBipvThermalStep(
src/engine/core/benchmarks/unitTestsCore.ts:813:  const bipvtNat = simulateBipvThermalStep(
src/engine/core/benchmarks/unitTestsCore.ts:841:  const nonBipv = simulateBipvThermalStep({ isBipvSystem: false });
src/engine/core/benchmarks/unitTestsCore.ts:1010:  const bipvtAnalytical = simulateBipvThermalStep(
scripts/run-all-benchmarks.ts:308:const snowRecal = runMarionSnowRecalibrationSuite();
scripts/run-all-benchmarks.ts:376:const bipvTask60 = simulateBipvThermalStep(
scripts/remediation/verify-phase04.ts:209:  const snowRes10 = evaluatePhysicalSnowLoss({
scripts/remediation/verify-phase04.ts:219:  const soilingUnwashed = simulateAnnualSoiling({
scripts/remediation/verify-phase04.ts:224:  const soilingWashed30 = evaluatePhysicalSoilingLoss({
scripts/remediation/verify-phase04.ts:401:  const snowRes30 = evaluatePhysicalSnowLoss({
```

## ۲. قرارداد فعلی، دادهٔ واقعی و fallback

| بخش | واحد/زمان فعلی | داده و missing فعلی | مصرف و نقص قرارداد |
|---|---|---|---|
| Snow | hourOfYear به‌جای timestamp؛ cm snowfall و ground depth؛ °C؛ tilt درجه؛ coverage fraction و loss درصد | `simulateAnnualSnowShedding([])` دورهٔ پیش‌فرض 8760 گام با weather گرم/بدون برف می‌سازد؛ wrapper فیزیکی در نبود weather، `buildStandardWinterSnowProfile` مصنوعی می‌سازد | تست‌ها و physicalLossContract؛ این defaultها برای API مرجع قابل استفاده نیستند. timezone، POA ساعتی و layout رشته در weather موجود نیستند. |
| Soiling | dayOfYear؛ باران mm/day؛ نرخ درصد/روز؛ خروجی mean سادهٔ درصد در 365 روز | `weatherDaily.find` در نبود روز، rainfall=0 و بدون storm فرض می‌کند | physicalLossContract و تست‌ها؛ missing با روز خشک مخلوط است. mean فعلی energy-weighted نیست. |
| BIPV/T | یک فراخوانی بدون timestamp؛ POA W/m²، °C، باد m/s؛ هندسه m؛ flow kg/s/m² | config و POA/temp/wind مقدار default دارند؛ سه mode فعلی و fallback Faiman برای non-BIPV؛ cpAir ثابت و loss جلو 3.50 فرض داخلی | مستقیم در unit/crossValidation/runner؛ transient time contract، sky/ground radiation boundary و خواص همهٔ لایه‌ها صریح نیستند. |
| Weather gateway | NASA POWER climatology ANN و PVGIS MRcalc ماهانه؛ تبدیل به شاخص‌های سالانه | PRECTOTCORR.ANN به mm/year تبدیل می‌شود؛ نبود آن fallback اقلیمی منطقه‌ای دارد؛ MRcalc بارش ارائه نمی‌کند | بارش سالانه/ماهانه، جای rainfall timestamped یا snow depth واقعی نیست. در مسیر بررسی‌شده series هم‌زمان POA/temp/rain/snow ارائه نمی‌شود. |

**UI و گزارش:** `App.tsx` یک waterfallReport مشترک می‌سازد؛ `iamLossPct=-2.2` می‌دهد و physicalLossConfig سری‌زمانی تأمین نمی‌کند. FinancialTab، WaterfallLossTab و OfficialReportModal همان خروجی را مصرف می‌کنند. `waterfallArgs` فقط در صورت وجود physicalLossConfig، wrapper فیزیکی را اجرا می‌کند؛ precedence ورودی دستی بر خروجی wrapper است. fallback soiling=4.5 و snow=0 در args/contract باقی‌اند. در اتصال جدید این‌ها باید screening/assumed معرفی شوند، نه نتیجهٔ API مرجع. صفر دستی با صفر اندازه‌گیری‌شده و missing متمایز خواهد شد.

## ۳. انتخاب نسخه‌ها و تفاوت‌ها

### Snow — تصمیم قطعی آغاز

شناسهٔ پیشنهادی `snow_pvlib_nrel_0131`، نسخهٔ API `1.0.0`؛ الگوریتم مقایسه‌ای **pvlib-python 0.13.1**، توابع `fully_covered_nrel`, `coverage_nrel`, `dc_loss_nrel` در [source ثابت](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/snow.py). پیشینه: Marion 2013 DOI `10.1016/j.solener.2013.07.029` و Ryberg–Freeman 2017 [NREL/TP-6A20-68705](https://docs.nrel.gov/docs/fy17osti/68705.pdf). این انتخاب معادل ادعای برابری همهٔ جزئیات SAM نیست.

- snowfall مقدار هر interval به cm است؛ trigger روی نرخ cm/hour و مقایسهٔ strict `>` قرار دارد؛ snow depth اختیاری نسخهٔ مرجع، اگر ارائه شود باید کامل و هم‌تراز باشد.
- لغزش با شرط strict دما در برابر POA/coefficient، متناسب با sin(tilt) و طول گام است؛ default 0.197 fraction/hour همان واحد 1.97 tenths/hour است، نه 1.97 fraction/hour.
- snowfall جدید، پوشش را reset می‌کند و در همان interval لغزش ندارد. در نخستین interval لغزش زمانی اعمال نمی‌شود؛ override عمق زمین کمتر از threshold یک رفتار جداست و باید تست شود.
- layout در تبدیل coverage به DC loss الزامی است؛ loss کسری باید مستقل از snow structural load بماند. نصب و ضریب انتخاب‌شده explicit و provenanceدار خواهد بود؛ ground-mounted به‌صورت خاموش از ضریب roof استفاده نمی‌کند.
- timestamp دارای offset، timezone مشخص، بازه‌های منظم hourly/sub-hourly و مقدار پوشش اولیه الزامی‌اند. gap/ترتیب نامعتبر/NaN/مقادیر منفی unsupported یا missing هستند، نه interpolated.

### Soiling — تصمیم قطعی آغاز

شناسهٔ پیشنهادی `soiling_kimber_pvlib_0131`، نسخهٔ API `1.0.0`؛ مقایسه با `pvlib.soiling.kimber` در [source ثابت](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/soiling.py)؛ پیشینه Kimber 2006 DOI `10.1109/WCPEC.2006.279690`.

- accumulated rainfall پنجرهٔ زمانی `(t-window,t]` دارد، cleaning event فقط با `>` threshold است؛ مقدار برابر event نیست.
- grace window هم right-closed است؛ نخستین نمونه initial_soiling دارد، نه افزایش یک روز کامل. timestep باید منظم و صریح باشد، نه تخمین از یک sample.
- wash زمان‌دار، هم‌تراز با series و timezone است؛ باران مفقود state آینده را نامعلوم می‌کند مگر ورودی restart معتبر و explicit برسد. نسخهٔ نخست کل سری ناقص را با status missing رد می‌کند تا loss قطعی نسازد.
- initial loss/max/rate/threshold/grace/accumulation window همه explicit یا assumption با provenance خواهند بود؛ default ابزار دادهٔ سایت نیست.
- time-average روزانه به‌عنوان annual energy loss استفاده نمی‌شود. فقط با وزن‌های انرژی معتبر و پوشش کامل دوره، sum(loss*energy)/sum(energy) محاسبه می‌شود؛ وزن صفرِ کل یا missing => نتیجهٔ انرژی null با علت.
- تفاوت سیاست missing/validation ما با pvlib صریح ثبت می‌شود؛ parity فقط روی دادهٔ کامل و معتبر و قرارداد timestep منتخب سنجیده خواهد شد.

### BIPV/T — دامنهٔ نخست قطعی، correlation هنوز قابل‌ادعا نیست

مسیر نخست **forced-air steady-state segmented** با mass-flow معلوم است. مدل natural-buoyancy، نشتی façade، ظرفیت حرارتی transient یا رفتار سالانه از یک گام ادعا نمی‌شود. inlet air و rear boundary، PV/دیوار، جذب/گسیل و بازتاب، area basis و خواص هوا باید explicit باشند. h یا correlation انتخابی همراه دامنه و provenance لازم است؛ در غیاب آن unsupported/missing، نه ضریب تازهٔ حدسی.

منابع منتخب برای بررسی پیش از تثبیت correlation:
- Candanedo et al., DOI `10.1115/1.4003145`؛ اعداد correlation و دامنهٔ Reynolds **هنوز از متن کامل استخراج/تأیید نشده‌اند** و از عنوان مقاله ساخته نمی‌شوند.
- [Purdue 2010](https://docs.lib.purdue.edu/ihpbc/25/) باز شد و لینک مقالهٔ اصلی شناسایی شد: https://docs.lib.purdue.edu/cgi/viewcontent.cgi?article=1024&context=ihpbc . دادهٔ آزمایشگاهی قابل دانلود و شرایط تطبیق هنوز ارزیابی نشده‌اند.
- صفحهٔ رسمی [IEA PVPS Task 15 report](https://iea-pvps.org/key-topics/t15-modelling-simulation-bipv-analysis-2026/) باز شد؛ گزارش با DOI `10.69766/GWEF4173` و ISBN `978-1-923734-16-6` شناسایی شد. متن کامل PDF و دادهٔ ماشین‌خوان هنوز در اختیار این بررسی نیستند؛ خلاصهٔ صفحه، validation این برنامه تلقی نمی‌شود. گام بعدی، دریافت PDF اصلی و ثبت dataset/دامنهٔ قابل استفاده است.

تا احراز این موارد، implementation مدل BIPV/T مرجع یا field validation آن **تکمیل‌شده اعلام نمی‌شود**. API می‌تواند status missing/unsupported را صادقانه برگرداند و legacy screening را جدا نگه دارد. Open-circuit و MPP مرزهای جذب/برق متفاوت دارند؛ loss soiling ثابت و bifacial proxy داخل تراز حرارتی به‌صورت خاموش وارد نمی‌شوند.

### fingerprint source انتخابی

فایل‌های مرجع از GitHub API روی tag `v0.13.1` خوانده شدند؛ فقط hash در گزارش است و source خارجی به Git افزوده نشده:
- `pvlib-snow.py`: SHA256 `d636df0afca2f02944d7953fb2dc1d9f175a3275cec3c8a03770486048c5ae4a`
- `pvlib-soiling.py`: SHA256 `cc3277374bb2792d42a0ed26c52746d7aab614204b6521dbba3247822b21e785`

## ۴. قرارداد خروجی و integration برنامه‌ریزی‌شده

هر سه نتیجه discriminated union با `status: computed | missing | unsupported | non_converged`، value nullable، modelId/version، input/parameter provenance با qualityهای measured/weather_provider/user_configured/assumed/missing، units، timestamps/timezone و پوشش داده، appliedParameters و validityLimits خواهند داشت. independent comparison و field-validation status جداگانه ثبت می‌شوند؛ computed مترادف validated نیست.

مرز ورودی‌های جدید از legacy با ماژول‌های مجزا و wrapper/adaptor explicit حفظ می‌شود. در UI/report فقدان دادهٔ سری‌زمانی باید دیده شود و screening fallback با منبع و علت باقی بماند. مدل‌های مرجع تا آماده‌بودن دادهٔ واقعی از مسیر live به‌طور خودکار اجرا نمی‌شوند. در integration، snow و soiling هرکدام یک بار به‌صورت loss مثبت مدل -> کسر loss در waterfall اعمال می‌شوند؛ BIPV/T Pdc خودش شامل lossهایی که wrapper اعلام می‌کند خواهد بود و مصرف‌کننده موظف به جلوگیری از اعمال دوباره است.

## ۵. مراحل اجرا و معیار خروج

1. همین گزارش شروع کار و موجودی، پیش از تغییر کد مدل.
2. قراردادهای مشترک version/provenance/missing؛ سپس API مرجع snow و soiling جداگانه، همراه fixtureهای واقعاً تولیدشده با pvlib pinned، مرزهای زمانی و backward compatibility.
3. پس از بررسی متن اصلی، forced-air energy-balance با residual، convergence و unsupported domain؛ بدون دادهٔ مستقل، فقط implementation/numerical tests و validation status صریحِ not_field_validated.
4. اتصال اختیاری به physicalLoss/UI/report با تفکیک missing و screening و جلوگیری از double counting؛ بدون تغییر tracker/transposition/offsetهای فعلی.
5. typecheck، ESLint، build، benchmarks، audit کامل، gateway، invariants و CI روی SHA نهایی؛ ثبت قبل/بعد و metricهای MBE/MAE/RMSE/normalization/temperature bias/coverage فقط در صورت وجود دادهٔ مستقل قابل استفاده. نبود داده به معنی metric ناموجود است، نه صفر خطا.

**وضعیت تحویل این مرحله:** فقط کشف مسیرها و قرارداد/نسخهٔ پیشنهادی؛ هیچ تست مدل جدید اجرا نشده، هیچ fixture جدید یا خروجی سالانه تولید نشده و هیچ ادعای جایگزینی سه heuristic یا validation مستقل مطرح نیست. کار مرحله‌بندی شده است و برای تصمیم معمول طراحی درخواست تأیید دوباره نمی‌شود. merge انجام نمی‌شود.
