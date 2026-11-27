"""Acquire public primary-source artifacts through GitHub; immutable refs, no credentials stored.
Run with .venv Python; --check verifies cached bytes without network. Cache is not shipped.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / '.cache/phase3-research/sources'
MANIFEST = ROOT / 'docs/audit/dual-independent-audit-review/phase3-research-sources.json'
PV = '6b9476b90892bd05726b237d9098f7536568a43a'
EP = 'e7ecb2d53b6b2f4666bf5a56fc9b3ba35cf34190'
SOURCES = [
    ('pvlib/pvlib-python', PV, p) for p in [
        'LICENSE', 'pvlib/pvsystem.py', 'pvlib/singlediode.py', 'pvlib/ivtools/sdm/desoto.py',
        'pvlib/temperature.py', 'pvlib/iam.py', 'pvlib/inverter.py', 'pvlib/tracking.py',
        'pvlib/bifacial/infinite_sheds.py', 'pvlib/bifacial/utils.py', 'tests/test_temperature.py',
        'tests/bifacial/test_infinite_sheds.py', 'tests/test_iam.py', 'tests/test_inverter.py',
        'pvlib/data/sam-library-cec-modules-2019-03-05.csv',
        'pvlib/data/sam-library-cec-inverters-2019-03-05.csv',
        'pvlib/data/703165TY.csv', 'tests/data/NLD_Amsterdam062400_IWEC.epw',
    ]
] + [
    ('NREL/EnergyPlus', EP, p) for p in [
        'LICENSE.txt', 'src/EnergyPlus/PhotovoltaicThermalCollectors.cc',
        'tst/EnergyPlus/unit/PhotovoltaicThermalCollectors.unit.cc',
        'weather/USA_AZ_Phoenix-Sky.Harbor.Intl.AP.722780_TMY3.epw',
        'weather/USA_NJ_Newark.Intl.AP.725020_TMY3.epw',
        'doc/engineering-reference/src/on-site-generation/photovoltaic-arrays.tex',
    ]
] + [
    ('OpenWaterAnalytics/EPANET', '4d8d82ddc260fce216af9321fc3d9a4646ac6827', 'src/hydcoeffs.c'),
    ('numpy/numpy-financial', '247aa4e2ee4fa7db44915790d5a730b9776d10a7', 'numpy_financial/_financial.py'),
    ('scipy/scipy', 'e29dcb65a2040f04819b426a04b60d44a8f69c04', 'scipy/stats/_multivariate.py'),
    ('scipy/scipy', 'e29dcb65a2040f04819b426a04b60d44a8f69c04', 'scipy/stats/_continuous_distns.py'),
]

def local(repo, ref, path):
    return CACHE / repo / ref / path

def acquire(item):
    repo, ref, path = item
    endpoint = f'repos/{repo}/contents/{path}?ref={ref}'
    # raw accept also supports files >1MB; gh handles authentication without exposing it.
    data = subprocess.run(['gh', 'api', '-H', 'Accept: application/vnd.github.raw+json', endpoint],
                          check=True, capture_output=True).stdout
    if data.startswith(b'{"name"'):
        raise RuntimeError('API returned metadata instead of source bytes: ' + path)
    dest = local(repo, ref, path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return {'repository': repo, 'commit': ref, 'path': path,
            'url': f'https://github.com/{repo}/blob/{ref}/{path}',
            'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
            'cachePath': str(dest.relative_to(ROOT))}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.check:
        manifest = json.loads(MANIFEST.read_text())
        for record in manifest['sources']:
            data = (ROOT / record['cachePath']).read_bytes()
            assert len(data) == record['bytes']
            assert hashlib.sha256(data).hexdigest() == record['sha256'], record['path']
        print(f"PASS offline source integrity: {len(manifest['sources'])} artifacts")
        return
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(acquire, SOURCES))
    MANIFEST.write_text(json.dumps({'schemaVersion': 'phase3-research-sources-v1',
        'acquisitionDate': '2026-11-03', 'transport': 'GitHub contents API raw bytes at immutable commit',
        'qualification': 'Acquired source is not project applicability, upstream test execution, manufacturer verification or standards conformity. Review upstream licenses before redistribution; full source/data remains in ignored cache.',
        'sources': records}, indent=2) + '\n')
    print(f'Acquired {len(records)} pinned source/data artifacts')

if __name__ == '__main__':
    main()
