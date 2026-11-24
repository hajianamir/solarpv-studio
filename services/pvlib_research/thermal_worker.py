"""Direct isolated module-BACK worker; not a StudyResult or energy simulation."""
import json
import math
import sys
import pvlib


def run(p):
    if set(p) != {'target', 'u0', 'u1', 'rows'} or p['target'] != 'back_of_module':
        raise ValueError('Explicit back_of_module contract required')
    for key, low, high in [('u0', .1, 200), ('u1', 0, 100)]:
        v = p[key]
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not low <= v <= high:
            raise ValueError('Invalid Faiman coefficient')
    if not isinstance(p['rows'], list) or not 1 <= len(p['rows']) <= 8784:
        raise ValueError('1..8784 rows required')
    out = []
    for r in p['rows']:
        for k, lo, hi in [('poaWm2', 0, 2000), ('tempAirC', -100, 100), ('windSpeedMs', 0, 100)]:
            v = r[k]
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not lo <= v <= hi:
                raise ValueError('Invalid measured thermal input')
        value = float(pvlib.temperature.faiman(r['poaWm2'], r['tempAirC'], r['windSpeedMs'], u0=p['u0'], u1=p['u1']))
        if not math.isfinite(value) or not -100 <= value <= 150:
            raise ValueError('Module temperature outside declared research domain')
        out.append(value)
    return dict(schemaVersion='module-back-worker-v1', target='back_of_module', pvlibVersion=pvlib.__version__, moduleBackC=out)


if __name__ == '__main__':
    try:
        raw = sys.stdin.buffer.read(4_000_001)
        if len(raw) > 4_000_000:
            raise ValueError('Worker input cap exceeded')
        print(json.dumps(run(json.loads(raw)), allow_nan=False))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
