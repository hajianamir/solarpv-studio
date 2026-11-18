"""Recompute fixtures with pvlib==0.13.1, not TypeScript application outputs.
Run from repo root: python scripts/fixtures/physics/generate-snow-0131.py
"""
import json
from pathlib import Path
import pandas as pd
import pvlib
assert pvlib.__version__=='0.13.1'
SOURCE=dict(title='pvlib.snow.coverage_nrel and dc_loss_nrel',url='https://pvlib-python.readthedocs.io/en/v0.13.1/_modules/pvlib/snow.html',version='pvlib-python 0.13.1',locator='coverage_nrel, fully_covered_nrel and dc_loss_nrel; roof/reference coefficients; ground-depth reset refinement; NREL/TP-6A20-67399 Eq.11.8 string assumption')
METHOD='Python pvlib==0.13.1 coverage_nrel with the explicit JSON geometry, weather and coefficients, then dc_loss_nrel with explicit parallel strings. Index is a regular timezone-aware UTC DatetimeIndex (inferable frequency). Snowfall is cm/interval, POA W/m2, ground depth cm; no TypeScript implementation output used. Additional expected metadata is an API contract, not a scientific reference. Reproduce with scripts/fixtures/physics/generate-snow-0131.py.'
def expected(req):
    p=req['parameters'];idx=pd.DatetimeIndex([s['timestamp'] for s in req['steps']]);series=lambda k:pd.Series([s[k] for s in req['steps']],index=idx)
    c=pvlib.snow.coverage_nrel(series('snowfallCm'),series('poaWm2'),series('ambientTempC'),p['tiltDeg'],snow_depth=series('groundSnowDepthCm'),initial_coverage=p['initialCoverageFraction'],threshold_snowfall=p['snowfallThresholdCmPerHour'],threshold_depth=p['groundDepthThresholdCm'],can_slide_coefficient=p['canSlideCoefficientWm2PerC'],slide_amount_coefficient=p['slideAmountCoefficientPerHour'])
    loss=pvlib.snow.dc_loss_nrel(c,p['parallelStringsAlongSlant'])
    return dict(modelId='snow_pvlib_nrel_0131_roof',modelVersion='1.0.0',referenceSoftware='pvlib-python 0.13.1',validationStatus='not_field_validated',units=dict(coverage='fraction of row slant height',loss='fraction of DC capacity',snowfall='cm/interval',depth='cm',poa='W/m2'),limitations='Roof/reference coefficients only; string partly covered means string capacity lost; complete regular data required; no structural or annual energy result',status='computed',quality=req['weatherQuality'],parameterQuality=req['parameterQuality'],timezone=req['timezone'],mounting=req['mounting'],period=dict(start=req['steps'][0]['timestamp'],end=req['steps'][-1]['timestamp']),appliedParameters=p,samples=[dict(timestamp=s['timestamp'],coverageFraction=float(v),dcCapacityLossFraction=float(l)) for s,v,l in zip(req['steps'],c,loss)])
if __name__=='__main__':
    for path in sorted(Path('scripts/fixtures/physics').glob('snow-0131-*.json')):
        obj=json.loads(path.read_text());obj['expected']=expected(obj['inputs'][0]);path.write_text(json.dumps(obj,indent=2)+'\n')

    data_path = Path('scripts/fixtures/physics/reference-timeseries-pvlib-0131.json')
    if data_path.exists():
        data = json.loads(data_path.read_text())
        for case in data['cases']:
            if case['kind'] == 'snow':
                case['expected'] = expected(case['input'])
        data_path.write_text(json.dumps(data, indent=2) + '\n')
