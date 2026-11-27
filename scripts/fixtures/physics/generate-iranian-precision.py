"""Independent 50-digit Decimal ledger for unrounded million-Toman accounting.
NPV discounting: NREL SAM help mtf_npv and Short et al. 1995 NREL/TP-462-5173.
This is PRE-TAX application-policy specialization, NOT SAM default finance/taxes,
verified Iranian tariffs, or bankable assumptions. All policy values are explicit:
31.5 million Toman/kWp capital, 1.5% OPEX, .45% degradation, discount20%,
tariff/OPEX escalation=.48/.60 times inflation; 25 years; ordinary annual annuity.
No production code import, execution or copied numeric output. IRR independently
solved by Decimal bisection; rounded scalar display metrics reproduce legacy API
format, but ledger and NPV remain unrounded. No replacement/salvage model claimed.
"""
from decimal import Decimal as D,getcontext,ROUND_FLOOR
from pathlib import Path
import json
getcontext().prec=50
def rnd(v,digits=0):
 k=D(10)**digits
 return float((v*k+D('.5')).to_integral_value(rounding=ROUND_FLOOR)/k)
def result(capacity,generation,share,interest,term,inflation,policy=None):
 cap=D(str(capacity))*D('31.5');loan=cap*D(str(share))/100;equity=cap-loan
 r=D(str(interest))/100
 annuity=loan/D(term) if r==0 else loan*r/(1-(1+r)**(-term))
 inflation=D(str(inflation))/100
 discount=D(str(policy["discountRatePct"]))/100 if policy else D(".2")
 tariff_growth=D(str(policy["tariffEscalationPct"]))/100 if policy else inflation*D(".48")
 opex_growth=D(str(policy["opexEscalationPct"]))/100 if policy else inflation*D(".60")
 basis=policy or dict(modelPolicy="iranian_screen_economics_v1",currency="TOMAN",rateBasis="nominal",discountRatePct=20,tariffEscalationPct=float(tariff_growth*100),opexEscalationPct=float(opex_growth*100))
 cash=[];project=[-cap];equities=[-equity];cumulative=-equity;discounted=-equity;simple=None;pay=None;cost=cap;energy=D(0)
 for year in range(1,26):
  gen=D(str(generation))*D('.9955')**(year-1)
  revenue=gen*1000*4200*(1+tariff_growth)**(year-1)/D(1000000)
  opex=cap*D('.015')*(1+opex_growth)**(year-1)
  debt=annuity if year<=term else D(0);noi=revenue-opex;net=noi-debt;before=cumulative;cumulative+=net
  if cumulative>=0 and simple is None:simple=rnd(D(year-1)+abs(before)/max(D('.000001'),net),1)
  present=net/(1+discount)**year;before=discounted;discounted+=present
  if discounted>=0 and pay is None:pay=rnd(D(year-1)+abs(before)/max(D('.000001'),present),1)
  project.append(noi);equities.append(net);cost+=opex/(1+discount)**year;energy+=gen*1000/(1+discount)**year
  cash.append(dict(year=year,generationMwh=float(gen),revenueMillionToman=float(revenue),opexMillionToman=float(opex),debtServiceMillionToman=float(debt),netCashFlowMillionToman=float(net),cumulativeCashFlowMillionToman=float(cumulative),dscr=float(noi/debt) if debt>0 else None))
 def irr(series):
  if not any(x>0 for x in series) or not any(x<0 for x in series):return None
  def npv(rate):return sum(v/(1+rate)**i for i,v in enumerate(series))
  lo=D('-.95');hi=D(5)
  if npv(lo)*npv(hi)>0:return None
  for _ in range(220):
   mid=(lo+hi)/2
   if npv(mid)>0:lo=mid
   else:hi=mid
  return rnd((lo+hi)*50,1)
 return dict(frameworkNameFa='قرارداد خرید تضمینی ۲۰ ساله ساتبا (SATBA FIT PPA)',tariffPerKwhToman=4200,totalCapexMillionToman=float(cap),equityContributionMillionToman=float(equity),bankLoanMillionToman=float(loan),projectIrrPct=irr(project),equityIrrPct=irr(equities),npvMillionToman=float(discounted),projectNpvMillionToman=float(sum(v/(1+discount)**i for i,v in enumerate(project))),equityNpvMillionToman=float(discounted),economicPolicy=basis,financialAdoptionEligible=False,simplePaybackYears=simple,discountedPaybackYears=pay,paybackStatus='achieved' if simple is not None else 'not_achieved',lcoeTomanPerKwh=rnd(cost*1000000/energy) if energy>0 else None,article16PenaltyAvoidedMillionToman=rnd(D(str(generation))*1000*4200/1000000),summerBlackoutLossPreventedMillionToman=rnd(D(str(capacity))*D('8.5')),cashFlow25Years=cash)
cases=[]
for capacity in [.5,1,5,10,50,1000]:
 for share,interest,term in [(0,0,5),(70,0,6),(70,23,6)]:
  args=[capacity,capacity*1.8,'satba_fit_ppa',4200,share,interest,term,25]
  cases.append(dict(inputs=args,expected=result(capacity,capacity*1.8,share,interest,term,25)))
witness=cases[2]
fixture=dict(schemaVersion=1,independentOfImplementation=True,productionExport='runIranianRegulationFinancialModel',inputs=witness['inputs'],expected=witness['expected'],cases=cases,independentCalculation=__doc__,tolerances=dict(absolute=1e-7,relative=1e-11),referenceSource=dict(title='NREL SAM NPV / independent Decimal pre-tax policy ledger',url='https://samrepo.nlr.gov/help/mtf_npv.html',version='Public help retrieved 2026-11-03; local explicit policy specialization v1',locator='Discounted annual cash flows and year-zero equity; background Short et al. 1995 NREL/TP-462-5173. Local illustrative assumptions explicitly documented; not statutory/SAM parameter validation.'))
Path('scripts/fixtures/physics/iranian-precision-decimal.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2)+'\n')
# Identity only from registry; no numerical production targets read.
registry=json.loads(Path('scripts/physics-reference-evidence.json').read_text())
for r in registry['fixtures']:
 if r['formulaId'].startswith('src/engine/iranianRegulationsFinancial.ts#') and 'precision' in r['fixtureFile']:
  Path(r['fixtureFile']).write_text(json.dumps(dict(fixture,formulaId=r['formulaId'],cases=[]),ensure_ascii=False,indent=2)+'\n')

# Independent custom-policy matrix, sharing only the separately implemented
# Decimal accounting oracle above, never production output.
policy_cases=[]
for capacity in [.5,1,5,10,50,1000]:
 for discount,tariff,opex in [(-5,2,1),(0,12,15),(5,10,8),(20,0,0),(40,-1,-2)]:
  policy=dict(modelPolicy='iranian_screen_economics_v1',currency='TOMAN',rateBasis='nominal',discountRatePct=discount,tariffEscalationPct=tariff,opexEscalationPct=opex)
  args=[capacity,capacity*1.8,'satba_fit_ppa',4200,70,0,6,25,policy]
  policy_cases.append(dict(inputs=args,expected=result(capacity,capacity*1.8,70,0,6,25,policy)))
for capacity in [.5,1,5,10,50,1000]:
 for interest in [1e-9,1e-12,1e-16]:
  policy=dict(modelPolicy='iranian_screen_economics_v1',currency='TOMAN',rateBasis='nominal',discountRatePct=5,tariffEscalationPct=10,opexEscalationPct=8)
  args=[capacity,capacity*1.8,'satba_fit_ppa',4200,70,interest,6,25,policy]
  policy_cases.append(dict(inputs=args,expected=result(capacity,capacity*1.8,70,interest,6,25,policy)))
f=dict(fixture,inputs=policy_cases[2]['inputs'],expected=policy_cases[2]['expected'],cases=policy_cases,independentCalculation=__doc__+' Custom policies independently vary nominal discount and escalation; project NPV excludes debt, equity NPV includes debt. Metadata is contract, not statutory validation.')
Path('scripts/fixtures/physics/iranian-policy-decimal.json').write_text(json.dumps(f,ensure_ascii=False,indent=2)+'\n')
ids=['0b20eb0546ec','0273ec42632a','0e4500dfa723','14302e72d23f','2c21b691d7d4','43b37a8c9b7a','7f053acf18d8','b1c45f04216f','cfb2e3bb6170']
m=json.loads(Path('scripts/physics-reference-evidence.json').read_text())
for identity in ids:
 fid='src/engine/iranianRegulationsFinancial.ts#runIranianRegulationFinancialModel#'+identity
 # Inflation coefficient nodes must execute the omitted-policy branch.
 chosen=fixture if identity in ['2c21b691d7d4','cfb2e3bb6170'] else f
 if identity=='0b20eb0546ec':
  tiny=next(c for c in policy_cases if c['inputs'][0]==10 and c['inputs'][5]==1e-12)
  chosen=dict(f,inputs=tiny['inputs'],expected=tiny['expected'])
 file='scripts/fixtures/physics/iranian-policy-'+identity+'.json'
 Path(file).write_text(json.dumps(dict(chosen,formulaId=fid,cases=[]),ensure_ascii=False,indent=2)+'\n')
 ref=chosen['referenceSource'];m['fixtures']=[r for r in m['fixtures'] if r['formulaId']!=fid]+[dict(formulaId=fid,fixtureFile=file,productionExport='runIranianRegulationFinancialModel',referenceTitle=ref['title'],referenceUrl=ref['url'],referenceVersion=ref['version'],referenceLocator=ref['locator'])]
Path('scripts/physics-reference-evidence.json').write_text(json.dumps(m,indent=2)+'\n')
