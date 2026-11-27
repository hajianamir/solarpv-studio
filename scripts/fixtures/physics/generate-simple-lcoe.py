"""Independent 50-digit Decimal simple discounted LCOE specialization.
Year-zero CAPEX + discounted constant end-of-year OPEX divided by discounted
first-year delivered kWh with geometric degradation. Currency and rate basis
are explicit labels; no taxes, debt, escalation, replacement or salvage schedules.
SAM LCOE help documents discounted costs/energy and real vs nominal distinction;
this is NOT parity with SAM's full tax/debt cashflow. Synthetic costs/rates are
arithmetic cases, not product or jurisdiction assumptions. No TS imports/output.
"""
from decimal import Decimal as D,getcontext
from pathlib import Path
import json
getcontext().prec=50
OUT=Path('scripts/fixtures/physics')
REF=dict(title='SAM LCOE discounted costs/delivered energy; independent Decimal simple pre-tax specialization',url='https://samrepo.nlr.gov/help/mtf_lcoe.html',version='Public help retrieved2026-11-03; simple_discounted_lcoe_v1',locator='Levelized Cost of Energy Equations and Real and Nominal LCOE; simple constant-OPEX unlevered specialization, NOT full SAM taxes/debt implementation.')
LIMITS=['Pre-tax unlevered screen: constant annual OPEX, first-year energy under the declared basis with geometric degradation; no taxes, debt, escalation, replacement or salvage schedules.','Numerical arithmetic verification is not validation of project assumptions or financial eligibility.']
def totals(x):
 c=D(str(x['capex']));e=D(0);r=D(str(x['discountRate']));d=D(str(x['degradationPct']))/100
 for year in range(1,x['lifetimeYears']+1):
  discount=(1+r)**year
  c+=D(str(x['opexAnnual']))/discount
  generation=D(str(x['energyAnnual']))*((1-d)**(year-1) if year>1 else 1)
  e+=generation/discount
 return dict(discountedCosts=float(c),discountedEnergyKwh=float(e),lcoeValue=float(c/e))
def assessed(x):
 limitations=list(LIMITS)
 if x['energyBasis']!='delivered':limitations.append('Energy delivery boundary is not established; generation-proxy or unspecified energy is not an assessed delivered-cost basis.')
 if x['currency']=='unspecified':limitations.append('Currency unit unspecified; do not compare to a currency-denominated tariff.')
 if x['rateBasis']=='unspecified':limitations.append('Real/nominal valuation basis unspecified; do not compare mixed-basis alternatives.')
 return dict(status='available',**totals(x),currency=x['currency'],rateBasis=x['rateBasis'],modelPolicy='simple_discounted_lcoe_v1',financialAdoptionEligible=False,inputs=x,limitations=limitations)
cases=[]
for size in [.5,1,5,10,50,1000]:
 for rate in [-.05,0,.18]:
  for deg in [0,.5]:
   x=dict(capex=size*1000,opexAnnual=size*15,energyAnnual=size*1800,discountRate=rate,lifetimeYears=25,degradationPct=deg,energyBasis='delivered',currency='USD',rateBasis='real' if rate<0 else 'nominal')
   cases.append(dict(inputs=[x],expected=assessed(x)))
for patch in [dict(capex=0,opexAnnual=0),dict(degradationPct=100),dict(lifetimeYears=1),dict(lifetimeYears=100),dict(currency='TOMAN'),dict(currency='unspecified',rateBasis='unspecified')]:
 x=dict(capex=10000,opexAnnual=200,energyAnnual=5000,discountRate=.05,lifetimeYears=25,degradationPct=.5,energyBasis='delivered',currency='USD',rateBasis='nominal');x.update(patch)
 cases.append(dict(inputs=[x],expected=assessed(x)))
f=dict(schemaVersion=1,independentOfImplementation=True,productionExport='assessSimpleLcoe',cases=cases,independentCalculation=__doc__,tolerances=dict(absolute=1e-9,relative=1e-12),referenceSource=REF)
(OUT/'simple-lcoe-decimal.json').write_text(json.dumps(f,indent=2)+'\n')
witness=dict(capex=10000,opexAnnual=200,energyAnnual=5000,discountRate=.05,lifetimeYears=25,degradationPct=.5,energyBasis='delivered',currency='USD',rateBasis='nominal')
units=['0223ffd50c23','643659f3eeaa','74d58f12ac67','a000ea8123ea','a0b439532cd0','a69eba4e64d8','ba69e142c82d']
records=[('src/engine/core/simpleLcoe.ts#calculateDiscountedLcoe#'+id,'calculateDiscountedLcoe',[witness],totals(witness)) for id in units]
records.append(('src/engine/core/simpleLcoe.ts#assessSimpleLcoe#2ffdcb83e519','assessSimpleLcoe',[witness],assessed(witness)))
legacy=dict(witness,energyBasis='unspecified',currency='unspecified',rateBasis='unspecified')
records.append(('src/engine/solarPvEngine.ts#calculateLcoe#ab7983c07a6e','calculateLcoe',[10000,200,5000,.05,25,.5],totals(legacy)['lcoeValue']))
scenario=dict(opexAnnual=200,energyAnnual=5000,discountRate=.05,lifetimeYears=25,degradationPct=.5,initialCapexUsd=9000,replacementPresentValueUsd=1000)
records.append(('src/engine/scenarioEngine.ts#assessScenarioLcoe#518725cabf1b','assessScenarioLcoe',[scenario],assessed(dict(witness,energyBasis='generation_proxy'))))
p=Path('scripts/physics-reference-evidence.json');m=json.loads(p.read_text())
for fid,owner,inputs,expected in records:
 file='scripts/fixtures/physics/simple-lcoe-reference-'+fid.split('#')[-1]+'.json'
 Path(file).write_text(json.dumps(dict(f,formulaId=fid,productionExport=owner,inputs=inputs,expected=expected,cases=[]),indent=2)+'\n')
 m['fixtures']=[r for r in m['fixtures'] if r['formulaId']!=fid]+[dict(formulaId=fid,fixtureFile=file,productionExport=owner,referenceTitle=REF['title'],referenceUrl=REF['url'],referenceVersion=REF['version'],referenceLocator=REF['locator'])]
p.write_text(json.dumps(m,indent=2)+'\n')
