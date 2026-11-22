"""Assumed reduced-order dynamics, NOT an implemented physical MPPT algorithm.

RK4 with integral states; independent DOP853 and analytic oracles in tests.
No network/POI or production energy integration.
"""
from datetime import datetime, timezone
import math
from .electrical import keys, number
from .thermal import digest


def stamp(value):
    if not isinstance(value, str):
        raise ValueError('Timestamp string required')
    t = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if t.tzinfo is None or t.utcoffset() is None:
        raise ValueError('Explicit timestamp offset required')
    return t.astimezone(timezone.utc)


def simulate(plan, cancel=lambda: False):
    keys(plan, ('schemaVersion','source','equipment','initial','intervals','stepS'), ('maxSteps',))
    if plan['schemaVersion'] != 'transient-plan-v1' or not isinstance(plan['source'], str) or not plan['source'].strip():
        raise ValueError('Version/source required')
    eq = plan['equipment']
    names = ('ratingW','efficiency','mpptTauS','controlTauS','thermalRKW','thermalCJK','derateStartC','shutdownC')
    keys(eq, names)
    e = {k:number(eq[k], *bounds, k) for k,bounds in zip(names, (
        (1,1e8),(.5,1),(.01,3600),(.01,3600),(1e-6,10),(1,1e9),(-40,150),(-39,200)))}
    if e['shutdownC'] <= e['derateStartC']:
        raise ValueError('shutdownC must exceed derateStartC')
    step = number(plan['stepS'], .0001, 10, 'stepS')
    if step > min(e['mpptTauS'],e['controlTauS'],e['thermalRKW']*e['thermalCJK'])/10:
        raise ValueError('Step exceeds time-constant/10 stability domain')
    budget = plan.get('maxSteps',200000)
    if type(budget) is not int or not 1 <= budget <= 1000000:
        raise ValueError('Invalid maxSteps')
    initial = plan['initial']
    keys(initial, ('trackedDcW','commandW','temperatureC'))
    y = [number(initial['trackedDcW'],0,1e9,'trackedDcW'),
         number(initial['commandW'],0,e['ratingW'],'commandW'),
         number(initial['temperatureC'],-80,200,'temperatureC'),0.,0.,0.]
    intervals = plan['intervals']
    if not isinstance(intervals,list) or not 1 <= len(intervals) <= 10000:
        raise ValueError('Require 1..10000 intervals')
    prepared=[]; end=None; totalsteps=0
    for row in intervals:
        keys(row, ('start','durationS','availableDcW','setpointW','hardLimitW','ambientC'))
        start=stamp(row['start'])
        duration=number(row['durationS'],.001,60,'durationS')
        if end is not None and abs(start.timestamp()-end)>1e-6:
            raise ValueError('Gap/overlap: contiguous explicit intervals required')
        end=start.timestamp()+duration
        data={k:number(row[k],lo,hi,k) for k,lo,hi in (
            ('availableDcW',0,1e9),('setpointW',0,e['ratingW']),
            ('hardLimitW',0,e['ratingW']),('ambientC',-80,100))}
        n=math.ceil(duration/step); totalsteps+=n
        prepared.append((start,duration,n,data))
    if totalsteps>budget:
        raise RuntimeError('Integration step budget exceeded; no fallback')
    traces=[]; steps=0; elapsed=0.
    for start,duration,n,d in prepared:
        h=duration/n
        def power(state):
            derate=max(0.,min(1.,(e['shutdownC']-state[2])/(e['shutdownC']-e['derateStartC'])))
            return max(0.,min(e['efficiency']*min(state[0],d['availableDcW']),
                             state[1],d['hardLimitW'],e['ratingW']*derate))
        def rhs(state):
            p=power(state); heat=p*(1/e['efficiency']-1)
            return [(d['availableDcW']-state[0])/e['mpptTauS'],
                    (d['setpointW']-state[1])/e['controlTauS'],
                    (heat-(state[2]-d['ambientC'])/e['thermalRKW'])/e['thermalCJK'],
                    p,heat,(state[2]-d['ambientC'])/e['thermalRKW']]
        energy0=y[3]; temp0=y[2]; heat0=y[4]; cool0=y[5]
        for _ in range(n):
            if cancel():
                raise RuntimeError('Transient simulation cancelled; no partial result')
            k1=rhs(y)
            k2=rhs([a+h*b/2 for a,b in zip(y,k1)])
            k3=rhs([a+h*b/2 for a,b in zip(y,k2)])
            k4=rhs([a+h*b for a,b in zip(y,k3)])
            y=[a+h*(b+2*c+2*d0+f)/6 for a,b,c,d0,f in zip(y,k1,k2,k3,k4)]
            if any(not math.isfinite(v) for v in y) or not -100 <= y[2] <= 250:
                raise RuntimeError('Transient state outside research domain')
            steps+=1
        elapsed+=duration
        traces.append(dict(startUTC=start.isoformat(),durationS=duration, elapsedS=elapsed,
                           trackedDcW=y[0],commandW=y[1],temperatureC=y[2],endAcW=power(y),
                           energyWh=(y[3]-energy0)/3600,
                           thermalBalanceResidualJ=e['thermalCJK']*(y[2]-temp0)-(y[4]-heat0)+(y[5]-cool0)))
    return dict(schemaVersion='transient-result-v1',algorithmVersion='1.0.0',plan=plan,planSha256=digest(plan),
                validationStatus='conditional_assumptions',projectApproval='blocked',source=plan['source'],
                model='assumed_first_order_power_tracking_and_control_with_lumped_RC',
                equipment=e,initial=initial,stepS=step,steps=steps,durationS=elapsed,
                energyWh=y[3]/3600,conversionHeatWh=y[4]/3600,ambientHeatWh=y[5]/3600,
                trace=traces,fallback='none_fail_closed',
                limitations=['not_PandO_or_voltage_current_MPPT','not_manufacturer_controller',
                             'ZOH_subinterval_inputs_not_hourly_means','local_AC_limit_not_POI_control',
                             'linear_derating_no_hysteresis_or_trip_latch','fixed_efficiency_no_idle_loss',
                             'no_field_validation_or_production_energy_waterfall'])
