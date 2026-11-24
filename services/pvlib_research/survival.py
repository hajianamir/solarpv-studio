"""Right-censored cohort survival, not asset-specific SCADA RUL or field qualification.

KM with failures before censor removals at ties; pointwise log-log Greenwood CI.
No delayed entry, competing events, extrapolation or fitted covariates.
"""
import math
import re
from datetime import datetime
from bisect import bisect_left, bisect_right
from scipy.stats import norm
from .portfolio import bounded, numeric_fields, integer, stamps, result
from .electrical import keys


def validate(p):
    bounded(p,('schemaVersion','source','eventDefinition','censoringAssumptionSource','trainSites','evaluationSites','trainEndUtc','evaluationStartUtc','confidenceLevel','minimumAtRisk','ageDays','remainingHorizonDays','scoreHorizonDays','minimumCensorSurvival','records'))
    if p['schemaVersion']!='cohort-survival-v1':raise ValueError('Survival version')
    for name in ('eventDefinition','censoringAssumptionSource'):
        if not isinstance(p[name],str) or not 10<=len(p[name].strip())<=1000:raise ValueError('Provenance required')
    numeric_fields(p,dict(confidenceLevel=(.8,.99),ageDays=(0,36500),remainingHorizonDays=(1e-6,36500),scoreHorizonDays=(1e-6,36500),minimumCensorSurvival=(.01,.5)))
    integer(p['minimumAtRisk'],2,10000)
    for sites in (p['trainSites'],p['evaluationSites']):
        if not isinstance(sites,list) or not 1<=len(sites)<=50 or any(not isinstance(x,str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,40}',x) for x in sites) or len(set(sites))!=len(sites):raise ValueError('Site identities')
    if set(p['trainSites'])&set(p['evaluationSites']):raise ValueError('Overlapping sites')
    stamp=lambda s:datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
    for key in ('trainEndUtc','evaluationStartUtc'):stamps([dict(timestamp=p[key])],1)
    if stamp(p['trainEndUtc'])>=stamp(p['evaluationStartUtc']):raise ValueError('Chronology')
    if not isinstance(p['records'],list) or not 4<=len(p['records'])<=10000:raise ValueError('Cohort budget')
    seen=set();train=[];evaluation=[]
    for row in p['records']:
        keys(row,('siteId','assetId','installedUtc','observedUntilUtc','failed'))
        if row['siteId'] not in p['trainSites']+p['evaluationSites'] or not isinstance(row['assetId'],str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,40}',row['assetId']) or type(row['failed']) is not bool:raise ValueError('Asset/outcome identity')
        identity=row['assetId']
        if identity in seen:raise ValueError('One outcome per asset')
        seen.add(identity)
        for key in ('installedUtc','observedUntilUtc'):stamps([dict(timestamp=row[key])],1)
        installed=stamp(row['installedUtc']);end=stamp(row['observedUntilUtc']);days=(end-installed)/86400
        if not 0<days<=36500:raise ValueError('Positive bounded follow-up')
        if row['siteId'] in p['trainSites']:
            if end>stamp(p['trainEndUtc']):raise ValueError('Training uses future outcomes')
            train.append((days,row['failed']))
        else:
            if installed<stamp(p['evaluationStartUtc']):raise ValueError('Evaluation cohort must start in future')
            evaluation.append((days,row['failed']))
    if len(train)<2 or len(evaluation)<2:raise ValueError('Two assets per split required')
    return train,evaluation


def curve(rows,confidence=.95):
    grouped={}
    for time,failed in rows:
        counts=grouped.setdefault(time,[0,0]);counts[0 if failed else 1]+=1
    risk=len(rows);survival=1.;greenwood=0.;points=[];z=float(norm.ppf((1+confidence)/2))
    for time,(failures,censored) in sorted(grouped.items()):
        if failures:
            survival*=1-failures/risk
            if risk>failures:greenwood+=failures/(risk*(risk-failures))
        if survival in (0,1):lower=upper=survival
        else:
            center=math.log(-math.log(survival));se=math.sqrt(greenwood)/abs(math.log(survival))
            lower=math.exp(-math.exp(min(700,center+z*se)));upper=math.exp(-math.exp(max(-700,center-z*se)))
        points.append(dict(days=time,atRisk=risk,failures=failures,censored=censored,survival=survival,ciLower=lower,ciUpper=upper))
        risk-=failures+censored
    return points


def value(points,time,left=False,times=None):
    index=(bisect_left if left else bisect_right)(times if times is not None else [x['days'] for x in points],time)-1
    return points[index]['survival'] if index>=0 else 1.


def censoring_curve(rows):
    # Reverse KM: observed failures removed BEFORE censoring at tied times.
    grouped={}
    for t,failed in rows:
        counts=grouped.setdefault(t,[0,0]);counts[0 if failed else 1]+=1
    risk=len(rows);probability=1.;points=[]
    for t,(failed,censored) in sorted(grouped.items()):
        denominator=risk-failed
        if censored:probability*=1-censored/denominator
        points.append(dict(days=t,survival=probability));risk-=failed+censored
    return points


def cohort_survival(p):
    train,evaluation=validate(p);points=curve(train,p['confidenceLevel'])
    times=[x['days'] for x in points]
    survival=lambda t:value(points,t,times=times)
    age=p['ageDays'];end=age+p['remainingHorizonDays'];support=max(t for t,_ in train)
    at_age=sum(t>=age for t,_ in train);at_end=sum(t>=end for t,_ in train);s_age=survival(age)
    supported=end<=support and at_end>=p['minimumAtRisk'] and s_age>0
    probability=restricted=None
    if supported:
        probability=survival(end)/s_age
        cuts=[age]+[x['days'] for x in points if age<x['days']<end]+[end]
        restricted=sum((right-left)*survival(left)/s_age for left,right in zip(cuts,cuts[1:]))
    h=p['scoreHorizonDays'];censor_curve=censoring_curve(train);censor_times=[x['days'] for x in censor_curve]
    g_h=value(censor_curve,h,times=censor_times);score_supported=h<=support and sum(t>=h for t,_ in train)>=p['minimumAtRisk'] and g_h>=p['minimumCensorSurvival']
    prediction=survival(h);weighted=0.;early=0
    for t,failed in evaluation:
        if failed and t<=h:
            g=value(censor_curve,t,left=True,times=censor_times)
            if g<p['minimumCensorSurvival']:score_supported=False
            else:weighted+=prediction**2/g
        elif t>h:
            if g_h>=p['minimumCensorSurvival']:weighted+=(1-prediction)**2/g_h
        else:early+=1
    score_supported=score_supported and len(evaluation)-early>=2
    median=next((x['days'] for x in points if x['survival']<=.5),None)
    output=dict(curve=points,trainingAssets=len(train),trainingFailures=sum(f for _,f in train),evaluationAssets=len(evaluation),maximumFollowupDays=support,medianLifetimeDays=median,conditional=dict(ageDays=age,horizonDays=p['remainingHorizonDays'],atRiskAtAge=at_age,atRiskAtHorizon=at_end,status='supported' if supported else 'insufficient_support',survivalProbability=probability,restrictedMeanRemainingDays=restricted),evaluation=dict(horizonDays=h,predictedSurvival=prediction,censorSurvival=g_h,earlyCensoredAssets=early,scoredAssets=len(evaluation)-early,status='supported' if score_supported else 'insufficient_support',ipcwBrier=weighted/len(evaluation) if score_supported else None),fieldGate='blocked_missing_independent_lifetime_evidence',ciMethod='Pointwise Greenwood log-log, not simultaneous; 0/1 endpoint intervals are degenerate empirical limits',estimand='Cohort first-event lifetime from installation; conditional restricted mean to stated horizon, not unrestricted or individualized RUL')
    r=result(p,'cohort_survival',output,'insufficient_evidence')
    r['limitations']+=['Independent non-informative censoring and transferable train censor distribution are caller assumptions, not verified facts.','No delayed entry, competing-risk classification, recurrent events, covariates, extrapolation or field RUL qualification.','IPCW can exceed one with finite-sample weighting; not a calibrated accuracy certificate.','Greenwood intervals assume independent assets; no site-cluster correction. Endpoint intervals are not proof of zero uncertainty.']
    return r
