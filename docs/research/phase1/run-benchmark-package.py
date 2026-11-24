"""Research W/L tracks only. Never imports or modifies the product engine."""
import hashlib
import io
import json
import platform
import scipy
from datetime import timezone, timedelta
from pathlib import Path
import numpy as np
import pandas as pd
import pvlib
from pvlib import iotools, irradiance, temperature, pvarray, pvsystem, inverter

BASE = Path('docs/research/phase1')
OUT = Path('docs/audit/PHASE1-BENCHMARK-RESULTS.json')

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def metrics(pred, truth, ref):
    error = np.asarray(pred) - np.asarray(truth)
    assert np.isfinite(error).all()
    return dict(rmse_W=float(np.sqrt(np.mean(error**2))), mae_W=float(np.mean(np.abs(error))),
                bias_W=float(np.mean(error)), nrmse_stc=float(np.sqrt(np.mean(error**2))/ref), n=len(error))

def lab_case(asset):
    text = Path(asset['localPath']).read_text(encoding='utf-8-sig')
    start = text.index('seqno,date,temperature,irradiance,')
    frame = pd.read_csv(io.StringIO(text[start:]))
    cols = ['temperature', 'irradiance', 'p_mp']
    assert np.isfinite(frame[cols]).all().all()
    assert (frame[['irradiance', 'p_mp']] > 0).all().all()
    assert not frame[['temperature', 'irradiance']].duplicated().any()
    holdout = frame.irradiance.isin([600, 800])
    train, test = frame[~holdout], frame[holdout]
    stc = train[(train.temperature == 25) & (train.irradiance == 1000)]
    assert len(stc) == 1 and len(train) >= 6 and len(test) > 0
    ref = float(stc.p_mp.iloc[0])
    g, dt = train.irradiance.to_numpy()/1000, train.temperature.to_numpy()-25
    # P = a*g + b*g*(T-25); no heldout power enters either model fit.
    ab, _, rank, _ = np.linalg.lstsq(np.column_stack([g, g*dt]), train.p_mp, rcond=None)
    assert rank == 2 and ab[0] > 0
    eta = train.p_mp / (ref*g)
    adr = pvarray.fit_pvefficiency_adr(train.irradiance, train.temperature, eta)
    models = {}
    for name in ['pvwatts_form_fit', 'adr_fit']:
        scores = {}
        for label, df in [('train', train), ('holdout', test)]:
            gg = df.irradiance.to_numpy()/1000
            if name == 'pvwatts_form_fit':
                pred = gg*(ab[0] + ab[1]*(df.temperature.to_numpy()-25))
            else:
                pred = ref*gg*pvarray.pvefficiency_adr(df.irradiance, df.temperature, **adr)
            scores[label] = metrics(pred, df.p_mp, ref)
        models[name] = scores
    tech = next((line.split(':', 1)[1].strip() for line in text.splitlines() if line.strip().startswith('Technology:')), 'unknown')
    return dict(module=Path(asset['path']).stem, technology=tech, rows=len(frame), trainRows=len(train),
                holdoutRows=len(test), trainingStc_W=ref,
                irradianceRange=[int(frame.irradiance.min()), int(frame.irradiance.max())],
                temperatureRange=[float(frame.temperature.min()), float(frame.temperature.max())],
                parametersNotAdopted=True, models=models)

def weather_case(asset):
    path = Path(asset['localPath'])
    name = asset['path'].split('/')[-1]
    if name.endswith('.tm2'):
        raw, meta = iotools.read_tmy2(path)
        frame = raw[['GHI', 'DNI', 'DHI', 'DryBulb', 'Wspd']].copy()
        frame.columns = ['ghi', 'dni', 'dhi', 'temp_air', 'wind_speed']
        frame[['temp_air', 'wind_speed']] /= 10
        months, days, hours = raw.month, raw.day, raw.hour
        city = meta['City']
        temporal = 'TMY2 raw hour 1..24: preceding hour, midpoint hour-0.5; raw radiation Wh/m2 over 1 h -> numerical W/m2 mean'
    elif name.endswith('.epw'):
        raw, meta = iotools.read_epw(path)
        frame = raw[['ghi', 'dni', 'dhi', 'temp_air', 'wind_speed']].copy()
        months, days, hours = raw.month, raw.day, raw.hour
        city = meta['city']
        temporal = 'EPW raw hour 1..24: preceding hour, midpoint hour-0.5; raw radiation Wh/m2 over 1 h -> numerical W/m2 mean'
    else:
        raw, meta = iotools.read_tmy3(path)
        frame = raw[['ghi', 'dni', 'dhi', 'temp_air', 'wind_speed']].copy()
        source_dates = pd.to_datetime(raw['Date (MM/DD/YYYY)'])
        months, days = source_dates.dt.month, source_dates.dt.day
        hours = raw['Time (HH:MM)'].str.split(':').str[0].astype(int)
        city = meta['Name']
        temporal = 'TMY3 raw hour 1..24: preceding hour, midpoint hour-0.5; radiation Wh/m2 over 1 h -> numerical W/m2 mean'
    assert len(raw) == 8760
    assert hours.between(1, 24).all()
    local_zone = timezone(timedelta(hours=float(meta['TZ'])))
    starts = pd.to_datetime({'year': np.repeat(2001, len(raw)), 'month': np.asarray(months), 'day': np.asarray(days)})
    index = pd.DatetimeIndex(starts + pd.to_timedelta(np.asarray(hours)-0.5, unit='h')).tz_localize(local_zone)
    assert index.is_unique and index.is_monotonic_increasing
    assert (np.diff(index.asi8) == 3600*10**9).all()
    native = raw.index
    frame.index = index
    qc = dict(missing={c: int(frame[c].isna().sum()) for c in frame},
              negativeIrradiance={c: int((frame[c]<0).sum()) for c in ['ghi','dni','dhi']},
              invalidRange={c: int((~frame[c].between(*bounds)).sum()) for c, bounds in
                            {'ghi':(0,2000),'dni':(0,2000),'dhi':(0,2000),'temp_air':(-100,70),'wind_speed':(0,100)}.items()},
              nativeIndexMonotonic=bool(native.is_monotonic_increasing),
              nativeDuplicateTimestamps=int(native.duplicated().sum()),
              canonicalIndexUnique=True, canonicalHourly=True,
              canonicalFirstTimestamp=index[0].isoformat(), canonicalLastTimestamp=index[-1].isoformat())
    # Strict: any missing/sentinel/range violation blocks THIS illustrative scenario only.
    valid = all(v == 0 for group in ['missing','negativeIrradiance','invalidRange'] for v in qc[group].values())
    result = dict(file=name, city=city, latitude=float(meta['latitude']), longitude=float(meta['longitude']),
                  timezoneOffsetHours=float(meta['TZ']), rows=len(raw), calendar='synthetic typical year 2001; NOT measured chronology',
                  timestampContract=temporal, qc=qc, temperatureRange_C=[float(frame.temp_air.min()),float(frame.temp_air.max())],
                  windRange_ms=[float(frame.wind_speed.min()),float(frame.wind_speed.max())],
                  ghi_kWh_m2=float(frame.ghi.sum()/1000), modelScenarioStatus='not_run_invalid_weather' if not valid else 'run',
                  measuredPVTruth=False)
    if not valid:
        return result
    site = pvlib.location.Location(meta['latitude'], meta['longitude'], tz=float(meta['TZ']), altitude=meta['altitude'])
    sun = site.get_solarposition(index)
    diagnostic_mask = (sun.apparent_zenith < 85) & (frame.ghi > 50)
    residual = (frame.dhi + frame.dni*np.cos(np.deg2rad(sun.apparent_zenith)) - frame.ghi)[diagnostic_mask]
    result['irradianceClosureDiagnostic'] = dict(n=len(residual), rmse_W_m2=float(np.sqrt(np.mean(residual**2))),
        bias_W_m2=float(np.mean(residual)), status='diagnostic_only_not_acceptance',
        caveat='hourly averages versus midpoint solar geometry; closure alone cannot rule out correlated sensor faults')
    poa = irradiance.get_total_irradiance(abs(meta['latitude']), 180, sun.apparent_zenith, sun.azimuth,
                                        frame.dni, frame.ghi, frame.dhi, albedo=0.2, model='isotropic').poa_global
    assert np.isfinite(poa).all() and (poa >= 0).all()
    temps = {'faiman': temperature.faiman(poa, frame.temp_air, frame.wind_speed),
             'sapm_open_rack_glass_polymer': temperature.sapm_cell(poa, frame.temp_air, frame.wind_speed,
                 **temperature.TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_polymer'])}
    ac = {}
    for label, temp in temps.items():
        pdc = pvsystem.pvwatts_dc(poa, temp, 1000, -0.004)
        pac = inverter.pvwatts(pdc, 1000)
        assert np.isfinite(pac).all() and (pac >= 0).all() and (pac <= 960+1e-9).all()
        ac[label] = float(pac.sum()/1000)  # W * 1 h / 1000 = kWh
    result['illustrativeAC_kWh_per_1kWdc'] = ac
    result['thermalChoiceSensitivity_percent'] = 100*(ac['sapm_open_rack_glass_polymer']/ac['faiman']-1)
    result['notFieldValidated'] = True
    return result

def main():
    assert pvlib.__version__ == '0.13.1'
    manifest = json.loads(Path('docs/audit/PHASE1-BENCHMARK-ASSETS.json').read_text())
    for asset in manifest['assets']:
        raw = Path(asset['localPath']).read_bytes()
        assert len(raw) == asset['bytes'] and digest(asset['localPath']) == asset['sha256']
    weather, lab = [], []
    for asset in manifest['assets']:
        if '/modules/' in asset['path']:
            lab.append(lab_case(asset))
        elif asset['path'].endswith(('.tm2','.epw','.CSV','.csv')):
            weather.append(weather_case(asset))
    assert len(lab) == 20 and len(weather) == 4
    results = dict(schemaVersion=1, scope='reference research W/L only; NOT product/annual field validation',
                   pvlibVersion=pvlib.__version__, runtime=dict(python=platform.python_version(), numpy=np.__version__, pandas=pd.__version__, scipy=scipy.__version__),
                   runnerSha256=digest(__file__), manifestSha256=digest('docs/audit/PHASE1-BENCHMARK-ASSETS.json'),
                   protocolSha256=digest(BASE/'BENCHMARK-PROTOCOL.json'),
                   verifiedFiles=len(manifest['assets']), weather=weather, laboratory=lab,
                   measuredFieldTrack=dict(status='NOT_EXECUTED', reason='original multi-climate field binary data unavailable'),
                   empiricalAccuracyAcceptance='NOT_ASSIGNED: no invented universal threshold')
    OUT.write_text(json.dumps(results, indent=2, allow_nan=False)+'\n')
    print(f'Integrity {len(manifest["assets"])} PASS; weather {len(weather)}; lab modules {len(lab)}')
    for case in weather:
        print(case['city'], case['modelScenarioStatus'], case.get('illustrativeAC_kWh_per_1kWdc'))
    for model in ['pvwatts_form_fit','adr_fit']:
        values=[case['models'][model]['holdout']['nrmse_stc'] for case in lab]
        print(model,'holdout nRMSE/STC min median max',np.min(values),np.median(values),np.max(values))

if __name__ == '__main__':
    main()
