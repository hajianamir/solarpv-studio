"""Descriptive held-out absolute-residual bands. No verified exchangeability claim."""
from datetime import datetime
from decimal import Decimal,ROUND_CEILING
import math
import re
from .science_d import header
from .portfolio import numeric_fields,stamps,result
from .electrical import keys
from .reference_models import evidence

IDENTITY=re.compile(r'[A-Za-z0-9_-]{1,40}')


def interval_calibration(p):
    header(p,'interval-calibration-v1',('modelSha256','datasetSha256','modelTrainingEndTimestamp','durationHours','alpha','trainingSites','calibration','evaluation'))
    numeric_fields(p,dict(durationHours=(.25,8784),alpha=(.001,.5)))
    for name in ('modelSha256','datasetSha256'):
        if not isinstance(p[name],str) or not re.fullmatch('[a-f0-9]{64}',p[name]):raise ValueError('Declared model/dataset hashes')
    training=p['trainingSites']
    if not isinstance(training,list) or not 1<=len(training)<=100 or any(not isinstance(s,str) or not IDENTITY.fullmatch(s) for s in training) or len(set(training))!=len(training):raise ValueError('Unique training site identities')
    stamps([dict(timestamp=p['modelTrainingEndTimestamp'])],1)
    epoch=lambda t:datetime.fromisoformat(t.replace('Z','+00:00')).timestamp()
    seen=set();times=[];sites=[]
    for group in ('calibration','evaluation'):
        records=p[group]
        if not isinstance(records,list) or not 1<=len(records)<=5000:raise ValueError('Calibration/evaluation row budgets')
        group_times=[];group_sites=set()
        for row in records:
            keys(row,('siteId','timestamp','predictionKwh','observedKwh'));numeric_fields(row,dict(predictionKwh=(0,1e12),observedKwh=(0,1e12)))
            if not isinstance(row['siteId'],str) or not IDENTITY.fullmatch(row['siteId']):raise ValueError('Site identity')
            stamps([dict(timestamp=row['timestamp'])],1);stamp=epoch(row['timestamp']);key=(row['siteId'],stamp)
            if key in seen:raise ValueError('Duplicate site/time sample')
            seen.add(key);group_times.append(stamp);group_sites.add(row['siteId'])
        if len(group_sites)>100:raise ValueError('Site budget')
        for site in group_sites:
            ordered=sorted(epoch(r['timestamp']) for r in records if r['siteId']==site)
            if any(b-a<p['durationHours']*3600 for a,b in zip(ordered,ordered[1:])):raise ValueError('Overlapping measurement windows')
        times.append(group_times);sites.append(group_sites)
    if sites[0]&sites[1] or set(training)&(sites[0]|sites[1]):raise ValueError('Disjoint training/calibration/evaluation sites required')
    if epoch(p['modelTrainingEndTimestamp'])>=min(times[0]) or max(times[0])+p['durationHours']*3600>min(times[1]):raise ValueError('Strict training/calibration/evaluation time order')
    scores=sorted(abs(r['observedKwh']-r['predictionKwh']) for r in p['calibration']);n=len(scores);rank=int(((n+1)*(Decimal(1)-Decimal(str(p['alpha'])))).to_integral_value(rounding=ROUND_CEILING));radius=scores[rank-1] if rank<=n else None
    trace=[]
    for row in p['evaluation']:
        lo=row['predictionKwh']-radius if radius is not None else None;hi=row['predictionKwh']+radius if radius is not None else None;trace.append(dict(**row,lowerKwh=lo,upperKwh=hi,covered=radius is None or lo<=row['observedKwh']<=hi,residualKwh=row['predictionKwh']-row['observedKwh']))
    def metrics(rows):
        count=len(rows);return dict(count=count,maeKwh=math.fsum(abs(r['residualKwh']) for r in rows)/count,rmseKwh=math.sqrt(math.fsum(r['residualKwh']**2 for r in rows)/count),biasKwh=math.fsum(r['residualKwh'] for r in rows)/count,empiricalCoverage=sum(r['covered'] for r in rows)/count,meanWidthKwh=2*radius if radius is not None else None)
    by_site=[dict(siteId=s,**metrics([r for r in trace if r['siteId']==s])) for s in sorted(sites[1])]
    return result(p,'interval_calibration',dict(calibrationCount=n,rank=rank,sortedScoresKwh=scores,radiusKwh=radius,bandStatus='finite' if radius is not None else 'unbounded_insufficient_calibration',nominalCoverage=1-p['alpha'],evaluation=trace,metrics=metrics(trace),bySite=by_site,guaranteeStatus='blocked_exchangeability_and_model_freeze_not_verified',referenceHashes=evidence(['docs/reference-data/conformal/correctness-checks.ipynb','docs/reference-data/conformal/LICENSE.txt']),scope='Absolute-residual split-conformal formula on caller-declared frozen predictions and disjoint-site temporal holdout. Metadata do not prove model freezing or exchangeability; site/time shift can invalidate nominal coverage. Unbounded intervals are the entire real line, not useful calibration. No clipped bounds, tail-energy UQ, censored RUL calibration, model fitting, project qualification, energy or finance adoption.'),'insufficient_evidence')
