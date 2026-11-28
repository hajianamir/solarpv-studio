"""Independent Decimal replay of scenario assumptions, not a physical/market oracle.
No TypeScript imports or output. Positive resource must not be replaced by1PSH.
Year-zero CAPEX plus discounted battery reserve, end-year OPEX and geometric
energy degradation. All cost/efficiency constants are internal illustrative
assumptions, NOT independently validated costs, reliability or plant yield.
"""
from decimal import Decimal as D, getcontext, ROUND_HALF_UP
from pathlib import Path
import json
getcontext().prec=60
def rnd(x,places=0): return x.quantize(D(1).scaleb(-places),rounding=ROUND_HALF_UP)
cases=[]
for pv,daily,autonomy in [('100','10','1'),('1','.1','1'),('1','100','1')]:
 for psh in ['.1','.5','1','5']:
  pv,daily,autonomy=map(D,[pv,daily,autonomy]);psh=D(psh);inv=max(D(5),((rnd(pv,1)/5).to_integral_value(rounding='ROUND_CEILING')*5))
  params=[('optimized_lifepo4',rnd(pv,1),rnd(daily*autonomy/D('.85'),1),inv,D(300),D(210),D(130),D(1500),D('.012'),D(130),[12],D('.78')),
          ('budget_gel',rnd(pv*D('.95'),1),rnd(daily*autonomy/D('.5'),1),inv,D(270),D(115),D(100),D(1200),D('.015'),D(115),list(range(4,25,4)),D('.78')),
          ('industrial_redundant',rnd(pv*D('1.25'),1),rnd(daily*(autonomy+D('.5'))/D('.8'),1),inv*2,D(340),D(230),D(140),D(3500),D('.01'),D(160),[15],D('.8'))]
  for id,p,b,i,pc,bc,ic,fixed,op,rep,years,pr in params:
   cap=rnd(p*pc+b*bc+i*ic+fixed);energy=p*psh*365*pr;rate=D('.18')
   reserve=sum((b*rep/(1+rate)**y for y in years),D(0))
   costs=cap+reserve+sum((cap*op/(1+rate)**y for y in range(1,26)),D(0))
   discounted=sum((energy*D('.995')**(y-1)/(1+rate)**y for y in range(1,26)),D(0))
   cases.append(dict(inputs=[float(pv),float(daily),float(autonomy),90000,18,float(psh)],id=id,expected=dict(firstYearGenerationProxyKwh=float(energy),lcoeUsdPerKwh=float(costs/discounted))))
f=dict(schemaVersion=1,evidenceClass='independent-arithmetic-replay',independentCalculation=__doc__,tolerances=dict(absolute=1e-10,relative=1e-12),cases=cases)
# Separate ideal solar-hour-angle geometry: level east-west rows, south-facing.
# This is not a terrain/3D/annual shading or IEC clearance assessment.
import math
lat,decl,tilt,L=map(float,[35.6892,-23.45,31,2.278])
phi,delta,beta=map(math.radians,[lat,decl,tilt])
def required_pitch(hour_angle_deg):
    h=math.radians(hour_angle_deg)
    up=math.sin(phi)*math.sin(delta)+math.cos(phi)*math.cos(delta)*math.cos(h)
    south=math.sin(phi)*math.cos(delta)*math.cos(h)-math.cos(phi)*math.sin(delta)
    return L*math.cos(beta)+L*math.sin(beta)*south/up
noon=required_pitch(0)
f['rowGeometry']=dict(latitudeDeg=lat,declinationDeg=decl,tiltDeg=tilt,slantM=L,noonPitchM=noon,pitchAt14TrueSolarM=required_pitch(30),projectedGroundCoveragePct=100*L*math.cos(beta)/noon,limitations='Ideal single-module-slant level-ground south-facing geometry only; not assessed installation or4hour clearance.')
p=Path(__file__).with_name('audit-priority-scenarios-decimal.json');text=json.dumps(f,indent=2)+'\n'
import sys
if '--check' in sys.argv: assert p.read_text()==text,'Scenario fixture stale'
else:p.write_text(text)
print(f'PASS {len(cases)} Decimal scenario vectors; no market/field or reliability validation.')
