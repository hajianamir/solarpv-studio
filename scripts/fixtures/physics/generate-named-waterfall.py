"""Independent Decimal characterization of unchanged scalar loss composition.

No TypeScript imports, execution or production numerical outputs. The source
policy is the base-revision waterfall's named percentages, not an independently
validated physical loss model. Human-readable report text uses the pre-existing
text-contract template, which is not scientific evidence. Fixture verifies the
canonical-to-configured routing call, not weather/financial applicability.
"""
from decimal import Decimal as D, getcontext, ROUND_HALF_UP
from pathlib import Path
import json
getcontext().prec=50
OUT=Path(__file__).parent
FID='src/engine/core/annualYieldEngine.ts#computeCanonicalAnnualYield#2c3d77e814c1'
REF=dict(title='Independent Decimal scalar-waterfall routing characterization',url='https://github.com/hajianamir/solarpv-studio/blob/0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb/src/engine/waterfallLossEngine.ts',version='base 0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb; unchanged screening policy',locator='Sequential stage energy E_next=E_previous*(1+pct/100), zero tilt => zero transposition gain; first-year kWh, kWp, PSH, percentage points. Independent Decimal arithmetic only, not physical-model validation.')
def rounded(x,places=0):
    return float(x.quantize(D(1).scaleb(-places),rounding=ROUND_HALF_UP))
def result(cap,psh,loss):
    # No tracker, fixed tilt 0 degrees -> no transposition gain. Explicit signed
    # thermal loss makes temperature model immaterial to this arithmetic witness.
    pct=[D(x) for x in ['-2.4','-2.2','-4.5','0',str(-loss),'.4','-1.2','-1.3','-1.4','-.4','-.2','-2.2','-1.5','-1']]
    nominal=D(cap)*D(psh)*365
    energy=nominal
    compound=D(1)
    stages=[]
    for text,p in zip(json.loads((OUT/'reference-waterfall-text-contract.json').read_text()),pct):
        before=energy
        compound*=1+p/100
        energy=nominal*compound
        stages.append(dict(text,nominalEnergyKwh=rounded(before),percentageLoss=float(p),percentageLossRaw=float(p),stageOutputKwh=rounded(energy)))
    final=rounded(energy)
    report=dict(installedCapacityKwp=cap,rawGhiEnergyKwh=rounded(nominal),effectivePoaEnergyKwh=rounded(nominal),stages=stages,netAnnualEnergyExportMwh=rounded(energy/1000,1) if cap>0 else 0,specificAnnualYieldKwhPerKwp=rounded(energy/D(cap)) if cap>0 else 0,performanceRatioPct=rounded(compound*100,1) if nominal>0 else 0,finalEnergyKwh=final,compoundPerformanceRatioPct=rounded(compound*100,4),arithmeticSumLossPct=rounded(sum(pct),2))
    return dict(annualYieldKwh=final,netAnnualEnergyExportMwh=report['netAnnualEnergyExportMwh'],specificYieldKwhPerKwp=report['specificAnnualYieldKwhPerKwp'],effectiveYieldFactor=rounded(D(str(final))/nominal,6) if nominal>0 else 0,performanceRatioPct=report['performanceRatioPct'],compoundPerformanceRatioPct=report['compoundPerformanceRatioPct'],thermalDeratePctUsed=loss,clippingLossPctUsed=.2,waterfallReport=report)
cases=[]
for cap,psh,loss in [(100,5,-10),(1,2,0),(1000,6,10),(0,5,0),(100,0,0)]:
    i=dict(installedCapacityKwp=cap,peakSunHours=psh,ambientTempMaxC=40,tiltDeg=0,latitudeDeg=0,annualThermalDerateOverridePct=loss)
    cases.append(dict(inputs=[i],expected=result(cap,psh,loss)))
f=dict(schemaVersion=1,formulaId=FID,independentOfImplementation=True,productionExport='computeCanonicalAnnualYield',inputs=cases[0]['inputs'],expected=cases[0]['expected'],cases=cases,independentCalculation=__doc__,tolerances=dict(absolute=1e-7,relative=1e-12),referenceSource=REF)
file=OUT/'named-waterfall-decimal.json';file.write_text(json.dumps(f,ensure_ascii=False,indent=2)+'\n')
p=Path('scripts/physics-reference-evidence.json');m=json.loads(p.read_text());m['fixtures']=[r for r in m['fixtures'] if r['formulaId']!=FID]+[dict(formulaId=FID,fixtureFile=file.resolve().relative_to(Path.cwd()).as_posix(),productionExport=f['productionExport'],referenceTitle=REF['title'],referenceUrl=REF['url'],referenceVersion=REF['version'],referenceLocator=REF['locator'])];p.write_text(json.dumps(m,indent=2)+'\n')
