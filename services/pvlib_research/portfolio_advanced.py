"""Opt-in bounded experiments; never project calibration or financial adoption."""
import math
import re
from datetime import datetime
import numpy as np
from scipy.optimize import milp, Bounds, LinearConstraint
from scipy.sparse import lil_matrix
from .portfolio import result, project_uq, quantiles, bounded, numeric_fields, integer, stamps
from .electrical import keys


def uq_convergence(p):
    bounded(p, ('schemaVersion','source','base','budgets','seeds'))
    if p['schemaVersion']!='uq-convergence-v1':raise ValueError('Convergence version')
    # Reuse the independently checked base contract and diagnostics.
    project_uq(p['base'])
    budgets=p['budgets']; seeds=p['seeds']
    if not 2 <= len(budgets) <= 4 or not 2 <= len(seeds) <= 4 or len(set(seeds)) != len(seeds):
        raise ValueError('Convergence budget/seeds')
    previous=0; runs=[]; family=len(budgets)*len(seeds)*4
    b=p['base']; se=math.sqrt(math.log1p(b['epistemicCv']**2)); sa=math.sqrt(math.log1p(b['aleatoryCv']**2))
    for budget in budgets:
        keys(budget,('outer','inner'))
        if any(type(budget[k]) is not int or not 100 <= budget[k] <= 1000 for k in ('outer','inner')):raise ValueError('Budget domain')
        size=budget['outer']*budget['inner']
        if size<=previous:raise ValueError('Increasing budgets required')
        previous=size
        for seed in seeds:
            if type(seed) is not int or not 0<=seed<2**32:raise ValueError('Seed')
            rng=np.random.default_rng(seed)
            # IID marginal sample, not dependent nested rows. Common seed across budgets is intentional.
            x=b['baselineKwh']*np.exp(rng.normal(-(se*se+sa*sa)/2,math.hypot(se,sa),size))
            runs.append(dict(samples=size,seed=seed,quantiles=quantiles(x,b['relativeCiTolerance'],family)))
    return result(p,'uq_convergence',dict(runs=runs,familyComparisons=family,converged=all(q['withinTolerance'] for r in runs for q in r['quantiles']),ciMethod='Binomial order statistics; Bonferroni across ALL budgets, seeds and quantiles. No independence between runs assumed.',calibrationGate='blocked_not_project_calibration'),'insufficient_evidence')


def hybrid_design(p):
    bounded(p, ('schemaVersion','source','contextSha256','intervalHours','initialSoc','minimumSoc','chargeEfficiency','dischargeEfficiency','minimumDeliveredKwh','wearPerKwh','standbyW','hvacWPerKwhC','setpointC','maximumBatteryC','minimumInstalledBatteryKwh','capacities','records','timeLimitS','relativeGap'))
    if p['schemaVersion']!='hybrid-design-v1' or not isinstance(p['contextSha256'],str) or not re.fullmatch('[a-f0-9]{64}',p['contextSha256']):raise ValueError('Design identity')
    numeric_fields(p,dict(intervalHours=(float(np.nextafter(0.,1.)),1),initialSoc=(0,1),minimumSoc=(0,1),chargeEfficiency=(.8,.99),dischargeEfficiency=(.8,.99),minimumDeliveredKwh=(0,1e9),wearPerKwh=(float(np.nextafter(0.,1.)),1e6),standbyW=(0,1e6),hvacWPerKwhC=(0,1000),setpointC=(-20,60),maximumBatteryC=(float(np.nextafter(0.,1.)),10),minimumInstalledBatteryKwh=(float(np.nextafter(0.,1.)),1e6),timeLimitS=(.01,60),relativeGap=(0,.1)))
    if p['minimumSoc']>p['initialSoc']:raise ValueError('SOC order')
    keys(p['capacities'],('pvKwp','inverterKw','batteryKwh','batteryKw'))
    for capacity in p['capacities'].values():
        keys(capacity,('maximum','unitSize','integer','costPerUnit'))
        numeric_fields(capacity,dict(maximum=(0,1e6),unitSize=(float(np.nextafter(0.,1.)),1e6),costPerUnit=(float(np.nextafter(0.,1.)),1e9)))
        if type(capacity['integer']) is not bool:raise ValueError('Capacity integrality boolean')
    for row in p['records']:
        keys(row,('timestamp','pvKwhPerKwp','externalKwh','loadKwh','importPrice','exportPrice','importLimitKw','exportLimitKw','ambientC'))
        numeric_fields(row,dict(pvKwhPerKwp=(0,2),externalKwh=(0,1e6),loadKwh=(0,1e6),importPrice=(0,1e6),exportPrice=(0,1e6),importLimitKw=(0,1e6),exportLimitKw=(0,1e6),ambientC=(-60,70)))
    stamps(p['records'],p['intervalHours'])
    rows=p['records']; t=len(rows); dt=p['intervalHours']; names=('pvKwp','inverterKw','batteryKwh','batteryKw')
    if not 1<=t<=8760 or not 0<dt<=1 or not .01<=p['timeLimitS']<=60:raise ValueError('Design budget')
    # Capacity units (4), installation binary (1), then per interval G,C,D,I,X,S, charge-direction and grid-direction.
    count=5+8*t; c=np.zeros(count); lo=np.zeros(count); hi=np.full(count,np.inf); integer=np.zeros(count)
    scales=[]
    for j,k in enumerate(names):
        b=p['capacities'][k]; scale=b['unitSize']; scales.append(scale)
        hi[j]=b['maximum']/scale;c[j]=scale*b['costPerUnit'];integer[j]=int(b['integer'])
    hi[4]=1;integer[4]=1
    constraints=[]; lower=[]; upper=[]
    def add(values,l=-np.inf,u=np.inf):constraints.append(values);lower.append(l);upper.append(u)
    pv,inv,cap,power=scales; maxcap=p['capacities']['batteryKwh']['maximum']; maxpower=p['capacities']['batteryKw']['maximum']
    add({2:cap,4:-maxcap},u=0);add({2:-cap,4:p['minimumInstalledBatteryKwh']},u=0)
    add({3:power,2:-p['maximumBatteryC']*cap},u=0)
    delivery={}
    for i,r in enumerate(rows):
        g,ch,d,imp,exp,s,bc,bg=range(5+8*i,13+8*i)
        hi[bc]=hi[bg]=1;integer[bc]=integer[bg]=1
        hi[imp]=r['importLimitKw']*dt;hi[exp]=r['exportLimitKw']*dt
        c[ch]=c[d]=p['wearPerKwh'];c[imp]=r['importPrice'];c[exp]=-r['exportPrice']
        auxcap=p['hvacWPerKwhC']*max(0,r['ambientC']-p['setpointC'])*dt/1000
        add({g:1,0:-pv*r['pvKwhPerKwp']},u=r['externalKwh']);add({g:1,1:-inv*dt},u=r['externalKwh'])
        add({g:1,d:1,imp:1,ch:-1,exp:-1,2:-auxcap*cap,4:-p['standbyW']*dt/1000},r['loadKwh'],r['loadKwh'])
        for v in (ch,d):add({v:1,3:-power*dt},u=0)
        add({ch:1,bc:-maxpower*dt},u=0);add({d:1,bc:maxpower*dt},u=maxpower*dt)
        add({imp:1,bg:-hi[imp]},u=0);add({exp:1,bg:hi[exp]},u=hi[exp])
        add({s:1,2:-cap},u=0);add({s:-1,2:p['minimumSoc']*cap},u=0)
        balance={s:1,ch:-p['chargeEfficiency'],d:1/p['dischargeEfficiency']}
        balance[5+8*(i-1)+5 if i else 2]=-1 if i else -p['initialSoc']*cap
        add(balance,0,0);delivery[exp]=1;delivery[imp]=-1
    add({5+8*(t-1)+5:1,2:-p['initialSoc']*cap},0,0)
    if p['minimumDeliveredKwh']>0:add(delivery,p['minimumDeliveredKwh'])
    matrix=lil_matrix((len(constraints),count))
    for i,row in enumerate(constraints):
        for j,v in row.items():matrix[i,j]=v
    solved=milp(c,integrality=integer,bounds=Bounds(lo,hi),constraints=LinearConstraint(matrix.tocsc(),lower,upper),options={'time_limit':p['timeLimitS'],'mip_rel_gap':p['relativeGap']})
    status='completed' if solved.status==0 else 'infeasible' if solved.status==2 else 'incomplete'
    output=dict(design=None,objective=None,dualBound=None,relativeGap=None,qualified=False,trace=[],solverStatus=int(solved.status),scope='Global bound only for this declared linear/MILP finite horizon. Grid charging permitted. No diesel, equipment HVAC or lifetime qualification.')
    if solved.x is not None:
        x=solved.x;design={k:float(x[j]*scales[j]) for j,k in enumerate(names)};trace=[]
        for i,r in enumerate(rows):
            v=np.maximum(0,x[5+8*i:11+8*i]);trace.append(dict(timestamp=r['timestamp'],**dict(zip(('generationKwh','chargeKwh','dischargeKwh','importKwh','exportKwh','storedKwh'),map(float,v))),auxiliaryKwh=float(x[4]*p['standbyW']*dt/1000+design['batteryKwh']*p['hvacWPerKwhC']*max(0,r['ambientC']-p['setpointC'])*dt/1000)))
        bound=getattr(solved,'mip_dual_bound',None);gap=getattr(solved,'mip_gap',None)
        output.update(design=design,objective=float(solved.fun),dualBound=float(bound) if bound is not None and math.isfinite(bound) else None,relativeGap=float(gap) if gap is not None and math.isfinite(gap) else None,qualified=bool(solved.status==0 and gap is not None and gap<=p['relativeGap']+1e-8),trace=trace)
    return result(p,'hybrid_design',output,status)


def twin_site_holdout(p):
    bounded(p,('schemaVersion','source','baselineSource','baselineSha256','trainSites','evaluationSites','trainEndUtc','evaluationStartUtc','intervalMinutes','trainingQuantile','minimumThreshold','minimumTrainingPairs','minimumEvaluationPairs','minimumExpectedW','maximumFalseAlarmsPerAssetDay','records'))
    if p['schemaVersion']!='twin-site-holdout-v1' or not isinstance(p['baselineSha256'],str) or not re.fullmatch('[a-f0-9]{64}',p['baselineSha256']):raise ValueError('Holdout identity')
    if not isinstance(p['baselineSource'],str) or not 10<=len(p['baselineSource'].strip())<=1000:raise ValueError('Baseline source')
    numeric_fields(p,dict(trainingQuantile=(.8,.999),minimumThreshold=(.001,.9),minimumExpectedW=(float(np.nextafter(0.,1.)),1e9),maximumFalseAlarmsPerAssetDay=(0,1440)))
    integer(p['intervalMinutes'],1,60);integer(p['minimumTrainingPairs'],3,10000);integer(p['minimumEvaluationPairs'],2,10000)
    if not 5<=len(p['records'])<=20000:raise ValueError('Holdout row budget')
    for sites in (p['trainSites'],p['evaluationSites']):
        if not isinstance(sites,list) or not 1<=len(sites)<=50 or any(not isinstance(x,str) or not re.fullmatch(r'[\w-]{1,40}',x,flags=re.ASCII) for x in sites) or len(set(sites))!=len(sites):raise ValueError('Unique site identities')
    # Explicit offset validation is shared with the other offline kernels.
    for boundary in ('trainEndUtc','evaluationStartUtc'):stamps([dict(timestamp=p[boundary])],1)
    grouped={}
    for row in p['records']:
        keys(row,('siteId','assetId','timestamp','expectedW','measuredW','quality','event','knownHealthy'))
        if any(not isinstance(row[k],str) or not re.fullmatch(r'[\w-]{1,40}',row[k],flags=re.ASCII) for k in ('siteId','assetId')):raise ValueError('Asset identity')
        numeric_fields(row,dict(expectedW=(0,1e9)))
        if row['measuredW'] is not None:numeric_fields(row,dict(measuredW=(0,1e9)))
        if row['quality'] not in ('valid','missing','excluded') or row['event'] not in ('none','outage','curtailment') or row['knownHealthy'] is not None and type(row['knownHealthy']) is not bool:raise ValueError('Quality/event/healthy domain')
        grouped.setdefault((row['siteId'],row['assetId']),[]).append(row)
    for rows in grouped.values():stamps(rows,p['intervalMinutes']/60)
    trains=set(p['trainSites']); evaluations=set(p['evaluationSites'])
    stamp=lambda s:datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
    end=stamp(p['trainEndUtc']);start=stamp(p['evaluationStartUtc'])
    if trains&evaluations or end>=start:raise ValueError('Leaking site/time split')
    training=[];testing=[];excluded=0;last={}
    for r in p['records']:
        key=(r['siteId'],r['assetId']);time=stamp(r['timestamp'])
        if key in last and abs(time-last[key]-p['intervalMinutes']*60)>1e-6:raise ValueError('Asset grid')
        last[key]=time
        if (r['quality']=='missing') != (r['measuredW'] is None):raise ValueError('Missing null')
        if r['quality']!='valid' or r['event']!='none' or r['expectedW']<p['minimumExpectedW']:excluded+=1;continue
        residual=abs(r['measuredW']/r['expectedW']-1)
        if r['siteId'] in trains and time<=end and r['knownHealthy'] is True:training.append(residual)
        elif r['siteId'] in evaluations and time>=start:testing.append((r,residual))
        else:excluded+=1
    enough=len(training)>=p['minimumTrainingPairs'];threshold=max(p['minimumThreshold'],float(np.quantile(training,p['trainingQuantile'],method='higher'))) if enough else None
    healthy=[v for r,v in testing if r['knownHealthy'] is True]; exposure=len(healthy)*p['intervalMinutes']/1440
    alarms=sum(v>threshold for v in healthy) if enough else None
    rate=alarms/exposure if exposure and enough else None
    output=dict(threshold=threshold,trainingPairs=len(training),evaluationPairs=len(testing),excludedPairs=excluded,healthyAssetDays=exposure,falseAlarms=alarms,falseAlarmsPerAssetDay=rate,screeningPassed=bool(enough and len(testing)>=p['minimumEvaluationPairs'] and rate is not None and rate<=p['maximumFalseAlarmsPerAssetDay']),split={k:p[k] for k in ('trainSites','evaluationSites','trainEndUtc','evaluationStartUtc')},baselineSha256=p['baselineSha256'],fieldGate='blocked_independent_data_qualification',scope='Site/time holdout screening only. Baseline must be frozen independently of evaluation. No RUL, online events or field qualification.')
    return result(p,'twin_site_holdout',output,'insufficient_evidence')
