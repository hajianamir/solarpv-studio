"""Installed pinned Python license inventory, not a grant or legal approval."""
import json
import re
import hashlib
from pathlib import Path
from importlib.metadata import distribution


def requirements(path):
    out = set()
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if line.startswith('-r '):
            out |= requirements((path.parent/line[3:]).resolve())
        elif line and not line.startswith('#'):
            out.add(line.split('==')[0])
    return out


rows = []
for name in sorted(requirements(Path('services/pvlib_research/requirements.txt'))):
    dist = distribution(name)
    notices = []
    for file in dist.files or []:
        if re.search(r'(^|/)(licenses?/|licen[cs]e|copying|notice)', str(file), re.I):
            p = dist.locate_file(file)
            if p.is_file():
                notices.append(dict(file=str(file), sha256=hashlib.sha256(p.read_bytes()).hexdigest(), text=p.read_text(errors='replace')))
    rows.append(dict(name=name, version=dist.version,
                     licenseExpression=dist.metadata.get('License-Expression'),
                     declaredLicense=dist.metadata.get('License'),
                     classifiers=[v for v in dist.metadata.get_all('Classifier', []) if v.startswith('License')], notices=notices))
Path('.cache/phase6').mkdir(parents=True, exist_ok=True)
Path('.cache/phase6/python-licenses.json').write_text(json.dumps(rows, indent=2)+'\n')
print('PASS Python license inventory:', len(rows), 'pinned packages; not legal clearance')
