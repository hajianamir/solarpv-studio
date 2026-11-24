"""Independent numerical oracles for bounded B1/B2/B3; NOT field validation."""
import copy
import json
import math
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
import pvlib
from scipy.optimize import brentq
from services.pvlib_research.science_b import oet_patch,tandem_spectrum,Q,H,C,K
from services.pvlib_research.battery_pybamm import battery_pybamm


def plan(name):return json.loads((Path(__file__).resolve().parents[1]/f'docs/examples/science-b/{name}.synthetic.json').read_text())['plan']


def single(p):p['patches']=p['patches'][:1];p['links']=[];return p


def cover(left):return [[[left,-1,.2],[10,-1,.2],[10,10,.2]],[[left,-1,.2],[10,10,.2],[left,10,.2]]]


class OetTests(unittest.TestCase):
    def test_pvlib_and_scalar_thermal_root_oracle(self):
        p=single(plan('oet'));before=copy.deepcopy(p);o=oet_patch(p)['output'];self.assertEqual(p,before);x=p['patches'][0];area=x['widthM']*x['heightM']
        def pv(t):
            k=t+273.15;il=x['photocurrentRefA']*p['dniWm2']/1000*(1+x['alphaPerK']*(t-25));io=x['saturationRefA']*(k/298.15)**3*math.exp(x['bandgapEv']*Q/K*(1/298.15-1/k))
            return float(pvlib.pvsystem.singlediode(il,io,0,np.inf,x['nVtRefV']*k/298.15)['p_mp'])
        balance=lambda t:area*p['dniWm2']*x['absorptance']-pv(t)-p['convectionWm2K']*area*(t-p['airC'])-p['emissivity']*5.670374419e-8*area*((t+273.15)**4-(p['skyC']+273.15)**4)
        temperature=brentq(balance,25,100,xtol=1e-10);self.assertAlmostEqual(o['fine']['patches'][0]['temperatureC'],temperature,places=6);self.assertAlmostEqual(o['fine']['powerW'],pv(temperature),places=6)
        self.assertEqual(o['numericalGate'],'passed')

    def test_opaque_near_obstacle_and_darkness(self):
        p=single(plan('oet'));w=p['patches'][0]['widthM'];p['triangles']=cover(w/2)
        o=oet_patch(p)['output'];self.assertEqual(o['fine']['patches'][0]['visibleFraction'],.5)
        p['triangles']=cover(-1);o=oet_patch(p)['output']['fine'];self.assertEqual(o['incidentW'],0);self.assertEqual(o['powerW'],0)
        p['emissivity']=0;p['dniWm2']=0
        self.assertAlmostEqual(oet_patch(p)['output']['fine']['patches'][0]['temperatureC'],p['airC'],places=8)

    def test_lateral_conduction_optical_and_thermal_ledgers(self):
        p=plan('oet');p['triangles']=cover(.156);o=oet_patch(p)['output']['fine']
        self.assertLess(abs(sum(x['conductionOutW'] for x in o['patches'])),1e-10)
        self.assertGreater(abs(o['patches'][0]['conductionOutW']),.1)
        for x in o['patches']:self.assertLess(abs(x['residualW']),1e-6)
        self.assertAlmostEqual(o['incidentW'],sum(x['absorbedW'] for x in o['patches'])+o['reflectedW'],places=10)
        self.assertAlmostEqual(o['currentA']*o['voltageV'],o['powerW'],places=10)

    def test_refinement_failure_is_not_pass(self):
        p=single(plan('oet'));p['surfaceGrid']=1;p['triangles']=cover(.3*p['patches'][0]['widthM'])
        self.assertEqual(oet_patch(p)['output']['numericalGate'],'failed_refinement')

    def test_invalid_geometry_budget_and_physical_extraction(self):
        for mutate in (lambda p:p.update(extra=1),lambda p:p.update(maxRayPairs=1,triangles=cover(-1)),lambda p:p['patches'][0].update(widthM=0),lambda p:p['links'].append(copy.deepcopy(p['links'][0])),lambda p:p.update(triangles=[[[0,0,0]]*3])):
            p=plan('oet');mutate(p)
            with self.assertRaises(ValueError):oet_patch(p)
        p=single(plan('oet'));p['patches'][0]['photocurrentRefA']=100
        with self.assertRaises(ValueError):oet_patch(p)


class TandemTests(unittest.TestCase):
    def test_closed_spectral_integral_and_pvlib_mpp(self):
        p=plan('tandem');before=copy.deepcopy(p);o=tandem_spectrum(p)['output'];self.assertEqual(p,before)
        expected=.5*.4*1e-9*Q/(H*C)*(800**2-400**2)/2
        self.assertAlmostEqual(o['photocurrentAm2'][0],expected,places=10)
        oracle=pvlib.pvsystem.singlediode(expected,p['topJ0Am2'],0,np.inf,p['topNVtV'])
        self.assertAlmostEqual(o['fourTerminal']['powerWm2'],2*float(oracle['p_mp']),places=7)
        self.assertAlmostEqual(o['twoTerminal']['powerWm2'],o['fourTerminal']['powerWm2'],places=7)
        self.assertEqual(o['currentRatioToReference'],[.5,.5])

    def test_mismatched_2t_exhaustive_oracle(self):
        p=plan('tandem');p['bottomEqe']=[.2]*5;o=tandem_spectrum(p)['output']
        self.assertLess(o['twoTerminal']['powerWm2'],o['fourTerminal']['powerWm2'])
        grid=np.linspace(0,min(o['photocurrentAm2']),100001)
        volts=sum(p[k]*np.log1p((il-grid)/p[j]) for il,k,j in zip(o['photocurrentAm2'],('topNVtV','bottomNVtV'),('topJ0Am2','bottomJ0Am2')))
        self.assertLess(abs(o['twoTerminal']['powerWm2']-max(grid*volts)),1e-5)

    def test_normalization_darkness_and_zero_reference(self):
        p=plan('tandem');p['normalizationWm2']=1000;o=tandem_spectrum(p)['output'];self.assertEqual(o['incidentWm2'],1000);self.assertEqual(o['normalizationScale'],5)
        p['normalizationWm2']=None;p['irradianceWm2Nm']=[0]*5;p['referenceWm2Nm']=[0]*5;o=tandem_spectrum(p)['output'];self.assertEqual(o['twoTerminal']['powerWm2'],0);self.assertEqual(o['currentRatioToReference'],[None,None])
        p['normalizationWm2']=1
        with self.assertRaises(ValueError):tandem_spectrum(p)

    def test_no_extrapolation_or_double_photons(self):
        for mutate in (lambda p:p['topEqe'].pop(),lambda p:p['wavelengthNm'].__setitem__(1,400),lambda p:p.update(topEqe=[.8]*5),lambda p:p['irradianceWm2Nm'].__setitem__(0,float('nan')),lambda p:p.update(extra=1)):
            p=plan('tandem');mutate(p)
            with self.assertRaises(ValueError):tandem_spectrum(p)


class BatteryTests(unittest.TestCase):
    def test_models_convergence_and_coulombs(self):
        for model in ('SPM','SPMe','DFN'):
            p=plan('battery');p['model']=model;before=copy.deepcopy(p);o=battery_pybamm(p)['output'];self.assertEqual(p,before)
            self.assertEqual(o['numericalGate'],'passed');self.assertEqual(len(o['runs']),3)
            for run in o['runs']:
                for row in run['trace']:
                    self.assertAlmostEqual(row['capacityAh'],p['currentA']*row['timeS']/3600,places=9)
                    self.assertLess(abs(row['totalHeatingWm3']-row['irreversibleHeatingWm3']-row['reversibleHeatingWm3']-row['ohmicHeatingWm3']),1e-6)
                self.assertGreater(run['trace'][-1]['temperatureK'],p['temperatureK'])
            self.assertLess(o['capacityLedgerErrorAh'],1e-9)

    def test_rest_thermal_and_standalone_pybamm_reference(self):
        import pybamm
        p=plan('battery');p['currentA']=0;o=battery_pybamm(p)['output']
        for row in o['runs'][-1]['trace']:self.assertAlmostEqual(row['temperatureK'],p['temperatureK'],places=7);self.assertAlmostEqual(row['capacityAh'],0,places=10)
        p=plan('battery');o=battery_pybamm(p)['output'];param=pybamm.ParameterValues('Chen2020');param.update({'Current function [A]':1.})
        model=pybamm.lithium_ion.SPMe({'thermal':'lumped'});s=pybamm.Simulation(model,parameter_values=param,solver=pybamm.CasadiSolver(mode='safe',rtol=1e-8,atol=1e-9),var_pts={k:24 for k in ('x_n','x_s','x_p','r_n','r_p')});s.solve([0,60],initial_soc=.5)
        self.assertLess(abs(o['runs'][-1]['trace'][-1]['voltageV']-float(s.solution['Voltage [V]'](60))),.002)

    def test_optional_sei_and_no_internet(self):
        p=plan('battery');p['parameterSet']='OKane2022';p['sei']=True
        with patch('socket.socket.connect',side_effect=AssertionError('Network forbidden')):o=battery_pybamm(p)['output']
        loss=[x['seiLossAh'] for x in o['runs'][-1]['trace']];self.assertGreater(loss[-1],loss[0]);self.assertTrue(all(b>=a-1e-9 for a,b in zip(loss,loss[1:])))

    def test_fresh_process_offline_import_and_execution(self):
        import subprocess,sys,os
        p=plan('battery');p['model']='SPM'
        code="from unittest.mock import patch\nfrom services.pvlib_research.battery_pybamm import battery_pybamm\np="+repr(p)+"\nwith patch('socket.socket.connect',side_effect=AssertionError('no network')) as connect:\n r=battery_pybamm(p)\n assert not connect.called\n assert r['projectApproval']=='blocked'\n"
        run=subprocess.run([sys.executable,'-c',code],cwd=Path(__file__).resolve().parents[1],env={**os.environ,'PYBAMM_DISABLE_TELEMETRY':'true'},capture_output=True,text=True,timeout=40)
        self.assertEqual(run.returncode,0,run.stderr)

    def test_bad_parameters_missing_runtime_and_failed_convergence(self):
        p=plan('battery');p['sei']=True
        with self.assertRaises(ValueError):battery_pybamm(p)
        p=plan('battery')
        with patch('services.pvlib_research.battery_pybamm.version',return_value='unavailable'),self.assertRaises(RuntimeError):battery_pybamm(p)
        p['voltageToleranceV']=1e-6;self.assertEqual(battery_pybamm(p)['output']['numericalGate'],'failed_convergence')
        p['extra']=1
        with self.assertRaises(ValueError):battery_pybamm(p)

    def test_cutoff_never_returns_complete_horizon(self):
        p=plan('battery');p.update(initialSoc=.1,currentA=10,durationS=1800)
        with self.assertRaises(ValueError):battery_pybamm(p)


if __name__=='__main__':unittest.main()
