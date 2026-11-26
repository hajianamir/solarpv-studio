"""External-component verification of real DXF artifacts, not a packing oracle.

DXF: ezdxf 1.4.3 structural reader/auditor (no recovery/auto-repair accepted).
Geometry: Shapely 2.1.2 / GEOS set operations, no TS interval implementation.
Production output is the object UNDER TEST, never a generated golden reference.
No claim about engineering clearance policy, optimal capacity, yield or standards approval.
"""
import io
from decimal import Decimal, ROUND_HALF_UP
import json
from collections import Counter
from pathlib import Path
import sys
import tempfile

import ezdxf
import shapely
from shapely import Polygon, box, union_all
from shapely.strtree import STRtree
from ezdxf.lldxf.tagger import ascii_tags_loader

TOLERANCE_AREA = 1e-7  # m²; roundoff bound for centimeter-grid coordinate operations
TOLERANCE_LENGTH = 1e-7  # m; not a civil tolerance or site-survey accuracy claim


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def connected(polygons):
    if polygons:
        geometry = union_all(polygons)
        require(geometry.is_valid and geometry.geom_type == 'Polygon', 'road union disconnected or point-only connected')


def verify(text, model, roundtrip=False):
    # A parser may discard duplicate handles before audit; inspect raw tags too.
    handles = [str(tag.value).upper() for tag in ascii_tags_loader(io.StringIO(text)) if tag.code == 5]
    require(all(count == 1 for count in Counter(handles).values()), 'duplicate DXF handles')
    doc = ezdxf.read(io.StringIO(text))  # deliberately NOT ezdxf.recover
    audit = doc.audit()
    require(not audit.errors and not audit.fixes, f'DXF requires repair: {audit.errors} / {audit.fixes}')
    require(doc.dxfversion == 'AC1015', 'unexpected DXF version')
    require(doc.units == 6, 'DXF meter units missing')
    groups = {}
    for entity in doc.modelspace():
        if entity.dxftype() != 'LWPOLYLINE':
            continue
        require(entity.closed, 'open footprint polygon')
        points = list(entity.get_points('xy'))
        require(len(points) == 4 and entity.dxf.elevation == 0, 'non-planar or non-rectangular footprint')
        polygon = Polygon(points)
        require(polygon.is_valid and polygon.area > 0, 'invalid or empty footprint')
        require(abs(polygon.area - polygon.envelope.area) <= TOLERANCE_AREA, 'non-axis-aligned footprint')
        groups.setdefault(entity.dxf.layer, []).append(polygon)
    p = model['layoutParameters']
    boundary = groups.get('BOUNDARY', [])
    require(len(boundary) == 1, 'missing/duplicate site boundary')
    require(boundary[0].symmetric_difference(box(0, 0, p['landLengthM'], p['landWidthM'])).area < TOLERANCE_AREA, 'wrong site boundary')
    site = boundary[0]
    for layer in ('ROADS', 'PV_TABLES', 'MV_SUBSTATIONS'):
        for polygon in groups.get(layer, []):
            require(site.buffer(TOLERANCE_LENGTH).covers(polygon), 'footprint outside site')
    roads = groups.get('ROADS', [])
    tables = groups.get('PV_TABLES', [])
    stations = groups.get('MV_SUBSTATIONS', [])
    require(len(tables) == model['totalTablesCount'] and len(stations) == model['mvPowerStationsCount'], 'artifact count mismatch')
    # Integration parity, not independent proof of the model's chosen packing/count.
    for layer, expected in (
        ('PV_TABLES', model['tables']),
        ('ROADS', [z for z in model['reservedZones'] if z['kind'] == 'road']),
        ('MV_SUBSTATIONS', [z for z in model['reservedZones'] if z['kind'] == 'mv_station']),
    ):
        actual = groups.get(layer, [])
        require(len(actual) == len(expected), 'model/artifact polygon count mismatch')
        for polygon, rect in zip(actual, expected):
            reference_shape = box(rect['xM'], rect['yM'], rect['xM'] + rect['lengthM'], rect['yM'] + rect['widthM'])
            require(polygon.symmetric_difference(reference_shape).area < TOLERANCE_AREA, 'model/artifact polygon geometry mismatch')
    # Independent accounting from artifact counts/site geometry and explicit
    # module configuration. This validates accounting, not the siting policy.
    config = model['tableConfig']
    per_table = config['modulesWide'] * config['modulesHigh']
    require(per_table == config['totalModulesPerTable'], 'module configuration mismatch')
    modules = len(tables) * per_table
    require(modules == model['totalModulesCount'], 'module accounting mismatch')
    dc = (Decimal(modules) * Decimal(str(p['moduleWattage'])) / Decimal(1000000)).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
    require(dc == Decimal(str(model['installedCapacityDcMwp'])), 'DC capacity accounting mismatch')
    require(abs(site.area - model['totalLandAreaM2']) <= TOLERANCE_AREA, 'site area accounting mismatch')
    # Count distinct geometric row ordinates, not model row labels; changing all
    # row/col identifiers consistently must not hide wrong displayed aggregates.
    row_sizes = Counter(round(poly.bounds[1], 7) for poly in tables)
    require(len(row_sizes) == model['rowsCount'], 'row accounting mismatch')
    require(max(row_sizes.values(), default=0) == model['tablesPerRow'], 'tables per row accounting mismatch')
    connected(roads)
    road_union = union_all(roads)
    table_union = union_all(tables)
    station_union = union_all(stations)
    for a, b, name in ((road_union, table_union, 'table/road'), (road_union, station_union, 'station/road'), (table_union, station_union, 'table/station')):
        require(a.intersection(b).area <= TOLERANCE_AREA, f'{name} overlap')
    # STRtree avoids an O(n²) comparison and detects pair overlap, including duplicate shapes.
    for objects, name in ((tables, 'table/table'), (stations, 'station/station')):
        tree = STRtree(objects)
        for i, polygon in enumerate(objects):
            for j in tree.query(polygon, predicate='intersects'):
                if int(j) > i:
                    require(polygon.intersection(objects[int(j)]).area <= TOLERANCE_AREA, f'{name} overlap')
    if roundtrip:
        with tempfile.TemporaryDirectory(prefix='solarpv-ezdxf-') as directory:
            path = Path(directory) / 'roundtrip.dxf'
            doc.saveas(path)
            restored = ezdxf.readfile(path)
            require(restored.units == 6, 'roundtrip lost units')
            for layer in ('BOUNDARY', 'ROADS', 'PV_TABLES', 'MV_SUBSTATIONS'):
                output = [Polygon(list(e.get_points('xy'))) for e in restored.modelspace().query('LWPOLYLINE') if e.dxf.layer == layer]
                require(len(output) == len(groups.get(layer, [])), 'roundtrip lost entities')
                require(union_all(output).symmetric_difference(union_all(groups.get(layer, []))).area <= TOLERANCE_AREA, 'roundtrip changed geometry')
    return doc


def rejected(call, name, expected_message):
    try:
        call()
    except Exception as exc:
        require(expected_message in str(exc), f'{name}: unexpected rejection: {exc}')
        return {'case': name, 'rejectedBy': type(exc).__name__, 'reason': expected_message}
    raise AssertionError(f'Negative case accepted: {name}')


def main():
    require(ezdxf.__version__ == '1.4.3' and shapely.__version__ == '2.1.2', 'reference dependency version mismatch')
    manifest_path = Path(sys.argv[1])
    manifest = json.loads(manifest_path.read_text())
    first_text, first_model = None, None
    count = 0
    for case in manifest['cases']:
        text = (manifest_path.parent / case['dxf']).read_text()
        model = case['model']
        verify(text, model, roundtrip=True)
        if first_text is None:
            first_text, first_model = text, model
        count += 1
    require(count > 0, 'no cases')
    negatives = []
    negatives.append(rejected(lambda: verify(first_text.replace('100\nAcDbPolyline\n', '', 1), first_model), 'missing R2000 subclass', 'AcDbPolyline'))
    negatives.append(rejected(lambda: connected([box(0, 0, 1, 1), box(1, 1, 2, 2)]), 'point-only road connection', 'road union disconnected'))
    base = ezdxf.read(io.StringIO(first_text))
    base.units = 0
    stream = io.StringIO(); base.write(stream)
    negatives.append(rejected(lambda: verify(stream.getvalue(), first_model), 'missing meter units', 'meter units'))
    # Force a raw duplicate handle, independent of parser repair/discard behavior.
    lines = first_text.splitlines()
    indexes = [i for i in range(0, len(lines), 2) if lines[i] == '5']
    lines[indexes[-1] + 1] = lines[indexes[-2] + 1]
    negatives.append(rejected(lambda: verify('\n'.join(lines) + '\n', first_model), 'duplicate handles', 'duplicate DXF handles'))
    # Independently evaluate the original audit counterexample with GEOS.
    require(box(244, 12, 256, 20).intersection(box(244, 6, 256, 494)).area == 96, 'original audit area oracle failed')
    # Alter the artifact AND its declared model consistently: parity checks alone
    # cannot reject this; the external geometry intersection must reject it.
    import copy
    bad_model = copy.deepcopy(first_model)
    station = next(z for z in bad_model['reservedZones'] if z['kind'] == 'mv_station')
    station['xM'] = 244
    changed = ezdxf.read(io.StringIO(first_text))
    entity = next(e for e in changed.modelspace().query('LWPOLYLINE') if e.dxf.layer == 'MV_SUBSTATIONS')
    entity.set_points([(244,12),(256,12),(256,20),(244,20)])
    stream = io.StringIO(); changed.write(stream)
    negatives.append(rejected(lambda: verify(stream.getvalue(), bad_model), 'on-road station with matching model', 'station/road overlap'))
    for field, reason in (
        ('totalModulesCount', 'module accounting mismatch'),
        ('installedCapacityDcMwp', 'DC capacity accounting mismatch'),
        ('totalLandAreaM2', 'site area accounting mismatch'),
        ('rowsCount', 'row accounting mismatch'),
        ('tablesPerRow', 'tables per row accounting mismatch'),
    ):
        corrupted = copy.deepcopy(first_model)
        corrupted[field] += 1
        negatives.append(rejected(lambda: verify(first_text, corrupted), f'wrong {field}', reason))
    print(json.dumps({'status':'PASS' ,'cases':count,'negativeCases':negatives,'ezdxf':ezdxf.__version__,'shapely':shapely.__version__,'geos':shapely.geos_version_string,'evidenceClass':'independent-component artifact/geometry verification, NOT independent packing/clearance policy, field or conformity validation'}))


if __name__ == '__main__':
    main()
