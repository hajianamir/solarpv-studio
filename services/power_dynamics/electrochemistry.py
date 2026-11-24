"""Isothermal two-electrode single-particle model (SPM), spherical conservative FV.
Positive pack current is discharge. Fixed electrolyte concentration; no degradation.
"""
import math
import numpy as np
from scipy.integrate import solve_ivp
from .common import (header, keys, number, positive, integer, intervals, result, finite_state)

F = 96485.33212
R = 8.31446261815324


def electrode(raw, cells, temperature):
    keys(raw, ('radiusM', 'diffusivityM2S', 'maximumConcentrationMolM3', 'activeVolumeM3',
               'initialStoichiometry', 'reactionRate', 'activationEnergyJMol', 'referenceTemperatureK', 'ocp'))
    p = {k: positive(raw[k], k) for k in ('radiusM', 'diffusivityM2S', 'maximumConcentrationMolM3',
                                          'activeVolumeM3', 'reactionRate', 'referenceTemperatureK')}
    p['initial'] = number(raw['initialStoichiometry'], 1e-8, 1-1e-8, 'initialStoichiometry')
    activation = number(raw['activationEnergyJMol'], 0, 1e6, 'activationEnergyJMol')
    p['rate'] = p['reactionRate']*math.exp(activation/R*(1/p['referenceTemperatureK']-1/temperature))
    table = raw['ocp']
    if not isinstance(table, list) or not 2 <= len(table) <= 10001:
        raise ValueError('OCP must be explicit monotonic-stoichiometry table')
    xs, us = [], []
    for row in table:
        if not isinstance(row, list) or len(row) != 2:
            raise ValueError('OCP rows must contain stoichiometry and voltage')
        x = number(row[0], 0, 1, 'OCP stoichiometry')
        u = number(row[1], -10, 10, 'OCP potential V')
        if xs and x <= xs[-1]:
            raise ValueError('Strictly increasing OCP stoichiometry required')
        xs.append(x)
        us.append(u)
    if not xs[0] < p['initial'] < xs[-1]:
        raise ValueError('Initial stoichiometry outside strict OCP domain')
    p['xs'], p['us'] = np.array(xs), np.array(us)
    edges = np.linspace(0, p['radiusM'], cells+1)
    centers = (edges[1:]+edges[:-1])/2
    volumes = np.diff(edges**3)/3
    # Faces use particle volume with the common 4*pi factor cancelled.
    G = p['diffusivityM2S']*edges[1:-1]**2/np.diff(centers)
    A = np.zeros((cells, cells))
    for i, g in enumerate(G):
        A[i, i] -= g/volumes[i]
        A[i, i+1] += g/volumes[i]
        A[i+1, i] += g/volumes[i+1]
        A[i+1, i+1] -= g/volumes[i+1]
    p.update(matrix=A, weights=volumes/sum(volumes), boundary=edges[-1]**2/volumes[-1],
             halfWidth=p['radiusM']-centers[-1], area=3*p['activeVolumeM3']/p['radiusM'])
    return p


def simulate(plan):
    header(plan, 'spm-plan-v1', ('temperatureK', 'electrolyteConcentrationMolM3', 'seriesCells',
        'parallelCells', 'ohmicResistanceOhm', 'lowerCellVoltageV', 'upperCellVoltageV',
        'radialCells', 'maximumStepS', 'relativeTolerance', 'negative', 'positive', 'intervals'))
    temp = number(plan['temperatureK'], 250, 350, 'temperatureK')
    ce = positive(plan['electrolyteConcentrationMolM3'], 'electrolyteConcentrationMolM3')
    ns = integer(plan['seriesCells'], 1, 100000, 'seriesCells')
    npack = integer(plan['parallelCells'], 1, 100000, 'parallelCells')
    resistance = number(plan['ohmicResistanceOhm'], 0, 1000, 'ohmicResistanceOhm')
    lower = number(plan['lowerCellVoltageV'], 0, 10, 'lowerCellVoltageV')
    upper = number(plan['upperCellVoltageV'], lower, 10, 'upperCellVoltageV')
    if upper <= lower:
        raise ValueError('Voltage cutoff window must have positive width')
    n = integer(plan['radialCells'], 4, 100, 'radialCells')
    step = number(plan['maximumStepS'], .001, 60, 'maximumStepS')
    tolerance = number(plan['relativeTolerance'], 1e-10, 1e-4, 'relativeTolerance')
    neg = electrode(plan['negative'], n, temp)
    pos = electrode(plan['positive'], n, temp)
    rows = plan['intervals']
    intervals(rows, ('packCurrentA',), 2000)
    duration = sum(r['durationS'] for r in rows)
    if duration > 86400 or duration/step > 200000:
        raise ValueError('SPM time budget exceeded')
    currents = [number(r['packCurrentA'], -1e6, 1e6, 'packCurrentA')/npack for r in rows]
    y = np.r_[np.full(n, neg['initial']*neg['maximumConcentrationMolM3']),
              np.full(n, pos['initial']*pos['maximumConcentrationMolM3'])]
    initial_y = y.copy()

    def inventory(state):
        return float(np.dot(state[:n], neg['weights'])*neg['activeVolumeM3']+
                     np.dot(state[n:], pos['weights'])*pos['activeVolumeM3'])

    inventory0 = inventory(y)
    trace = []
    elapsed = 0.
    status = 'completed'
    stopped = None
    charge_as = 0.
    for row, current in zip(rows, currents):
        jn = current/(F*neg['area'])
        jp = -current/(F*pos['area'])

        def surfaces(state):
            return (state[n-1]-jn*neg['halfWidth']/neg['diffusivityM2S'],
                    state[-1]-jp*pos['halfWidth']/pos['diffusivityM2S'])

        def safe_surfaces(state):
            cn, cp = surfaces(state)
            xn, xp = cn/neg['maximumConcentrationMolM3'], cp/pos['maximumConcentrationMolM3']
            return (neg['xs'][0] < xn < neg['xs'][-1] and pos['xs'][0] < xp < pos['xs'][-1]
                    and 0 < xn < 1 and 0 < xp < 1)

        def voltage(state):
            cn, cp = surfaces(state)
            xn, xp = cn/neg['maximumConcentrationMolM3'], cp/pos['maximumConcentrationMolM3']
            # Numerical event bracketing may evaluate outside the domain. Only the
            # terminal event root or valid side is exposed; never extrapolate OCP.
            if not safe_surfaces(state):
                return None
            un, up = np.interp(xn, neg['xs'], neg['us']), np.interp(xp, pos['xs'], pos['us'])
            i0n = neg['rate']*math.sqrt(ce*cn*(neg['maximumConcentrationMolM3']-cn))
            i0p = pos['rate']*math.sqrt(ce*cp*(pos['maximumConcentrationMolM3']-cp))
            etan = 2*R*temp/F*math.asinh(F*jn/(2*i0n))
            etap = 2*R*temp/F*math.asinh(F*jp/(2*i0p))
            return float(up-un+etap-etan-current*resistance)

        def domain(t, state):
            cn, cp = surfaces(state)
            xn, xp = cn/neg['maximumConcentrationMolM3'], cp/pos['maximumConcentrationMolM3']
            return min(xn-max(0, neg['xs'][0]), min(1, neg['xs'][-1])-xn,
                       xp-max(0, pos['xs'][0]), min(1, pos['xs'][-1])-xp,
                       np.min(state[:n])/neg['maximumConcentrationMolM3'],
                       1-np.max(state[:n])/neg['maximumConcentrationMolM3'],
                       np.min(state[n:])/pos['maximumConcentrationMolM3'],
                       1-np.max(state[n:])/pos['maximumConcentrationMolM3'])

        def low(t, state):
            v = voltage(state)
            return v-lower if v is not None else 1.

        def high(t, state):
            v = voltage(state)
            return upper-v if v is not None else 1.

        for event in (domain, low, high):
            event.terminal = True
            event.direction = -1

        v0 = voltage(y)
        if domain(0, y) <= 0 or v0 is None or v0 <= lower or v0 >= upper:
            status = 'cutoff'
            stopped = dict(elapsedS=elapsed, reason='initial_or_step_boundary_domain_or_voltage',
                           requestedPackCurrentA=row['packCurrentA'], cellVoltageV=v0)
            break

        def rhs(t, state):
            dn = neg['matrix']@state[:n]
            dp = pos['matrix']@state[n:]
            dn[-1] -= neg['boundary']*jn
            dp[-1] -= pos['boundary']*jp
            return np.r_[dn, dp]

        sol = solve_ivp(rhs, (0., row['durationS']), y, method='BDF', rtol=tolerance,
                        atol=tolerance, max_step=step, events=(domain, low, high))
        if not sol.success:
            raise RuntimeError('SPM solver failed: '+sol.message)
        prior_elapsed = elapsed
        for t, state in zip(sol.t, sol.y.T):
            finite_state(state)
            csn, csp = surfaces(state)
            v = voltage(state)
            trace.append(dict(elapsedS=prior_elapsed+float(t), intervalStart=row['start'],
                packCurrentA=row['packCurrentA'], cellVoltageV=v, packVoltageV=None if v is None else ns*v,
                averageNegativeStoichiometry=float(np.dot(state[:n], neg['weights'])/neg['maximumConcentrationMolM3']),
                averagePositiveStoichiometry=float(np.dot(state[n:], pos['weights'])/pos['maximumConcentrationMolM3']),
                surfaceNegativeStoichiometry=float(csn/neg['maximumConcentrationMolM3']),
                surfacePositiveStoichiometry=float(csp/pos['maximumConcentrationMolM3']),
                cellLithiumResidualMol=inventory(state)-inventory0))
        y = sol.y[:, -1]
        used = float(sol.t[-1])
        elapsed += used
        charge_as += current*used
        if sol.status == 1:
            which = next(i for i, ts in enumerate(sol.t_events) if len(ts))
            status = 'cutoff'
            stopped = dict(elapsedS=elapsed, reason=('stoichiometry_domain', 'lower_voltage', 'upper_voltage')[which],
                           cellVoltageV=voltage(y), requestedPackCurrentA=row['packCurrentA'])
            break
    expected_n = neg['initial']*neg['maximumConcentrationMolM3']-charge_as/(F*neg['activeVolumeM3'])
    expected_p = pos['initial']*pos['maximumConcentrationMolM3']+charge_as/(F*pos['activeVolumeM3'])
    return result(plan, 'spm-result-v1', ['Isothermal SPM, fixed electrolyte; no transport losses in electrolyte',
        'OCP is piecewise linear in the supplied domain; diffusivity is supplied at temperatureK',
        'No SEI, plating, ageing, thermal runaway or safety certification',
        'Cutoff terminates execution; unexecuted future intervals are not zero-filled',
        'Cell current=pack current/parallel cells; voltage scales with series cells; no imbalance model',
        'No automatic annual energy or finance adoption'], status=status, stopped=stopped,
        elapsedS=elapsed, unexecutedDurationS=duration-elapsed, trace=trace,
        finalNegativeConcentrationMolM3=y[:n].tolist(), finalPositiveConcentrationMolM3=y[n:].tolist(),
        initialLithiumMolPerCell=inventory0, finalLithiumMolPerCell=inventory(y),
        lithiumResidualMolPerCell=inventory(y)-inventory0,
        coulombResidualNegativeMolM3=float(np.dot(y[:n], neg['weights'])-expected_n),
        coulombResidualPositiveMolM3=float(np.dot(y[n:], pos['weights'])-expected_p))
