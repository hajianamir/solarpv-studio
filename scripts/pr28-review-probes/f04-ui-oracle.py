#!/usr/bin/env python3
"""Verify independently captured real Chromium UI values against its report JSON.
Python Decimal uses the JSON float's shortest decimal spelling, matching the
candidate's documented published-decimal input convention, but implements the
rounding independently. Only the captured scenario is assessed.
"""
import json, math, re, sys
from decimal import Decimal, ROUND_HALF_UP
x=json.load(open(sys.argv[1],encoding='utf-8')); sim=x['sim']
assert len(x['hours'])==len(sim['hourlySteps'])==24
assert 'گرد کردن' in x['disclosure'] and 'مجموع روزانه' in x['disclosure']
assert not x['errors'],x['errors']
def fmt(v):
    d=Decimal(str(v)).quantize(Decimal('0.01'),rounding=ROUND_HALF_UP)
    if d==0:d=abs(d)
    return f'{d:.2f}'
def number(text):
    m=re.search(r'(-?\d+\.\d{2})\s*kWh',text)
    assert m,repr(text)
    return m.group(1)
fields=['solarGenKwh','loadDemandKwh','batteryChargeKwh','batteryDischargeKwh','surplusKwh','deficitKwh']
indices=[1,2,4,5,6,7]
for i,step in enumerate(sim['hourlySteps']):
    row=x['hours'][i]
    for field,idx in zip(fields,indices):
        seen,expected=number(row[idx]),fmt(step[field])
        assert seen==expected,(i,field,seen,expected,step[field])
totals=['totalGeneration24hKwh','totalConsumption24hKwh','totalSurplus24hKwh','totalDeficit24hKwh']
for i,field in enumerate(totals):
    seen,expected=number(x['kpis'][i]),fmt(sim[field])
    assert seen==expected,(field,seen,expected)
# Actual XLSX cells retain the annualized raw 24-hour diagnostic with an
# OOXML two-decimal number format, rather than a pre-rounded numeric value.
annual=sim['totalGeneration24hKwh']*365/1000
xlsx=x['xlsx']
for key in ('summary','diagnostic'):
    assert math.isclose(xlsx[key]['value'],annual,rel_tol=1e-14,abs_tol=1e-14),(key,xlsx[key],annual)
    assert xlsx[key]['numFmt']=='0.00',(key,xlsx[key])
assert math.isclose(xlsx['gross']['value'],annual*1.05,rel_tol=1e-14,abs_tol=1e-14)
assert xlsx['gross']['numFmt']=='0.00'
assert xlsx['diagnostic']['unit']==xlsx['gross']['unit']=='MWh/yr'
assert math.isclose(xlsx['primary']['value'],x['waterfallPrimaryMwh'],rel_tol=1e-14,abs_tol=1e-14)
assert 'independently displayed' in xlsx['disclosure']['value'] and 'raw model values' in xlsx['disclosure']['value']
assert 'گرد' in x['reportDisclosure'] and x['docxDisclosurePresent']
assert not x['docxDiurnalRowPresent'] and not x['reportDiurnalRowPresent']
# Independent Python calculation of the real regulatory table, not a second
# call to the JS reducer. This scenario is nonnegative and away from ties.
assert len(x['annualRows'])==25 and 'گردنشده' in x['regulatoryDisclosure']
for year,text in enumerate(x['annualRows'],1):
    raw=annual*(1-0.0045)**(year-1)
    expected=int(Decimal(str(raw)).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
    assert int(text.replace(',',''))==expected,(year,text,raw,expected)
model=x['regulatoryModel']; flows=model['cashFlow25Years']
cost=model['totalCapexMillionToman']+math.fsum(row['opexMillionToman']/(1.2**row['year']) for row in flows)
raw_energy=math.fsum(annual*(1-0.0045)**(row['year']-1)*1000/(1.2**row['year']) for row in flows)
rounded_energy=math.fsum(row['generationMwh']*1000/(1.2**row['year']) for row in flows)
expected_lcoe=math.floor(cost*1e6/raw_energy+0.5)
old_lcoe=math.floor(cost*1e6/rounded_energy+0.5)
assert model['lcoeTomanPerKwh']==expected_lcoe,(model['lcoeTomanPerKwh'],expected_lcoe)
assert expected_lcoe!=old_lcoe,(expected_lcoe,old_lcoe)
print('PASS: real Chromium pointer-hover UI versus actual exported raw report JSON, separate Python Decimal oracle')
print('24 hours × 6 displayed energy fields = 144 comparisons; four daily KPI comparisons; rounding disclosure present; 0 browser page errors')
print('Actual XLSX: three raw-derived annual diagnostic cells + 0.00 formats/units; primary uses waterfall; DOCX/preview disclosure present; no diagnostic row in this waterfall sample.')
print(f'Actual regulatory UI: 25 annual rows checked; separate raw-energy LCOE oracle {expected_lcoe} vs old rounded-energy {old_lcoe} Toman/kWh.')
print('Scope: one synthetic on-grid project and OOXML metadata, one Chromium/Linux environment; actual Excel renderer, comprehensive finance and battery physics not validated.')
