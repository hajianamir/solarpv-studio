"""Independent Decimal comparisons of per-channel current against a declared limit.
Only the retained legacy Isc screen uses1.25. Enphase IQ8AC/HC source distinguishes
14A operating input,25A short-circuit terminal capability and20A maximum paired
module Isc with documented1.25 relation. It does NOT validate a universal factor,
per-MPPT conversion or this application's synthetic examples as real products.
Exact binary64 input values are converted with Decimal.from_float, not rounded
strings. Threshold boolean comparison is exact; no tolerance grants capacity.
"""
from decimal import Decimal as D,getcontext
from pathlib import Path
import json,math
getcontext().prec=70
REF=dict(title='Independent Decimal current-limit comparisons; retained legacy Isc factor qualified by rating basis',url='https://enphase.com/en-au/download/iq8ac-and-iq8hc-microinverters-data-sheet',version='Public datasheet retrieved2026-11-03; synthetic threshold arithmetic',locator='Input data (DC): operating vs short-circuit/module ratings and explicit1.25 relation. Independent threshold arithmetic only; product/source-date/scope applicability remains unassessed.')
cases=[]
for strings in [1,2,3,6]:
 for current in [math.nextafter(20,-math.inf),20.,math.nextafter(20,math.inf),20.0001,20.004]:
  for owner,factor,limit in [('exceedsMpptOperatingLimit',D(1),20*strings),('exceedsLegacyMpptShortCircuitLimit',D('1.25'),25*strings)]:
   expected=D(strings)*D.from_float(current)*factor>D(limit)
   cases.append(dict(owner=owner,inputs=[strings,current,limit],expected=expected))
f=dict(schemaVersion=1,independentOfImplementation=True,cases=cases,independentCalculation=__doc__,tolerances=dict(absolute=0,relative=0),referenceSource=REF)
Path('scripts/fixtures/physics/mppt-current-boundaries-decimal.json').write_text(json.dumps(f,indent=2)+'\n')
p=Path('scripts/physics-reference-evidence.json');m=json.loads(p.read_text())
for owner,id in [('exceedsMpptOperatingLimit','d35f36b70f11'),('exceedsLegacyMpptShortCircuitLimit','f6df7705f25f')]:
 fid='src/engine/core/mpptCurrentComparison.ts#'+owner+'#'+id
 witness=next(c for c in cases if c['owner']==owner and c['inputs'][1]==math.nextafter(20,math.inf) and c['inputs'][0]==1)
 file='scripts/fixtures/physics/mppt-current-reference-'+id+'.json'
 Path(file).write_text(json.dumps(dict(f,formulaId=fid,productionExport=owner,inputs=witness['inputs'],expected=witness['expected'],cases=[]),indent=2)+'\n')
 m['fixtures']=[r for r in m['fixtures'] if r['formulaId']!=fid]+[dict(formulaId=fid,fixtureFile=file,productionExport=owner,referenceTitle=REF['title'],referenceUrl=REF['url'],referenceVersion=REF['version'],referenceLocator=REF['locator'])]
p.write_text(json.dumps(m,indent=2)+'\n')
