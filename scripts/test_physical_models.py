"""Independent physical invariants, published oracle and negative/domain tests."""
import copy
import json
import math
import unittest
from decimal import Decimal as D
from pathlib import Path
import numpy as np
from scipy.integrate import solve_ivp
from services.power_dynamics import dc_coupled as dc, electrochemistry as spm, control

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT/'docs/examples/physical-models'


def plan(name):
    return json.loads((EXAMPLES/(name+'.json')).read_text())['plan']


class DcTests(unittest.TestCase):
    def test_decimal_clipping_all_modes(self):
        for mode in ('powerplant', 'ongrid', 'offgrid'):
            p = plan('dc_coupled')
            p['mode'] = mode
            p['intervals'] = p['intervals'][:1]
            p['intervals'][0]['loadAcW'] = 5000
            p['intervals'][0]['exportLimitW'] = 0
            if mode == 'offgrid':
                p['intervals'][0]['gridAvailable'] = False
            r = dc.simulate(p)['trace'][0]
            # Decimal arithmetic, not a replay of the implementation.
            pv = D(10000)*D('.98')
            ch = D(4000)
            stored = D(5)+ch*D('.97')*D('.98')/1000
            forward = D(5000)/D('.96')
            self.assertAlmostEqual(r['finalStoredKwh'], float(stored), places=11)
            self.assertAlmostEqual(r['curtailedDcW'], float(pv-ch-forward), places=9)
            self.assertEqual(r['inverterAcW'], 5000)
            self.assertEqual(r['recoveredClippingToBatteryW'], 4000)
            self.assertAlmostEqual(r['energyResidualKwh'], 0, places=11)
            p['intervals'][0]['batteryBusCommandW'] = 0
            no_storage = dc.simulate(p)['trace'][0]
            self.assertAlmostEqual(no_storage['curtailedDcW']-r['curtailedDcW'], 4000)

    def test_grid_rectification_no_forward_simultaneous(self):
        p = plan('dc_coupled');p['allowGridCharging'] = True
        row = p['intervals'][0];p['intervals'] = [row]
        row.update(pvAvailableDcW=1000, loadAcW=2000, gridImportLimitW=3000, exportLimitW=0)
        r = dc.simulate(p)['trace'][0]
        self.assertAlmostEqual(r['rectifierAcW'], 1000)
        self.assertEqual(r['gridImportW'], 3000)
        self.assertEqual(r['inverterAcW'], 0)
        self.assertAlmostEqual(r['batteryChargeBusW'], 980+950)
        self.assertEqual(r['unmetLoadW'], 0)
        p['allowGridCharging'] = False
        r = dc.simulate(p)['trace'][0]
        self.assertEqual(r['rectifierAcW'], 0)
        self.assertEqual(r['batteryChargeBusW'], 980)

    def test_limits_outage_capacity_and_initial(self):
        p = plan('dc_coupled');p['intervals'] = p['intervals'][:1]
        p['battery']['capacityKwh'] = 6
        row = p['intervals'][0];row['gridAvailable'] = False
        p['islandCapable'] = False
        r = dc.simulate(p)['trace'][0]
        self.assertAlmostEqual(r['finalStoredKwh'], 6)
        self.assertEqual(r['servedLoadW'], 0)
        self.assertEqual(r['unmetLoadW'], row['loadAcW'])
        self.assertEqual(r['exportW'], 0)
        p['dcChargingWhenIslanded'] = False
        r = dc.simulate(p)['trace'][0]
        self.assertEqual(r['batteryChargeBusW'], 0)
        p = plan('dc_coupled');p['intervals'] = p['intervals'][1:]
        p['battery']['initialKwh'] = 2.1
        r = dc.simulate(p)['trace'][0]
        self.assertAlmostEqual(r['finalStoredKwh'], 2)
        self.assertGreater(r['gridImportW'], 2000)

    def test_random_conservation_constraints(self):
        rng = np.random.default_rng(572)
        for mode in ('powerplant', 'ongrid', 'offgrid'):
            for _ in range(100):
                p = plan('dc_coupled');p['mode'] = mode
                p['allowGridCharging'] = mode != 'offgrid' and bool(rng.integers(2))
                p['intervals'] = p['intervals'][:1]
                row = p['intervals'][0]
                row.update(pvAvailableDcW=float(rng.uniform(0, 25000)), loadAcW=float(rng.uniform(0, 12000)),
                    batteryBusCommandW=float(rng.uniform(-15000, 15000)), gridAvailable=mode != 'offgrid',
                    gridImportLimitW=float(rng.uniform(0, 10000)), exportLimitW=0 if mode == 'offgrid' else float(rng.uniform(0, 5000)))
                for key in ('pvMpptEfficiency', 'inverterEfficiency', 'rectifierEfficiency', 'chargeConverterEfficiency', 'dischargeConverterEfficiency'):
                    p['equipment'][key] = float(rng.uniform(.5, 1))
                r = dc.simulate(p)['trace'][0]
                self.assertLess(abs(r['energyResidualKwh']), 1e-10)
                self.assertLessEqual(r['inverterAcW'], 5000+1e-8)
                self.assertLessEqual(r['gridImportW'], row['gridImportLimitW'] if row['gridAvailable'] else 0)
                self.assertLessEqual(r['exportW'], row['exportLimitW'])
                self.assertEqual(r['gridImportW']*r['exportW'], 0)
                self.assertEqual(r['inverterDcW']*r['rectifierDcW'], 0)


class SpmTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p = plan('electrochemical_spm')
        cls.r = spm.simulate(cls.p)

    def test_independent_pybamm_oracle_and_mesh(self):
        oracle = json.loads((EXAMPLES/'pybamm-oracle.json').read_text())
        errors = []
        for cells in (10, 30, 60):
            p = copy.deepcopy(self.p);p['radialCells'] = cells
            r = spm.simulate(p)
            samples = [min(r['trace'], key=lambda row:abs(row['elapsedS']-t)) for t in oracle['timesS']]
            # Interpolate each protocol segment separately; voltage jumps at current change.
            voltages = []
            for t in oracle['timesS']:
                rows = [x for x in r['trace'] if (x['packCurrentA'] == 2.5 if t < 300 else x['packCurrentA'] == 0)]
                voltages.append(np.interp(t, [x['elapsedS'] for x in rows], [x['cellVoltageV'] for x in rows]))
            error = max(abs(np.array(voltages)-oracle['cellVoltageV']))
            errors.append(error)
            print('SPM oracle max voltage error V, cells', cells, error)
        # Neumann half-cell reconstruction has first-order instantaneous boundary
        # error at current steps; explicitly bound it rather than claim exact parity.
        self.assertLess(errors[-1], .005)
        settled = [abs(voltages[i]-oracle['cellVoltageV'][i]) for i,t in enumerate(oracle['timesS']) if 30 <= t < 300 or t >= 330]
        self.assertLess(max(settled), .0004)
        self.assertLess(errors[-1], errors[0]/4)
        self.assertLess(abs(self.r['lithiumResidualMolPerCell']), 1e-12)
        self.assertLess(abs(self.r['coulombResidualNegativeMolM3']), 1e-7)
        self.assertLess(abs(self.r['coulombResidualPositiveMolM3']), 1e-7)

    def test_no_current_uniform_and_relaxation(self):
        p = copy.deepcopy(self.p)
        for row in p['intervals']:row['packCurrentA'] = 0
        r = spm.simulate(p)
        self.assertLess(np.ptp([x['cellVoltageV'] for x in r['trace']]), 1e-9)
        self.assertLess(np.ptp(r['finalNegativeConcentrationMolM3']), 1e-7)
        end_discharge = [x for x in self.r['trace'] if x['packCurrentA'] == 2.5][-1]
        end_rest = self.r['trace'][-1]
        self.assertGreater(end_rest['cellVoltageV'], end_discharge['cellVoltageV'])
        self.assertAlmostEqual(end_rest['averageNegativeStoichiometry'], end_discharge['averageNegativeStoichiometry'], places=10)
        # Fick flux gives surface depleted vs volume-average negative particle on discharge.
        self.assertLess(end_discharge['surfaceNegativeStoichiometry'], end_discharge['averageNegativeStoichiometry'])
        self.assertGreater(end_discharge['surfacePositiveStoichiometry'], end_discharge['averagePositiveStoichiometry'])

    def test_charge_pack_scaling_temperature_step_convergence(self):
        p = copy.deepcopy(self.p);p['seriesCells'] = 100;p['parallelCells'] = 5
        for row in p['intervals']:row['packCurrentA'] *= 5
        r = spm.simulate(p)
        self.assertAlmostEqual(r['trace'][-1]['cellVoltageV'], self.r['trace'][-1]['cellVoltageV'], places=10)
        self.assertAlmostEqual(r['trace'][-1]['packVoltageV'], 100*self.r['trace'][-1]['cellVoltageV'], places=8)
        p = copy.deepcopy(self.p);p['maximumStepS'] = 1
        r = spm.simulate(p)
        self.assertAlmostEqual(r['trace'][-1]['cellVoltageV'], self.r['trace'][-1]['cellVoltageV'], places=6)
        p = copy.deepcopy(self.p);p['intervals'] = p['intervals'][:1]
        p['intervals'][0]['packCurrentA'] = -1;p['intervals'][0]['durationS'] = 30
        r = spm.simulate(p)
        self.assertGreater(r['trace'][-1]['averageNegativeStoichiometry'], p['negative']['initialStoichiometry'])
        p = copy.deepcopy(self.p);p['temperatureK'] = 280
        cold = spm.simulate(p)
        self.assertLess(cold['trace'][0]['cellVoltageV'], self.r['trace'][0]['cellVoltageV'])

    def test_cutoff_not_zero_fill_or_extrapolate(self):
        p = copy.deepcopy(self.p);p['lowerCellVoltageV'] = 4.04
        r = spm.simulate(p)
        self.assertEqual(r['status'], 'cutoff');self.assertGreater(r['unexecutedDurationS'], 0)
        p = copy.deepcopy(self.p);p['lowerCellVoltageV'] = 4.15
        # Both boundary and continuous voltage events are tested with a valid window.
        r = spm.simulate(p)
        self.assertEqual(r['status'], 'cutoff')
        p = copy.deepcopy(self.p)
        p['negative']['ocp'] = [[.89,.1],[.91,.09]]
        p['lowerCellVoltageV'] = 0
        r = spm.simulate(p)
        self.assertEqual(r['status'], 'cutoff');self.assertEqual(r['stopped']['reason'], 'stoichiometry_domain')
        self.assertGreater(r['unexecutedDurationS'], 0)


class ControlTests(unittest.TestCase):
    def test_control_pll_trip_latch_and_energy(self):
        p = plan('dq_protection_control');r = control.simulate(p)
        pre = min(r['trace'], key=lambda x:abs(x['elapsedS']-.149))
        self.assertLess(abs(pre['currentDPeakA']-10), .03)
        self.assertLess(abs(pre['currentQPeakA']), .03)
        self.assertLess(abs(pre['phaseErrorRad']), .001)
        self.assertLess(abs(pre['pllFrequencyHz']-50), .01)
        self.assertEqual(r['events'][0]['reason'], 'voltage_window')
        self.assertAlmostEqual(r['tripTimeS'], .17, delta=2*p['sampleS'])
        self.assertAlmostEqual(r['events'][1]['timeS'], .175, delta=3*p['sampleS'])
        self.assertTrue(r['trace'][-1]['breakerOpen'])
        self.assertLess(r['finalMagneticEnergyJ'], 1e-20)
        self.assertLess(r['maximumEnergyResidualJ'], 1e-6)

    def test_idmt_published_table_and_variable_current(self):
        # ABB615 published IEC constants; high precision independent Decimal evaluation.
        for name,a,b in [('normal_inverse','.14','.02'),('very_inverse','13.5','1'),('extremely_inverse','80','2')]:
            expected=D('.1')*D(a)/(D(5)**D(b)-1)
            self.assertAlmostEqual(control.idmt_time(50,10,.1,name,0), float(expected), places=12)
        self.assertTrue(math.isinf(control.idmt_time(10,10,.1,'normal_inverse',0)))
        self.assertEqual(control.idmt_time(1000,10,.1,'normal_inverse',.2), .2)
        p = plan('dq_protection_control');p['intervals'] = p['intervals'][:1]
        row=p['intervals'][0];row.update(durationS=.12,gridVoltagePeakV=0,gridFrequencyHz=50,currentReferenceDPeakA=0)
        p['plant'].update(initialCurrentAlphaA=100,initialCurrentBetaA=0,dcVoltageV=1e-8,resistanceOhm=.01,inductanceH=.1,openCircuitDumpResistanceOhm=.1)
        p['controller'].update(currentKpOhm=0,currentKiOhmPerS=0,antiWindupPerS=0,initialGridAngleRad=0)
        p['protection'].update(pickupRmsA=10,instantaneousRmsA=1e6,timeMultiplier=.005,minimumOperateS=0,startupBlankingS=0,underVoltagePeakV=0,underFrequencyHz=0,overFrequencyHz=1000)
        r=control.simulate(p)
        # Near-zero DC source implies negligible applied voltage; Ipk=100*exp(-R*t/L).
        # Independently integrate inverse-time progress as a scalar continuous ODE.
        def integral(t,y):
            m=(100/math.sqrt(2)*math.exp(-.01*t/.1))/10
            return [(m**.02-1)/(.005*.14)]
        def event(t,y):return y[0]-1
        event.terminal=True
        oracle=solve_ivp(integral,(0,.12),[0.],events=event,rtol=1e-12,atol=1e-12)
        self.assertEqual(r['events'][0]['reason'],'idmt_overcurrent')
        self.assertAlmostEqual(r['tripTimeS'],float(oracle.t[-1]),delta=4*p['sampleS'])

    def test_saturation_no_artificial_current_clip_and_halved_step(self):
        p=plan('dq_protection_control');p['intervals']=p['intervals'][:1]
        p['plant']['dcVoltageV']=300;p['controller']['maximumCurrentPeakA']=5
        p['intervals'][0]['currentReferenceDPeakA']=100
        r=control.simulate(p)
        self.assertGreater(r['voltageSaturatedSamples'],0);self.assertGreater(r['referenceLimitedSamples'],0)
        self.assertGreater(r['maximumCurrentPeakA'],5) # physical plant, not clipped output
        p2=copy.deepcopy(p);p2['sampleS']/=2;p2['outputEvery']*=2
        r2=control.simulate(p2)
        self.assertEqual(r['status'],r2['status'])
        self.assertAlmostEqual(r['tripTimeS'],r2['tripTimeS'],delta=4*p['sampleS'])
        self.assertLess(r2['maximumEnergyResidualJ'],r['maximumEnergyResidualJ'])

    def test_grid_connected_plant_independent_exact_solution(self):
        p=plan('dq_protection_control');p['outputEvery']=1
        p['intervals']=p['intervals'][:1];p['intervals'][0]['durationS']=.02
        p['protection']['startupBlankingS']=1
        r=control.simulate(p)
        # Exact complex RL solution driven by ZOH converter and sinusoidal grid.
        # Independent closed form, not RK4 or dq controller equations.
        a=p['plant']['resistanceOhm']/p['plant']['inductanceH']
        h=p['sampleS'];w=2*math.pi*50;theta=p['controller']['initialGridAngleRad']
        expected=0j;maximum=0.
        for row in r['trace']:
            voltage=complex(row['converterVoltageAlphaV'],row['converterVoltageBetaV'])
            decay=math.exp(-a*h)
            sinusoid=complex(math.cos(w*h),math.sin(w*h))
            grid=325*complex(math.cos(theta),math.sin(theta))
            expected=decay*expected+voltage/p['plant']['resistanceOhm']*(1-decay)-grid/p['plant']['inductanceH']*(sinusoid-decay)/complex(a,w)
            actual=complex(row['currentAlphaA'],row['currentBetaA'])
            maximum=max(maximum,abs(expected-actual));theta+=w*h
        self.assertLess(maximum,1e-8)

    def test_instantaneous_and_frequency_trip(self):
        p=plan('dq_protection_control');p['intervals']=p['intervals'][:1]
        p['plant']['initialCurrentAlphaA']=100
        p['protection']['startupBlankingS']=0
        r=control.simulate(p)
        self.assertEqual(r['events'][0]['reason'],'instantaneous_overcurrent')
        self.assertAlmostEqual(r['tripTimeS'],p['sampleS'])
        p=plan('dq_protection_control');p['intervals']=p['intervals'][:1]
        p['intervals'][0]['durationS']=.3;p['intervals'][0]['gridFrequencyHz']=60
        p['protection']['startupBlankingS']=.1;p['protection']['frequencyDelayS']=.02
        r=control.simulate(p)
        self.assertEqual(r['events'][0]['reason'],'frequency_window')
        self.assertGreaterEqual(r['tripTimeS'],.12-2*p['sampleS'])

    def test_stationary_rl_independent_exact_open_decay(self):
        p=plan('dq_protection_control');r=control.simulate(p)
        # Once disconnected the only plant is L di/dt=-(R+Rdump)i.
        after=[row for row in r['trace'] if row['breakerOpen']]
        first,last=after[0],after[8]
        magnitude=lambda row:math.hypot(row['currentAlphaA'],row['currentBetaA'])
        expected=magnitude(first)*math.exp(-(p['plant']['resistanceOhm']+p['plant']['openCircuitDumpResistanceOhm'])/p['plant']['inductanceH']*(last['elapsedS']-first['elapsedS']))
        self.assertAlmostEqual(magnitude(last),expected,delta=max(1e-12,expected*1e-7))


class InvalidTests(unittest.TestCase):
    def test_invalid_inputs(self):
        cases=[]
        for name, fn in [('dc_coupled',dc.simulate),('electrochemical_spm',spm.simulate),('dq_protection_control',control.simulate)]:
            p=plan(name)
            for value in ('2026-01-01T00:00:00','bad','2026-02-30T00:00:00Z'):
                q=copy.deepcopy(p);q['intervals'][0]['start']=value;cases.append((fn,q))
            q=copy.deepcopy(p);q['bogus']=0;cases.append((fn,q))
            q=copy.deepcopy(p);q['intervals'][0]['durationS']=True;cases.append((fn,q))
            q=copy.deepcopy(p);q['intervals'][1]['start']='2026-01-02T00:00:00Z';cases.append((fn,q))
        p=plan('dc_coupled');p['mode']='offgrid';cases.append((dc.simulate,p))
        p=plan('electrochemical_spm');p['negative']['ocp']=[[.9,.2],[.8,.1]];cases.append((spm.simulate,p))
        p=plan('dq_protection_control');p['sampleS']=.001;cases.append((control.simulate,p))
        for fn,p in cases:
            with self.subTest(model=p['schemaVersion']):
                with self.assertRaises((ValueError,TypeError,KeyError)):fn(p)


if __name__=='__main__':unittest.main()
