"""Two-node areal cell/back thermal balance; caller-sourced, not calibrated.

Independent states, explicit sky/ground radiant sinks, no sensor conversion.
"""
import math
import re
from .electrical import keys,number
from .thermal import digest
from .transient import stamp
SIGMA=5.670374419e-8


def validate(plan):
    keys(plan,('schemaVersion','source','parameters','domain','initial','intervals','stepS','maxSteps'))
    if plan['schemaVersion']!='two-node-thermal-plan-v1' or not isinstance(plan['source'],str) or not plan['source'].strip() or len(plan['source'])>500:raise ValueError('Version/source required')
    p=plan['parameters']
    bounds=dict(cellCapacityJm2K=(100,1e6),backCapacityJm2K=(100,1e6),couplingWm2K=(0,1000),frontH0=(.01,300),frontHWind=(0,50),backH0=(.01,300),backHWind=(0,50),frontEmissivity=(0,1),backEmissivity=(0,1),windHeightM=(.1,200),coefficientWindHeightM=(.1,200))
    keys(p,tuple(bounds))
    for k,b in bounds.items():number(p[k],*b,k)
    if p['windHeightM']!=p['coefficientWindHeightM']:raise ValueError('Wind installation and coefficient heights must match')
    d=plan['domain'];keys(d,('nodeMinC','nodeMaxC','airMinC','airMaxC','windMaxMps'))
    for k,lo,hi in [('nodeMinC',-100,180),('nodeMaxC',-100,180),('airMinC',-80,80),('airMaxC',-80,80),('windMaxMps',0,75)]:number(d[k],lo,hi,k)
    if d['nodeMinC']>=d['nodeMaxC'] or d['airMinC']>=d['airMaxC']:raise ValueError('Invalid declared domain')
    keys(plan['initial'],('cellC','backC'))
    for v in plan['initial'].values():number(v,d['nodeMinC'],d['nodeMaxC'],'initial temperature')
    step=number(plan['stepS'],.001,10,'stepS')
    radiative=4*SIGMA*(d['nodeMaxC']+273.15)**3
    limit=min(p['cellCapacityJm2K']/(p['couplingWm2K']+p['frontH0']+p['frontHWind']*d['windMaxMps']+p['frontEmissivity']*radiative),p['backCapacityJm2K']/(p['couplingWm2K']+p['backH0']+p['backHWind']*d['windMaxMps']+p['backEmissivity']*radiative))/10
    if step>limit:raise ValueError('Step outside thermal time-constant stability bound')
    if type(plan['maxSteps']) is not int or not 1<=plan['maxSteps']<=200000:raise ValueError('Invalid maxSteps')
    rows=plan['intervals']
    if not isinstance(rows,list) or not 1<=len(rows)<=1000:raise ValueError('Require 1..1000 intervals')
    prepared=[];end=None;total=0
    for r in rows:
        keys(r,('start','durationS','absorbedCellWm2','electricalExtractedWm2','airC','skyC','groundC','windMps'),('observedEndCellC','observedEndBackC'))
        if not isinstance(r['start'],str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)',r['start']):raise ValueError('Strict timestamp required')
        start=stamp(r['start']);dt=number(r['durationS'],.001,600,'durationS')
        if end is not None and abs(start.timestamp()-end)>1e-6:raise ValueError('Gap/overlap in thermal series')
        end=start.timestamp()+dt
        for k,lo,hi in [('absorbedCellWm2',0,2000),('electricalExtractedWm2',0,2000),('airC',d['airMinC'],d['airMaxC']),('skyC',-100,100),('groundC',-80,150),('windMps',0,d['windMaxMps'])]:number(r[k],lo,hi,k)
        if r['electricalExtractedWm2']>r['absorbedCellWm2']:raise ValueError('Extraction exceeds absorbed power')
        for k in ('observedEndCellC','observedEndBackC'):
            if k in r:number(r[k],d['nodeMinC'],d['nodeMaxC'],k)
        n=math.ceil(dt/step);total+=n;prepared.append((r,start,dt,n))
    if total>plan['maxSteps']:raise ValueError('Thermal integration budget exceeded')
    return prepared,total


def simulate(plan,cancel=lambda:False):
    rows,steps=validate(plan);p=plan['parameters'];domain=plan['domain']
    cc=p['cellCapacityJm2K'];cb=p['backCapacityJm2K'];g=p['couplingWm2K']
    # Integral order: absorbed, extracted, cell->back, convFront, convBack, radFront, radBack.
    y=[float(plan['initial']['cellC']),float(plan['initial']['backC'])]+[0.]*7
    trace=[];errors={'cell':[],'back':[]}
    for r,start,dt,n in rows:
        initial=y.copy();h=dt/n
        def rhs(state):
            tc,tb=state[:2]
            if not all(domain['nodeMinC']<=t<=domain['nodeMaxC'] for t in (tc,tb)):raise ValueError('Node outside declared thermal domain')
            coupling=g*(tc-tb)
            cf=(p['frontH0']+p['frontHWind']*r['windMps'])*(tc-r['airC'])
            bf=(p['backH0']+p['backHWind']*r['windMps'])*(tb-r['airC'])
            rf=p['frontEmissivity']*SIGMA*((tc+273.15)**4-(r['skyC']+273.15)**4)
            rb=p['backEmissivity']*SIGMA*((tb+273.15)**4-(r['groundC']+273.15)**4)
            qa=r['absorbedCellWm2'];qe=r['electricalExtractedWm2']
            return [(qa-qe-coupling-cf-rf)/cc,(coupling-bf-rb)/cb,qa,qe,coupling,cf,bf,rf,rb]
        for _ in range(n):
            if cancel():raise RuntimeError('Thermal execution cancelled')
            k1=rhs(y);k2=rhs([v+h*k/2 for v,k in zip(y,k1)]);k3=rhs([v+h*k/2 for v,k in zip(y,k2)]);k4=rhs([v+h*k for v,k in zip(y,k3)])
            y=[v+h*(a+2*b+2*c+e)/6 for v,a,b,c,e in zip(y,k1,k2,k3,k4)]
            rhs(y)  # Endpoint domain check too, including the last step.
        integrals=[v-i for v,i in zip(y[2:],initial[2:])];qa,qe,qcb,cf,bf,rf,rb=integrals
        cellres=cc*(y[0]-initial[0])-qa+qe+qcb+cf+rf
        backres=cb*(y[1]-initial[1])-qcb+bf+rb
        for name,key,state in [('cell','observedEndCellC',y[0]),('back','observedEndBackC',y[1])]:
            if key in r:errors[name].append(state-r[key])
        trace.append(dict(startUTC=start.isoformat(),durationS=dt,cellC=y[0],backC=y[1],cellResidualJm2=cellres,backResidualJm2=backres,totalResidualJm2=cellres+backres,
                          absorbedJm2=qa,extractedJm2=qe,couplingJm2=qcb,convectionFrontJm2=cf,convectionBackJm2=bf,radiationFrontJm2=rf,radiationBackJm2=rb))
    comparison={key:dict(pairs=len(values),rmseC=math.sqrt(sum(e*e for e in values)/len(values)) if values else None) for key,values in errors.items()}
    return dict(schemaVersion='two-node-thermal-result-v1',algorithmVersion='1.0.0',plan=plan,planSha256=digest(plan),validationStatus='not_field_validated',projectApproval='blocked',steps=steps,trace=trace,comparison=comparison,
        limitations=['lumped_areal_nodes_not_resolved_laminate','full_effective_radiant_view_to_explicit_sky_and_ground','no_back_to_cell_measurement_conversion','caller_parameters_and_wind_height_not_authenticated','not_connected_to_production_energy_or_finance'])
