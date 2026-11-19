"""Recompute expected values using pvlib==0.13.1, never application outputs.
From repo root: python scripts/fixtures/physics/generate-kimber-0131.py
Requirements: pvlib==0.13.1. Inputs and selected expression IDs are in the JSONs.
The TS API uses explicit parameters; pandas timezone-aware interval ends are UTC.
"""
import json
from pathlib import Path
import pandas as pd
import pvlib
assert pvlib.__version__ == '0.13.1'
SOURCE = dict(title='pvlib.soiling.kimber',
    url='https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.soiling.kimber.html',
    version='pvlib-python 0.13.1', locator='pvlib/soiling.py@v0.13.1 kimber; rolling windows closed=right, strict rain threshold, initial loss, cap and manual wash')
METHOD = ('Generated independently with Python pvlib==0.13.1 soiling.kimber using the explicit JSON parameters and timezone-aware UTC timestamps. '
    'The first sample is initial_soiling; rainfall and grace windows are right-closed and cleaning uses strict >. '
    'Manual washes here are UTC-midnight sample timestamps, matching pvlib date semantics. '
    'Energy aggregation independently uses sum(pvlib_loss * unsoiledEnergyWh) / sum(unsoiledEnergyWh), not daily mean. '
    'The remaining expected metadata asserts the published application API contract; it is not scientific validation. '
    'Reproduce: python scripts/fixtures/physics/generate-kimber-0131.py. No TS engine imported or executed to compute expected values.')
def expected(req):
    p=req['parameters']; idx=pd.DatetimeIndex([s['timestamp'] for s in req['steps']])
    rain=pd.Series([s['rainfallMm'] for s in req['steps']],index=idx)
    wash=[pd.Timestamp(t).date() for t in req['manualWashTimestamps']]
    loss=pvlib.soiling.kimber(rain,cleaning_threshold=p['cleaningThresholdMm'],soiling_loss_rate=p['lossRatePerDay'],
        grace_period=p['gracePeriodDays'],max_soiling=p['maxLossFraction'],manual_wash_dates=wash,
        initial_soiling=p['initialLossFraction'],rain_accum_period=p['rainAccumulationHours'])
    complete=all(s.get('unsoiledEnergyWh') is not None for s in req['steps'])
    total=sum(s['unsoiledEnergyWh'] for s in req['steps']) if complete else 0
    weighted=sum(float(l)*s['unsoiledEnergyWh'] for l,s in zip(loss,req['steps']))/total if total>0 else None
    return dict(modelId='soiling_kimber_pvlib_0131',modelVersion='1.0.0',referenceSoftware='pvlib-python 0.13.1',
        validationStatus='not_field_validated',units=dict(loss='fraction',rainfall='mm/interval',energy='Wh'),
        limitations='Site parameters required; positive grace; regular intervals; no missing-rain inference; no annual claim without a full-year energy series',
        status='computed',quality=req['weatherQuality'],parameterQuality=req['parameterQuality'],timezone=req['timezone'],
        period=dict(start=req['steps'][0]['timestamp'],end=req['steps'][-1]['timestamp']),appliedParameters=p,
        samples=[dict(timestamp=s['timestamp'],lossFraction=float(l)) for s,l in zip(req['steps'],loss)],
        energyWeightedLossFraction=weighted,energyQuality='provided_complete' if complete and total>0 else 'missing_or_zero_weight')
if __name__=='__main__':
    for path in sorted(Path('scripts/fixtures/physics').glob('kimber-0131-*.json')):
        obj=json.loads(path.read_text()); obj['expected']=expected(obj['inputs'][0]);path.write_text(json.dumps(obj,indent=2)+'\n')

    data_path = Path('scripts/fixtures/physics/reference-timeseries-pvlib-0131.json')
    if data_path.exists():
        data = json.loads(data_path.read_text())
        for case in data['cases']:
            if case['kind'] == 'kimber':
                case['expected'] = expected(case['input'])
        data_path.write_text(json.dumps(data, indent=2) + '\n')
