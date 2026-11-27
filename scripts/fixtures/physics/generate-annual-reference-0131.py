"""Independent reference: pvlib==0.13.1 outputs + sum(E*loss)/sum(E).
Recompute registered annual-reference-*.json fixtures from the repository root.
Metadata and report text are API contracts, not independent physics evidence.
"""
import json, importlib.util
from pathlib import Path
import pandas as pd
import pvlib
assert pvlib.__version__ == '0.13.1'
def load(kind):
    spec=importlib.util.spec_from_file_location(kind,Path(__file__).with_name('generate-'+kind+'-0131.py'))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
K,S=load('kimber'),load('snow')
def expected(req):
    # Candidate inputs here satisfy the public annual contract, except explicit negative tests.
    energy=[e['cleanDcEnergyWh'] for e in req['energy']]
    soil=K.expected(dict(req['soiling'],steps=[dict(s,unsoiledEnergyWh=e) for s,e in zip(req['soiling']['steps'],energy)])) if req.get('soiling') else None
    snow=S.expected(req['snow']) if req.get('snow') else None
    soil_loss=[s['lossFraction'] for s in soil['samples']] if soil else [0]*len(energy)
    snow_loss=[s['dcCapacityLossFraction'] for s in snow['samples']] if snow else [0]*len(energy)
    clean=sum(energy);remaining=[e*(1-l) for e,l in zip(energy,soil_loss)]
    after=sum(remaining);lost=sum(e*l for e,l in zip(remaining,snow_loss))
    if clean<=0 or (snow and after<=0):
        return dict(status='missing_or_unsupported',reason='No positive energy denominator for requested annual loss',soilingLossPct=None,snowLossPct=None,combinedLossPct=None,metadata=None)
    def meta(result):
        return {k:result[k] for k in ['modelId','modelVersion','quality','parameterQuality','timezone','units','limitations']}|dict(parameters=result['appliedParameters']) if result else None
    soil_meta=meta(soil)
    if soil_meta is not None:soil_meta['manualWashTimestamps']=req['soiling']['manualWashTimestamps']
    year=req['year'];idx=pd.DatetimeIndex([e['timestamp'] for e in req['energy']])
    return dict(status='computed',reason=None,soilingLossPct=sum(e*l for e,l in zip(energy,soil_loss))/clean*100 if soil else None,
      snowLossPct=lost/after*100 if snow else None,combinedLossPct=(clean-after+lost)/clean*100,
      metadata=dict(cleanEnergyWh=clean,afterSoilingEnergyWh=after,snowLostEnergyWh=lost,year=year,site=req['site'],energyQuality=req['energyQuality'],energySource=req['energySource'],periodStartUtc=f'{year}-01-01T00:00:00.000Z',periodEndUtc=f'{year+1}-01-01T00:00:00.000Z',intervalCount=len(energy),intervalHours=(idx[1]-idx[0]).total_seconds()/3600,coverage='complete_utc_calendar_year',aggregation='Soiling weighted by clean DC energy; snow weighted by post-soiling DC energy. Each replaces one waterfall loss stage. Other hourly loss interactions are not resolved.',validationStatus='not_field_validated',soiling=soil_meta,snow=meta(snow)))

def recompute_fixture(data):
    """Reproduce all integration fixtures; text templates are reporting contracts only."""
    args=data['inputs'];fn=data['productionExport']
    if fn=='evaluateAnnualReferenceLosses': return expected(args[0])
    if fn=='combineEnvironmentalLossPct': return (1-(1-args[0]/100)*(1-args[1]/100))*100
    if fn=='withReferenceLossMetadata': return dict(args[0],annualReference=expected(args[1]['annualReferenceLosses']))
    if fn=='buildWaterfallArgs':
        i=args[0];r=expected(i['annualReferenceLosses'])
        return [100,5,35,r['soilingLossPct'] if r['soilingLossPct'] is not None else 4.5,1.25,True,r['snowLossPct'] if r['snowLossPct'] is not None else 0,-2.2,45,-.3,i['trackerConfig'],i['installationEnv'],i['fixedTiltDeg'],i['latitudeDeg'],i['shadingLossOverridePct'],i['bifacialGainPct'],i['annualThermalDerateOverridePct']]
    if fn=='computeConfiguredWaterfall':
        assert args==[dict(installedCapacityKwp=0,peakSunHours=5,annualThermalDerateOverridePct=0)]
        # Zero plant -> zero energy. These percentages are unchanged explicit screening assumptions,
        # not validated losses. This fixture tests wrapper transport, not any new physical law.
        pct=dict(near_shading=-2.4,iam=-2.2,soiling=-4.5,snow=0,thermal=0,quality=.4,lid=-1.2,mismatch=-1.3,dc_cabling=-1.4,mppt_tracking=-.4,clipping=-.2,inverter_efficiency=-2.2,mv_transformer=-1.5,aux_unavailability=-1)
        stages=json.loads(Path(__file__).with_name('reference-waterfall-text-contract.json').read_text())
        compound=1
        for p in pct.values():compound*=1+p/100
        return dict(thermalInputQualification=json.loads(Path(__file__).with_name('thermal-origin-text-contract.json').read_text()),installedCapacityKwp=0,rawGhiEnergyKwh=0,effectivePoaEnergyKwh=0,stages=[dict(s,nominalEnergyKwh=0,percentageLoss=pct[s['id']],percentageLossRaw=pct[s['id']],stageOutputKwh=0) for s in stages],netAnnualEnergyExportMwh=0,specificAnnualYieldKwhPerKwp=0,performanceRatioPct=0,finalEnergyKwh=0,compoundPerformanceRatioPct=round(compound*100,4),arithmeticSumLossPct=round(sum(pct.values()),2))
    raise ValueError(fn)

if __name__=='__main__':
    for path in Path('scripts/fixtures/physics').glob('annual-reference-*.json'):
        data=json.loads(path.read_text());data['expected']=recompute_fixture(data)
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
