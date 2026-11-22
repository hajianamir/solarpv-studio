"""Nonlinear five-parameter substring circuit, fixed-drop ideal bypass.

Parameters are ALREADY at operating conditions; never divide a module fit into
substrings implicitly. No avalanche/hotspot or protection certification.
"""
import math
import numpy as np
import pvlib
from scipy.optimize import brentq,minimize_scalar
from .electrical import keys,number
from .thermal import digest


def validate(plan):
    keys(plan,('schemaVersion','source','substrings','strings','voltageToleranceV','currentToleranceA','maxEvaluations'))
    if plan['schemaVersion']!='diode-network-plan-v1' or not isinstance(plan['source'],str) or not plan['source'].strip() or len(plan['source'])>500:raise ValueError('Version/source required')
    units=plan['substrings'];strings=plan['strings']
    if not isinstance(units,list) or not 1<=len(units)<=12:raise ValueError('Require 1..12 substrings')
    seen=set()
    for s in units:
        keys(s,('id','photocurrentA','saturationCurrentA','seriesOhm','shuntOhm','nNsVthV','bypassDropV'))
        if not isinstance(s['id'],str) or not s['id'].strip() or len(s['id'])>40 or s['id'] in seen:raise ValueError('Unique substring id required')
        seen.add(s['id'])
        for k,lo,hi in [('photocurrentA',0,30),('saturationCurrentA',1e-15,.001),('seriesOhm',0,10),('shuntOhm',1,1e6),('nNsVthV',.01,10),('bypassDropV',0,2)]:number(s[k],lo,hi,k)
    if not isinstance(strings,list) or not 1<=len(strings)<=4 or any(not isinstance(s,list) or not s for s in strings):raise ValueError('Require 1..4 explicit series strings')
    ids=[i for s in strings for i in s]
    if any(not isinstance(i,str) for i in ids) or len(ids)!=len(set(ids)) or set(ids)!=seen:raise ValueError('Every substring exactly once in wiring')
    number(plan['voltageToleranceV'],1e-8,.001,'voltageToleranceV');number(plan['currentToleranceA'],1e-10,1e-5,'currentToleranceA')
    if type(plan['maxEvaluations']) is not int or not 500<=plan['maxEvaluations']<=200000:raise ValueError('Invalid circuit evaluation budget')


def solve(plan,cancel=lambda:False):
    validate(plan);units={s['id']:s for s in plan['substrings']};evaluations=0
    params={k:(s['photocurrentA'],s['saturationCurrentA'],s['seriesOhm'],s['shuntOhm'],s['nNsVthV']) for k,s in units.items()}
    activation={k:max(0.,float(pvlib.pvsystem.i_from_v(-s['bypassDropV'],*params[k],method='lambertw'))) for k,s in units.items()}
    def voltage(current,ids):
        nonlocal evaluations
        evaluations+=1
        if evaluations>plan['maxEvaluations']:raise RuntimeError('Circuit evaluation budget exceeded')
        if cancel():raise RuntimeError('Circuit execution cancelled')
        total=0.
        for k in ids:
            s=units[k]
            v=-s['bypassDropV'] if current>=activation[k] else float(pvlib.pvsystem.v_from_i(current,*params[k],method='lambertw'))
            if not math.isfinite(v):raise ValueError('Nonfinite diode voltage')
            total+=max(-s['bypassDropV'],v)
        return total
    strings=plan['strings'];vocs=[max(0.,voltage(0.,s)) for s in strings]
    highs=[max(activation[k] for k in s) for s in strings]
    knots={0.,*vocs}
    for ids in strings:
        for k in ids:knots.add(max(0.,voltage(activation[k],ids)))
    def currents(v):
        out=[]
        for ids,voc,high in zip(strings,vocs,highs):
            if v>=voc or high==0:out.append(0.);continue
            out.append(float(brentq(lambda i:voltage(i,ids)-v,0.,high,xtol=plan['currentToleranceA'],rtol=1e-12,maxiter=100)))
        return out
    def power(v):return v*sum(currents(v))
    best=(0.,0.)
    for v in sorted(knots):
        pp=power(v)
        if pp>best[0]:best=(pp,v)
    ordered=sorted(knots)
    for lo,hi in zip(ordered,ordered[1:]):
        if hi-lo<=plan['voltageToleranceV']:continue
        opt=minimize_scalar(lambda v:-power(v),bounds=(lo,hi),method='bounded',options={'xatol':plan['voltageToleranceV'],'maxiter':100})
        if not opt.success:raise RuntimeError('Circuit peak search did not converge')
        if -opt.fun>best[0]:best=(-float(opt.fun),float(opt.x))
    amps=currents(best[1]);points=[];bypass_heat=0.
    for ids,i in zip(strings,amps):
        for k in ids:
            v=voltage(i,[k]);is_bypass=i>activation[k]+plan['currentToleranceA']
            heat=units[k]['bypassDropV']*max(0.,i-activation[k]) if is_bypass else 0.
            bypass_heat+=heat
            points.append(dict(id=k,currentA=i,voltageV=v,powerW=i*v,bypassActive=is_bypass,bypassDissipationW=heat))
    independent=sum(float(pvlib.pvsystem.singlediode(*params[k],method='lambertw')['p_mp']) for k in units)
    balance=sum(p['powerW'] for p in points)-best[0]
    if abs(balance)>max(1e-5,best[0]*1e-7):raise RuntimeError('Circuit power balance residual')
    return dict(schemaVersion='diode-network-result-v1',algorithmVersion='1.0.0',plan=plan,planSha256=digest(plan),validationStatus='not_field_validated',projectApproval='blocked',
        mppW=best[0],mppV=best[1],mppA=sum(amps),independentSubstringMppW=independent,mismatchW=max(0.,independent-best[0]),powerResidualW=balance,
        evaluations=evaluations,substrings=points,bypassDissipationW=bypass_heat,
        limitations=['five_parameters_at_declared_operating_condition_not_automatic_fit_scaling','fixed_drop_bypass_and_ideal_string_blocking',
          'uniform_within_each_substring_no_cell_hotspot_avalanche','numerical_segment_peak_search_with_declared_tolerances','not_connected_to_optics_or_production_yield','caller_parameters_not_authenticated'])
