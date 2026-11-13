#!/usr/bin/env python3
"""Independent Python decimal and compensated-sum checks of randomized F-04 output.
Usage: python3 f04-oracle.py f04-random.json
This checks numeric presentation rules and flow conservation, not real battery physics.
"""
import json, sys, math
from decimal import Decimal, ROUND_HALF_UP, localcontext

with open(sys.argv[1], encoding='utf-8') as f:
    data=json.load(f)
eps=2.220446049250313e-16

def rounding_text(text):
    with localcontext() as ctx:
        ctx.prec=100
        x=Decimal(text).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if x==0: x=abs(x)
        return f'{x:.2f}'

def bound(values, operations=64):
    n=operations*eps
    return n/(1-n)*math.fsum(abs(x) for x in values)+4*eps*max([1.0]+[abs(x) for x in values])

for i, row in enumerate(data['roundings']):
    expected=rounding_text(row['decimal'])
    assert row['actual']==expected, (i,row,expected)

max_diff=0.0
max_display=Decimal(0)
fields=[('solarGenKwh','totalGeneration24hKwh'),('loadDemandKwh','totalConsumption24hKwh'),('surplusKwh','totalSurplus24hKwh'),('deficitKwh','totalDeficit24hKwh')]
for i,case in enumerate(data['cases']):
    args=case['args']; result=case['result']; hours=result['hourlySteps']
    assert len(hours)==24
    for field,totalfield in fields:
        vals=[x[field] for x in hours]; total=result[totalfield]
        raw=math.fsum(vals); difference=abs(raw-total); max_diff=max(max_diff,difference)
        assert difference<=bound(vals), (i,field,difference,bound(vals))
        displayed=sum((Decimal(rounding_text(str(x))) for x in vals),Decimal(0))
        displayed_total=Decimal(rounding_text(str(total)))
        delta=abs(displayed-displayed_total);max_display=max(max_display,delta)
        assert delta<=Decimal('0.125')+Decimal(str(difference)), (i,field,delta,difference)
    expected_gen=args[0]*args[1]*args[8] if args[7]>0 else 0.0
    actual_gen=math.fsum(x['solarGenKwh'] for x in hours)
    assert abs(actual_gen-expected_gen)<=bound([x['solarGenKwh'] for x in hours],128), (i,'generation model')
    actual_load=math.fsum(x['loadDemandKwh'] for x in hours)
    assert abs(actual_load-(args[2]+args[3]))<=bound([x['loadDemandKwh'] for x in hours],128), (i,'load model')
    for h in hours:
        gen,load=h['solarGenKwh'],h['loadDemandKwh'];net=gen-load
        scale=max(1.0,*(abs(h[k]) for k in ['solarGenKwh','loadDemandKwh','batteryChargeKwh','batteryDischargeKwh','surplusKwh','deficitKwh']))
        if net>=0:
            assert abs(net-h['batteryChargeKwh']-h['surplusKwh'])<=16*eps*scale, (i,h['hour'],'positive flow')
            assert h['batteryDischargeKwh']==0 and h['deficitKwh']==0
        else:
            assert abs(-net-h['batteryDischargeKwh']-h['deficitKwh'])<=16*eps*scale, (i,h['hour'],'negative flow')
            assert h['batteryChargeKwh']==0 and h['surplusKwh']==0
print(f'Independent Python Decimal ROUND_HALF_UP oracle: {len(data["roundings"])} format cases')
print(f'Independent math.fsum/model + 24 hourly flow identities: {len(data["cases"])} cases')
print(f'Largest |raw fsum - total|: {max_diff} kWh; largest oracle display discrepancy: {max_display} kWh')
print('Failures: 0; this is finite sampled coverage, not full independent battery-physics validation.')
