"""Balanced averaged inverter: sampled SRF-PLL, dq PI, stationary RL plant.
Not firmware, PWM/EMT, anti-islanding certification or hardware safety validation.
"""
import math
import numpy as np
from .common import header, keys, number, positive, integer, intervals, result, finite_state

CURVES = {'normal_inverse': (.14, .02), 'very_inverse': (13.5, 1.), 'extremely_inverse': (80., 2.)}


def idmt_time(current_rms, pickup, multiplier, curve, minimum):
    if current_rms <= pickup:
        return math.inf
    a, b = CURVES[curve]
    return max(minimum, multiplier*a/((current_rms/pickup)**b-1))


def simulate(plan):
    header(plan, 'dq-control-plan-v1', ('plant', 'controller', 'protection', 'sampleS', 'outputEvery', 'intervals'))
    p, c, protection = plan['plant'], plan['controller'], plan['protection']
    keys(p, ('inductanceH', 'resistanceOhm', 'dcVoltageV', 'maximumModulation', 'openCircuitDumpResistanceOhm',
             'initialCurrentAlphaA', 'initialCurrentBetaA'))
    L = positive(p['inductanceH'], 'inductanceH')
    resistance = positive(p['resistanceOhm'], 'resistanceOhm')
    dump = positive(p['openCircuitDumpResistanceOhm'], 'openCircuitDumpResistanceOhm')
    vdc = positive(p['dcVoltageV'], 'dcVoltageV')
    modulation = number(p['maximumModulation'], .001, 1, 'maximumModulation')
    vmax = modulation*vdc/math.sqrt(3)
    keys(c, ('currentKpOhm', 'currentKiOhmPerS', 'antiWindupPerS', 'maximumCurrentPeakA',
             'pllKpPerS', 'pllKiPerS2', 'nominalFrequencyHz', 'maximumFrequencyDeviationHz',
             'initialPllAngleRad', 'initialGridAngleRad', 'minimumPllVoltagePeakV'))
    kp = number(c['currentKpOhm'], 0, 1e9, 'currentKpOhm')
    ki = number(c['currentKiOhmPerS'], 0, 1e12, 'currentKiOhmPerS')
    kaw = number(c['antiWindupPerS'], 0, 1e9, 'antiWindupPerS')
    imax = positive(c['maximumCurrentPeakA'], 'maximumCurrentPeakA')
    pkp = positive(c['pllKpPerS'], 'pllKpPerS')
    pki = positive(c['pllKiPerS2'], 'pllKiPerS2')
    wnom = 2*math.pi*number(c['nominalFrequencyHz'], 40, 70, 'nominalFrequencyHz')
    dwmax = 2*math.pi*positive(c['maximumFrequencyDeviationHz'], 'maximumFrequencyDeviationHz')
    vfloor = positive(c['minimumPllVoltagePeakV'], 'minimumPllVoltagePeakV')
    theta = number(c['initialPllAngleRad'], -1000, 1000, 'initialPllAngleRad')
    grid_angle = number(c['initialGridAngleRad'], -1000, 1000, 'initialGridAngleRad')
    keys(protection, ('pickupRmsA', 'curve', 'timeMultiplier', 'minimumOperateS', 'instantaneousRmsA',
                      'breakerDelayS', 'underVoltagePeakV', 'overVoltagePeakV', 'voltageDelayS',
                      'underFrequencyHz', 'overFrequencyHz', 'frequencyDelayS', 'startupBlankingS'))
    pickup = positive(protection['pickupRmsA'], 'pickupRmsA')
    curve = protection['curve']
    if curve not in CURVES:
        raise ValueError('Unsupported IEC IDMT curve')
    tms = positive(protection['timeMultiplier'], 'timeMultiplier')
    tmin = number(protection['minimumOperateS'], 0, 1e6, 'minimumOperateS')
    instantaneous = number(protection['instantaneousRmsA'], pickup, 1e12, 'instantaneousRmsA')
    delay = number(protection['breakerDelayS'], 0, 1000, 'breakerDelayS')
    uv = number(protection['underVoltagePeakV'], 0, 1e9, 'underVoltagePeakV')
    ov = number(protection['overVoltagePeakV'], uv, 1e9, 'overVoltagePeakV')
    vd = number(protection['voltageDelayS'], 0, 1000, 'voltageDelayS')
    uf = number(protection['underFrequencyHz'], 0, 1000, 'underFrequencyHz')
    of = number(protection['overFrequencyHz'], uf, 1000, 'overFrequencyHz')
    fd = number(protection['frequencyDelayS'], 0, 1000, 'frequencyDelayS')
    blank = number(protection['startupBlankingS'], 0, 1000, 'startupBlankingS')
    h = number(plan['sampleS'], 1e-7, .001, 'sampleS')
    if h*max(resistance/L, (resistance+dump)/L, kp/L, pkp, kaw, math.sqrt(pki), math.sqrt(ki/L)) > .2:
        raise ValueError('Sample too coarse for supplied plant/controller dynamics; reduce sampleS')
    every = integer(plan['outputEvery'], 1, 1000000, 'outputEvery')
    rows = plan['intervals']
    intervals(rows, ('gridVoltagePeakV', 'gridFrequencyHz', 'gridPhaseJumpRad',
                     'currentReferenceDPeakA', 'currentReferenceQPeakA'), 2000)
    steps = []
    for r in rows:
        count = round(r['durationS']/h)
        if count < 1 or abs(count*h-r['durationS']) > 1e-9:
            raise ValueError('Interval duration must be an integer multiple of sampleS')
        steps.append(count)
        number(r['gridVoltagePeakV'], 0, 1e9, 'gridVoltagePeakV')
        number(r['gridFrequencyHz'], 1, 1000, 'gridFrequencyHz')
        number(r['gridPhaseJumpRad'], -2*math.pi, 2*math.pi, 'gridPhaseJumpRad')
        number(r['currentReferenceDPeakA'], -1e9, 1e9, 'currentReferenceDPeakA')
        number(r['currentReferenceQPeakA'], -1e9, 1e9, 'currentReferenceQPeakA')
    if sum(steps) > 500000 or sum(steps)//every+2*len(rows) > 100000:
        raise ValueError('Transient execution/output budget exceeded')
    current = complex(number(p['initialCurrentAlphaA'], -1e9, 1e9, 'initialCurrentAlphaA'),
                      number(p['initialCurrentBetaA'], -1e9, 1e9, 'initialCurrentBetaA'))
    energy0 = .75*L*abs(current)**2
    int_dq = 0j
    pll_int = 0.
    omega = wnom
    progress = 0.
    vtimer = ftimer = 0.
    trip_time = open_time = None
    trip_reason = None
    opened = False
    trace, events = [], []
    t = 0.
    index = 0
    sources = grid_energy = resistor_energy = 0.
    voltage_saturation = reference_saturation = 0
    max_current = abs(current)
    max_residual = 0.
    for r, count in zip(rows, steps):
        grid_angle += r['gridPhaseJumpRad']
        grid_peak = r['gridVoltagePeakV']
        wg = 2*math.pi*r['gridFrequencyHz']
        reference = complex(r['currentReferenceDPeakA'], r['currentReferenceQPeakA'])
        if abs(reference) > imax:
            reference *= imax/abs(reference)
            reference_saturation += count
        for local in range(count):
            rot = complex(math.cos(theta), math.sin(theta))
            g = grid_peak*complex(math.cos(grid_angle), math.sin(grid_angle))
            gdq = g/rot
            idq = current/rot
            # SRF PLL uses measured voltage, not prescribed true grid frequency.
            pll_error = gdq.imag/max(abs(g), vfloor)
            unclamped = pkp*pll_error+pll_int
            correction = max(-dwmax, min(dwmax, unclamped))
            pll_int += h*(pki*pll_error+pkp*(correction-unclamped))
            omega = wnom+correction
            freq = omega/(2*math.pi)
            rms = abs(current)/math.sqrt(2)
            if trip_time is None and t >= blank:
                if rms <= pickup:
                    progress = 0.  # explicit immediate reset for these IEC curves
                else:
                    progress += h/idmt_time(rms, pickup, tms, curve, tmin)
                vtimer = vtimer+h if grid_peak < uv or grid_peak > ov else 0.
                ftimer = ftimer+h if freq < uf or freq > of else 0.
                reason = ('instantaneous_overcurrent' if rms >= instantaneous else
                          'idmt_overcurrent' if progress >= 1 else
                          'voltage_window' if (grid_peak < uv or grid_peak > ov) and vtimer >= vd else
                          'frequency_window' if (freq < uf or freq > of) and ftimer >= fd else None)
                if reason:
                    # Timers accumulated over this sampled interval; trigger at its end.
                    trip_time = t+h
                    open_time = trip_time+delay
                    trip_reason = reason
                    events.append(dict(timeS=trip_time, event='trip_latched', reason=reason))
            if not opened and open_time is not None and t+1e-12 >= open_time:
                opened = True
                events.append(dict(timeS=t, event='breaker_open', reason=trip_reason))
            error = reference-idq
            raw = gdq+kp*error+int_dq+1j*omega*L*idq
            saturated = abs(raw) > vmax
            command = raw*(vmax/abs(raw)) if saturated else raw
            if opened:
                applied = 0j
                int_dq = 0j
                effective_r = resistance+dump
            else:
                applied = command*rot
                effective_r = resistance
                int_dq += h*(ki*error+kaw*(command-raw))
                voltage_saturation += int(saturated)
            # RK4 stationary alpha-beta physical circuit with ZOH converter voltage.
            # Integrate the same power quadrature to audit 3-phase magnetic energy.
            def rhs(offset, state):
                ii = complex(state[0], state[1])
                gg = (grid_peak*complex(math.cos(grid_angle+wg*offset), math.sin(grid_angle+wg*offset))) if not opened else 0j
                di = (applied-gg-effective_r*ii)/L
                return np.array([di.real, di.imag, 1.5*(applied*ii.conjugate()).real,
                                 1.5*(gg*ii.conjugate()).real, 1.5*effective_r*abs(ii)**2])
            state = np.array([current.real, current.imag, 0., 0., 0.])
            k1 = rhs(0, state)
            k2 = rhs(h/2, state+h*k1/2)
            k3 = rhs(h/2, state+h*k2/2)
            k4 = rhs(h, state+h*k3)
            nxt = state+h*(k1+2*k2+2*k3+k4)/6
            finite_state([*nxt, int_dq.real, int_dq.imag, pll_int, theta])
            current = complex(nxt[0], nxt[1])
            sources += float(nxt[2])
            grid_energy += float(nxt[3])
            resistor_energy += float(nxt[4])
            t = (index+1)*h
            grid_angle = (grid_angle+wg*h) % (2*math.pi)
            theta = (theta+omega*h) % (2*math.pi)
            energy = .75*L*abs(current)**2
            residual = sources-grid_energy-resistor_energy-(energy-energy0)
            max_residual = max(max_residual, abs(residual))
            max_current = max(max_current, abs(current))
            if index % every == 0 or local == count-1:
                measured = current/complex(math.cos(theta), math.sin(theta))
                trace.append(dict(elapsedS=t, currentAlphaA=current.real, currentBetaA=current.imag,
                    currentDPeakA=measured.real, currentQPeakA=measured.imag,
                    currentReferenceDPeakA=reference.real, currentReferenceQPeakA=reference.imag,
                    pllFrequencyHz=freq, phaseErrorRad=math.atan2(math.sin(grid_angle-theta), math.cos(grid_angle-theta)),
                    converterVoltageAlphaV=applied.real, converterVoltageBetaV=applied.imag,
                    voltageSaturated=saturated and not opened, idmtProgress=progress,
                    tripLatched=trip_time is not None, breakerOpen=opened,
                    magneticEnergyJ=energy, energyResidualJ=residual))
            index += 1
    if max_residual > max(1e-6, (abs(sources)+abs(grid_energy)+resistor_energy+energy0)*1e-5):
        raise RuntimeError('Electrical integration energy residual exceeded; reduce sampleS')
    return result(plan, 'dq-control-result-v1', [
        'Balanced three-phase averaged voltage-source inverter; imposed stiff AC grid and fixed DC source',
        'No switching harmonics, unbalanced faults, LCL resonance, dead time, sensor filtering or computational delay',
        'Sampled PI/PLL with voltage and reference limits; current overshoot is not artificially clipped',
        'Protection uses ideal positive-sequence RMS magnitude and PLL frequency; no CT/sensor model',
        'IEC curve equation with immediate reset; not relay hardware tolerance or coordination qualification',
        'Trip is latched; breaker opening is quantized to sampleS after breakerDelayS',
        'Open breaker disconnects grid and converter; explicit RL dump path dissipates magnetic energy',
        'Not a grid-forming controller, complete anti-islanding algorithm, firmware or hardware safety approval',
        'No automatic energy or finance adoption'], status='tripped' if trip_time is not None else 'completed',
        trace=trace, events=events, tripTimeS=trip_time, breakerScheduledOpenS=open_time,
        maximumCurrentPeakA=max_current, voltageSaturatedSamples=voltage_saturation,
        referenceLimitedSamples=reference_saturation, converterEnergyJ=sources,
        gridEnergyJ=grid_energy, resistiveEnergyJ=resistor_energy,
        initialMagneticEnergyJ=energy0, finalMagneticEnergyJ=.75*L*abs(current)**2,
        maximumEnergyResidualJ=max_residual)
