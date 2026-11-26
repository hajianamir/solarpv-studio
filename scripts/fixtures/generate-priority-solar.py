"""Independent solar fixture. Reproduce with pvlib==0.13.1 and pandas.
Run from repository root. Uses geometric zenith, not refraction-corrected apparent zenith.
No network calls; fixture is not a climate or annual-energy validation.
"""
import json
import subprocess
import sys
from pathlib import Path
import pandas as pd
import pvlib

assert pvlib.__version__ == '0.13.1', 'Pin pvlib to preserve reference provenance'
sites = [('Sydney', -33.87, 151.21), ('Tokyo', 35.68, 139.69),
         ('Auckland', -36.85, 174.76), ('Tehran', 35.69, 51.39),
         ('London', 51.5, -.12), ('NewYork', 40.7, -74),
         ('Honolulu', 21.3, -157.8), ('Quito', -.18, -78.47),
         ('Singapore', 1.35, 103.82), ('DateLine', 20, -179.9)]
rows = []
for name, lat, lon in sites:
    for month in [1, 4, 7, 10]:
        times = pd.date_range(f'2024-{month:02}-15', periods=48, freq='30min', tz='UTC')
        result = pvlib.solarposition.get_solarposition(times, lat, lon, altitude=0)
        for ts, row in result.iterrows():
            if 5 < row.zenith < 85:
                rows.append(dict(site=name, latitude=lat, longitude=lon,
                                 utcTs=int(ts.timestamp()), zenith=float(row.zenith),
                                 azimuth=float(row.azimuth)))
fixture = dict(reference='pvlib 0.13.1 solarposition.get_solarposition default NREL SPA; geometric zenith (not apparent); altitude=0; UTC; daylight 5<zenith<85',
               tolerancesDegrees=dict(zenith=.05, azimuth=.15), rows=rows)
Path('benchmarks/independent/solar-position-spa.json').write_text(json.dumps(fixture, indent=2))

# Registry fixtures are full independent SPA outputs, not copied TS results.
registry = Path('scripts/physics-reference-evidence.json')
manifest = json.loads(registry.read_text())
solar_ids = {
    '00621e7ddbb1': '2024-01-15T03:00:00Z',
    '6e29caf63dd1': '2024-01-15T21:30:00Z',
    'df1bf2813862': '2024-01-15T21:30:00Z',
}
for suffix, instant in solar_ids.items():
    formula_id = f'src/engine/solarPvEngine.ts#calculateSolarPosition#{suffix}'
    ref = dict(title='pvlib-python NREL SPA solar position',
               url='https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.solarposition.get_solarposition.html',
               version='pvlib 0.13.1', locator='get_solarposition, geometric zenith and north-clockwise azimuth, altitude=0, UTC')
    ts = pd.Timestamp(instant)
    row = pvlib.solarposition.get_solarposition(pd.DatetimeIndex([ts]), -33.87, 151.21, altitude=0).iloc[0]
    az = float(row.azimuth)
    expected = dict(zenithDeg=float(row.zenith), azimuthDeg=az,
                    elevationDeg=round(90-float(row.zenith), 6),
                    azimuthSouthDeg=round((az % 360)-180, 6))
    filename = f'scripts/fixtures/physics/solar-spa-{suffix}.json'
    data = dict(schemaVersion=1, formulaId=formula_id, independentOfImplementation=True,
                productionExport='calculateSolarPosition', inputs=[-33.87, 151.21, int(ts.timestamp())],
                expected=expected, tolerances=dict(absolute=.05, relative=0),
                independentCalculation='Run scripts/fixtures/generate-priority-solar.py using pinned pvlib 0.13.1. All solar outputs from NREL SPA, elevation=90-geometric zenith, south azimuth=north azimuth-180; not field validation.',
                referenceSource=ref)
    Path(filename).write_text(json.dumps(data, indent=2)+'\n')
    manifest['fixtures'] = [r for r in manifest['fixtures'] if r['formulaId'] != formula_id]
    manifest['fixtures'].append(dict(formulaId=formula_id, fixtureFile=filename,
                                     productionExport='calculateSolarPosition', referenceTitle=ref['title'],
                                     referenceUrl=ref['url'], referenceVersion=ref['version'], referenceLocator=ref['locator']))
registry.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
subprocess.run([sys.executable, 'scripts/fixtures/physics/generate-grid-import-ledger.py'], check=True)
