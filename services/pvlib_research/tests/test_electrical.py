"""Synthetic circuit oracles, not field validation."""
import copy
import math
import unittest
from scipy.optimize import root
from services.pvlib_research.electrical import solve


def node(parent=0, r=.1, x=.05, load=10000, gen=0, pf=1, sign=1, q=0):
    return dict(parent=parent,rOhm=r,xOhm=x,loadW=load,loadVar=q,
                generationW=gen,generationPf=pf,generationQSign=sign)


def plan(nodes=None, **kw):
    return dict(schemaVersion='radial-ac-plan-v1',source='Synthetic circuit fixture, not equipment evidence',
                voltageLLV=400,nodes=nodes or [node()], **kw)


class ElectricalTests(unittest.TestCase):
    def test_resistive_closed_form_both_directions(self):
        for demand in (10000, -10000):
            out=solve(plan([node(r=.1,x=0,load=max(demand,0),gen=max(-demand,0))]))['final']
            v0=400/math.sqrt(3)
            v=(v0+math.sqrt(v0*v0-4*.1*demand/3))/2
            current=demand/(3*v)
            self.assertAlmostEqual(out['nodeVoltageLLV'][1],v*math.sqrt(3),places=7)
            self.assertAlmostEqual(out['seriesLossW'],3*current**2*.1,places=6)
            self.assertAlmostEqual(out['poiImportW'],demand+3*current**2*.1,places=5)
            self.assertLess(out['balanceResidualVA'],1e-8)

    def test_complex_network_independent_nodal_root(self):
        ns=[node(load=5000,q=2000),node(parent=1,load=0,gen=20000,pf=.95),node(parent=1,load=7000,q=-500)]
        p=plan(ns); out=solve(p)['final']; v0=400/math.sqrt(3)
        ss=[]
        for n in ns:
            ss.append(complex(n['loadW']-n['generationW'], n['loadVar']-n['generationW']*math.tan(math.acos(n['generationPf'])))/3)
        def residual(values):
            vv=[complex(v0)]+[complex(*values[2*i:2*i+2]) for i in range(3)]
            rr=[]
            for k,n in enumerate(ns,1):
                injected=(vv[k]-vv[n['parent']])/complex(n['rOhm'],n['xOhm'])
                for j,m in enumerate(ns,1):
                    if m['parent']==k: injected+=(vv[k]-vv[j])/complex(m['rOhm'],m['xOhm'])
                mismatch=injected+(ss[k-1]/vv[k]).conjugate()
                rr.extend([mismatch.real,mismatch.imag])
            return rr
        ref=root(residual,[v0,0]*3,tol=1e-10)
        self.assertTrue(ref.success)
        for i in range(3):
            self.assertAlmostEqual(out['nodeVoltageLLV'][i+1],abs(complex(*ref.x[2*i:2*i+2]))*math.sqrt(3),places=6)
        self.assertLess(out['pqResidualVA'],1e-4)
        self.assertLess(out['balanceResidualVA'],1e-8)
        self.assertAlmostEqual(out['poiImportVar'],sum(s.imag*3 for s in ss)+out['seriesLossVar'],places=5)

    def test_cap_resolves_losses_and_accounting(self):
        p=plan([node(load=2000,gen=100000,pf=.98)],exportLimitW=40000)
        before=copy.deepcopy(p); out=solve(p); f=out['final']
        self.assertEqual(p,before)
        self.assertLessEqual(f['exportW'],40000)
        self.assertAlmostEqual(f['exportW'],40000,places=5)
        self.assertLess(f['seriesLossW'],out['uncapped']['seriesLossW'])
        self.assertAlmostEqual(f['poiImportW'],2000-100000*f['generationScale']+f['seriesLossW'],places=4)
        self.assertAlmostEqual(out['curtailedGenerationW'],100000*(1-f['generationScale']))
        self.assertGreater(out['loadFlowCalls'],2)

    def test_zero_cap_signed_import_and_noop(self):
        for cap in (0,100000):
            o=solve(plan([node(load=1000,gen=20000)],exportLimitW=cap))
            if cap==0:
                self.assertLessEqual(o['final']['exportW'],0)
                self.assertAlmostEqual(o['final']['poiImportW'],0,places=5)
            else: self.assertEqual(o['loadFlowCalls'],1)
        o=solve(plan([node(load=5000,gen=1000)],exportLimitW=0))
        self.assertGreater(o['final']['poiImportW'],0)
        self.assertEqual(o['curtailedGenerationW'],0)

    def test_pf_q_sign_and_zero_impedance(self):
        for sign in (-1,1):
            f=solve(plan([node(r=0,x=0,load=0,gen=10000,pf=.8,sign=sign)]))['final']
            self.assertAlmostEqual(f['poiImportVar'],-sign*7500)
            self.assertEqual(f['seriesLossW'],0)
            self.assertAlmostEqual(f['branchCurrentA'][0],12500/(math.sqrt(3)*400))

    def test_strict_inputs_and_no_fallback(self):
        for key,val in [('generationPf',0),('rOhm',-1),('xOhm',float('nan')),('parent',1),('parent',True),('generationQSign',True),('wat',1)]:
            p=plan();p['nodes'][0][key]=val
            with self.subTest(key=key),self.assertRaises(ValueError):solve(p)
        for key,val in [('voltageLLV',float('inf')),('maxIterations',True),('toleranceV',0),('exportLimitW',-1),('schemaVersion','wrong'),('nodes',[])]:
            p=plan();p[key]=val
            with self.subTest(key=key),self.assertRaises(ValueError):solve(p)
        with self.assertRaisesRegex(RuntimeError,'converge'):solve(plan(maxIterations=1))
        with self.assertRaisesRegex(RuntimeError,'domain'):solve(plan([node(r=10,load=1e7)]))
        o=solve(plan())
        self.assertEqual(o['projectApproval'],'blocked')
        self.assertEqual(o['validationStatus'],'conditional_assumptions')


if __name__=='__main__': unittest.main()
