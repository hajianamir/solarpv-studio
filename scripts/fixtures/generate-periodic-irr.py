"""Independent Decimal periodic cash-flow roots; no TS imports or production output.
Root: sum(C_t/(1+r)**t)=0. 60-digit direct summation and 240 bisections,
not the production normalized Horner implementation. Test policy domain is explicit.
"""
from decimal import Decimal as D, getcontext
from pathlib import Path
import json, sys
getcontext().prec=60
root=Path(__file__).resolve().parents[2]
source=dict(title='Periodic cash-flow IRR equation and independent Decimal bisection',url='https://github.com/numpy/numpy-financial/blob/247aa4e2ee4fa7db44915790d5a730b9776d10a7/numpy_financial/_financial.py',version='numpy-financial v1.0.0 equation; local 60-digit Decimal oracle',locator='irr documentation: sum(values[t]/(1+irr)**t)=0. Decimal direct sum solves only explicit conventional test series; not numpy polynomial implementation or financial validation.')
def npv(flows,r):return sum((c/(1+r)**t for t,c in enumerate(flows)),D(0))
cases=[]
series=[['-100','110'],['-100','100'],['-100','25'],['-1','10'],['-100','0','121'],['-100','-20','200'],['-1','0','0','0','2'],['-10','1','1','1','1','20'],['-1','11'],['-10.000000000000002','1']]
for raw in series:
 for factor in ['0.000000001','1','1000000000']:
  flows=[D(c)*D(factor) for c in raw];lo=D('-.9');hi=D(10)
  for _ in range(240):
   mid=(lo+hi)/2
   if npv(flows,mid)>0:lo=mid
   else:hi=mid
  rate=(lo+hi)/2
  for basis in ['project','equity']:
   inp=dict(modelPolicy='conventional_periodic_irr_bounded_v1',cashFlows=[float(c) for c in flows],period='annual',cashFlowBasis=basis,currency='MILLION_TOMAN',rateBasis='nominal')
   expected=dict(status='available',rate=float(rate),irrPct=float(rate*100),normalizedNpvResidual=0,input=inp,modelPolicy=inp['modelPolicy'],rateDomain=[-.9,10],financialAdoptionEligible=False)
   cases.append(dict(inputs=[inp],expected=expected))
for raw,reason in [(['0','0'],'no_sign_change'),(['-100','-1'],'no_sign_change'),(['100','1'],'no_sign_change'),(['-100','230','-132'],'unsupported_cash_flow_pattern'),(['0','-100','110'],'unsupported_cash_flow_pattern'),(['-100','1'],'outside_policy_domain'),(['-1','100'],'outside_policy_domain'),(['-1e308','5e-324'],'numerical_failure')]:
 inp=dict(modelPolicy='conventional_periodic_irr_bounded_v1',cashFlows=[float(c) for c in raw],period='annual',cashFlowBasis='project',currency='MILLION_TOMAN',rateBasis='nominal')
 cases.append(dict(inputs=[inp],expected=dict(status='unavailable',rate=None,irrPct=None,reason=reason,financialAdoptionEligible=False)))
# Compose with the previously independently generated Decimal Iranian ledgers,
# never with production model output. Parse JSON numbers as Decimal.
ledger_pool=json.loads((root/'scripts/fixtures/physics/iranian-policy-decimal.json').read_text(),parse_float=D)
for ledger_case in ledger_pool['cases']:
 result=ledger_case['expected']
 for basis in ['project','equity']:
  initial=result['totalCapexMillionToman'] if basis=='project' else result['equityContributionMillionToman']
  flows=[-D(initial)]+[D(c['revenueMillionToman'])-D(c['opexMillionToman']) if basis=='project' else D(c['netCashFlowMillionToman']) for c in result['cashFlow25Years']]
  inp=dict(modelPolicy='conventional_periodic_irr_bounded_v1',cashFlows=[float(c) for c in flows],period='annual',cashFlowBasis=basis,currency='MILLION_TOMAN',rateBasis='nominal')
  nz=[c for c in flows if c]
  signs=[c>0 for c in nz]
  if not any(c>0 for c in flows) or not any(c<0 for c in flows):reason='no_sign_change'
  elif flows[0]>=0 or any(signs[i] and not signs[i+1] for i in range(len(signs)-1)):reason='unsupported_cash_flow_pattern'
  elif npv(flows,D('-.9'))<0 or npv(flows,D(10))>0:reason='outside_policy_domain'
  else:reason=None
  if reason:expected=dict(status='unavailable',rate=None,irrPct=None,reason=reason,financialAdoptionEligible=False)
  else:
   lo=D('-.9');hi=D(10)
   for _ in range(240):
    mid=(lo+hi)/2
    if npv(flows,mid)>0:lo=mid
    else:hi=mid
   rate=(lo+hi)/2
   expected=dict(status='available',rate=float(rate),irrPct=float(rate*100),normalizedNpvResidual=0,input=inp,modelPolicy=inp['modelPolicy'],rateDomain=[-.9,10],financialAdoptionEligible=False)
  cases.append(dict(inputs=[inp],expected=expected,ledgerInputs=json.loads(json.dumps(ledger_case['inputs'],default=float))))
npv_cases=[]
for flows in [['-1','.5','1'],['-100','10','20','150']]:
 for rate in ['-.5','0','.2','2']:
  npv_cases.append(dict(inputs=[[float(c) for c in flows],float(rate)],expected=float(npv([D(c) for c in flows],D(rate)))))
data=dict(schemaVersion=1,independentOfImplementation=True,referenceSource=source,independentCalculation=__doc__,tolerances=dict(absolute=1e-9,relative=1e-11),cases=cases,npvCases=npv_cases)
p=root/'scripts/fixtures/physics/periodic-irr-decimal.json';text=json.dumps(data,indent=2,allow_nan=False)+'\n'
if '--check' in sys.argv:assert p.read_text()==text,'Independent IRR fixture differs'
else:p.write_text(text)
print(f'PASS independent Decimal periodic IRR: {len(cases)} root/status cases and {len(npv_cases)} NPV cases')
