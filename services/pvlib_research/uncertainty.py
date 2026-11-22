"""Conditional sourced project-budget RESEARCH, not a bankability certificate.

Systematic log factors shared across years; interannual factors use an explicit
separable temporal correlation matrix. Cross-group independence must be declared.
No RMSE-to-CV conversion, data fitting, or automatic thermal-to-energy propagation.
"""
from __future__ import annotations
import math
import re
from statistics import NormalDist
import numpy as np
from .thermal import digest, number


def matrix(raw, n, label):
    if not isinstance(raw,list) or any(not isinstance(row,list) or any(isinstance(v,bool) or not isinstance(v,(int,float)) for v in row) for row in raw):
        raise ValueError(label+' numeric matrix required')
    a = np.asarray(raw, dtype=float)
    if a.shape != (n, n) or not np.isfinite(a).all():
        raise ValueError(label+' shape/finite mismatch')
    if not np.allclose(a, a.T, atol=1e-12, rtol=0) or not np.allclose(np.diag(a), 1, atol=1e-12, rtol=0) or (np.abs(a)>1).any():
        raise ValueError(label+' must be symmetric unit-diagonal correlation')
    e, v = np.linalg.eigh(a)
    if e.min() < -1e-10:
        raise ValueError(label+' must be PSD')
    return a, v @ np.diag(np.sqrt(np.maximum(0, e)))


def text(v):
    if not isinstance(v, str) or not v.strip() or len(v) > 2000:
        raise ValueError('Nonblank bounded provenance required')
    return v


def review(plan):
    required = {'schemaVersion','studyInputSha256','baselineEnergyWh','baselineInterpretation','horizonYears','components','systematicCorrelation','interannualCorrelation','temporalCorrelation','crossGroupIndependenceSource','samples','seed'}
    if set(plan) != required or plan['schemaVersion'] != 'project-energy-uncertainty-research-v1':
        raise ValueError('Exact versioned uncertainty plan required')
    if not isinstance(plan['studyInputSha256'], str) or not re.fullmatch('[a-f0-9]{64}',plan['studyInputSha256']):
        raise ValueError('Study input SHA required')
    if plan['baselineInterpretation'] != 'annual_baseline_as_median_before_log_bias':
        raise ValueError('Explicit median baseline required')
    energy = number(plan['baselineEnergyWh'], 1e-12, 1e15)
    years = number(plan['horizonYears'], 1, 30)
    samples = number(plan['samples'], 2000, 100000)
    seed = number(plan['seed'], 0, 2**32-1)
    if any(x != int(x) for x in (years,samples,seed)):
        raise ValueError('Integer years/samples/seed required')
    years, samples = int(years), int(samples)
    text(plan['crossGroupIndependenceSource'])
    components = plan['components']
    if not isinstance(components,list) or not 2 <= len(components) <= 8:
        raise ValueError('2..8 components, including both groups, required')
    ids, effects, groups, budget = set(), set(), {'systematic':[], 'interannual':[]}, []
    for c in components:
        if set(c) != {'id','effectIds','group','category','coefficientOfVariation','logBias','source','sourceVersion','documentSha256','applicability','historyYears'}:
            raise ValueError('Exact sourced component contract required')
        ident = text(c['id'])
        if ident in ids:
            raise ValueError('Duplicate component id')
        ids.add(ident)
        if not isinstance(c['effectIds'],list) or not c['effectIds']:
            raise ValueError('Explicit physical-effect ids required for double-counting review')
        for effect in c['effectIds']:
            effect = text(effect)
            if effect in effects:
                raise ValueError('Repeated physical effect: double counting')
            effects.add(effect)
        if c['group'] not in groups or c['category'] not in ('resource','metrology','model','other'):
            raise ValueError('Unknown group/category')
        for k in ('source','sourceVersion','applicability'):
            text(c[k])
        if not isinstance(c['documentSha256'], str) or not re.fullmatch('[a-f0-9]{64}',c['documentSha256']):
            raise ValueError('Source document SHA required')
        h = number(c['historyYears'], 0, 200)
        if h != int(h) or (c['group']=='interannual' and h < 2):
            raise ValueError('Interannual source needs declared multiyear support; not estimated here')
        cv = number(c['coefficientOfVariation'],0,1)
        bias = number(c['logBias'],-1,1)
        sigma = math.sqrt(math.log1p(cv*cv))
        groups[c['group']].append((c,sigma))
        budget.append(dict(id=ident,group=c['group'],category=c['category'],sigmaLog=sigma,diagonalLogVariance=sigma*sigma,logBias=bias,source=c['source']))
    if not all(groups.values()):
        raise ValueError('Explicit systematic and interannual groups required, even for zero CV')
    roots, variances, signed = {}, {}, []
    for group in groups:
        a, root = matrix(plan[group+'Correlation'], len(groups[group]), group)
        s = np.array([sigma for _,sigma in groups[group]])
        roots[group] = root
        variances[group] = max(0.,float(s @ a @ s))
        for i in range(len(s)):
            for j in range(i+1,len(s)):
                signed.append(dict(group=group,first=groups[group][i][0]['id'],second=groups[group][j][0]['id'],signedLogVariance=float(2*s[i]*a[i,j]*s[j])))
    temporal, temporal_root = matrix(plan['temporalCorrelation'], years, 'temporal')
    rng = np.random.Generator(np.random.PCG64(int(seed)))
    # Repeat the systematic factor, not independent redraws for each year.
    sys_s = np.array([sigma for _,sigma in groups['systematic']])
    var_s = np.array([sigma for _,sigma in groups['interannual']])
    systematic = (rng.standard_normal((samples,len(sys_s))) @ roots['systematic'].T) @ sys_s
    z = rng.standard_normal((samples,years,len(var_s)))
    interannual = np.einsum('ij,sjk,lk->sil',temporal_root,z,roots['interannual']) @ var_s
    bias = math.fsum(c['logBias'] for c in components)
    annual = energy*np.exp(bias+systematic[:,None]+interannual)
    mean_annual = annual.mean(axis=1)  # Arithmetic energy average, NOT geometric mean.
    log_variance = variances['systematic']+variances['interannual']
    expected_mean = energy*math.exp(bias+log_variance/2)
    arithmetic_variance = max(0.,expected_mean**2 * float(np.expm1(variances['systematic']+variances['interannual']*temporal).sum())/years**2)
    analytic = None
    if years == 1:
        analytic = {label:energy*math.exp(bias+NormalDist().inv_cdf(p)*math.sqrt(log_variance)) for label,p in [('p50Wh',.5),('p90Wh',.1)]}
        analytic['meanWh'] = energy*math.exp(bias+log_variance/2)
    def quantiles(v):
        return dict(p50Wh=float(np.quantile(v,.5)),p90Wh=float(np.quantile(v,.1)),meanWh=float(v.mean()))
    # DKW simultaneous 95% CDF band; this bounds MC quantile error only.
    eps = math.sqrt(math.log(2/.05)/(2*samples))
    ci = {label:[float(np.quantile(mean_annual,max(0,p-eps))),float(np.quantile(mean_annual,min(1,p+eps)))] for label,p in [('p50Wh',.5),('p90Wh',.1)]}
    coverage = {c['category'] for c in components}
    blockers = ['source_documents_and_distribution_applicability_not_authenticated','qualified_independent_review_pending']
    blockers += ['missing_'+category+'_uncertainty_source' for category in ('resource','metrology','model') if category not in coverage]
    return dict(schemaVersion='project-energy-uncertainty-review-v1',validationStatus='not_field_validated',status='conditional_assumptions',projectApproval='blocked',blockers=blockers,
                studyInputSha256=plan['studyInputSha256'],planSha256=digest(plan),plan=plan, budget=budget,signedCrossTerms=signed,groupLogVariance=variances,
                logBias=bias,logGeometricMeanVariance=variances['systematic']+variances['interannual']*float(temporal.sum())/years**2,
                horizon=dict(years=years,quantity='arithmetic_mean_annual_energy_Wh',totalEnergyMultiplier=years,temporalCorrelation=temporal.tolist()),
                analyticSingleYear=analytic,arithmeticMeanMoments=dict(meanWh=expected_mean,varianceWh2=arithmetic_variance),monteCarloStdWh=float(mean_annual.std(ddof=1)),monteCarlo=quantiles(mean_annual),monteCarloQuantile95PctDkwBandWh=ci,dkwCdfHalfWidth=eps,
                convergence=dict(firstHalf=quantiles(mean_annual[:samples//2]),secondHalf=quantiles(mean_annual[samples//2:]),full=quantiles(mean_annual)),
                rng='numpy.PCG64',numpyVersion=np.__version__,policy='P90 is the 10th CDF percentile. DKW band is finite-simulation error, NOT project uncertainty or a confidence interval for real plant energy. Bias and component CVs are caller-sourced assumptions; SHA is not document authentication. No RMSE-to-CV, no automatic thermal parameter-to-energy propagation. No approval/annualization of partial observed data.')
