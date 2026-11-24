"""Bounded, opt-in numerical analytics. No project/finance adoption.

Literature values are benchmark observations, NEVER site calibration defaults.
"""
import math
import numpy as np
from scipy.stats import binom, norm
from scipy.optimize import linprog
from scipy.sparse import lil_matrix
from .thermal import digest
from .electrical import keys


def result(plan, operation, output, status='completed'):
    return dict(schemaVersion='portfolio-result-v1', algorithmVersion='1.0.0', plan=plan,
                planSha256=digest(plan), validationStatus='not_field_validated', projectApproval='blocked',
                safetyApproval='not_assessed', operation=operation, status=status, output=output,
                limitations=['No automatic energy or finance adoption. Caller-declared inputs, not field calibration.',
                             'Numerical precision/convergence is not physical accuracy or bankability.'])


def bounded(plan, expected):
    keys(plan, expected)
    def visit(v):
        if isinstance(v, float) and not math.isfinite(v): raise ValueError('Nonfinite input')
        if isinstance(v, dict):
            for x in v.values(): visit(x)
        if isinstance(v, list):
            for x in v: visit(x)
    visit(plan)
    if not isinstance(plan['source'], str) or not 10 <= len(plan['source'].strip()) <= 1000: raise ValueError('Source required')


def numeric_fields(obj, rules):
    for name,(lo,hi) in rules.items():
        value=obj[name]
        if type(value) not in (int,float) or not math.isfinite(value) or not lo <= value <= hi:raise ValueError('Numeric domain: '+name)


def stamps(rows, hours, asset=False):
    from datetime import datetime
    import re
    last={}
    for row in rows:
        text=row['timestamp']
        if not isinstance(text,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)',text):raise ValueError('Explicit offset required')
        t=datetime.fromisoformat(text.replace('Z','+00:00')).timestamp();ident=row['assetId'] if asset else 'series'
        if ident in last and abs(t-last[ident]-hours*3600)>1e-6:raise ValueError('Exact grid required')
        last[ident]=t


def integer(x, lo, hi):
    if type(x) is not int or not lo <= x <= hi: raise ValueError('Integer budget')


def quantiles(x, tolerance, family_size=8):
    n = len(x); s = np.sort(x); output = []
    for p, label in ((.5, 'P50'), (.25, 'P75'), (.1, 'P90'), (.01, 'P99')):
        # Default family: 4 quantiles x 2 seeds. Expanded families supplied explicitly.
        l = int(binom.ppf(.05/(2*family_size), n, p)); u = int(binom.ppf(1-.05/(2*family_size), n, p))+1
        q = float(np.quantile(s, p)); lo = float(s[max(0,l-1)]); hi = float(s[min(n-1,u-1)])
        supported = l >= 1 and u <= n
        output.append(dict(label=label,cdfProbability=p,estimateKwh=q,ciLowerKwh=lo,ciUpperKwh=hi,
                           rankSupported=supported,relativeWidth=(hi-lo)/q,withinTolerance=supported and (hi-lo)/q <= tolerance))
    return output


def project_uq(p):
    bounded(p, ('schemaVersion','source','baselineKwh','referenceCapacityKwp','epistemicCv','aleatoryCv','outer','inner','seed','relativeCiTolerance','referenceId','inputBasis','gsaSamples','correlatedGaussianLinear'))
    numeric_fields(p,dict(baselineKwh=(1e-12,1e12),referenceCapacityKwp=(1e-12,1e9),epistemicCv=(0,.5),aleatoryCv=(0,.5),relativeCiTolerance=(.001,.2)))
    integer(p['outer'],100,1000); integer(p['inner'],100,1000); integer(p['seed'],0,2**32-1);integer(p['gsaSamples'],1024,32768)
    if p['schemaVersion']!='project-uq-v1' or not 0 < p['baselineKwh'] <= 1e12 or not 0 <= p['epistemicCv'] <= .5 or not 0 <= p['aleatoryCv'] <= .5 or not .001 <= p['relativeCiTolerance'] <= .2: raise ValueError('UQ domain')
    if p['referenceId'] not in ('bolzano-iea2020','alice-springs-iea2020','golden-nrel2023') or p['inputBasis'] not in ('literature_benchmark','caller_assumed'): raise ValueError('Unsupported evidence')
    from pathlib import Path
    import json,hashlib
    raw=(Path(__file__).resolve().parents[2]/'docs/examples/portfolio/literature-references.json').read_bytes()
    reference=next(r for r in json.loads(raw)['references'] if r['id']==p['referenceId'])
    reference_evidence=dict(record=reference,sha256=hashlib.sha256(raw).hexdigest(),role='Aggregate comparison only, not calibration',baselineSpecificKwhPerKwp=p['baselineKwh']/p['referenceCapacityKwp'])
    b=p['baselineKwh']; ve=p['epistemicCv']**2; va=p['aleatoryCv']**2
    se=math.sqrt(math.log1p(ve)); sa=math.sqrt(math.log1p(va)); rng=np.random.default_rng(p['seed'])
    outer=np.exp(rng.normal(-se*se/2,se,(p['outer'],1)))
    inner=np.exp(rng.normal(-sa*sa/2,sa,(p['outer'],p['inner'])))
    y=b*outer*inner
    within=float(np.var(y,axis=1).mean());between=float(np.var(y.mean(axis=1)));total=float(np.var(y))
    runs=[]
    for seed in (p['seed'], (p['seed']+1)%(2**32)):
        gen=np.random.default_rng(seed); n=p['outer']*p['inner']
        # IID draws for rank CI; DO NOT apply binomial CI to dependent nested pooled rows.
        x=b*np.exp(gen.normal(-(se*se+sa*sa)/2,math.hypot(se,sa),n))
        runs.append(quantiles(x,p['relativeCiTolerance']))
    convergence=[]
    for a,c in zip(*runs):
        delta=abs(a['estimateKwh']-c['estimateKwh'])/a['estimateKwh']
        convergence.append(dict(label=a['label'],publishableUnderAssumptions=a['withinTolerance'] and c['withinTolerance'] and delta<=p['relativeCiTolerance'],relativeSeedDifference=delta))
    variance=ve+va+ve*va
    # Global indices of independent mean-one lognormal product: exact variance decomposition.
    gsa=dict(method='exact independent multiplicative lognormal Sobol',S1=[ve/variance,va/variance] if variance else [0.,0.],ST=[ve*(1+va)/variance,va*(1+ve)/variance] if variance else [0.,0.],interaction=ve*va/variance if variance else 0.,correlatedInputs='unsupported; no r-squared relabeling')
    # Exact Shapley variance allocation for a SEPARATE correlated Gaussian linear model.
    import itertools
    linear=p['correlatedGaussianLinear'];keys(linear,('coefficients','correlation'))
    beta=np.asarray(linear['coefficients'],dtype=float);cov=np.asarray(linear['correlation'],dtype=float);d=len(beta)
    if not 2<=d<=6 or cov.shape!=(d,d) or not np.isfinite(cov).all() or not np.isfinite(beta).all() or (np.abs(beta)>100).any() or (np.abs(cov)>1).any() or not np.allclose(cov,cov.T,atol=1e-12,rtol=0) or not np.allclose(np.diag(cov),1,atol=1e-12,rtol=0) or np.linalg.eigvalsh(cov).min() < -1e-10:raise ValueError('Correlated Gaussian PSD required')
    total_linear=float(beta@cov@beta);shares=[]
    def conditional(ids):
        if not ids:return 0.
        cross=beta@cov[:,ids]
        return float(cross@np.linalg.pinv(cov[np.ix_(ids,ids)])@cross)
    for i in range(d):
        allocation=0.;others=[j for j in range(d) if i!=j]
        for k in range(d):
            for subset in itertools.combinations(others,k):
                allocation+=math.factorial(k)*math.factorial(d-k-1)/math.factorial(d)*(conditional(list(subset)+[i])-conditional(list(subset)))
        shares.append(allocation/total_linear if total_linear>1e-12 else 0.)
    correlated=dict(method='Exact Gaussian-linear conditional-variance Shapley; separate benchmark, not nonlinear PV attribution',variance=total_linear,shares=shares)
    # Separate nonlinear Ishigami verification/evaluation path, independent uniform inputs.
    gen=np.random.default_rng(p['seed']);n=p['gsaSamples'];a=gen.uniform(-np.pi,np.pi,(n,3));c=gen.uniform(-np.pi,np.pi,(n,3))
    def f(x):return np.sin(x[:,0])+7*np.sin(x[:,1])**2+.1*x[:,2]**4*np.sin(x[:,0])
    ya=f(a);yc=f(c);v=float(np.var(np.r_[ya,yc]));s1=[];st=[];s1ci=[];stci=[]
    for i in range(3):
        ac=a.copy();ac[:,i]=c[:,i];z=f(ac);first=(yc-yc.mean())*(z-ya);last=(ya-z)**2/2
        s1.append(float(first.mean()/v));st.append(float(last.mean()/v))
        indices=gen.integers(0,n,(64,n));s1ci.append(np.quantile(first[indices].mean(axis=1)/v,[.025,.975]).tolist());stci.append(np.quantile(last[indices].mean(axis=1)/v,[.025,.975]).tolist())
    return result(p,'project_uq',dict(literatureComparison=reference_evidence,quantileRuns=runs,convergence=convergence,ciMethod='IID binomial order statistics; Bonferroni 8 comparisons, at least 95% joint coverage under continuous IID assumptions',nested=dict(withinKwh2=within,betweenKwh2=between,totalKwh2=total,reconciliationKwh2=total-within-between,interpretation='Exact empirical finite-panel law; population estimator has finite-inner bias',analyticWithinKwh2=b*b*va*(1+ve),analyticBetweenKwh2=b*b*ve),gsa=gsa,correlatedGaussianLinear=correlated,ishigami=dict(S1=s1,ST=st,S1Approximate95Ci=s1ci,STApproximate95Ci=stci,ciMethod='64-row bootstrap with fixed variance estimate; approximate benchmark diagnostic only',samples=n,scope='Numerical benchmark only, not a sensitivity result for a PV plant'),analyticQuantilesKwh={label:b*math.exp(-(se*se+sa*sa)/2+norm.ppf(prob)*math.hypot(se,sa)) for prob,label in ((.5,'P50'),(.25,'P75'),(.1,'P90'),(.01,'P99'))},calibrationGate='blocked_literature_or_assumed_not_project_calibration',referenceId=p['referenceId']), 'insufficient_evidence')


def hybrid_sizing(p):
    bounded(p,('schemaVersion','source','contextSha256','intervalHours','initialSoc','minimumSoc','chargeEfficiency','dischargeEfficiency','wearPerKwh','minimumDeliveredKwh','allowGridCharging','standbyW','pumpW','hvacWPerKwhC','hvacSetpointC','candidates','records'))
    if p['schemaVersion']!='hybrid-sizing-v1' or not 1<=len(p['records'])<=168 or not 1<=len(p['candidates'])<=30:raise ValueError('Sizing budget')
    numeric_fields(p,dict(intervalHours=(1e-9,1),initialSoc=(0,1),minimumSoc=(0,1),chargeEfficiency=(.8,.99),dischargeEfficiency=(.8,.99),wearPerKwh=(1e-12,1e6),minimumDeliveredKwh=(0,1e9),standbyW=(0,1e6),pumpW=(0,1e6),hvacWPerKwhC=(0,1000),hvacSetpointC=(-20,60)))
    if type(p['allowGridCharging']) is not bool:raise ValueError('Grid charging boolean required')
    stamps(p['records'],p['intervalHours'])
    if len({c['id'] for c in p['candidates']})!=len(p['candidates']):raise ValueError('Duplicate candidates')
    dt=p['intervalHours'];ec=p['chargeEfficiency'];ed=p['dischargeEfficiency']
    if not 0<dt<=1 or not .8<=ec<=.99 or not .8<=ed<=.99 or not 0<=p['minimumSoc']<=p['initialSoc']<=1 or p['wearPerKwh']<=0:raise ValueError('Battery domain')
    output=[];n=len(p['records'])
    # kWh variables per step: charge, discharge, import, export, curtailment, final storage.
    for c in p['candidates']:
        keys(c,('id','pvKwp','inverterKw','batteryKwh','batteryKw','periodCapex'))
        numeric_fields(c,{k:(0,1e12 if k=='periodCapex' else 1e6) for k in ('pvKwp','inverterKw','batteryKwh','batteryKw','periodCapex')})
        if any(c[k]<0 for k in ('pvKwp','inverterKw','batteryKwh','batteryKw','periodCapex')):raise ValueError('Capacity domain')
        eq=lil_matrix((2*n,6*n));rhs=np.zeros(2*n);cost=np.zeros(6*n);bounds=[];aux=[];generation=[]
        for i,r in enumerate(p['records']):
            keys(r,('timestamp','pvKwhPerKwp','externalGenerationKwh','externalOrigin','loadKwh','ambientC','importPrice','exportPrice','importLimitKw','exportLimitKw'))
            numeric_fields(r,dict(pvKwhPerKwp=(0,2),externalGenerationKwh=(0,1e6),loadKwh=(0,1e6),ambientC=(-60,70),importPrice=(1e-12,1e6),exportPrice=(0,1e6),importLimitKw=(0,1e6),exportLimitKw=(0,1e6)))
            if r['externalOrigin'] not in ('pv','wind','hybrid','none') or r['externalOrigin']=='none' and r['externalGenerationKwh']!=0:raise ValueError('Origin required')
            if r['importPrice']<=r['exportPrice'] or r['exportPrice']<0:raise ValueError('No arbitrage price inversion')
            if any(r[k]<0 for k in ('pvKwhPerKwp','externalGenerationKwh','loadKwh','importLimitKw','exportLimitKw')):raise ValueError('Negative flow')
            pv=min(c['pvKwp']*r['pvKwhPerKwp'],c['inverterKw']*dt);gen=pv+r['externalGenerationKwh'];generation.append(gen)
            demandAux=(p['standbyW']+p['pumpW']+p['hvacWPerKwhC']*c['batteryKwh']*max(0,r['ambientC']-p['hvacSetpointC']))*dt/1000 if c['batteryKwh']>0 else 0.;aux.append(demandAux)
            j=6*i;eq[2*i,j:j+5]=[-1,1,1,-1,-1];rhs[2*i]=r['loadKwh']+demandAux-gen
            eq[2*i+1,j]=-ec;eq[2*i+1,j+1]=1/ed;eq[2*i+1,j+5]=1
            if i:eq[2*i+1,j-1]=-1
            else:rhs[2*i+1]=c['batteryKwh']*p['initialSoc']
            cost[j:j+4]=[p['wearPerKwh'],p['wearPerKwh'],r['importPrice'],-r['exportPrice']]
            bounds.extend([(0,c['batteryKw']*dt if p['allowGridCharging'] else min(c['batteryKw']*dt,max(0,gen-r['loadKwh']-demandAux))),(0,c['batteryKw']*dt),(0,r['importLimitKw']*dt),(0,r['exportLimitKw']*dt),(0,gen),(c['batteryKwh']*p['minimumSoc'],c['batteryKwh'])])
        # No borrowing energy from initial SOC. Terminal SOC exactly equals initial.
        bounds[-1]=(c['batteryKwh']*p['initialSoc'],c['batteryKwh']*p['initialSoc'])
        inequality=lil_matrix((1,6*n))
        # Positive delivery requirement is NET export, not gross buy-and-resell energy.
        if p['minimumDeliveredKwh']>0:
            inequality[0,3::6]=-1;inequality[0,2::6]=1
        solved=linprog(cost,A_ub=inequality.tocsr(),b_ub=[-p['minimumDeliveredKwh']],A_eq=eq.tocsr(),b_eq=rhs,bounds=bounds,method='highs',options={'time_limit':5.})
        if not solved.success:
            if solved.status!=2:raise RuntimeError('Solver incomplete; no hidden feasible fallback')
            output.append(dict(id=c['id'],status='infeasible'));continue
        x=solved.x.reshape(n,6);residual=float(np.max(np.abs(eq@solved.x-rhs)))
        if residual>1e-6:raise RuntimeError('Energy residual')
        if np.max(x[:,0]*x[:,1])>1e-6 or np.max(x[:,2]*x[:,3])>1e-6:raise RuntimeError('Simultaneous opposite flows; model unsupported')
        operating=float(cost@solved.x);trace=[]
        for i,r in enumerate(p['records']):
            trace.append(dict(timestamp=r['timestamp'],generationKwh=generation[i],auxiliaryKwh=aux[i],loadKwh=r['loadKwh'],chargeKwh=float(x[i,0]),dischargeKwh=float(x[i,1]),importKwh=float(x[i,2]),exportKwh=float(x[i,3]),curtailedKwh=float(x[i,4]),storedKwh=float(x[i,5])))
        output.append(dict(id=c['id'],status='feasible',objective=operating+c['periodCapex'],periodCapex=c['periodCapex'],operatingCost=operating,auxiliaryKwh=sum(aux),maxResidualKwh=residual,trace=trace))
    feasible=[r for r in output if r['status']=='feasible'];best=min(feasible,key=lambda r:(r['objective'],r['id'])) if feasible else None
    return result(p,'hybrid_sizing',dict(candidates=output,bestCandidateId=best['id'] if best else None,optimality='LP optimum per enumerated capacity candidate; NOT continuous/global equipment sizing',candidateSetGap=0. if best else None,continuousSizingGap=None,costUnit='caller-declared currency, one explicit period; no annualization',auxiliaryAccounting='HVAC/standby/pump already in power balance and import/export costs; never add energy cost twice',deliveryDefinition='If positive, minimumDeliveredKwh constrains total export minus import over the explicit period; zero disables the delivery requirement',controller='AC-coupled continuous LP, fixed efficiency, no diesel, no degradation dynamics'), 'completed' if best else 'infeasible')


def batch_twin(p):
    bounded(p,('schemaVersion','source','projectContextSha256','baselineContextSha256','baselineSha256','baselineSource','thresholdFraction','minimumExpectedW','minimumEvaluationPairs','trainEndUtc','intervalMinutes','records'))
    if p['schemaVersion']!='batch-twin-v1' or not 4<=len(p['records'])<=10000 or not .01<=p['thresholdFraction']<=.9 or p['minimumExpectedW']<=0:raise ValueError('Twin domain')
    numeric_fields(p,dict(thresholdFraction=(.01,.9),minimumExpectedW=(1e-12,1e9)))
    stamps(p['records'],p['intervalMinutes']/60,True)
    integer(p['minimumEvaluationPairs'],2,10000);integer(p['intervalMinutes'],1,60)
    from datetime import datetime
    stamp=lambda x:datetime.fromisoformat(x.replace('Z','+00:00')).timestamp()
    train_end=stamp(p['trainEndUtc']);groups={}
    for r in p['records']:
        keys(r,('assetId','timestamp','expectedW','measuredW','quality','event','knownHealthy'))
        numeric_fields(r,dict(expectedW=(0,1e9)))
        if r['measuredW'] is not None:numeric_fields(r,dict(measuredW=(0,1e9)))
        if r['quality'] not in ('valid','missing','excluded') or r['event'] not in ('none','outage','curtailment') or r['knownHealthy'] is not None and type(r['knownHealthy']) is not bool:raise ValueError('Quality domain')
        if r['expectedW']<0 or (r['measuredW'] is not None and r['measuredW']<0) or (r['quality']=='missing')!=(r['measuredW'] is None):raise ValueError('Twin input')
        rows=groups.setdefault(r['assetId'],[])
        if rows and stamp(r['timestamp'])-stamp(rows[-1]['timestamp'])!=p['intervalMinutes']*60:raise ValueError('Twin gap or duplicate')
        rows.append(r)
    if p['projectContextSha256']!=p['baselineContextSha256']:return result(p,'batch_twin',dict(reason='context_mismatch'), 'insufficient_evidence')
    assets=[]
    for ident,rows in sorted(groups.items()):
        valid=lambda r:r['quality']=='valid' and r['event']=='none' and r['expectedW']>=p['minimumExpectedW']
        train=[r for r in rows if stamp(r['timestamp'])<=train_end and valid(r)]
        evaluation=[r for r in rows if stamp(r['timestamp'])>train_end and valid(r)]
        if len(train)<2 or len(evaluation)<p['minimumEvaluationPairs']:
            assets.append(dict(assetId=ident,status='insufficient_pairs',trainingPairs=len(train),evaluationPairs=len(evaluation)));continue
        # Frozen caller baseline; train estimates noise/offset for DIAGNOSTICS only, no refit of expectedW.
        residual=lambda r:(r['measuredW']-r['expectedW'])/r['expectedW']
        training=np.array([residual(r) for r in train]);values=np.array([residual(r) for r in evaluation])
        flags=values < -p['thresholdFraction'];false_alarms=sum(bool(flag) and r['knownHealthy'] is True for flag,r in zip(flags,evaluation))
        labelled=sum(r['knownHealthy'] is True for r in evaluation);exposure_days=labelled*p['intervalMinutes']/1440
        mean=float(values.mean());half=max(1,len(values)//2);drift=float(values[-half:].mean()-values[:half].mean())
        assets.append(dict(assetId=ident,status='research_only',trainingPairs=len(train),evaluationPairs=len(evaluation),excludedPairs=len(rows)-len(train)-len(evaluation),meanRelativeResidual=mean,trainingResidualMedian=float(np.median(training)),driftFraction=drift,healthIndex=float(np.clip(1+mean,0,1)),healthIndexDefinition='clipped mean measured/expected on valid evaluation intervals; not RUL',cluster='underperforming' if mean < -p['thresholdFraction'] else 'reference_like',clusterMethod='deterministic threshold grouping; not learned fault classes',anomalyCount=int(flags.sum()),falseAlarmsPerLabelledHealthyAssetDay=false_alarms/exposure_days if exposure_days else None,labelledHealthyExposureDays=exposure_days,thresholdFraction=p['thresholdFraction']))
    usable=[a for a in assets if a['status']=='research_only']
    grouping=dict(status='insufficient_distinct_assets',method='Deterministic two-centroid Lloyd on evaluation mean residual/drift; exploratory asset grouping, not fault diagnosis')
    if len(usable)>=4:
        features=np.array([[a['meanRelativeResidual'],a['driftFraction']] for a in usable]);order=np.lexsort((features[:,1],features[:,0]));centers=features[[order[0],order[-1]]].copy()
        if np.linalg.norm(centers[0]-centers[1])>1e-12:
            labels=np.zeros(len(features),dtype=int)
            for iteration in range(100):
                labels=np.argmin(((features[:,None,:]-centers[None,:,:])**2).sum(axis=2),axis=1)
                updated=np.array([features[labels==k].mean(axis=0) if np.any(labels==k) else centers[k] for k in range(2)])
                if np.max(np.abs(updated-centers))<1e-12:centers=updated;break
                centers=updated
            labels=np.argmin(((features[:,None,:]-centers[None,:,:])**2).sum(axis=2),axis=1)
            grouping=dict(status='research_only',method=grouping['method'],centroids=centers.tolist(),assignments=[dict(assetId=a['assetId'],group=int(k)) for a,k in zip(usable,labels)],inertia=float(((features-centers[labels])**2).sum()),iterations=iteration+1,siteHoldout='not_available; no generalization claimed')
    return result(p,'batch_twin',dict(unsupervisedGrouping=grouping,assets=assets,baselineFrozen=True,baselineSha256=p['baselineSha256'],baselineEvidence='caller declared hash/source, original baseline authenticity not attested',thresholdPolicy='caller-specified before evaluation; no fit on holdout',fieldGate='blocked_independent_site_and_time_validation_required',rul='not_implemented'), 'insufficient_evidence')
