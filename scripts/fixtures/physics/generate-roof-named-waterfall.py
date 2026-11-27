"""Independent Decimal return oracle for the unchanged empty-scene roof policy.

No TypeScript imports/execution or numerical production outputs. Local scalar
stage constants are inherited screening assumptions, NOT validated site losses.
Day 1, latitude zero, integer solar hours 7..17 exceed one degree altitude;
6/18 are horizon. With stepDays365 each of those 11 samples weighs365 days.
Empty geometry means zero ray-traced table energy/loss; declared nonzero capacity
is intentionally inconsistent and must preserve the snapshot blocker. This
exercises nonzero waterfall transport without claiming a valid physical plant.
Report strings are API text contracts, not scientific reference evidence.
"""
from decimal import Decimal as D, getcontext, ROUND_HALF_UP
from pathlib import Path
import json
getcontext().prec=50
OUT=Path(__file__).parent
FID='src/engine/roof3dShadingEngine.ts#annualShadingSteps#a3427c625e63'
REF=dict(title='Independent Decimal roof-generator routing and empty-scene identities',url='https://github.com/hajianamir/solarpv-studio/blob/0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb/src/engine/roof3dShadingEngine.ts',version='base 0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb; unchanged local screening policy',locator='Empty scene: zero table energy/loss; equatorial day1 hours7..17 above 1 degree, weighted PSH integral; sequential Decimal retained-stage composition at zero tilt, NOCT45 and ambient -6.25C giving cell25C. Not whole-model geometry/weather validation.')
def rnd(x,places=0):return float(x.quantize(D(1).scaleb(-places),rounding=ROUND_HALF_UP))
def report(cap,psh):
    pct=[D(x) for x in ['0','-2.2','-4.5','0','0','.4','-1.2','-1.3','-1.4','-.4','-.2','-2.2','-1.5','-1']]
    nominal=D(str(cap))*D(str(psh))*365;energy=nominal;compound=D(1);stages=[]
    for text,p in zip(json.loads((OUT/'reference-waterfall-text-contract.json').read_text()),pct):
        before=energy;compound*=1+p/100;energy=nominal*compound
        text=dict(text)
        if text['id']=='thermal':
            text['descriptionFa']='کاهش توان سلول سیلیکونی در دمای کاری بیش از ۲۵ درجه استاندارد STC'
            text['descriptionEn']='Thermal degradation of silicon cells operating above standard STC 25°C rating.'
        stages.append(dict(text,nominalEnergyKwh=rnd(before),percentageLoss=float(p),percentageLossRaw=float(p),stageOutputKwh=rnd(energy)))
    return dict(installedCapacityKwp=cap,rawGhiEnergyKwh=rnd(nominal),effectivePoaEnergyKwh=rnd(nominal),stages=stages,netAnnualEnergyExportMwh=rnd(energy/1000,1) if cap>0 else 0,specificAnnualYieldKwhPerKwp=rnd(energy/D(str(cap))) if cap>0 else 0,performanceRatioPct=rnd(compound*100,1) if nominal>0 else 0,finalEnergyKwh=rnd(energy),compoundPerformanceRatioPct=rnd(compound*100,4),arithmeticSumLossPct=rnd(sum(pct),2))
TEXT=dict(methodologyDescription='Annual clear-sky optical ray-tracing screening proxy (isotropic diffuse and albedo transposition with multi-point substring mesh line-of-sight occlusion)',weatherDataSource='Estimated clear-sky proxy calibrated to site annual peak sun hours (PSH); not an empirical 8760-hour measured satellite TMY dataset',diffuseTranspositionAssumption='Sky diffuse and ground-reflected radiation assume unobstructed hemispherical view factor; geometric ray-tracing evaluates direct beam line-of-sight occlusion',energyBalanceNote='Energy accounting balance (E_unshaded = E_shaded + E_lost) verifies algorithmic arithmetic conservation only. It does not validate empirical transposition accuracy, circumsolar diffuse anisotropy, or non-linear multi-string mismatch behavior.',screeningNoticeFa='شاخص‌های سایه‌اندازی هندسی بر پایه تقریب تابش افقی آسمان صاف و شبکه چندنقطه‌ای ساب‌استرینگ محاسبه شده‌اند. این مقادیر شاخص غربالگری سایه هستند و مدل کامل جابجایی پرز، تلفات دمایی و برش اینورتر را در بر نمی‌گیرند.',screeningNoticeEn='Geometric shading indices evaluated using clear-sky horizontal proxy irradiance with multi-point substring mesh sampling. These represent relative optical screening indices and do not incorporate Perez diffuse transposition, cell temperature deratings, or inverter clipping.')
def case(cap,psh):
    scene=dict(anchorLocation=dict(latitude=0,longitude=51,elevationM=0),roofPlanes=[],obstacles=[],pvTables=[],updatedAt='2026-01-01T00:00:00Z',totalPvCapacityKwp=cap,tiltDeg=0)
    consistent=cap==0
    notes='Arithmetic balance verified across generation, unshaded baseline, and lost kWh. Diffuse and ground view factors are modeled under unobstructed hemispherical screening assumptions.'
    if not consistent:notes+=f' Capacity mismatch: declared {cap} kWp vs table sum 0.00 kWp.'
    status=dict(isArithmeticBalanceOk=True,isHeatmapAggregationConsistent=True,isComponentEnergyConsistent=True,isProjectSnapshotConsistent=consistent,overallReconciled=consistent,reconciliationNotes=notes)
    expected=dict(TEXT,sceneState=dict(scene,albedo=.2),simulationModeUsed='screening_3day',rawRayCastingStepsCount=11,totalEvaluatedDaylightHours=4015,annualGeometricBeamLossPct=0,annualElectricalMismatchLossPct=0,annualCombinedShadingLossPct=0,totalUnshadedAnnualKwh=0,totalShadedAnnualKwh=0,totalLostAnnualKwh=0,reconciliationDeltaKwh=0,tableHeatmap=[],isReconciled=consistent,reconciliationStatus=status,waterfallLossReport=report(cap,psh),targetAnnualHorizontalIrradiationKwhM2=psh*365,simulatedAnnualHorizontalIrradiationKwhM2=psh*365,pshIntegralConservationErrorPct=0,isEnergyConservationPreserved=True)
    return dict(inputs=[scene,psh,-6.25,dict(simulationMode='screening_3day',stepDays=365)],expected=expected)
cases=[case(c,p) for c,p in [(100,5),(1,2),(1000,6),(0,5)]]
f=dict(schemaVersion=1,formulaId=FID,independentOfImplementation=True,productionExport='annualShadingSteps',inputs=cases[0]['inputs'],expected=cases[0]['expected'],cases=cases,independentCalculation=__doc__,tolerances=dict(absolute=1e-7,relative=1e-12),referenceSource=REF)
file=OUT/'roof-named-waterfall-decimal.json';file.write_text(json.dumps(f,ensure_ascii=False,indent=2)+'\n')
p=Path('scripts/physics-reference-evidence.json');m=json.loads(p.read_text());m['fixtures']=[r for r in m['fixtures'] if r['formulaId']!=FID]+[dict(formulaId=FID,fixtureFile=file.resolve().relative_to(Path.cwd()).as_posix(),productionExport=f['productionExport'],referenceTitle=REF['title'],referenceUrl=REF['url'],referenceVersion=REF['version'],referenceLocator=REF['locator'])];p.write_text(json.dumps(m,indent=2)+'\n')
