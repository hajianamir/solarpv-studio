"""Analytic Neumann and independent energy quadrature; no COMSOL replay claim."""
import copy
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest
import numpy as np
from scipy.integrate import quad
from scipy.optimize import brentq
from scipy.special import erf
from services.pvlib_research.stefan_spatial import stefan_spatial

ROOT=Path(__file__).resolve().parents[1]


def fixture():return json.loads((ROOT/'docs/examples/stefan/paraffin.json').read_text())


def neumann(p):
    alpha=p['conductivityWmK']/(p['densityKgm3']*p['heatCapacityJkgK']);delta=p['wallK']-p['meltingK'];ste=p['heatCapacityJkgK']*delta/p['latentHeatJkg']
    lam=brentq(lambda x:math.sqrt(math.pi)*x*math.exp(x*x)*math.erf(x)-ste,1e-14,6,xtol=1e-14)
    t=p['durationS'];scale=2*math.sqrt(alpha*t);front=lam*scale
    def temperature(x):return p['wallK']-delta*erf(x/scale)/erf(lam) if x<front else p['meltingK']
    energy=quad(lambda x:p['densityKgm3']*(p['latentHeatJkg']+p['heatCapacityJkgK']*(temperature(x)-p['meltingK'])),0,front,epsabs=1e-6)[0]
    return front,temperature,energy,lam


class StefanSpatial(unittest.TestCase):
    def test_neumann_root_and_independent_integral(self):
        p=fixture();s,_,energy,lam=neumann(p);self.assertAlmostEqual(lam,.4677782140789931,12);self.assertAlmostEqual(s,.03320895882344611,12)
        alpha=p['conductivityWmK']/(p['densityKgm3']*p['heatCapacityJkgK']);flux_integral=2*p['conductivityWmK']*(p['wallK']-p['meltingK'])*math.sqrt(p['durationS']/alpha)/(math.sqrt(math.pi)*math.erf(lam));self.assertAlmostEqual(energy/flux_integral,1,12)

    def test_three_meshes_against_analytic(self):
        errors=[];energy_errors=[]
        for n in [80,160,320]:
            p=fixture();p['cells']=n;s,t,e,_=neumann(p);o=stefan_spatial(p)['output'];errors.append(float(np.mean(np.abs(np.array(o['temperatureK'])-[t(x) for x in o['xM']]))));energy_errors.append(abs(o['storedJm2']/e-1));self.assertLess(abs(o['equivalentMeltDepthM']/s-1),.003);self.assertTrue(o['semiInfiniteComparisonEligible'])
        self.assertTrue(all(b<a for a,b in zip(errors,errors[1:])));self.assertTrue(all(b<a for a,b in zip(energy_errors,energy_errors[1:])));self.assertLess(errors[-1],.006);self.assertLess(energy_errors[-1],8e-5)

    def test_frozen_high_precision_reference_multiple_times(self):
        ref=json.loads((ROOT/'docs/examples/stefan/neumann-reference.json').read_text())
        for r in ref['rows']:
            p=fixture();p.update(cells=320,durationS=r['timeS']);o=stefan_spatial(p)['output'];s,t,e,lam=neumann(p)
            self.assertAlmostEqual(s/float(r['frontM']),1,12);self.assertAlmostEqual(e/float(r['energyJm2']),1,12);self.assertAlmostEqual(lam/float(ref['lambdaValue']),1,12)
            self.assertLess(abs(o['equivalentMeltDepthM']/s-1),.002);self.assertLess(abs(o['storedJm2']/e-1),.001)
            for row in r['temperatureK']:self.assertAlmostEqual(float(t(float(row['xM']))),float(row['value']),10)

    def test_time_refinement(self):
        values=[]
        for fourier in [.3,.15,.075]:
            p=fixture();p['fourier']=fourier;o=stefan_spatial(p)['output'];values.append(o['storedJm2'])
        self.assertLess(abs(values[2]-values[1]),.6*abs(values[1]-values[0]));self.assertLess(abs(values[2]/values[0]-1),2e-5)

    def test_ledger_constitutive_and_maximum_principle(self):
        p=fixture();o=stefan_spatial(p)['output'];h=np.array(o['specificEnthalpyJkg']);t=np.array(o['temperatureK']);f=np.array(o['liquidFraction']);self.assertTrue(np.all(h>=0));self.assertTrue(np.all((t>=313)&(t<=350)));np.testing.assert_allclose(t,313+np.maximum(h-175000,0)/2400);np.testing.assert_allclose(f,np.clip(h/175000,0,1));self.assertAlmostEqual(o['storedJm2'],750*o['dxM']*math.fsum(h),7);self.assertLess(abs(o['residualJm2'])/o['storedJm2'],1e-10);self.assertLess(o['stepS']*.21/(750*2400*o['dxM']**2),.3000001)

    def test_zero_time(self):
        p=fixture();p['durationS']=0;o=stefan_spatial(p)['output'];self.assertEqual(o['steps'],0);self.assertEqual(o['stepS'],0);self.assertEqual(o['storedJm2'],0);self.assertEqual(o['equivalentMeltDepthM'],0);self.assertEqual(o['temperatureK'],[313]*p['cells'])

    def test_finite_domain_not_semi_infinite(self):
        p=fixture();p.update(lengthM=.01,cells=32,durationS=10000);o=stefan_spatial(p)['output'];self.assertFalse(o['semiInfiniteComparisonEligible']);self.assertLess(o['equivalentMeltDepthM'],.010000001)

    def test_invalid_numeric_units_and_schema(self):
        for name,value in [('cells',True),('cells',513),('cells',8.5),('conductivityWmK',float('nan')),('densityKgm3',0),('latentHeatJkg',-1),('durationS',float('inf')),('fourier',.34),('wallK',312),('meltingK','313 K'),('contextSha256','invalid'),('extra',1)]:
            p=fixture();p[name]=value
            with self.assertRaises(ValueError,msg=name):stefan_spatial(p)

    def test_work_budget_before_computation(self):
        p=fixture();p.update(cells=512,lengthM=.001,durationS=1e7)
        with self.assertRaisesRegex(ValueError,'budget'):stefan_spatial(p)

    def test_input_immutable_and_boundary(self):
        p=fixture();before=copy.deepcopy(p);r=stefan_spatial(p);self.assertEqual(p,before);self.assertEqual(r['status'],'insufficient_evidence');self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['validationStatus'],'not_field_validated');self.assertEqual(r['operation'],'stefan_spatial')

    def test_cli_default_off_enable_and_rollback(self):
        command=[sys.executable,'-m','services.pvlib_research.stefan_spatial'];raw=json.dumps(fixture())
        self.assertNotEqual(subprocess.run(command,input=raw,text=True,capture_output=True,timeout=30).returncode,0)
        r=subprocess.run(command+['--enable-research'],input=raw,text=True,capture_output=True,timeout=30);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(json.loads(r.stdout)['projectApproval'],'blocked')
        self.assertNotEqual(subprocess.run(command,input=raw,text=True,capture_output=True,timeout=30).returncode,0)

    def test_cli_bounded_and_nonfinite_json(self):
        command=[sys.executable,'-m','services.pvlib_research.stefan_spatial','--enable-research']
        for raw in [' '*65537,json.dumps(fixture()).replace('10800','NaN')]:
            r=subprocess.run(command,input=raw,text=True,capture_output=True,timeout=30);self.assertNotEqual(r.returncode,0)

    def test_offline_fresh_process(self):
        code="import socket;deny=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('network forbidden'));socket.socket.connect=deny;socket.getaddrinfo=deny;from scripts.test_stefan_spatial import fixture;from services.pvlib_research.stefan_spatial import stefan_spatial;stefan_spatial(fixture())"
        subprocess.run([sys.executable,'-c',code],cwd=ROOT,check=True,timeout=30)


if __name__=='__main__':unittest.main()
