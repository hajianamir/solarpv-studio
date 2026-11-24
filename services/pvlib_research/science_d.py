"""D bounded research: no automatic energy/finance adoption, provider or tools."""
import calendar
import json
import math
import re
from datetime import datetime,timedelta,timezone
from .portfolio import bounded,numeric_fields,integer,stamps,result
from .electrical import keys
from .thermal import digest

PVD_REFERENCE='https://github.com/NatLabRockies/PVDegradationTools/blob/3e77ab77ba804e592112380d713673b1f3880054/pvdeg/degradation.py'


def header(p,version,fields):
    bounded(p,('schemaVersion','source','contextSha256',*fields))
    if p['schemaVersion']!=version or not isinstance(p['contextSha256'],str) or not re.fullmatch('[a-f0-9]{64}',p['contextSha256']):raise ValueError('Version/context')


def out(p,op,data,scope):
    return result(p,op,dict(**data,scope=scope),'insufficient_evidence')


def degradation_exposure(p):
    header(p,'degradation-exposure-v1',('intervalHours','activationEnergyKjMol','referenceTemperatureC','referenceRhPct','humidityExponent','referenceHazardPerHour','baseEnergyBasis','alreadyAppliedMechanisms','records'))
    numeric_fields(p,dict(intervalHours=(.01,24),activationEnergyKjMol=(0,150),referenceTemperatureC=(-40,100),referenceRhPct=(.1,100),humidityExponent=(0,5),referenceHazardPerHour=(0,.01)))
    if p['baseEnergyBasis']!='undegraded' or p['alreadyAppliedMechanisms']!=[]:raise ValueError('Double-degradation guard')
    if not isinstance(p['records'],list) or not 1<=len(p['records'])<=8784:raise ValueError('Exposure budget')
    stamps(p['records'],p['intervalHours']);hazard=0.;trace=[]
    for r in p['records']:
        keys(r,('timestamp','temperatureC','rhPct'));numeric_fields(r,dict(temperatureC=(-40,100),rhPct=(0,100)))
        af=(r['rhPct']/p['referenceRhPct'])**p['humidityExponent']*math.exp(p['activationEnergyKjMol']/ .00831446261815324*(1/(p['referenceTemperatureC']+273.15)-1/(r['temperatureC']+273.15)))
        rate=p['referenceHazardPerHour']*af;h=rate*p['intervalHours'];start=math.exp(-hazard);hazard+=h
        mean=start*(-math.expm1(-h)/h if h else 1.)
        trace.append(dict(timestamp=r['timestamp'],accelerationFactor=af,hazardIncrement=h,cumulativeHazard=hazard,endRetention=math.exp(-hazard),meanRetention=mean))
    return out(p,'degradation_exposure',dict(trace=trace,finalRetention=trace[-1]['endRetention'],rulStatus='blocked_missing_failure_calibration',equationReference=PVD_REFERENCE), 'Selected normalized Arrhenius/RH rate relation with caller first-order retention law; not a PVDeg package adapter, fitted failure mechanism, calibrated RUL or energy correction. Source declarations cannot prove baseline is undegraded.')


def circular_lca(p):
    header(p,'circular-lca-v1',('functionalUnit','deliveredEnergyKwh','boundary','allocation','manufacturingYield','secondaryInputFraction','collectionFraction','reuseFraction','recyclingYield','manufacturingCostPerKg','eolCostPerKg','currency','factors','cohorts'))
    numeric_fields(p,dict(deliveredEnergyKwh=(.001,1e15),manufacturingYield=(.01,1),secondaryInputFraction=(0,1),collectionFraction=(0,1),reuseFraction=(0,1),recyclingYield=(0,1),manufacturingCostPerKg=(0,1e6),eolCostPerKg=(0,1e6)))
    if p['functionalUnit']!='kgCO2e_per_delivered_kWh' or p['boundary']!='cradle_to_eol' or p['allocation']!='cutoff_no_credit':raise ValueError('LCA boundary/allocation/unit')
    if not isinstance(p['currency'],str) or not re.fullmatch('[A-Z]{3}',p['currency']):raise ValueError('Explicit currency code')
    keys(p['factors'],('virgin','secondary','manufacturing','eol'))
    for f in p['factors'].values():
        keys(f,('low','central','high','source','license','unit'));numeric_fields(f,dict(low=(0,1e6),central=(0,1e6),high=(0,1e6)))
        if not f['low']<=f['central']<=f['high'] or f['unit']!='kgCO2e_per_kg':raise ValueError('Factor interval/unit')
        for k in ('source','license'):
            if not isinstance(f[k],str) or not 3<=len(f[k].strip())<=1000:raise ValueError('Factor provenance')
    if not isinstance(p['cohorts'],list) or not 1<=len(p['cohorts'])<=100:raise ValueError('Cohort budget')
    trace=[];seen=set()
    for c in p['cohorts']:
        keys(c,('id','installedYear','installedKg','retirements'))
        if not isinstance(c['id'],str) or not re.fullmatch('[A-Za-z0-9_-]{1,40}',c['id']) or c['id'] in seen:raise ValueError('Unique cohort id')
        seen.add(c['id']);integer(c['installedYear'],1900,2200);numeric_fields(c,dict(installedKg=(0,1e12)))
        if not isinstance(c['retirements'],list) or len(c['retirements'])>101:raise ValueError('Retirement budget')
        retired=0.;last=c['installedYear']-1
        for r in c['retirements']:
            keys(r,('year','kg'));integer(r['year'],c['installedYear'],2300);numeric_fields(r,dict(kg=(0,1e12)))
            if r['year']<=last:raise ValueError('Retirement years increasing')
            retired+=r['kg'];last=r['year']
        if retired>c['installedKg']:raise ValueError('Overretirement')
        feed=c['installedKg']/p['manufacturingYield'];scrap=feed-c['installedKg'];secondary=feed*p['secondaryInputFraction'];virgin=feed-secondary
        collected=retired*p['collectionFraction'];reuse=collected*p['reuseFraction'];recycling_feed=collected-reuse;recycled=recycling_feed*p['recyclingYield'];disposed=retired-reuse-recycled
        trace.append(dict(id=c['id'],installedKg=c['installedKg'],feedstockKg=feed,virginKg=virgin,secondaryKg=secondary,manufacturingScrapKg=scrap,retiredKg=retired,inUseKg=c['installedKg']-retired,collectedKg=collected,reusedKg=reuse,recyclingFeedKg=recycling_feed,recycledKg=recycled,disposedKg=disposed,manufacturingResidualKg=feed-c['installedKg']-scrap,eolResidualKg=retired-reuse-recycled-disposed))
    totals={k:sum(row[k] for row in trace) for k in trace[0] if k!='id'}
    masses=dict(virgin=totals['virginKg'],secondary=totals['secondaryKg'],manufacturing=totals['feedstockKg'],eol=totals['retiredKg'])
    impacts={s:sum(masses[k]*p['factors'][k][s] for k in masses) for s in ('low','central','high')}
    costs=dict(manufacturing=totals['feedstockKg']*p['manufacturingCostPerKg'],eol=totals['retiredKg']*p['eolCostPerKg'])
    return out(p,'circular_lca',dict(cohorts=trace,totals=totals,impactKgCO2e=impacts,functionalImpact={k:v/p['deliveredEnergyKwh'] for k,v in impacts.items()},costs={**costs,'total':sum(costs.values()),'currency':p['currency']},lifecycleCoverage='partial_observed_retirements' if totals['inUseKg']>0 else 'closed_declared_lifecycle',uncertainty='deterministic_factor_bounds_not_confidence_interval'), 'Explicit cohort cutoff ledger, not PV ICE engine/inventory or certified LCA. Manufacturing scrap exits boundary with no recovery credit; reuse and recycled outputs receive no avoided-burden credit. Unretired stock has no future EOL impact included. Caller factors must include declared process burdens without overlap; transport/use omitted unless embedded in factors. Costs separate, undiscounted, no financial adoption.')


def bill_ensemble(p):
    header(p,'bill-ensemble-v1',('unit','timeBasis','months','shapes'))
    if p['unit']!='kWh' or p['timeBasis']!='fixed_UTC_no_DST':raise ValueError('Explicit energy/time units')
    if not isinstance(p['months'],list) or not 1<=len(p['months'])<=12 or not isinstance(p['shapes'],list) or not 1<=len(p['shapes'])<=3:raise ValueError('Ensemble budget')
    month_data=[];last=None
    for m in p['months']:
        keys(m,('month','energyKwh'));numeric_fields(m,dict(energyKwh=(0,1e9)))
        if not isinstance(m['month'],str) or not re.fullmatch(r'20\d\d-(0[1-9]|1[0-2])',m['month']):raise ValueError('Month format 2000-2099')
        year,month=map(int,m['month'].split('-'));ordinal=year*12+month
        if last is not None and ordinal!=last+1:raise ValueError('Contiguous unique months')
        last=ordinal;days=calendar.monthrange(year,month)[1];month_data.append((m,year,month,days))
    seen=set();members=[]
    for s in p['shapes']:
        keys(s,('id','source','hourWeights'))
        if not isinstance(s['id'],str) or not re.fullmatch('[A-Za-z0-9_-]{1,40}',s['id']) or s['id'] in seen:raise ValueError('Unique shape')
        seen.add(s['id'])
        if not isinstance(s['source'],str) or not 10<=len(s['source'].strip())<=1000:raise ValueError('Shape provenance')
        weights=s['hourWeights']
        if not isinstance(weights,list) or len(weights)!=24 or any(type(x) not in (int,float) or not math.isfinite(x) or not 0<=x<=1e6 for x in weights) or sum(weights)<=0:raise ValueError('Positive daily shape weights')
        records=[];monthly=[]
        for m,year,month,days in month_data:
            start=datetime(year,month,1,tzinfo=timezone.utc);scale=m['energyKwh']/(days*sum(weights));values=[weights[h%24]*scale for h in range(days*24)]
            # Correct only roundoff, never assign a profile inconsistent with the weights.
            positive=next(i for i in range(len(values)-1,-1,-1) if weights[i%24]>0);values[positive]+=m['energyKwh']-math.fsum(values)
            for h,v in enumerate(values):records.append(dict(timestamp=(start+timedelta(hours=h)).isoformat().replace('+00:00','Z'),energyKwh=v))
            total=math.fsum(values);monthly.append(dict(month=m['month'],energyKwh=total,residualKwh=total-m['energyKwh']))
        members.append(dict(id=s['id'],records=records,monthly=monthly,totalKwh=math.fsum(x['energyKwh'] for x in records)))
    return out(p,'bill_ensemble',dict(members=members,timeBasis=p['timeBasis'],identifiability='monthly_energy_does_not_identify_hourly_load',annualEnergyAdoption=False), 'Caller-shaped synthetic hourly energy ensemble; not meter data, probabilistic confidence bounds, measured peaks or tariff/bill savings. Fixed UTC without daylight-saving transitions. Explicit external adoption gates would be required; none are activated here.')


def grounded_scenario(p):
    header(p,'grounded-scenario-v1',('snapshot','command'))
    s=p['snapshot'];keys(s,('id','pvCapacityKwp','batteryCapacityKwh'));numeric_fields(s,dict(pvCapacityKwp=(0,1e6),batteryCapacityKwh=(0,1e7)))
    if not isinstance(s['id'],str) or not re.fullmatch('[A-Za-z0-9_-]{1,40}',s['id']):raise ValueError('Snapshot id')
    c=p['command'];keys(c,('kind','field','value'))
    if c['kind']!='propose_set' or c['field'] not in ('pvCapacityKwp','batteryCapacityKwh'):raise ValueError('Typed read-only command')
    numeric_fields(c,dict(value=(0,1e6 if c['field']=='pvCapacityKwp' else 1e7)))
    field=c['field'];proposal={**s,field:c['value']};diff=dict(field=field,before=s[field],after=c['value'])
    return out(p,'grounded_scenario',dict(snapshotCanonicalJson=json.dumps(s,sort_keys=True,separators=(',',':'),allow_nan=False),snapshotSha256=digest(s),proposal=proposal,diff=diff,undo=dict(kind='propose_set',field=field,value=s[field]),facts=[dict(key=k,value=s[k],unit='kWp' if k=='pvCapacityKwp' else 'kWh') for k in ('pvCapacityKwp','batteryCapacityKwh')],execution='proposal_only',provider='none_offline',financeMutation=False,energyAdoption=False), 'Deterministic typed proposal and snapshot-grounded facts only, not an LLM, feasibility/finance advice or command executor. No prompt, model, tools, apply endpoint or network provider.')
