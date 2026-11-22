"""Synthetic dynamics only; not controller or field validation."""
import copy
import math
import unittest
from scipy.integrate import solve_ivp
from services.pvlib_research.transient import simulate


def plan():
    return dict(schemaVersion='transient-plan-v1',source='Synthetic assumed dynamics fixture',stepS=.1,
                equipment=dict(ratingW=10000,efficiency=.96,mpptTauS=2,controlTauS=3,
                               thermalRKW=.1,thermalCJK=1000,derateStartC=60,shutdownC=90),
                initial=dict(trackedDcW=0,commandW=10000,temperatureC=25),
                intervals=[dict(start='2026-01-01T00:00:00Z',durationS=20,availableDcW=8000,
                                setpointW=10000,hardLimitW=10000,ambientC=25)])


class TransientTests(unittest.TestCase):
    def test_mppt_step_and_energy_analytic(self):
        p=plan(); before=copy.deepcopy(p); r=simulate(p); end=r['trace'][-1]
        self.assertEqual(p,before)
        self.assertAlmostEqual(end['trackedDcW'],8000*(1-math.exp(-10)),places=5)
        expected=.96*8000*(20-2*(1-math.exp(-10)))/3600
        self.assertAlmostEqual(r['energyWh'],expected,places=7)
        self.assertLess(abs(end['thermalBalanceResidualJ']),1e-7)
        self.assertEqual(r['projectApproval'],'blocked')

    def test_control_step_up_and_down(self):
        for start,target in [(1000,7000),(7000,1000)]:
            p=plan();p['initial'].update(trackedDcW=15000,commandW=start)
            p['intervals'][0].update(availableDcW=15000,setpointW=target)
            r=simulate(p); end=r['trace'][0]
            expected=target+(start-target)*math.exp(-20/3)
            energy=(target*20+(start-target)*3*(1-math.exp(-20/3)))/3600
            self.assertAlmostEqual(end['commandW'],expected,places=5)
            self.assertAlmostEqual(r['energyWh'],energy,places=7)

    def test_cooling_zero_generation_and_hard_limit(self):
        p=plan();p['initial']['temperatureC']=80;p['intervals'][0]['availableDcW']=0
        r=simulate(p)
        self.assertEqual(r['energyWh'],0)
        self.assertAlmostEqual(r['trace'][0]['temperatureC'],25+55*math.exp(-.2),places=9)
        p=plan();p['intervals'][0]['hardLimitW']=500
        r=simulate(p)
        self.assertLessEqual(r['energyWh'],500*20/3600)
        self.assertLessEqual(r['trace'][0]['endAcW'],500)

    def test_hot_derating_independent_dop853_and_convergence(self):
        p=plan();p['initial'].update(temperatureC=75,trackedDcW=10000)
        p['intervals'][0].update(availableDcW=10000)
        def rhs(t,y):
            m,c,temp,energy=y
            factor=max(0,min(1,(90-temp)/30))
            ac=max(0,min(.96*min(m,10000),c,10000*factor,10000))
            return [(10000-m)/2,(10000-c)/3,(ac*(1/.96-1)-(temp-25)/.1)/1000,ac]
        ref=solve_ivp(rhs,(0,20),[10000,10000,75,0],method='DOP853',rtol=1e-12,atol=1e-10)
        self.assertTrue(ref.success)
        errors=[]
        for step in (.2,.1,.05):
            p['stepS']=step;r=simulate(p)
            errors.append(abs(r['energyWh']-ref.y[3,-1]/3600))
            self.assertAlmostEqual(r['trace'][0]['temperatureC'],ref.y[2,-1],places=8)
            self.assertLess(r['trace'][0]['endAcW'],9600)
        self.assertLess(errors[-1],1e-7)
        self.assertLessEqual(errors[-1],errors[0]+1e-12)

    def test_timing_continuity_and_irradiance_drop(self):
        p=plan();row=copy.deepcopy(p['intervals'][0]);row.update(start='2026-01-01T01:00:20+01:00',availableDcW=0)
        p['intervals'].append(row);r=simulate(p)
        self.assertEqual(r['trace'][1]['energyWh'],0)
        self.assertGreater(r['trace'][1]['trackedDcW'],0)  # internal state is not fabricated available energy
        p['intervals'][1]['start']='2026-01-01T00:00:21Z'
        with self.assertRaisesRegex(ValueError,'Gap'):simulate(p)
        p=plan();p['intervals'][0]['start']='2026-01-01T00:00:00'
        with self.assertRaisesRegex(ValueError,'offset'):simulate(p)

    def test_switching_energy_refinement(self):
        p=plan();p['initial']['temperatureC']=75
        row=copy.deepcopy(p['intervals'][0])
        row.update(start='2026-01-01T00:00:20Z',setpointW=1000,hardLimitW=2500)
        p['intervals'].append(row)
        energies=[]
        for step in (.1,.05,.025):
            p['stepS']=step
            r=simulate(p);energies.append(r['energyWh'])
            self.assertLessEqual(r['trace'][1]['energyWh'],2500*20/3600)
        # Non-smooth min switching need not give monotonic RK4 convergence.
        self.assertLess(max(energies)-min(energies),1e-3)

    def test_fail_closed_budget_cancel_and_inputs(self):
        p=plan();p['maxSteps']=1
        with self.assertRaisesRegex(RuntimeError,'budget'):simulate(p)
        with self.assertRaisesRegex(RuntimeError,'cancelled'):simulate(plan(),cancel=lambda:True)
        for key,val in [('stepS',1),('stepS',True),('schemaVersion','wrong'),('source',''),('intervals',[])]:
            p=plan();p[key]=val
            with self.subTest(key=key),self.assertRaises(ValueError):simulate(p)
        for key,val in [('efficiency',0),('shutdownC',50),('thermalRKW',float('nan')),('extra',1)]:
            p=plan();p['equipment'][key]=val
            with self.subTest(key=key),self.assertRaises(ValueError):simulate(p)
        p=plan();p['intervals'][0]['durationS']=3600
        with self.assertRaises(ValueError):simulate(p)


if __name__=='__main__':unittest.main()
