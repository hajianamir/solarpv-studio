"""Pinned benchmark inputs. Cache only; run at repository root with authenticated gh."""
import base64
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path('.cache/phase1-research/benchmark')
OUT = Path('docs/audit/PHASE1-BENCHMARK-ASSETS.json')
SPECS = [
    ('pvlib/pvlib-python', '6b9476b90892bd05726b237d9098f7536568a43a', [
        'LICENSE', 'pvlib/data/12839.tm2', 'pvlib/data/703165TY.csv',
        'pvlib/data/723170TYA.CSV', 'tests/data/NLD_Amsterdam062400_IWEC.epw',
        'pvlib/pvarray.py', 'tests/test_pvarray.py', 'tests/test_temperature.py',
        'docs/examples/adr-pvarray/plot_fit_to_matrix.py',
        'docs/examples/system-models/plot_oedi_9068.py',
    ], 'mixed_weather_and_algorithm_reference_not_measured_PV_validation'),
    ('adriesse/pvpltools-python', '7618782d59335f91305b93f1be21a47a7569df0b', [
        'README.md', 'LICENSE', 'data/nrel_mpert/readme.md',
    ], 'repackaged_NREL_Sandia_CFV_lab_characterization_not_field_timeseries'),
    ('SunPower/PVMismatch', 'b391a98c5ded478a73b3c6a08e8de89024be5156', [
        'README.rst', 'LICENSE', 'pvmismatch/pvmismatch_lib/pvcell.py',
        'pvmismatch/pvmismatch_lib/pvmodule.py', 'pvmismatch/pvmismatch_lib/pvconstants.py',
        'pvmismatch/tests/test_pvcell.py', 'pvmismatch/tests/test_pvmodule.py',
    ], 'independent_circuit_algorithm_reference_not_measurement'),
    ('NatLabRockies/pvdaq_access', '2db7a8d96ff46757a620835a579a29938af9ce66', [
        'README.md', 'License.txt', 'pvdaq_access/main.py',
    ], 'official_data_access_contract_not_downloaded_PVDAQ_data'),
]

def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], timeout=60))

def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    assets = []
    for repo, ref, paths, role in SPECS:
        tree = api(f'repos/{repo}/git/trees/{ref}?recursive=1')
        assert not tree.get('truncated', False)
        entries = {e['path']: e for e in tree['tree'] if e['type'] == 'blob'}
        if repo == 'adriesse/pvpltools-python':
            paths = paths + sorted(p for p in entries if p.startswith('data/nrel_mpert/modules/') and p.endswith('.txt'))
        for path in paths:
            entry = entries[path]
            blob = api(f'repos/{repo}/git/blobs/{entry["sha"]}')
            raw = base64.b64decode(blob['content'])
            assert len(raw) == entry['size']
            assert hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == entry['sha']
            local = ROOT / (repo.replace('/', '__') + '__' + path.replace('/', '__'))
            local.write_bytes(raw)
            assets.append(dict(repository=repo, revision=ref, path=path, localPath=str(local),
                               url=f'https://github.com/{repo}/blob/{ref}/{path}',
                               bytes=len(raw), gitBlobSha=entry['sha'], sha256=hashlib.sha256(raw).hexdigest(),
                               role=role, status='downloaded_verified',
                               redistribution='cache_only_data_license_review_separate_from_code'))
    OUT.write_text(json.dumps(dict(schemaVersion=1, assets=assets), indent=2) + '\n')
    print(f'{len(assets)} files verified; {sum(a["bytes"] for a in assets)} bytes')

if __name__ == '__main__':
    main()
