"""Conditional balanced radial AC snapshot; not protection/design approval.

Current summation: MATPOWER manual 4.3.2, equations 4.16–4.19.
SI units; series impedances per phase, referred to the slack voltage level.
Positive PQ is demand; generation fields are positive injection.
"""
import math
from .thermal import digest


REFERENCE = 'https://matpower.app/manual/matpower/DistributionPowerFlow.html'


def number(x, lo, hi, name):
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not lo <= x <= hi:
        raise ValueError('Invalid '+name)
    return float(x)


def keys(obj, required, optional=()):
    if not isinstance(obj, dict) or set(obj) - set(required) - set(optional) or set(required) - set(obj):
        raise ValueError('Unknown or missing electrical fields')


def prepare(plan):
    keys(plan, ('schemaVersion', 'source', 'voltageLLV', 'nodes'), ('exportLimitW', 'maxIterations', 'toleranceV'))
    if plan['schemaVersion'] != 'radial-ac-plan-v1' or not isinstance(plan['source'], str) or not plan['source'].strip():
        raise ValueError('Version and source required')
    voltage = number(plan['voltageLLV'], 1, 1e6, 'voltageLLV') / math.sqrt(3)
    nodes = plan['nodes']
    if not isinstance(nodes, list) or not 1 <= len(nodes) <= 200:
        raise ValueError('Require 1..200 non-slack nodes')
    parents, impedance, loads, generation = [], [], [], []
    for i, n in enumerate(nodes, 1):
        keys(n, ('parent', 'rOhm', 'xOhm', 'loadW', 'loadVar', 'generationW', 'generationPf', 'generationQSign'))
        parent = n['parent']
        if type(parent) is not int or not 0 <= parent < i:
            raise ValueError('Radial oriented parent required (slack=0)')
        parents.append(parent)
        impedance.append(complex(number(n['rOhm'], 0, 1e4, 'rOhm'), number(n['xOhm'], 0, 1e4, 'xOhm')))
        loads.append(complex(number(n['loadW'], 0, 1e10, 'loadW'), number(n['loadVar'], -1e10, 1e10, 'loadVar')) / 3)
        p = number(n['generationW'], 0, 1e10, 'generationW')
        pf = number(n['generationPf'], .05, 1, 'generationPf')
        sign = n['generationQSign']
        if type(sign) is not int or sign not in (-1, 1):
            raise ValueError('generationQSign must be -1 or +1')
        generation.append(complex(p, sign*p*math.tan(math.acos(pf))) / 3)
    iterations = plan.get('maxIterations', 200)
    if type(iterations) is not int or not 1 <= iterations <= 2000:
        raise ValueError('maxIterations must be 1..2000')
    tolerance = number(plan.get('toleranceV', 1e-8), 1e-10, 1e-4, 'toleranceV')
    if 'exportLimitW' in plan:
        number(plan['exportLimitW'], 0, 1e10, 'exportLimitW')
    return voltage, parents, impedance, loads, generation, iterations, tolerance


def solve(plan):
    """Re-solve network for every curtailment candidate; never clip POI power."""
    v0, parents, z, loads, gen, maxiter, tol = prepare(plan)
    calls = 0

    def flow(scale):
        nonlocal calls
        calls += 1
        s = [a-scale*b for a, b in zip(loads, gen)]
        v = [complex(v0)]*(len(s)+1)
        for iteration in range(1, maxiter+1):
            branch = [0j]+[(power/v[i+1]).conjugate() for i, power in enumerate(s)]
            for k in range(len(s), 0, -1):
                branch[parents[k-1]] += branch[k]
            updated = [complex(v0)]
            for k in range(1, len(v)):
                updated.append(updated[parents[k-1]]-z[k-1]*branch[k])
            if any(not math.isfinite(abs(x)) or not .5*v0 <= abs(x) <= 1.5*v0 for x in updated):
                raise RuntimeError('Voltage outside research domain [0.5,1.5] pu')
            error = max(abs(a-b) for a, b in zip(v, updated))
            v = updated
            if error <= tol:
                break
        else:
            raise RuntimeError('Load flow did not converge; no fallback')
        # branch currents and voltages obey KVL exactly at the final sweep;
        # residual quantifies remaining constant-PQ mismatch, not hidden correction.
        actual = []
        for k in range(1, len(v)):
            children = sum((branch[j] for j in range(1, len(v)) if parents[j-1] == k), 0j)
            actual.append(3*v[k]*(branch[k]-children).conjugate())
        losses = [3*abs(branch[k+1])**2*zz for k, zz in enumerate(z)]
        slack = 3*v[0]*branch[0].conjugate()
        total = sum(losses, 0j)
        mismatch = max(abs(a-3*b) for a, b in zip(actual, s))
        if mismatch > max(1e-4, sum(abs(a)*3 for a in s)*1e-8):
            raise RuntimeError('Constant PQ residual exceeds tolerance')
        return dict(generationScale=scale, iterations=iteration, poiImportW=slack.real,
                    poiImportVar=slack.imag, exportW=max(0., -slack.real),
                    seriesLossW=total.real, seriesLossVar=total.imag,
                    nodeVoltageLLV=[abs(x)*math.sqrt(3) for x in v],
                    branchCurrentA=[abs(x) for x in branch[1:]],
                    branchLossW=[x.real for x in losses],
                    pqResidualVA=mismatch,
                    balanceResidualVA=abs(slack-sum(actual, 0j)-total))

    raw = flow(1.)
    final = raw
    cap = plan.get('exportLimitW')
    if cap is not None and raw['exportW'] > cap:
        low, high = 0., 1.
        final = flow(low)
        if final['exportW'] > cap:
            raise RuntimeError('Export cap infeasible')
        # Explicit bracketed feasible-side solution. No assumption of convergence fallback.
        for _ in range(48):
            mid = (low+high)/2
            candidate = flow(mid)
            if candidate['exportW'] <= cap:
                low, final = mid, candidate
            else:
                high = mid
        if cap-final['exportW'] > max(.01, cap*1e-8):
            raise RuntimeError('Cap search did not reach boundary')
    available = sum(x.real for x in gen)*3
    return dict(schemaVersion='radial-ac-result-v1', algorithmVersion='1.0.0', reference=REFERENCE,
                plan=plan, planSha256=digest(plan),
                source=plan['source'], validationStatus='conditional_assumptions', projectApproval='blocked',
                limitations=['balanced_radial_constant_PQ_only', 'single_referred_voltage_level',
                             'no_shunt_tap_or_transient', 'no_ampacity_or_protection_approval',
                             'manufacturer_limits_and_engineering_review_unverified',
                             'not_connected_to_energy_waterfall'],
                uncapped=raw, final=final, loadFlowCalls=calls,
                curtailedGenerationW=available*(1-final['generationScale']),
                lossChangeW=raw['seriesLossW']-final['seriesLossW'],
                accounting='POI already includes series losses; do not subtract them again')
