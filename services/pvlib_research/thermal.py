"""Isolated back-of-module research tools. Never feeds StudyResult/finance.

DTU v3: DOI 10.11583/DTU.13580759.v3. No missing-data or wind-height inference.
"""
from __future__ import annotations
import os
import tempfile
import csv
import hashlib
import io
from importlib.metadata import version
import json
import math
import subprocess
import sys
import time
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

DTU_MD5 = 'b18a679dbeccafb1ff0d33b4262778e5'
METEO = ['Date (MM/DD/YYYY)', 'Time (HH:MM)', 'GHI (W/m2)', 'GHI uncert (%)', 'DNI (W/m2)', 'DNI uncert (%)', 'DHI (W/m2)', 'DHI uncert (%)', 'Dry-bulb (C)', 'RHum (%)', 'Wspd (m/s)']
VALIDATION = ['Month', 'Day', 'Hour', 'Date', 'PV Module Type', 'Mounting Structure', 'Tracker ID', 'Filter 1', 'Filter 2', 'Filter 3', 'Filter 4', 'Data Point Used in Publication', 'GHI (W/m2)', 'Solar Zenith Angle (°)', 'Solar Azimuth Angle (°)', 'Gpoa Rear Pyranometer Measured (W/m2)', 'Gpoa Front Measured (W/m2)', 'DC Pmp Measured (W)', 'Tmod Measured (°C)']
FIELDS = ['timestamp', 'poaWm2', 'tempAirC', 'windSpeedMs', 'moduleBackC', 'used', 'filter1', 'filter2', 'filter3', 'filter4']


def number(v, lo, hi):
    if isinstance(v, bool) or not isinstance(v, (float, int)) or not math.isfinite(v) or not lo <= v <= hi:
        raise ValueError(f'Finite number in [{lo},{hi}] required: {v!r}')
    return float(v)


def stamp(v):
    if not isinstance(v, str):
        raise ValueError('Explicit UTC/offset timestamp required')
    d = datetime.fromisoformat(v.replace('Z', '+00:00'))
    if d.tzinfo is None or d.utcoffset() is None:
        raise ValueError('Explicit UTC/offset timestamp required')
    return d.astimezone(timezone.utc)


def local_end(day, hour):
    """Workbook CET(GMT+1), fixed offset, NOT Europe/Copenhagen DST."""
    if isinstance(day, datetime):
        day = day.date()
    if isinstance(day, str):
        day = date.fromisoformat(day)
    if not isinstance(day, date) or isinstance(hour, bool) or not isinstance(hour, (int, float)) or hour != int(hour) or not 1 <= hour <= 24:
        raise ValueError('Workbook date and integer hour 1..24 required')
    return (datetime.combine(day, datetime.min.time(), timezone(timedelta(hours=1))) + timedelta(hours=int(hour))).astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def digest(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def yes(v):
    if v not in ('Yes', 'No'):
        raise ValueError('Explicit Yes/No quality flag required')
    return v == 'Yes'


def assemble(meteo, validation, receipt):
    weather = {}
    for row in meteo:
        t = local_end(row[0], row[1])
        if t in weather:
            raise ValueError('Duplicate meteorological interval')
        weather[t] = row
    records, seen = [], set()
    for r in validation:
        if r[6] != 'T7':
            continue  # Other systems have no measured module temperature.
        if r[4:6] != ['Monofacial', 'HSAT']:
            raise ValueError('T7 must be Monofacial / HSAT')
        t = local_end(r[3], r[2])
        if t in seen:
            raise ValueError('Duplicate T7 interval')
        seen.add(t)
        day = date.fromisoformat(r[3]) if isinstance(r[3], str) else r[3]
        if number(r[0],1,12) != day.month or number(r[1],1,31) != day.day:
            raise ValueError('Month/day/date mismatch')
        flags = [yes(x) for x in r[7:12]]
        w = weather.get(t)
        reasons = []
        if not all(flags):
            reasons.append('publisher_quality_filter')
        if w is None:
            reasons.append('unpaired_meteorology')
        try:
            poa = number(r[16], 0, 2000)
            temp = number(r[18], -100, 150)
            air = number(w[8], -100, 100) if w else None
            wind = number(w[10], 0, 100) if w else None
        except ValueError:
            poa = temp = air = wind = None
            reasons.append('missing_or_invalid_numeric')
        # Publisher encodes some unavailable/night intervals as all-zero rows.
        if w is not None and all(x == 0 for x in w[2:]):
            reasons.append('publisher_all_zero_sentinel')
        records.append(dict(timestamp=t, poaWm2=poa, tempAirC=air, windSpeedMs=wind,
                            moduleBackC=temp, used=flags[4], filter1=flags[0], filter2=flags[1],
                            filter3=flags[2], filter4=flags[3], eligible=not reasons, reasons=reasons))
    if not records:
        raise ValueError('No T7 records; header or dataset mismatch')
    return dataset(records, receipt)


def dataset(records, receipt):
    out = dict(schemaVersion='module-back-research-data-v1', parserVersion='1.0.0', target='back_of_module',
               statistic='interval_mean', intervalMinutes=60, poaBasis='measured_front_poa',
               windHeightM=None, windHeightSource=None, receipt=receipt,
               records=sorted(records, key=lambda r: stamp(r['timestamp'])))
    out['dataSha256'] = digest(out)
    return out


def parse_xlsx(path):
    """Requires original bytes; refuses another version, no name/position guessing."""
    import openpyxl
    raw = Path(path).read_bytes()
    if len(raw) > 16_000_000:
        raise ValueError('Workbook exceeds 16 MB')
    if hashlib.md5(raw).hexdigest() != DTU_MD5:
        raise ValueError('Original DTU v3 MD5 mismatch; another version is not accepted')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        if sum(i.file_size for i in z.infolist()) > 128_000_000:
            raise ValueError('Workbook expansion exceeds 128 MB')
    wb = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True, keep_links=False)
    try:
        tables = {}
        for sheet in wb:
            target = None
            for i, values in enumerate(sheet.iter_rows(values_only=True)):
                r = list(values)
                if target is None:
                    if r[:len(METEO)] == METEO:
                        target = 'meteo'
                    elif r[:len(VALIDATION)] == VALIDATION:
                        target = 'validation'
                    elif i > 150:
                        break
                    else:
                        continue
                    if target in tables:
                        raise ValueError('Ambiguous duplicate table headers')
                    tables[target] = []
                elif any(v is not None for v in r):
                    tables[target].append(r[:len(METEO) if target == 'meteo' else len(VALIDATION)])
                    if len(tables[target]) > 36000:
                        raise ValueError('Too many table records')
        if set(tables) != {'meteo', 'validation'}:
            raise ValueError('Exact DTU v3 headers/units required; no automatic mapping')
        return assemble(tables['meteo'], tables['validation'], dict(kind='original_xlsx', sha256=hashlib.sha256(raw).hexdigest(), md5=DTU_MD5, bytes=len(raw), doi='10.11583/DTU.13580759.v3'))
    finally:
        wb.close()


def parse_excerpt(path):
    """Explicit transcribed tool-rendered subset, NEVER an original XLSX receipt."""
    raw = Path(path).read_bytes()
    if len(raw) > 1_000_000:
        raise ValueError('Excerpt exceeds 1 MB')
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8')))
    if reader.fieldnames != FIELDS:
        raise ValueError('Exact excerpt headers required')
    records, seen = [], set()
    for r in reader:
        stamp(r['timestamp'])
        key = stamp(r['timestamp']).isoformat()
        if key in seen:
            raise ValueError('Duplicate interval')
        seen.add(key)
        flags = {k: yes(r[k]) for k in FIELDS[5:]}
        values = {k: number(float(r[k]), *bounds) for k, bounds in [('poaWm2', (0, 2000)), ('tempAirC', (-100, 100)), ('windSpeedMs', (0, 100)), ('moduleBackC', (-100, 150))]}
        records.append(dict(timestamp=r['timestamp'], **values, **flags, eligible=all(flags.values()), reasons=[] if all(flags.values()) else ['publisher_quality_filter']))
    if not records:
        raise ValueError('Empty excerpt')
    return dataset(records, dict(kind='tool_rendered_excerpt', sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw), doi='10.11583/DTU.13580759.v3', originalBytesVerified=False))


def operational_blockers(data):
    reasons = []
    if data.get('target') != 'back_of_module':
        reasons.append('explicit_back_of_module_target_required')
    if data.get('receipt', {}).get('kind') != 'original_xlsx':
        reasons.append('original_xlsx_receipt_unavailable')
    if data.get('windHeightM') is None or not data.get('windHeightSource'):
        reasons.append('wind_sensor_installation_height_unverified')
    reasons += ['sensor_calibration_and_independent_engineering_review_pending']
    return reasons


def predict(rows, u0, u1, timeout=10, cancel=lambda: False):
    """Isolated worker with deterministic EOF and bounded disk-backed capture.

    Unlike timed communicate(input=...), polling cannot strand partially sent
    stdin. Deadline/cancellation and cleanup remain authoritative; no fallback.
    """
    payload = json.dumps(dict(target='back_of_module', u0=u0, u1=u1, rows=rows)).encode()
    if len(payload) > 16 * 1024 * 1024:
        raise ValueError('Thermal worker input budget exceeded')
    deadline = time.monotonic() + timeout
    with tempfile.TemporaryFile() as incoming, tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        incoming.write(payload)
        incoming.seek(0)
        p = subprocess.Popen([sys.executable, '-I', '-B', str(Path(__file__).with_name('thermal_worker.py'))], stdin=incoming, stdout=out, stderr=err)
        try:
            while True:
                if cancel():
                    raise RuntimeError('Cancelled during worker execution')
                left = deadline - time.monotonic()
                if left <= 0:
                    raise TimeoutError('Thermal worker timeout')
                if os.fstat(out.fileno()).st_size > 4 * 1024 * 1024 or os.fstat(err.fileno()).st_size > 65536:
                    raise RuntimeError('Thermal worker output budget exceeded')
                try:
                    p.wait(timeout=min(.05, left))
                    break
                except subprocess.TimeoutExpired:
                    pass
            if os.fstat(out.fileno()).st_size > 4 * 1024 * 1024 or os.fstat(err.fileno()).st_size > 65536:
                raise RuntimeError('Thermal worker output budget exceeded')
            if p.returncode:
                raise RuntimeError('Thermal worker failed; no fallback')
            out.seek(0)
            result = json.loads(out.read(), parse_constant=lambda v: (_ for _ in ()).throw(ValueError('Nonfinite worker JSON')))['moduleBackC']
            if not isinstance(result, list) or len(result) != len(rows) or not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in result):
                raise ValueError('Invalid thermal worker output')
            return result
        finally:
            if p.poll() is None:
                p.kill()
            p.wait()


def metrics(observed, modeled):
    if not observed:
        return None
    errors = [m-y for y, m in zip(observed, modeled)]
    return dict(n=len(errors), mbe=math.fsum(errors)/len(errors), rmse=math.sqrt(math.fsum(e*e for e in errors)/len(errors)), mae=math.fsum(abs(e) for e in errors)/len(errors))


def fit_research(data, plan, runner=predict, cancel=lambda: False):
    """Bounded grid research only; no engineering approval, energy or cell promotion."""
    import numpy as np
    required = {'train', 'holdout', 'u0Bounds', 'u1Bounds', 'baseline', 'gridPoints', 'rounds', 'maxEvaluations', 'timeoutSeconds', 'minPairs', 'minPoaWm2', 'source'}
    if set(plan) != required or not isinstance(plan['source'], str) or not plan['source'].strip():
        raise ValueError('Exact sourced research plan required')
    windows = []
    for key in ('train', 'holdout'):
        a, b = map(stamp, plan[key])
        if a >= b:
            raise ValueError('Window start must precede end')
        windows.append((a, b))
    if windows[0][1] > windows[1][0]:
        raise ValueError('Train must precede disjoint holdout')
    bounds = []
    for key, lo in [('u0Bounds', .1), ('u1Bounds', 0)]:
        if len(plan[key]) != 2:
            raise ValueError('Two bounds required')
        a, b = [number(v, lo, 200 if key == 'u0Bounds' else 100) for v in plan[key]]
        if a >= b:
            raise ValueError('Increasing bounds required')
        bounds.append((a, b))
    for k, lo, hi in [('gridPoints', 3, 15), ('rounds', 1, 5), ('maxEvaluations', 1, 1000), ('minPairs', 2, 10000)]:
        v = number(plan[k], lo, hi)
        if v != int(v):
            raise ValueError('Integer plan value required')
    timeout = number(plan['timeoutSeconds'], .001, 1800)
    min_poa = number(plan['minPoaWm2'], 0, 1500)
    base = plan['baseline']
    if len(base) != 2 or any(not a <= number(v, a, b) <= b for v, (a, b) in zip(base, bounds)):
        raise ValueError('Baseline inside declared bounds required')
    if data.get('target') != 'back_of_module' or data.get('poaBasis') != 'measured_front_poa' or data.get('intervalMinutes') != 60:
        raise ValueError('Explicit module-back measured-POA hourly data required')
    if digest({k:v for k,v in data.items() if k != 'dataSha256'}) != data.get('dataSha256'):
        raise ValueError('Dataset integrity mismatch')
    selected = []
    for a, b in windows:
        selected.append([r for r in data['records'] if r['eligible'] and r['poaWm2'] >= min_poa and a <= stamp(r['timestamp'])-timedelta(minutes=30) < b])
    train, holdout = selected
    if any(len(rows) < plan['minPairs'] for rows in selected):
        raise ValueError('Insufficient valid pairs; no fill')
    x = np.array([[r['poaWm2'], r['tempAirC'], r['windSpeedMs']] for r in train])
    y = [r['moduleBackC'] for r in train]
    cache, start = {}, time.monotonic()
    worker_calls = 0
    def check():
        if cancel():
            raise RuntimeError('Cancelled; no partial fit accepted')
        if time.monotonic()-start > timeout:
            raise TimeoutError('Research wall-time budget exceeded')
    def execute(rows, u0, u1):
        nonlocal worker_calls
        check()
        if worker_calls >= plan['maxEvaluations']:
            raise RuntimeError('Worker evaluation budget exceeded')
        worker_calls += 1
        answer = (runner(rows,u0,u1,timeout=min(10,timeout-(time.monotonic()-start)),cancel=cancel)
                  if runner is predict else runner(rows,u0,u1))
        check()
        if len(answer) != len(rows) or not all(isinstance(v,(int,float)) and math.isfinite(v) for v in answer):
            raise ValueError('Invalid worker output')
        return answer
    def objective(u0, u1):
        check()
        key = (float(u0), float(u1))
        if key not in cache:
            if len(cache) >= plan['maxEvaluations']:
                raise RuntimeError('Candidate budget exceeded; no partial fit accepted')
            predicted = execute(train, *key)
            if len(predicted) != len(train) or not all(math.isfinite(v) for v in predicted):
                raise ValueError('Invalid worker output')
            check()
            cache[key] = metrics(y, predicted)['rmse']
        return cache[key]
    best = tuple(base)
    objective(*best)
    search = bounds[:]
    for _ in range(plan['rounds']):
        for a in np.linspace(*search[0], int(plan['gridPoints'])):
            for b in np.linspace(*search[1], int(plan['gridPoints'])):
                if objective(a, b) < objective(*best):
                    best = (float(a), float(b))
        search = [(max(a, v-(d-c)/(plan['gridPoints']-1)), min(b, v+(d-c)/(plan['gridPoints']-1))) for (a, b), (c, d), v in zip(bounds, search, best)]
    denominator = best[0]+best[1]*x[:, 2]
    jac = np.column_stack((-x[:, 0]/denominator**2, -x[:, 0]*x[:, 2]/denominator**2))
    singular = np.linalg.svd(jac, compute_uv=False)
    identifiable = bool(singular[-1] > max(1e-10, singular[0]*1e-6))
    domain = {k:[min(r[k] for r in train), max(r[k] for r in train)] for k in ('poaWm2', 'tempAirC', 'windSpeedMs')}
    evaluations = {}
    for name, rows in [('train', train), ('holdout', holdout)]:
        check()
        extrapolated = [r['timestamp'] for r in rows if any(not a <= r[k] <= b for k, (a, b) in domain.items())]
        observations = [r['moduleBackC'] for r in rows]
        raw = execute(rows, *base)
        adjusted = execute(rows, *best)
        check()
        evaluations[name] = dict(raw=metrics(observations, raw), fitted=metrics(observations, adjusted), extrapolatedIntervals=extrapolated,
                                 acceptanceBlocked=bool(extrapolated), rows=[dict(**r, rawModuleBackC=m, fittedModuleBackC=f) for r, m, f in zip(rows, raw, adjusted)])
    return dict(schemaVersion='module-back-research-fit-v1', algorithmVersion='1.0.0', pvlibVersion=version('pvlib'), parameterUnits={'u0':'W/(m2 K)','u1':'W/(m2 K (m/s))'}, temperatureUnit='degC', validationStatus='not_field_validated', operationalStatus='blocked', operationalBlockers=operational_blockers(data), dataSha256=data['dataSha256'], planSha256=digest(plan), plan=plan,
                target='back_of_module', model='pvlib.temperature.faiman', windBasis='native_sensor_no_height_conversion', baseline=list(base), fitted=list(best), parameterDiff=[v-b for v,b in zip(best,base)], boundActive=[v==a or v==b for v,(a,b) in zip(best,bounds)],
                candidateEvaluations=len(cache), totalWorkerEvaluations=worker_calls, identifiable=identifiable, jacobianSingularValues=singular.tolist(), trainingDomain=domain, evaluation=evaluations,
                holdoutWorse=evaluations['holdout']['fitted']['rmse'] > evaluations['holdout']['raw']['rmse'],
                policy='Research only. Holdout never chooses coefficients. Extrapolated holdout is diagnostic only and blocks acceptance. No cell/energy conversion, no baseline mutation, no field or seasonal representativeness claim. Bounds are research declarations, not engineering approval.')
