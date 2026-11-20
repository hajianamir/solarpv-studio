"""Direct pvlib study v1. JSON stdin/stdout, no network or user-supplied code.
Scientific model contracts and sources: docs/audit/PVLIB-DIRECT-STUDY-DESIGN.fa.md.
"""
import sys
import json
import math
import hashlib
import platform
from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from importlib.metadata import version
import re

MAX_BYTES = 8 * 1024 * 1024
MAX_RECORDS = 17568
ENGINE_VERSION = '1.1.0'
MODELS = dict(solarPosition='nrel_numpy; delta_t=67 s; atmos_refract=0.5667 deg (fixed assumptions)', pressure='alt2pres standard atmosphere from altitude',
              transposition='haydavies', extraterrestrial='spencer; solar_constant=1366.1 W/m2', beamIam='ashrae',
              diffuseIam='unity assumption', temperature='sapm_cell', dc='pvwatts_dc',
              ac='pvwatts inverter (not SAM/PVWatts V8 equivalence)', spectral='unity assumption',
              energyIntegration='interval-average rectangular; solar geometry at interval midpoint')
LIMITATIONS = [
    'Not field validated, calibrated, bankable or a standards-conformity assessment.',
    'Fixed-tilt or single-axis monofacial single aggregate array and single aggregate inverter only; no string voltage/MPPT design.',
    'No horizon, near/electrical row shading, bifacial, snow, soiling, battery, grid curtailment or financial simulation.',
    'Fixed SPA delta_t=67 s and sunrise/sunset refraction 0.5667 deg are assumptions, not historical/forecast corrections.',
    'Diffuse IAM and spectral factors are unity assumptions; midpoint transposition does not eliminate interval-averaging error.',
    'SAPM wind must be at 10 m; mounting-specific coefficients and all equipment parameters are caller-declared.',
    'Additional DC loss is an explicit constant retained fraction, not a physical decomposition; no legacy waterfall losses are applied.',
    'Period energy is not annualized. No P50/P90 or field accuracy metrics are inferred.'
]

class InputError(ValueError):
    pass


def keys(value, required, label):
    if not isinstance(value, dict) or set(value) != set(required):
        raise InputError(f'{label}: exact required fields are {", ".join(required)}')


def number(value, lo, hi, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not lo <= value <= hi:
        raise InputError(f'{label}: finite number in [{lo}, {hi}] required')


def text(value, label, maximum=500):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise InputError(f'{label}: nonempty string, at most {maximum} characters required')


def timestamp(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)', value):
        raise InputError('weather timestamp requires ISO calendar datetime with explicit Z or signed offset')
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)
    except ValueError as error:
        raise InputError('invalid weather calendar timestamp') from error


def validate(req):
    keys(req, ['schemaVersion', 'label', 'site', 'system', 'weather', 'parameterProvenance'], 'study')
    if req['schemaVersion'] != 'pvlib-study-v1':
        raise InputError('unsupported study schemaVersion')
    text(req['label'], 'label', 200)
    site = req['site']
    keys(site, ['latitude', 'longitude', 'altitudeM', 'timezone'], 'site')
    for key, lo, hi in [('latitude', -90, 90), ('longitude', -180, 180), ('altitudeM', -500, 9000)]:
        number(site[key], lo, hi, 'site.'+key)
    text(site['timezone'], 'site.timezone', 100)
    try:
        ZoneInfo(site['timezone'])
    except (KeyError, ValueError) as error:
        raise InputError('valid IANA timezone required') from error
    system = req['system']
    bounds = dict(surfaceTiltDeg=(0, 90), surfaceAzimuthDeg=(0, 360), albedo=(0, 1), arrayPdc0W=(1, 1e9),
                  gammaPdcPerC=(-.01, 0), inverterPdc0W=(1, 1e9), inverterEtaNom=(.8, .995),
                  inverterEtaRef=(.8, 1), iamB=(0, 1), additionalDcLossPct=(0, 100))
    keys(system, [*bounds, 'temperature', *(['tracking'] if 'tracking' in system else [])], 'system')
    if 'tracking' in system:
        track = system['tracking']
        tracking_bounds = dict(axisTiltDeg=(0,90), axisAzimuthDeg=(0,360), maxAngleDeg=(0,90), gcr=(.01,1), crossAxisTiltDeg=(-30,30))
        keys(track, [*tracking_bounds, 'backtrack'], 'system.tracking')
        for key, (lo, hi) in tracking_bounds.items():
            number(track[key], lo, hi, 'tracking.'+key)
        if not isinstance(track['backtrack'], bool):
            raise InputError('tracking.backtrack: boolean required')
    for key, (lo, hi) in bounds.items():
        number(system[key], lo, hi, 'system.'+key)
    if system['arrayPdc0W']/system['inverterPdc0W'] > 2:
        raise InputError('study configuration supports array DC / inverter DC limit ratio <= 2 only')
    if system['inverterEtaRef'] != 0.9637:
        raise InputError('this model configuration requires PVWatts eta_inv_ref=0.9637')
    keys(system['temperature'], ['a', 'b', 'deltaT'], 'system.temperature')
    for key, lo, hi in [('a', -10, 0), ('b', -1, 0), ('deltaT', 0, 20)]:
        number(system['temperature'][key], lo, hi, 'temperature.'+key)
    prov = req['parameterProvenance']
    keys(prov, ['source', 'quality'], 'parameterProvenance')
    weather = req['weather']
    keys(weather, ['source', 'quality', 'windHeightM', 'timestampConvention', 'intervalMinutes', 'records'], 'weather')
    for obj in (prov, weather):
        text(obj['source'], 'provenance source')
        if obj['quality'] not in ('measured', 'weather_provider', 'user_configured', 'assumed'):
            raise InputError('explicit provenance quality required')
    if isinstance(weather['windHeightM'], bool) or weather['windHeightM'] != 10 or weather['timestampConvention'] != 'interval_end':
        raise InputError('10 m wind and interval_end average weather required')
    dt = weather['intervalMinutes']
    number(dt, 1, 60, 'intervalMinutes')
    if int(dt) != dt:
        raise InputError('integer intervalMinutes required')
    rows = weather['records']
    if not isinstance(rows, list) or not 2 <= len(rows) <= MAX_RECORDS:
        raise InputError(f'2..{MAX_RECORDS} regular records required')
    times = []
    for row in rows:
        keys(row, ['timestamp', 'ghiWm2', 'dniWm2', 'dhiWm2', 'tempAirC', 'windSpeedMs'], 'weather record')
        times.append(timestamp(row['timestamp']))
        for key in ('ghiWm2', 'dniWm2', 'dhiWm2'):
            number(row[key], 0, 2000, key)
        number(row['tempAirC'], -90, 70, 'tempAirC')
        number(row['windSpeedMs'], 0, 75, 'windSpeedMs')
    if any(b-a != timedelta(minutes=dt) for a, b in zip(times, times[1:])):
        raise InputError('unordered, duplicate, gapped or nonuniform timestamps')
    if (times[0]-timedelta(minutes=dt)).year < 1900 or times[-1].year > 2200 or times[-1]-times[0]+timedelta(minutes=dt) > timedelta(days=366):
        raise InputError('supported period: 1900..2200, at most 366 days')
    return times


def run_study(req):
    times = validate(req)
    for requirement in Path(__file__).with_name('requirements.txt').read_text().splitlines():
        name, pinned = requirement.split('==')
        if version(name) != pinned:
            raise RuntimeError('study dependency version mismatch')
    import numpy as np
    import pandas as pd
    import pvlib
    if pvlib.__version__ != '0.13.1':
        raise RuntimeError('pvlib version mismatch; install the pinned study requirements')
    site, s, w = req['site'], req['system'], req['weather']
    dt_hours = w['intervalMinutes']/60
    end = pd.DatetimeIndex(times)
    mid = end - pd.Timedelta(minutes=w['intervalMinutes']/2)
    df = pd.DataFrame(w['records'], index=mid)
    position = pvlib.solarposition.get_solarposition(mid, site['latitude'], site['longitude'], altitude=site['altitudeM'],
        pressure=pvlib.atmosphere.alt2pres(site['altitudeM']), temperature=df.tempAirC, method='nrel_numpy', delta_t=67.0, atmos_refract=0.5667)
    if ((position.apparent_zenith >= 90) & (df.dniWm2 > 0)).any():
        raise InputError('positive DNI below the midpoint apparent horizon is unsupported; review timestamp and weather')
    tilt = pd.Series(s['surfaceTiltDeg'], index=mid, dtype=float)
    azimuth = pd.Series(s['surfaceAzimuthDeg'], index=mid, dtype=float)
    tracker_columns = {}
    models = dict(MODELS, mounting='fixed_tilt')
    limitations = list(LIMITATIONS)
    if 'tracking' in s:
        track = s['tracking']
        geometry = pvlib.tracking.singleaxis(position.apparent_zenith, position.azimuth,
            axis_tilt=track['axisTiltDeg'], axis_azimuth=track['axisAzimuthDeg'],
            max_angle=track['maxAngleDeg'], backtrack=track['backtrack'],
            gcr=track['gcr'], cross_axis_tilt=track['crossAxisTiltDeg'])
        # Only model geometry is parked; no missing weather is filled here.
        daylight = position.apparent_zenith < 90
        theta = geometry.tracker_theta.where(daylight, 0.0)
        orientation = pvlib.tracking.calc_surface_orientation(theta,
            axis_tilt=track['axisTiltDeg'], axis_azimuth=track['axisAzimuthDeg'])
        tilt, azimuth = orientation['surface_tilt'], orientation['surface_azimuth']
        tracker_columns = dict(trackerThetaDeg=theta, trackerActive=daylight.astype(float))
        models['mounting'] = 'singleaxis; pvlib slope-aware backtracking if requested; night theta=0 axis-neutral park'
        limitations.extend([
            'Tracker is ideal parallel-row geometry only; no diffuse row masking, electrical shading/mismatch, terrain/layout verification or motor energy.',
            'No wind/snow stow, tracking error, slew-rate or structural control simulation; SAPM coefficients must suit moving open-rack mounting.',
            'Fixed surfaceTiltDeg/surfaceAzimuthDeg are inactive retained reference inputs in tracker mode; axis geometry controls modeled orientation.',
            'Night (midpoint zenith >=90 deg) uses theta=0 axis-neutral park, not necessarily a horizontal module on a tilted axis.'
        ])
        if not track['backtrack']:
            limitations.append('True-tracking has NO row-shading deduction; GCR and crossAxisTiltDeg are retained but inactive when backtracking is disabled.')
    poa = pvlib.irradiance.get_total_irradiance(tilt, azimuth, position.apparent_zenith,
        position.azimuth, df.dniWm2, df.ghiWm2, df.dhiWm2,
        dni_extra=pvlib.irradiance.get_extra_radiation(mid, method='spencer', solar_constant=1366.1), albedo=s['albedo'], model='haydavies')
    aoi = pvlib.irradiance.aoi(tilt, azimuth, position.apparent_zenith, position.azimuth)
    iam = pvlib.iam.ashrae(aoi, b=s['iamB'])
    effective = poa.poa_direct*iam + poa.poa_diffuse
    cell = pvlib.temperature.sapm_cell(poa.poa_global, df.tempAirC, df.windSpeedMs, irrad_ref=1000.0, **s['temperature'])
    raw_dc = pvlib.pvsystem.pvwatts_dc(effective, cell, s['arrayPdc0W'], s['gammaPdcPerC'], temp_ref=25)
    if (raw_dc < 0).any():
        raise InputError('PVWatts produced negative DC outside supported temperature/coefficient conditions')
    dc = raw_dc * (1-s['additionalDcLossPct']/100)
    ac = pvlib.inverter.pvwatts(dc, s['inverterPdc0W'], eta_inv_nom=s['inverterEtaNom'], eta_inv_ref=s['inverterEtaRef'])
    columns = dict(surfaceTiltDeg=tilt, surfaceAzimuthDeg=azimuth, **tracker_columns, solarZenithDeg=position.apparent_zenith, solarAzimuthDeg=position.azimuth, aoiDeg=aoi,
        beamIam=iam, poaDirectWm2=poa.poa_direct, poaSkyDiffuseWm2=poa.poa_sky_diffuse,
        poaGroundDiffuseWm2=poa.poa_ground_diffuse, poaGlobalWm2=poa.poa_global,
        effectiveIrradianceWm2=effective, cellTemperatureC=cell, dcBeforeAdditionalLossW=raw_dc, dcW=dc, acW=ac)
    if not all(np.isfinite(values).all() for values in columns.values()):
        raise InputError('nonfinite model output; unsupported input combination')
    energy = pd.DataFrame(dict(dcBeforeAdditionalLossWh=raw_dc*dt_hours, dcWh=dc*dt_hours, acWh=ac*dt_hours), index=mid)
    monthly = energy.groupby(mid.strftime('%Y-%m')).sum()
    warnings = ['All provenance quality labels are caller declarations, not independently verified sources.']
    closure = (df.ghiWm2-(df.dniWm2*np.maximum(0, np.cos(np.radians(position.apparent_zenith)))+df.dhiWm2)).abs()
    if (closure > 100).any():
        warnings.append('Irradiance component closure differs by >100 W/m2 at some interval midpoints; inputs retained without correction. Threshold is a diagnostic, not a validation criterion.')
    start = times[0]-timedelta(minutes=w['intervalMinutes'])
    annual = (start.month, start.day, start.hour, start.minute, start.second, start.microsecond)==(1,1,0,0,0,0) and times[-1]==datetime(start.year+1,1,1,tzinfo=timezone.utc)
    if not annual:
        warnings.append('Partial/non-calendar-year coverage: period totals only, not annualized.')
    request_bytes = json.dumps(req, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()
    dependencies = {name:version(name) for name in ('pvlib','numpy','pandas','scipy','h5py','requests','pytz','tzdata','python-dateutil','six','certifi','charset-normalizer','idna','urllib3')}
    def iso(t):
        return t.isoformat().replace('+00:00', 'Z')
    return dict(schemaVersion='pvlib-study-result-v1', status='completed', engine='pvlib-python-direct',
        manifest=dict(engineVersion=ENGINE_VERSION, models=models, validationStatus='not_field_validated',
            inputSha256=hashlib.sha256(request_bytes).hexdigest(), workerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            requirementsSha256=hashlib.sha256(Path(__file__).with_name('requirements.txt').read_bytes()).hexdigest(),
            python=platform.python_version(), platform=platform.platform(), dependencies=dependencies,
            period=dict(startUtc=iso(start),endUtc=iso(times[-1]),intervalMinutes=w['intervalMinutes'],intervalCount=len(times),
                        completeUtcCalendarYear=annual, monthlyAllocation='interval midpoint UTC month'),
            units=dict(irradiance='W/m2',power='W',energy='Wh',temperature='degC',angles='degrees; azimuth clockwise from north',
                **(dict(trackerActive='dimensionless daylight command flag (0/1), not equipment availability') if 'tracking' in s else {})),
            limitations=limitations, warnings=warnings),
        request=req, summary={key:float(energy[key].sum()) for key in energy},
        monthly=[dict(month=month,**{key:float(v) for key,v in row.items()}) for month,row in monthly.iterrows()],
        samples=[dict(timestamp=original['timestamp'], midpointUtc=iso(mid[i]), **{key:float(val.iloc[i]) for key,val in columns.items()}) for i,original in enumerate(w['records'])])


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise InputError('duplicate JSON key')
        result[key] = value
    return result


def main():
    try:
        raw = sys.stdin.buffer.read(MAX_BYTES+1)
        if len(raw)>MAX_BYTES:
            raise InputError('input exceeds 8 MiB')
        req = json.loads(raw, object_pairs_hook=no_duplicates, parse_constant=lambda value: (_ for _ in ()).throw(InputError('nonfinite JSON')))
        result = run_study(req)
        print(json.dumps(result, allow_nan=False, separators=(',', ':')))
    except (InputError, json.JSONDecodeError, UnicodeDecodeError) as error:
        print(json.dumps(dict(status='invalid_input',message=str(error))))
        return 2
    except (ImportError, RuntimeError) as error:
        print(json.dumps(dict(status='unavailable',message=str(error))))
        return 3
    except Exception:
        print(json.dumps(dict(status='failed',message='Study failed; no screening fallback was applied')))
        return 4
    return 0

if __name__ == '__main__':
    sys.exit(main())
