"""Independent exact-decimal dimensional arithmetic; no production imports/network.
The coefficient values are deliberately illustrative test inputs, not official tariffs.
"""
from decimal import Decimal as D, getcontext
from pathlib import Path
import itertools
import json
import sys
getcontext().prec = 60
root = Path(__file__).resolve().parents[2]
source = {'title': 'Independent 60-digit Decimal dimensional arithmetic for explicitly assumed screening rates',
          'url': 'https://docs.python.org/3/library/decimal.html',
          'version': 'Python decimal, precision 60',
          'locator': 'MWh * 1000 kWh/MWh * Toman/kWh / 1000000 Toman/million; kWp * million Toman/kWp. Exact decimal unit conversion, not tariff/avoided-loss validation.'}
cases = []
for capacity, generation, rate, outage in itertools.product(['0', '.5', '1', '5', '10', '50', '1000'],
        ['0', '.9', '11.8', '1800.12345'], ['0', '4200', '5432.1'], ['0', '8.5']):
    inp = {'modelPolicy':'iranian_benefit_indicators_full_precision_v1', 'capacityKwp':float(capacity),
           'annualGenerationMwh':float(generation),'penaltyRateTomanPerKwh':float(rate),
           'outageLossMillionTomanPerKwp':float(outage)}
    expected = {'modelPolicy':inp['modelPolicy'],'input':inp,
        'article16PenaltyAvoidanceProxyMillionToman':float(D(generation)*D(1000)*D(rate)/D(1000000)),
        'outageLossProxyMillionToman':float(D(capacity)*D(outage)),
        'unit':'MILLION_TOMAN','assumptionBasis':'illustrative_rates_not_verified_statutory_or_realized_savings',
        'financialAdoptionEligible':False}
    cases.append({'inputs':[inp],'expected':expected})
fixture = {'schemaVersion':1,'independentOfImplementation':True,
    'productionExport':'evaluateIranianBenefitIndicators','referenceSource':source,
    'independentCalculation':'60-digit Decimal products and exact base-unit conversion. Full Cartesian pool generated without reading/importing production code. Assumed coefficients are not official/field evidence.',
    'tolerances':{'absolute':1e-15,'relative':5e-15},'cases':cases}
text=json.dumps(fixture,indent=2,ensure_ascii=False,allow_nan=False)+'\n'
output=root/'scripts/fixtures/physics/iranian-benefit-indicators-decimal.json'
if '--check' in sys.argv:
    assert output.read_text()==text, 'Independent reference bytes changed'
else:
    output.write_text(text)
print(f'PASS independent Decimal reference: {len(cases)} benefit-indicator cases')
