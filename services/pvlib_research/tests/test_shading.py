"""Independent synthetic ray/circuit oracles, NOT field validation."""
import copy
import math
import unittest
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import numpy as np
from scipy.optimize import brentq, minimize_scalar
from services.pvlib_research.shading import visible, network_mpp, review_shading
from services.pvlib_research.thermal import digest


def roof(x0=0,x1=.5,y0=0,y1=1,z=1):
    a=[x0,y0,z];b=[x1,y0,z];c=[x1,y1,z];d=[x0,y1,z]
    return [[a,b,c],[a,c,d]]


def plan():
    return dict(schemaVersion='finite-shading-plan-v1',source='Synthetic finite optical/circuit fixture',
        datum='Synthetic local ENU metres, not survey',
        patches=[dict(id=f's{i}',origin=[i,0,0],u=[1,0,0],v=[0,1,0],iscRefA=10,vocV=30) for i in range(2)],
        triangles=roof(),sun=dict(zenithDeg=0,azimuthDeg=180,dniWm2=1000,dhiWm2=0),
        quadrature=dict(surfaceGrid=4,skyMu=4,skyAzimuth=16,maxPairTests=2000000),
        electrical=dict(source='Assumed linear IV, not equipment parameters',strings=[['s0','s1']],bypassDropV=.5,referenceWm2=1000))


class ShadingTests(unittest.TestCase):
    def test_ray_independent_linear_system_and_winding(self):
        tri=np.array([[0,0,1],[1,0,1],[0,1,1]],float)
        direction=np.array([.1,.1,1]);direction/=np.linalg.norm(direction)
        for origin in ([.1,.1,0],[2,2,0],[.1,.1,2]):
            o=np.array(origin,float)
            # O+tD=A+u(B-A)+v(C-A): independent 3x3 oracle.
            t,u,v=np.linalg.solve(np.column_stack((direction,tri[0]-tri[1],tri[0]-tri[2])),tri[0]-o)
            expected=t>1e-8 and u>=0 and v>=0 and u+v<=1
            for mesh in ([tri],[tri[::-1]]):
                self.assertEqual(bool(visible(np.array([o]),direction,mesh)[0]),not expected)
        self.assertTrue(visible(np.array([[.1,.1,1]]),np.array([0.,0.,1.]),[tri])[0])
        self.assertTrue(visible(np.array([[.1,.1,0]]),np.array([1.,0.,0.]),[tri])[0])

    def test_partial_shadow_finite_edges_and_accounting(self):
        p=plan();before=copy.deepcopy(p);r=review_shading(p)
        self.assertEqual(p,before)
        self.assertEqual([a['directVisibleFraction'] for a in r['patches']],[.5,1])
        self.assertAlmostEqual(r['optical']['blockedIncidentW'],500)
        e=r['electrical']
        self.assertAlmostEqual(e['networkReductionW'],e['independentSubstringReductionW']+e['additionalMismatchW'])
        self.assertAlmostEqual(e['unshaded']['mppW'],150)
        self.assertEqual(r['planSha256'],digest(p))
        self.assertEqual(r['projectApproval'],'blocked')
        p['sun'].update(zenithDeg=45,azimuthDeg=270)
        r=review_shading(p)
        # Shadow moves east by one metre: first patch clears, next patch is half shaded.
        self.assertEqual([a['directVisibleFraction'] for a in r['patches']],[1,.5])

    def test_diffuse_horizon_symmetry_and_refinement(self):
        p=plan();p['triangles']=[];p['sun'].update(dniWm2=0,dhiWm2=100)
        r=review_shading(p)
        self.assertAlmostEqual(r['optical']['unshadedIncidentW'],200)
        for patch in r['patches']:self.assertAlmostEqual(patch['diffuseShadedWm2'],100)
        # Finite vertical east wall blocks exactly half of isotropic sky for a tiny patch.
        p['patches']=p['patches'][:1];p['patches'][0].update(origin=[-.005,-.005,0],u=[.01,0,0],v=[0,.01,0])
        p['electrical']['strings']=[['s0']]
        p['triangles']=[[[.01,-100,0],[.01,100,0],[.01,100,100]],[[.01,-100,0],[.01,100,100],[.01,-100,100]]]
        p['quadrature']['surfaceGrid']=1
        for mu,az in [(2,8),(4,16),(8,32)]:
            p['quadrature'].update(skyMu=mu,skyAzimuth=az)
            r=review_shading(p)
            self.assertAlmostEqual(r['patches'][0]['diffuseShadedWm2'],50,places=10)
        p['triangles']=roof(-100,100,-100,100)
        self.assertAlmostEqual(review_shading(p)['patches'][0]['diffuseShadedWm2'],0)

    def test_bypass_global_peak_and_dark(self):
        models={f's{i}':dict(iscRefA=10,vocV=30) for i in range(2)}
        r=network_mpp(models,[['s0','s1']],{'s0':200,'s1':1000},.5,1000)
        # High-current peak bypasses weak substring: V=29.5-3I.
        self.assertAlmostEqual(r['mppW'],29.5**2/12,places=9)
        self.assertGreater(r['mppW'],50)  # other local peak
        dark=network_mpp(models,[['s0','s1']],{'s0':0,'s1':0},.5,1000)
        self.assertEqual(dark['mppW'],0)
        lit=network_mpp(models,[['s0','s1']],{'s0':1000,'s1':1000},.5,1000)
        self.assertAlmostEqual(lit['mismatchW'],0)
        self.assertAlmostEqual(lit['mppW'],150)

    def test_parallel_common_voltage_independent_root_oracle(self):
        specs={'a':dict(iscRefA=10,vocV=30),'b':dict(iscRefA=10,vocV=30),'c':dict(iscRefA=8,vocV=25)}
        light={'a':200,'b':1000,'c':800};strings=[['a','b'],['c']]
        result=network_mpp(specs,strings,light,.5,1000)
        def independent_current(voltage, ids):
            isc=[specs[k]['iscRefA']*light[k]/1000 for k in ids]
            voc=[specs[k]['vocV'] for k in ids]
            def f(i):return sum(max(-.5,v*(1-i/c)) for c,v in zip(isc,voc))-voltage
            if f(0)<=0:return 0
            return brentq(f,0,max(isc)*2,xtol=1e-12)
        def power(v):return v*sum(independent_current(v,s) for s in strings)
        # independent dense voltage scan, then scalar search around each local peak
        vv=np.linspace(0,60,1201);pp=[power(v) for v in vv];best=0
        for i in range(1,len(vv)-1):
            if pp[i]>=pp[i-1] and pp[i]>=pp[i+1]:
                opt=minimize_scalar(lambda v:-power(v),bounds=(vv[i-1],vv[i+1]),method='bounded',options={'xatol':1e-10})
                best=max(best,-opt.fun)
        self.assertAlmostEqual(result['mppW'],best,places=7)
        independent=sum(s['vocV']*s['iscRefA']*light[k]/1000/4 for k,s in specs.items())
        self.assertAlmostEqual(result['mismatchW'],independent-best,places=7)

    def test_strict_budget_cancel_and_topology(self):
        p=plan();p['quadrature']['maxPairTests']=1
        with self.assertRaisesRegex(RuntimeError,'budget'):review_shading(p)
        with self.assertRaisesRegex(RuntimeError,'cancelled'):review_shading(plan(),cancel=lambda:True)
        for mutate in [lambda p:p['patches'][0].update(u=[0,0,0]),
                       lambda p:p['patches'][0].update(v=[1,1,0]),
                       lambda p:p['patches'][0].update(vocV=float('nan')),
                       lambda p:p['electrical'].update(strings=[['s0','s0']]),
                       lambda p:p['quadrature'].update(surfaceGrid=True),
                       lambda p:p['sun'].update(zenithDeg=100),
                       lambda p:p.update(triangles=[[[0,0,1]]*3]),
                       lambda p:p.update(extra=0)]:
            p=plan();mutate(p)
            with self.assertRaises(ValueError):review_shading(p)

    def test_tilted_sky_independent_view_factor_and_beam(self):
        p=plan();p['patches']=p['patches'][:1];p['electrical']['strings']=[['s0']]
        p['triangles']=[];p['quadrature'].update(skyMu=8,skyAzimuth=32)
        p['patches'][0]['v']=[0,math.cos(math.pi/6),math.sin(math.pi/6)]
        p['sun'].update(dniWm2=1000,dhiWm2=100)
        r=review_shading(p)['patches'][0]
        self.assertAlmostEqual(r['directUnshadedWm2'],1000*math.cos(math.pi/6),places=9)
        self.assertLess(abs(r['diffuseUnshadedWm2']-100*(1+math.cos(math.pi/6))/2),.5)

    def test_cli_readback_cancel_and_duplicate_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            inp=Path(tmp)/'plan.json';out=Path(tmp)/'result.json';flag=Path(tmp)/'cancel'
            inp.write_text(json.dumps(plan()))
            cmd=[sys.executable,'-m','services.pvlib_research','shading','--plan',str(inp),'--output',str(out)]
            run=subprocess.run(cmd,capture_output=True,text=True,timeout=30)
            self.assertEqual(run.returncode,0,run.stderr)
            result=json.loads(out.read_text());self.assertEqual(result['planSha256'],digest(plan()))
            out.unlink();flag.touch()
            run=subprocess.run(cmd+['--cancel-file',str(flag)],capture_output=True,text=True,timeout=30)
            self.assertNotEqual(run.returncode,0);self.assertFalse(out.exists())
            self.assertIn('cancelled',run.stderr)
            inp.write_text('{"schemaVersion":1,"schemaVersion":2}')
            run=subprocess.run(cmd,capture_output=True,text=True,timeout=30)
            self.assertNotEqual(run.returncode,0);self.assertFalse(out.exists())
            self.assertIn('Duplicate JSON',run.stderr)

    def test_night_zero_and_patch_grid_refinement(self):
        p=plan();values=[]
        for grid in (2,4,8):
            p['quadrature']['surfaceGrid']=grid
            r=review_shading(p);values.append(r['electrical']['shaded']['mppW'])
        self.assertLess(max(values)-min(values),1e-9)
        p['sun'].update(zenithDeg=100,dniWm2=0,dhiWm2=0)
        r=review_shading(p)
        self.assertEqual(r['electrical']['shaded']['mppW'],0)
        self.assertEqual(r['optical']['shadedIncidentW'],0)


if __name__=='__main__':unittest.main()
