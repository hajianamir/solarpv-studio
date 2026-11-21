import copy
import json
import unittest
from pathlib import Path
import numpy as np
from scipy.linalg import expm
from scipy.integrate import solve_ivp
from scipy.optimize import brentq
from services.pvlib_research.advanced_thermal import simulate,SIGMA
from services.pvlib_research.diode_network import solve

FIX=Path(__file__).parent/'advanced-synthetic.json'

class AdvancedModels(unittest.TestCase):
    def setUp(self):self.plans=json.loads(FIX.read_text())
    def test_thermal_matrix_exponential(self):
        p=self.plans['thermal']['plan'];a=p['parameters'];a['frontEmissivity']=a['backEmissivity']=0
        r=p['intervals'][0];out=simulate(p)['trace'][0];cc=a['cellCapacityJm2K'];cb=a['backCapacityJm2K'];g=a['couplingWm2K'];hf=a['frontH0']+a['frontHWind']*r['windMps'];hb=a['backH0']+a['backHWind']*r['windMps']
        A=np.array([[-(g+hf)/cc,g/cc,(r['absorbedCellWm2']-r['electricalExtractedWm2']+hf*r['airC'])/cc],[g/cb,-(g+hb)/cb,hb*r['airC']/cb],[0,0,0]])
        expected=expm(A*r['durationS'])@np.array([25,25,1])
        np.testing.assert_allclose([out['cellC'],out['backC']],expected[:2],atol=1e-9,rtol=0)
        self.assertLess(abs(out['totalResidualJm2']),1e-6)
    def test_thermal_radiation_independent_dop853(self):
        p=self.plans['thermal']['plan'];a=p['parameters'];r=p['intervals'][0]
        def rhs(t,y):
            tc,tb=y;g=a['couplingWm2K']*(tc-tb)
            return [(560-g-12*(tc-25)-.85*SIGMA*((tc+273.15)**4-283.15**4))/8000,(g-10*(tb-25)-.85*SIGMA*((tb+273.15)**4-298.15**4))/12000]
        expected=solve_ivp(rhs,[0,60],[25,25],method='DOP853',rtol=1e-12,atol=1e-12).y[:,-1]
        out=simulate(p)['trace'][0];np.testing.assert_allclose([out['cellC'],out['backC']],expected,atol=1e-9,rtol=0)
        self.assertLess(abs(out['cellResidualJm2']),1e-6);self.assertLess(abs(out['backResidualJm2']),1e-6)
    def test_night_and_distinct_observations(self):
        p=self.plans['thermal']['plan'];p['intervals'][0].update(absorbedCellWm2=0,electricalExtractedWm2=0,observedEndCellC=24,observedEndBackC=26)
        out=simulate(p);self.assertLess(out['trace'][0]['cellC'],25);self.assertEqual(out['comparison']['cell']['pairs'],1);self.assertNotEqual(out['comparison']['cell']['rmseC'],out['comparison']['back']['rmseC'])
    def test_reject_thermal_domains_and_cancel(self):
        base=self.plans['thermal']['plan']
        for mutate in [lambda p:p.update(maxSteps=1),lambda p:p.update(stepS=10),lambda p:p['parameters'].update(windHeightM=10),lambda p:p['intervals'][0].update(start='2026-01-01T12:00:00'),lambda p:p['initial'].update(cellC=200),lambda p:p['intervals'][0].update(electricalExtractedWm2=2000)]:
            p=copy.deepcopy(base);mutate(p)
            with self.assertRaises(ValueError):simulate(p)
        with self.assertRaises(RuntimeError):simulate(base,lambda:True)
    def test_circuit_implicit_independent_dense_oracle(self):
        p=self.plans['circuit']['plan'];out=solve(p)
        # Independently solve diode-current equation at each terminal voltage,
        # then construct V(I) by bracketing; do not call pvlib in the oracle.
        def node_voltage(i,s):
            vd=brentq(lambda d:s['photocurrentA']-s['saturationCurrentA']*np.expm1(d/s['nNsVthV'])-d/s['shuntOhm']-i,-10000,30,xtol=1e-12)
            return max(-s['bypassDropV'],vd-i*s['seriesOhm'])
        def power(i):return i*sum(node_voltage(i,s) for s in p['substrings'])
        currents=np.linspace(0,8,20001);powers=np.array([power(i) for i in currents]);oracle=float(powers.max())
        self.assertLess(abs(out['mppW']-oracle),.002);self.assertGreater(out['mppW'],0);self.assertTrue(any(s['bypassActive'] for s in out['substrings']));self.assertLess(abs(out['powerResidualW']),1e-5)
        self.assertLessEqual(out['mppW'],out['independentSubstringMppW']+1e-6)
    def test_uniform_parallel_dark_and_wiring(self):
        p=self.plans['circuit']['plan'];p['substrings'][1]['photocurrentA']=8
        series=solve(p);self.assertAlmostEqual(series['mppW'],series['independentSubstringMppW'],places=7)
        p['strings']=[['bright'],['shaded']];parallel=solve(p);self.assertAlmostEqual(series['mppW'],parallel['mppW'],places=6)
        for s in p['substrings']:s['photocurrentA']=0
        self.assertEqual(solve(p)['mppW'],0)
        p['strings']=[['bright','bright']]
        with self.assertRaises(ValueError):solve(p)
    def test_circuit_budget_cancel(self):
        p=self.plans['circuit']['plan']
        with self.assertRaises(RuntimeError):solve(p,lambda:True)
        p['substrings']=[dict(p['substrings'][0],id=str(i),photocurrentA=1+i*.5) for i in range(12)]
        p['strings']=[[str(i) for i in range(12)]]
        p['maxEvaluations']=500
        with self.assertRaises(RuntimeError):solve(p)

if __name__=='__main__':unittest.main()
