"""Independent 60-digit Decimal characterization, not physical POA validation.

No production imports/execution/numerical outputs. Governing policy is the
repository's inherited latitude/tilt heuristic at base 0d41fd38. Trigonometry
is independently evaluated by Decimal Taylor series, not JavaScript Math/libm.
One decimal place is inherited policy quantization, not claimed accuracy.
"""
from decimal import Decimal as D, getcontext, ROUND_HALF_UP
from pathlib import Path
import json
getcontext().prec=60
PI=D('3.14159265358979323846264338327950288419716939937510582097494459')
OUT=Path(__file__).parent
PREFIX='src/engine/core/scalarTransposition.ts#calculateFixedTiltTranspositionGain#'
IDS=['04fb44f7732d','44f3119ddced','527dcf3452e7','5d083cdece6e','5d1463a58902','680f01237b19','971fe3ea22db','9b7af51ccf98','a3a8c99d4297','b5a906717670','c2328fa70623','ca9f5664b87f','d92630d4a826','fcc6ae3598e1','feef71cb977d']
REF=dict(title='Independent Decimal characterization of inherited scalar transposition policy',url='https://github.com/hajianamir/solarpv-studio/blob/0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb/src/engine/waterfallLossEngine.ts',version='base 0d41fd38; legacy_latitude_tilt_screen_v1',locator='calculateFixedTiltTranspositionGain; degrees in, percent over GHI out; empirical coefficients unvalidated; independent Taylor-series arithmetic, not weather/field/model-accuracy evidence')
def trig(x,cos=False):
    term=D(1) if cos else x
    total=term
    for k in range(1,120):
        a=2*k-1 if cos else 2*k
        term *= -x*x/(D(a)*D(a+1))
        total += term
    return total

def gain(inputs):
    if not inputs:return 16.8
    tilt=D(str(inputs[0]))
    if tilt<=0:return 0.0
    lat=abs(D(str(inputs[1]))) if len(inputs)>1 else D('35.69')
    optimal=max(D(8),min(D(60),lat*D('.88')))
    maximum=12+min(D(6),lat*D('.15'))
    ratio=min(D(1),tilt/optimal)
    delta=max(D(0),tilt-optimal)
    raw=maximum*trig(PI/2*ratio)*trig(delta*PI/180,True)
    return float(raw.quantize(D('.1'),rounding=ROUND_HALF_UP))

cases=[]
for lat in [-90,-60,-35.69,-8,0,8,35.69,60,90]:
    for tilt in [-1,0,1,8,20,30,45,60,89,90]:
        inputs=[tilt,lat];cases.append(dict(inputs=inputs,expected=gain(inputs)))
    opt=max(8,min(60,abs(lat)*.88))
    for tilt in [opt-1e-9,opt,opt+1e-9]:
        inputs=[tilt,lat];cases.append(dict(inputs=inputs,expected=gain(inputs)))
for inputs in [[],[0],[20],[45],[90]]:
    cases.append(dict(inputs=inputs,expected=gain(inputs)))
base=dict(schemaVersion=1,independentOfImplementation=True,productionExport='calculateFixedTiltTranspositionGain',independentCalculation=__doc__,tolerances=dict(absolute=1e-12,relative=1e-12),referenceSource=REF,cases=cases)
(OUT/'scalar-transposition-decimal.json').write_text(json.dumps(base,indent=2)+'\n')
records=[]
for suffix in IDS:
    inputs=[] if suffix=='971fe3ea22db' else [0,35] if suffix=='44f3119ddced' else [45,35]
    f=dict(base,formulaId=PREFIX+suffix,inputs=inputs,expected=gain(inputs))
    file=OUT/f'scalar-transposition-{suffix}.json'
    # The main independent matrix is stored once; the gate executes this node's witness.
    f.pop('cases')
    file.write_text(json.dumps(f,indent=2)+'\n')
    records.append(dict(formulaId=PREFIX+suffix,fixtureFile=file.resolve().relative_to(Path.cwd()).as_posix(),productionExport=base['productionExport'],referenceTitle=REF['title'],referenceUrl=REF['url'],referenceVersion=REF['version'],referenceLocator=REF['locator']))
p=Path('scripts/physics-reference-evidence.json');m=json.loads(p.read_text());m['fixtures']=[r for r in m['fixtures'] if not r['formulaId'].startswith(PREFIX)]+records;p.write_text(json.dumps(m,indent=2)+'\n')
print(f'Generated {len(cases)} independent Decimal cases and {len(records)} exact-node witnesses')
