"""Independent 50-digit Decimal conversion of published per-foot Ke exponent.
NCSEA 2024 school wind/tornado examples: site379 ft yields Ke approximately .986.
The exact conversion is .3048 m/ft; the published .0000362 exponent is per foot.
Only this altitude component is compared. Combined caller fixture explicitly sets
legacy C coefficients alpha9.5, zg274.32m, minimum4.57m, default3m; Kzt=1, Kd=.85, V=120 km/h; those are local test policy, not verified
ASCE 7-22 exposure/pressure-chain applicability. Below-sea-level Ke=1 is preserved
legacy no-reduction policy, not a physical density validation.
"""
from pathlib import Path
from decimal import Decimal as D,getcontext
import json
getcontext().prec=50
ref=dict(title='NCSEA Wind Engineering Committee school examples',url='https://www.ncsea.com/app/uploads/2024/02/Wind-Problems.pdf',version='February 2024',locator='School site379 feet: Ke=exp(-.0000362*z_e) approximately .986; site1200 ft approximately .96. Component-only SI conversion; exact 0.3048 metre per foot. Not whole pressure-chain validation.')
def ke(z):return (-D('.0000362')*D(str(z))/D('.3048')).exp() if z>0 else D(1)
cases=[dict(inputs=[z],expected=float(ke(z))) for z in [-100,0,91.44,115.5192,500,1000,1190,1620,2000]]
f=dict(schemaVersion=1,independentOfImplementation=True,productionExport='calculateWindElevationFactor',inputs=[1000],expected=float(ke(1000)),cases=cases,independentCalculation=__doc__,tolerances=dict(absolute=1e-12,relative=1e-12),referenceSource=ref)
Path('scripts/fixtures/physics/wind-elevation-si-decimal.json').write_text(json.dumps(f,indent=2)+'\n')
kz=(D('2.01')*((D('4.57')/D('274.32')).ln()*D(2)/D('9.5')).exp()).quantize(D('.001'))
v=D(120)/D('3.6');factor=ke(1000);q=D('.613')*kz*D('.85')*factor*v*v
w=dict(f,productionExport='calculateUnifiedWindPressureQz',inputs=[dict(basicWindSpeedKmh=120,elevationM=1000)],expected=dict(qzN_M2=float(q),qzKnM2=float(q/1000),vMs=float(v),kz=float(kz),kzt=1,kd=.85,ke=float(factor)),cases=[],tolerances=dict(absolute=1e-9,relative=1e-12))
Path('scripts/fixtures/physics/wind-pressure-elevation-independent.json').write_text(json.dumps(w,indent=2)+'\n')
reg=json.loads(Path('scripts/physics-reference-evidence.json').read_text())
for r in reg['fixtures']:
 if 'wind-elevation-si-reference' in r['fixtureFile']:Path(r['fixtureFile']).write_text(json.dumps(dict(f,formulaId=r['formulaId'],cases=[]),indent=2)+'\n')
 if 'wind-pressure-elevation-reference' in r['fixtureFile']:Path(r['fixtureFile']).write_text(json.dumps(dict(w,formulaId=r['formulaId']),indent=2)+'\n')
