import math
import re
from datetime import datetime, timezone
from services.pvlib_research.electrical import keys, number
from services.pvlib_research.thermal import digest


def positive(value, name):
    x = number(value, 0, 1e100, name)
    if x <= 0:
        raise ValueError(name + ' must be positive')
    return x


def efficiency(value, name):
    x = positive(value, name)
    if x > 1:
        raise ValueError(name + ' must not exceed one')
    return x


def integer(value, lo, hi, name):
    if type(value) is not int or not lo <= value <= hi:
        raise ValueError('Invalid ' + name)
    return value


def boolean(value, name):
    if type(value) is not bool:
        raise ValueError('Boolean required: ' + name)
    return value


def intervals(rows, fields, max_rows):
    if not isinstance(rows, list) or not 1 <= len(rows) <= max_rows:
        raise ValueError('Interval count outside execution budget')
    end = None
    for row in rows:
        keys(row, ('start', 'durationS', *fields))
        if not isinstance(row['start'], str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)', row['start']):
            raise ValueError('Explicit offset timestamp required')
        start = datetime.fromisoformat(row['start'].replace('Z', '+00:00'))
        if start.tzinfo is None or start.utcoffset() is None:
            raise ValueError('Explicit offset timestamp required')
        t = start.astimezone(timezone.utc).timestamp()
        if end is not None and abs(t-end) > 1e-6:
            raise ValueError('Intervals must be contiguous without gaps or overlaps')
        end = t + positive(row['durationS'], 'durationS')


def header(plan, version, fields):
    keys(plan, ('schemaVersion', 'source', *fields))
    if plan['schemaVersion'] != version or not isinstance(plan['source'], str) or not 10 <= len(plan['source'].strip()) <= 1000:
        raise ValueError('Explicit version and parameter source required')


def result(plan, schema, limitations, **values):
    return dict(schemaVersion=schema, algorithmVersion='1.0.0', plan=plan, planSha256=digest(plan),
                validationStatus='not_field_validated', safetyApproval='not_assessed', projectApproval='blocked',
                limitations=limitations, **values)


def finite_state(values):
    if any(not math.isfinite(float(v)) for v in values):
        raise RuntimeError('Nonfinite state; no fallback')
