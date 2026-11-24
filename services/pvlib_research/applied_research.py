"""Bounded applied evaluators; no automatic financial/annual-energy adoption."""
import calendar
from datetime import datetime,timedelta,timezone
import hashlib
from importlib import resources
from importlib.metadata import version
import json
import math
from pathlib import Path
import re
from zoneinfo import ZoneInfo
import numpy as np
from .electrical import keys
from .portfolio import numeric_fields,integer,result
from .science_d import header
from .reference_models import evidence,DATA

ZONES=('UTC','America/New_York','Europe/Berlin','Asia/Tehran','Asia/Kolkata','Australia/Lord_Howe')


def local_zone(name):
    if name not in ZONES:raise ValueError('Registered timezone only')
    if version('tzdata')!='2025.2':raise RuntimeError('Pinned tzdata2025.2 required')
    raw=resources.files('tzdata.zoneinfo').joinpath(*name.split('/')).read_bytes()
    import io
    return ZoneInfo.from_file(io.BytesIO(raw),key=name),hashlib.sha256(raw).hexdigest()


def bill_local_ensemble(p):
    header(p,'bill-local-ensemble-v1',('unit','calendar','timeZone','intervalMinutes','months','shapes'))
    if p['unit']!='kWh' or p['calendar']!='gregorian' or p['intervalMinutes'] not in (30,60) or type(p['intervalMinutes']) is not int:raise ValueError('Explicit unit/calendar/step')
    zone,zone_hash=local_zone(p['timeZone'])
    if not isinstance(p['months'],list) or not 1<=len(p['months'])<=12 or not isinstance(p['shapes'],list) or not 1<=len(p['shapes'])<=3:raise ValueError('Local bill budget')
    grids=[];previous=None;dt=timedelta(minutes=p['intervalMinutes'])
    def boundary(year,month):
        naive=datetime(year,month,1);local=naive.replace(tzinfo=zone)
        if local.astimezone(timezone.utc).astimezone(zone).replace(tzinfo=None)!=naive or local.utcoffset()!=naive.replace(tzinfo=zone,fold=1).utcoffset():raise ValueError('Ambiguous/nonexistent month boundary')
        return local.astimezone(timezone.utc)
    for m in p['months']:
        keys(m,('month','energyKwh'));numeric_fields(m,dict(energyKwh=(0,1e9)))
        if not isinstance(m['month'],str) or not re.fullmatch(r'20\d\d-(0[1-9]|1[0-2])',m['month']):raise ValueError('Gregorian month 2000..2099')
        y,mo=map(int,m['month'].split('-'));ordinal=y*12+mo
        if previous is not None and ordinal!=previous+1:raise ValueError('Contiguous unique months')
        previous=ordinal;start=boundary(y,mo);end=boundary(y+mo//12,mo%12+1);count=(end-start)/dt
        if not count.is_integer():raise ValueError('Offset transition incompatible with step')
        grid=[]
        for i in range(int(count)):
            stamp=start+i*dt;local=stamp.astimezone(zone);offset=local.utcoffset().total_seconds()/60
            if local.minute%p['intervalMinutes']!=0:raise ValueError('Timezone offset/transition outside sampling grid')
            grid.append(dict(timestamp=stamp.isoformat().replace('+00:00','Z'),localTimestamp=local.isoformat(),localHour=local.hour,fold=local.fold,offsetMinutes=int(offset),durationHours=p['intervalMinutes']/60))
        grids.append((m,grid))
    seen=set();members=[]
    for shape in p['shapes']:
        keys(shape,('id','source','hourWeights'))
        if not isinstance(shape['id'],str) or not re.fullmatch('[A-Za-z0-9_-]{1,40}',shape['id']) or shape['id'] in seen:raise ValueError('Unique shape')
        seen.add(shape['id'])
        if not isinstance(shape['source'],str) or not 10<=len(shape['source'].strip())<=1000:raise ValueError('Shape source')
        w=shape['hourWeights']
        if not isinstance(w,list) or len(w)!=24 or any(type(v) not in (int,float) or not math.isfinite(v) or not 0<=v<=1e6 for v in w) or sum(w)<=0:raise ValueError('Hourly shape weights')
        records=[];monthly=[]
        for m,grid in grids:
            weights=[w[r['localHour']]*r['durationHours'] for r in grid];denom=math.fsum(weights)
            if denom<=0:raise ValueError('Zero exposure in local month')
            values=[m['energyKwh']*v/denom for v in weights];last=next(i for i in range(len(weights)-1,-1,-1) if weights[i]>0);values[last]+=m['energyKwh']-math.fsum(values)
            records.extend(dict(**r,energyKwh=v) for r,v in zip(grid,values));total=math.fsum(values)
            monthly.append(dict(month=m['month'],hours=len(grid)*p['intervalMinutes']/60,energyKwh=total,residualKwh=total-m['energyKwh']))
        members.append(dict(id=shape['id'],records=records,monthly=monthly,totalKwh=math.fsum(r['energyKwh'] for r in records)))
    return result(p,'bill_local_ensemble',dict(timeZone=p['timeZone'],tzdataVersion='2025.2',ianaVersion='2025b',zoneFileSha256=zone_hash,members=members,identifiability='monthly_energy_does_not_identify_hourly_load',annualEnergyAdoption=False,scope='Gregorian local-month synthetic energy ensemble with pinned IANA timezone and explicit interval. Caller shapes, not measured load, tariff savings or probabilistic intervals. Unsupported/ambiguous month boundaries and off-grid transitions fail closed. No automatic annual-energy/financial adoption.'),'insufficient_evidence')


def weather_for(p):
    w=p['weather']
    if not isinstance(w,dict):raise ValueError('Weather object required')
    if w.get('kind')=='registered_psm3':
        keys(w,('kind',));paths=['docs/reference-data/pvdeg/weather.csv','docs/reference-data/pvlib/forcing.json','docs/reference-data/pvlib/LICENSE.txt'];hashes=evidence(paths);forcing=json.loads((DATA/'pvlib/forcing.json').read_text());g=np.array(forcing['poaWm2']);t=np.array(forcing['cellC']);year=forcing['year']
    elif w.get('kind')=='constant_reference':
        keys(w,('kind','year','poaWm2','cellC'));integer(w['year'],2000,2099);numeric_fields(w,dict(poaWm2=(0,1500),cellC=(-40,90)));year=w['year'];hours=8784 if calendar.isleap(year) else 8760;g=np.full(hours,w['poaWm2']);t=np.full(hours,w['cellC']);hashes={}
    else:raise ValueError('Weather contract')
    if len(g)!=(8784 if calendar.isleap(year) else 8760) or len(g)!=len(t) or not np.isfinite(g).all() or not np.isfinite(t).all() or np.any((g<0)|(g>1500)|(t< -40)|(t>90)):raise ValueError('Frozen annual forcing coverage/domain')
    return g,t,year,hashes


def pv_lcoe_scenarios(p):
    header(p,'pv-lcoe-scenarios-v1',('weather','currency','years','realDiscountRate','annualDegradationFraction','baseEnergyBasis','alreadyAppliedMechanisms','scenarios'))
    integer(p['years'],1,50);numeric_fields(p,dict(realDiscountRate=(0,.3),annualDegradationFraction=(0,.05)))
    if not isinstance(p['currency'],str) or not re.fullmatch('[A-Z]{3}',p['currency']) or p['baseEnergyBasis']!='undegraded' or p['alreadyAppliedMechanisms']!=[]:raise ValueError('Currency/baseline/double-degradation guard')
    if not isinstance(p['scenarios'],list) or not 1<=len(p['scenarios'])<=16:raise ValueError('Scenario budget')
    if version('pvlib')!='0.13.1':raise RuntimeError('Pinned pvlib0.13.1 required')
    import pvlib
    g,t,year,hashes=weather_for(p);seen=set();outputs=[]
    for s in p['scenarios']:
        keys(s,('id','dcKwp','acKw','gammaPerK','inverterEfficiency','staticLossFraction','irradianceScale','temperatureShiftC','capex','annualOpex','replacements'))
        if not isinstance(s['id'],str) or not re.fullmatch('[A-Za-z0-9_-]{1,40}',s['id']) or s['id'] in seen:raise ValueError('Unique scenario identity')
        seen.add(s['id']);numeric_fields(s,dict(dcKwp=(.001,1e6),acKw=(.001,1e6),gammaPerK=(-.008,0),inverterEfficiency=(.8,1),staticLossFraction=(0,.5),irradianceScale=(.5,1.5),temperatureShiftC=(-15,15),capex=(0,1e12),annualOpex=(0,1e10)))
        if not isinstance(s['replacements'],list) or len(s['replacements'])>10:raise ValueError('Replacement budget')
        replacements={};previous=0
        for r in s['replacements']:
            keys(r,('year','cost'));integer(r['year'],1,p['years']);numeric_fields(r,dict(cost=(0,1e12)))
            if r['year']<=previous:raise ValueError('Replacement years strictly increasing')
            previous=r['year'];replacements[r['year']]=r['cost']
        raw=np.asarray(pvlib.pvsystem.pvwatts_dc(g*s['irradianceScale'],t+s['temperatureShiftC'],s['dcKwp']*1000,s['gammaPerK']),dtype=float);dc=raw*(1-s['staticLossFraction']);pdc0=s['acKw']*1000/s['inverterEfficiency'];ac=np.asarray(pvlib.inverter.pvwatts(dc,pdc0,s['inverterEfficiency']),dtype=float)
        # Independent polynomial oracle, including zero/low-light and AC cap.
        z=dc/pdc0
        if np.any(z>3):raise ValueError('PVWatts normalized loading outside declared domain 0..3')
        unclipped=s['inverterEfficiency']/.9637*(-.0162*z*dc-.0059*pdc0+.9858*dc);oracle=np.maximum(0,np.minimum(s['acKw']*1000,unclipped))
        if np.any(raw<0) or not np.allclose(ac,oracle,rtol=1e-11,atol=1e-8):raise ValueError('PVWatts component oracle')
        energy=float(ac.sum()/1000);dc_energy=float(dc.sum()/1000);clipped=float(np.maximum(0,unclipped-s['acKw']*1000).sum()/1000);trace=[];discounted_cost=s['capex'];discounted_energy=0.
        for y in range(1,p['years']+1):
            generation=energy*(1-p['annualDegradationFraction'])**(y-1);cost=s['annualOpex']+replacements.get(y,0);factor=(1+p['realDiscountRate'])**y;de=generation/factor;co=cost/factor;discounted_cost+=co;discounted_energy+=de
            trace.append(dict(year=y,energyKwh=generation,cost=cost,discountedEnergyKwh=de,discountedCost=co))
        outputs.append(dict(id=s['id'],firstYearAcKwh=energy,firstYearDcKwh=dc_energy,inverterClippedKwh=clipped,annual=trace,discountedCost=discounted_cost,discountedEnergyKwh=discounted_energy,lcoe=discounted_cost/discounted_energy if discounted_energy>0 else None))
    return result(p,'pv_lcoe_scenarios',dict(pvlibVersion='0.13.1',weatherYear=year,weatherHours=len(g),referenceHashes=hashes,scenarios=outputs,scope='Bounded actual PVWatts DC/inverter scenario evaluator with modeled frozen or constant annual forcing. Static DC loss before inversion; future economic degradation applied after first-year AC. Repeated reference year, real constant-currency costs, no tax/debt/salvage or physical lifetime model. Not a UQ estimator, calibrated project LCOE, annual energy adoption or mutation of the financial engine.'),'insufficient_evidence')
