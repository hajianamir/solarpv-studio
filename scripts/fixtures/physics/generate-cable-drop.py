"""Independent Decimal voltage-drop oracle, Schneider EIG 2010 chapter G fig G27.
No production imports/outputs. Inputs are explicit synthetic equivalent-circuit
conditions, NOT manufacturer/site evidence. R=1/(conductivity*S*N) ohm/m;
DC 2LIR, AC kLI(R PF+X sqrt(1-PF²)); k=2 or sqrt(3).
Units: metre, ampere, mm², conductivity m/(ohm mm²), X ohm/metre, result volt.
"""
from decimal import Decimal as D, getcontext
from pathlib import Path
import json
getcontext().prec=50
out=Path('scripts/fixtures/physics/cable-drop-decimal.json')
cases=[]
for dc,three in [(True,False),(False,False),(False,True)]:
 for pf in [1,.9,.7,0]:
  for runs in [1,2,3,6]:
   for x in [0,.00008,.0002]:
    i=dict(isDc=dc,isThreePhase=three,oneWayLengthM=250,designCurrentAmps=400,powerFactor=pf,equivalentReactanceOhmPerM=x)
    r=D(1)/(D('44.444444444444444')*D(95)*D(runs))
    p=D(1) if dc else D(str(pf));xx=D(0) if dc else D(str(x));k=D(2) if dc or not three else D(3).sqrt()
    value=k*D(250)*D(400)*(r*p+xx*(1-p*p).sqrt())
    cases.append(dict(inputs=[i,44.444444444444444,95,runs],expected=float(value)))
witness=next(c for c in cases if not c['inputs'][0]['isDc'] and c['inputs'][0]['isThreePhase'] and c['inputs'][0]['powerFactor']==.7 and c['inputs'][0]['equivalentReactanceOhmPerM']==.00008 and c['inputs'][3]==3)
x=dict(schemaVersion=1,independentOfImplementation=True,productionExport='candidateVoltageDropVolts',inputs=witness['inputs'],expected=witness['expected'],cases=cases,independentCalculation=__doc__,tolerances=dict(absolute=1e-10,relative=1e-12),referenceSource=dict(title='Schneider Electrical Installation Guide',url='https://www.electrical-installation.org/enw/images/0/0a/G-Sizing-and-protection-of-conductors.pdf',version='2010',locator='Chapter G §3.2 fig G27; parallel resistance footnote. Supplied equivalent X, not universal X/N. Decimal synthetic conditions; not insulation/ampacity/impedance validation.'))
out.write_text(json.dumps(x,indent=2)+'\n')

# Registry supplies identity only; every expected number above is independently calculated.
registry=json.loads(Path('scripts/physics-reference-evidence.json').read_text())
for record in registry['fixtures']:
 if record['formulaId'].startswith('src/engine/core/cableVoltageDrop.ts#'):
  Path(record['fixtureFile']).write_text(json.dumps(dict(x,formulaId=record['formulaId']),indent=2)+'\n')
