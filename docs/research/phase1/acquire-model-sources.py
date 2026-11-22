"""Download pinned research sources, not runtime dependencies. Run from repo root."""
import base64
import hashlib
import json
import subprocess
from pathlib import Path

SETS = [
    ('pvlib/pvlib-python', '6b9476b90892bd05726b237d9098f7536568a43a', [
        'pvlib/modelchain.py', 'pvlib/pvsystem.py', 'pvlib/inverter.py',
        'pvlib/temperature.py', 'pvlib/soiling.py', 'pvlib/snow.py', 'pvlib/irradiance.py',
        'pvlib/tracking.py', 'pvlib/shading.py', 'pvlib/bifacial/infinite_sheds.py',
        'pvlib/iotools/pvgis.py', 'pvlib/iotools/epw.py',
        'tests/test_snow.py', 'tests/test_soiling.py',
    ]),
    ('NatLabRockies/ssc', '6ce13d26f44b3a21f7bf0fbb5b1e3f3f80cf3860', [
        'ssc/cmod_pvwattsv8.cpp', 'shared/lib_battery_capacity.cpp',
        'shared/lib_battery_dispatch.cpp', 'shared/lib_battery_dispatch_automatic_btm.cpp',
        'shared/lib_battery_dispatch_automatic_fom.cpp', 'shared/lib_snowmodel.cpp',
        'shared/lib_pvshade.cpp',
    ]),
]
folder = Path('.cache/phase1-research/model-sources')
folder.mkdir(parents=True, exist_ok=True)
assets = []
for repository, revision, paths in SETS:
    for path in paths:
        response = subprocess.run(
            ['gh', 'api', f'repos/{repository}/contents/{path}?ref={revision}'],
            capture_output=True, text=True, timeout=45, check=True)
        item = json.loads(response.stdout)
        raw = base64.b64decode(item['content'])
        assert len(raw) == item['size']
        blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        assert blob == item['sha']
        local = folder / (repository.replace('/', '__') + '__' + path.replace('/', '__'))
        local.write_bytes(raw)
        assets.append(dict(repository=repository, revision=revision, path=path,
                           url=f'https://github.com/{repository}/blob/{revision}/{path}',
                           localPath=str(local), bytes=len(raw), gitBlobSha=blob,
                           sha256=hashlib.sha256(raw).hexdigest(),
                           status='downloaded_blob_verified', role='research_source_not_field_data'))
Path('docs/audit/PHASE1-MODEL-SOURCES.json').write_text(
    json.dumps(dict(schemaVersion=1, assets=assets), indent=2) + '\n')
print(f'{len(assets)} pinned sources downloaded, byte-count and Git blob verified')
