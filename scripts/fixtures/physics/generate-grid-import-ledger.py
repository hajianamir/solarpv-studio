"""Independent Decimal ledger: no TS imports, production executions or outputs.

Zero-capital and nonzero-capital cases isolate purchase costs and the
output-sensitive fixed-charge terms. No production numbers are read.
Fixture business inputs are explicit test policy, NOT SSC default parameters.
SSC singleowner purchase bill is a separate recurring cash outflow. Basic flat
rate fixture specializes that accounting to Q*t, escalated by (1+g)^(year-1).
Full output metadata below is contract-only; all numeric targets use Decimal
arithmetic or explicit input/clamping policy. Never run TS to generate targets.
"""
from decimal import Decimal as D, ROUND_HALF_UP
from pathlib import Path
import copy,json,sys
ROOT=Path(__file__).resolve().parents[3]
UNDEFINED={'$undefined':True}
def rounded(x):return int(D(str(x)).quantize(D('1'),rounding=ROUND_HALF_UP))
# Deliberately zero all capital/infrastructure capacities and prices; this
# isolates new grid-bill nodes; separate capital case exercises nonzero fixed costs.
P={k:0 for k in ('moduleUsdPerWp','inverterUsdPerKw','batteryUsdPerKwh','structureUsdPerWp','cablingBopUsdPerWp','substationUsdPerMva','epcLaborUsdPerKw','annualOpexPctOfCapex','discountRatePct','dieselGenSetCapexUsd','dieselAnnualFuelLiters','dieselAnnualRunHours','dieselFuelConsumptionLitersPerHour','dieselFuelPriceTomanPerLiter','dieselAnnualServiceOpexUsd','hvConnectionUsdPerKva','contingencyCapexPct','ppaTariffTomanPerKwh','offgridAvoidedCostTomanPerKwh','landLeaseUsdPerKwpYear','gridOperatorFeeUsdPerKwpYear','annualDegradationRate','inverterReplacementCostRatio','opexEscalationPct','selfConsumptionRatioPct','gridExportTariffTomanPerKwh','offgridServedLoadKwhAnnual','offgridDailyLoadKwh','substationTransformerMva')}
P.update(annualGridImportKwh=100,gridTariffTomanPerKwh=2,usdToTomanRate=1,tariffEscalationPct=10,includeDieselGenSet=False,plantPowerFactor=1,inverterReplacementYear=None,batteryChemistry='lifepo4',batteryLifespanYears=12,customerType='custom',escalateFixedChargesWithOpex=False,includeResidualSalvageValue=True,inverterLifespanYears=15)
SOURCE=dict(title='SSC singleowner separate utility-purchase bill with independent Decimal flat-rate ledger',url='https://github.com/NatLabRockies/ssc/blob/6ce13d26f44b3a21f7bf0fbb5b1e3f3f80cf3860/ssc/cmod_singleowner.cpp',version='SSC 6ce13d26f44b3a21f7bf0fbb5b1e3f3f80cf3860; flat-rate test specialization v1',locator='utility_bill_w_sys / cf_utility_bill; separate purchases and sales. Local explicit test policies: finite clamp [0,1e12], zero capital, two years, stated tariff escalation; not claimed SSC defaults.')

def ledger(default=False,capital=False):
    q=D(0 if default else 100);tariff=D(3800 if default else 2);rate=D('.15' if default else '.10');discount=D('.18' if default else 0);degrade=D('.005' if default else 0);energy=D(1000 if default else 100);ppa=D(2800 if default else 0);currency=D(90000 if default else 1)
    capex={'systemMode':'powerplant'}
    for k in ('pvModules','inverters','batteries','structures','cablesAndProtection','substationMv','gridInterconnection','hvConnection','dieselGenSet','engineeringAndInstallation','contingency'):
        capex[k+'Usd']=0;capex[k+'Toman']=0
    capex.update(batteryReplacementYear12Usd=0,totalCapexUsd=0,totalCapexToman=0,isReconciled=True)
    cap=D(1000 if capital else 0);base=D(100 if capital else 0)
    if capital:capex.update(pvModulesUsd=1000,pvModulesToman=1000,totalCapexUsd=1000,totalCapexToman=1000)
    row0=dict(year=0,capexToman=0,generationKwh=0,revenueToman=0,opexToman=0,fuelCostToman=0,batteryReplacementToman=0,inverterReplacementToman=0,netCashFlowToman=0,cumulativeCashFlowToman=0,discountedCashFlowToman=0)
    if capital:row0.update(capexToman=1000,netCashFlowToman=-1000,cumulativeCashFlowToman=-1000,discountedCashFlowToman=-1000)
    rows=[];cumulative=-cap;npv=-cap;costs=cap;energies=D(0)
    for year in (1,2):
        generation=energy*(1-degrade)**(year-1);revenue=generation*ppa*(1+rate)**(year-1);bill=q*tariff*(1+rate)**(year-1)+base*D(2)**(year-1)+(D(30) if capital else D(0));net=revenue-bill;present=net/(1+discount)**year
        cumulative+=net;npv+=present;costs+=D(rounded(bill))/(1+discount)**year;energies+=D(rounded(generation))/(1+discount)**year
        rows.append(dict(year=year,capexToman=0,generationKwh=rounded(generation),revenueToman=rounded(revenue),opexToman=rounded(bill),fuelCostToman=0,batteryReplacementToman=0,inverterReplacementToman=0,salvageCreditToman=0,netCashFlowToman=rounded(net),cumulativeCashFlowToman=rounded(cumulative),discountedCashFlowToman=rounded(present)))
    payback=dict(years=0 if default else None,status='NOT_ACHIEVED_WITHIN_HORIZON' if capital else 'INVALID_INPUT',formattedYears='0 yrs' if default else '>2 yrs (N/A)')
    # Revenue-only zero-capital case or all-negative ledger: IRR/MIRR undefined.
    result=dict(systemMode='powerplant',systemKwp=1 if capital else 0,batteryKwh=0,inverterKw=0,capexBreakdown=capex,annualGridImportKwh=int(q),annualGridImportCostToman=int(q*tariff),annualEnergyYieldKwh=int(energy),annualOpexUsd=int(base),annualOpexToman=int(base),annualRevenueToman=rounded(energy*ppa),annualRevenueUsd=rounded(energy*ppa/currency),simplePaybackPeriodYears=payback['years'],discountedPaybackPeriodYears=payback['years'],simplePayback=payback,discountedPayback=payback,lcoeUsdPerKwh=float((costs/energies/currency).quantize(D('.0001'))),lcoeTomanPerKwh=rounded(costs/energies),isLcoeDefined=True,
        batteryReplacementNotesFa='زمان‌بندی تعویض باتری‌ها بر اساس فرض تقویمی ساده (12 سال برای شیمی lifepo4) لحاظ شده است.',dieselFuelCostUsd=0,dieselOpexUsd=0,dieselEstimatedAnnualFuelLiters=0,batteryReplacementCostUsd=0,costOfEnergyServedUsdPerKwh=float((cap/2/energy+base/energy+q*tariff/currency/energy+(D(30)/energy if capital else D(0))).quantize(D('.000001'))),costOfEnergyServedProxyUsdPerKwh=float((cap/2/energy+base/energy+q*tariff/currency/energy+(D(30)/energy if capital else D(0))).quantize(D('.000001'))),costOfEnergyServedStatus='GRID_DELIVERED',costOfEnergyServedNoteFa='محاسبه‌شده بر اساس تفکیک هزینه‌های سالانه‌شده سرمایه‌ای و جاری.',costOfEnergyServedNoteEn='Calculated from annualized capital recovery and recurring operational expenses.',activeModeTariffTomanPerKwh=int(ppa),ppaTariffTomanPerKwh=int(ppa),gridTariffTomanPerKwh=int(tariff),offgridAvoidedCostTomanPerKwh=21600 if default else 0,landLeaseAnnualUsd=10 if capital else 0,gridOperatorFeeAnnualUsd=20 if capital else 0,npvUsd=rounded(npv/currency),npvToman=rounded(npv),irrPct=None,irrStatus='NO_SIGN_CHANGE',isIrrDefined=False,irrRootsPct=UNDEFINED,mirrPct=None,residualSalvageToman=UNDEFINED if default else 0,residualSalvageUsd=UNDEFINED if default else 0,annualCo2ReductionTons=rounded(energy*D('.00062')),lifetime25yCo2ReductionTons=rounded(energy*D('.00062')*2*D('.94')),year0CashFlow=row0,cashFlow25Years=rows,cashFlowWithYear0=[row0,*rows],isCashFlowReconciled=True,
        assumptionsMetadata=dict(modelScope='PRE_TAX_PRELIMINARY_SCREENING',discountRatePct=18 if default else 0,tariffEscalationPct=15 if default else 10,annualDegradationPct=.5 if default else 0,annualOpexPctOfCapex=1.2 if default else 10 if capital else 0,plantPowerFactor=.95 if default else 1,usdToTomanRate=int(currency),activeModeTariffUnit='Toman/kWh',activeModeTariffValue=int(ppa),standardsReference='NREL SAM 2023.12 / IRENA Renewable Costing / SATBA PPA Regulations',citationDate='2026-11-05'),opexEscalationPct=8 if default else 100 if capital else 0,selfConsumptionRatioPct=0,gridExportTariffTomanPerKwh=3800 if default else 0,customerType=UNDEFINED if default else 'custom',selfConsumedYieldKwh=0,exportedYieldKwh=int(energy))
    return result

def generate(check=False):
    def store(path,text):
        if check:
            if path.read_text(encoding='utf-8')!=text:raise SystemExit('Independent fixture differs from Decimal generator: '+str(path))
        else:path.write_text(text,encoding='utf-8')
    capitalPricing=dict(P,moduleUsdPerWp=1,annualOpexPctOfCapex=10,opexEscalationPct=100,landLeaseUsdPerKwpYear=10,gridOperatorFeeUsdPerKwpYear=20)
    specs=[('performFinancialAnalysis','07cbbf982780',[0,0,0,100,P,2,'powerplant'],ledger()),('performFinancialAnalysis','2abf8b390bac',[0,0,0,1000,None,2,'powerplant'],ledger(True)),('performFinancialAnalysis','535a26248a84',[1,0,0,100,capitalPricing,2,'powerplant'],ledger(capital=True)),('performFinancialAnalysis','a67c22a299a1',[1,0,0,100,capitalPricing,2,'powerplant'],ledger(capital=True))]
    for suffix,value,target in [('488ab5156c0e',-1,0),('4a0793d3b20d','invalid',0),('9c94a974a0ee',2e12,1e12)]:
        given=copy.deepcopy(P);given['annualGridImportKwh']=value;expected=copy.deepcopy(P);expected['annualGridImportKwh']=target
        specs.append(('sanitizeFinancialPricing',suffix,[given],expected))
    records=[]
    for owner,suffix,inputs,expected in specs:
        ident=f'src/engine/financialEngine.ts#{owner}#{suffix}';name=f'scripts/fixtures/physics/grid-import-{suffix}.json'
        fixture=dict(schemaVersion=1,formulaId=ident,independentOfImplementation=True,productionExport=owner,inputs=inputs,expected=expected,expectedEncoding='js-undefined-v1',independentCalculation=__doc__+' Generator: scripts/fixtures/physics/generate-grid-import-ledger.py. Import100*tariff2=200 first-year; year2=220; discounted at zero: NPV=-420, energy=200, LCOE=2.1, recurring first-year proxy=2. Nonzero-capital case: capital1000, OPEX100/200, fixed30, purchase200/220 => costs330/450, NPV=-1780, LCOE=8.9 and first-year annualized proxy=8.3. Separate default-policy case with missing import validates zero fallback and revenue-only ledger. All nonzero default-policy input prices are explicit documented application policy, not independent field evidence.',tolerances=dict(absolute=1e-7,relative=1e-10),referenceSource=SOURCE)
        store(ROOT/name,json.dumps(fixture,ensure_ascii=False,indent=2)+'\n')
        records.append(dict(formulaId=ident,fixtureFile=name,productionExport=owner,referenceTitle=SOURCE['title'],referenceUrl=SOURCE['url'],referenceVersion=SOURCE['version'],referenceLocator=SOURCE['locator']))
    manifest=ROOT/'scripts/physics-reference-evidence.json';data=json.loads(manifest.read_text(encoding='utf-8'));ids={r['formulaId'] for r in records};data['fixtures']=[r for r in data['fixtures'] if r['formulaId'] not in ids]+records;store(manifest,json.dumps(data,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':generate('--check' in sys.argv)
