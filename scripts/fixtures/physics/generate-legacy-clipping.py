"""Independent Decimal characterization of an UNCHANGED inherited heuristic.

Source: repository base0c4d7cadc7db6001459ea36fdf9a3d1403179a71,
waterfallLossEngine.ts clipping stage and annualYieldEngine.ts adapter.
Decimal arithmetic checks extraction/precision only. The coefficients/bounds are
local policy, not externally validated inverter physics. No production execution,
imports or numeric outputs are used. Never cite this as model-quality evidence.
"""
from decimal import Decimal as D, getcontext
from pathlib import Path
import json
getcontext().prec=50
fids=['src/engine/core/legacyClippingScreen.ts#legacyClippingScreen#9724cdcaea24','src/engine/core/legacyClippingScreen.ts#legacyClippingScreen#bd8997052b2b']
ref=dict(title='Historical clipping heuristic: independent Decimal extraction characterization only',url='https://github.com/hajianamir/solarpv-studio/blob/0c4d7cadc7db6001459ea36fdf9a3d1403179a71/src/engine/waterfallLossEngine.ts',version='base0c4d7cadc7db6001459ea36fdf9a3d1403179a71; unchanged policy',locator='Clipping stage: baseline -.2 percentage points, breakpoint1.3, slope6.5 points/ILR, floor-85 points. Historical source attribution, NOT independent physical validation.')
cases=[]
for x in [-1,0,.1,1,1.25,1.3,1.3000001,1.3333333,1.5,2,10,14.346153846153847,20,1e9]:
 ratio=D(str(x));value=max(D(-85),min(D('-.2'),D('-.2')-D('6.5')*max(D(0),ratio-D('1.3'))))
 raw=D('-.2')-D('6.5')*max(D(0),ratio-D('1.3'))
 cases.append(dict(inputs=[x],expected=dict(rawClippingPct=float(raw),clippingPct=float(value))))
witness=cases[8]
f=dict(schemaVersion=1,independentOfImplementation=True,productionExport='legacyClippingScreen',inputs=witness['inputs'],expected=witness['expected'],cases=cases,independentCalculation=__doc__,tolerances=dict(absolute=1e-12,relative=1e-12),referenceSource=ref)
file='scripts/fixtures/physics/legacy-clipping-decimal.json'
Path(file).write_text(json.dumps(f,indent=2)+'\n')
p=Path('scripts/physics-reference-evidence.json');m=json.loads(p.read_text());m['fixtures']=[r for r in m['fixtures'] if not r['formulaId'].startswith('src/engine/core/legacyClippingScreen.ts#')]
for fid in fids:
 file='scripts/fixtures/physics/legacy-clipping-'+fid.split('#')[-1]+'.json'
 Path(file).write_text(json.dumps(dict(f,formulaId=fid,cases=[]),indent=2)+'\n')
 m['fixtures'].append(dict(formulaId=fid,fixtureFile=file,productionExport='legacyClippingScreen',referenceTitle=ref['title'],referenceUrl=ref['url'],referenceVersion=ref['version'],referenceLocator=ref['locator']))
p.write_text(json.dumps(m,indent=2)+'\n')
