"""Synthetic independent equation oracles; no field calibration/validation."""
import copy
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from scipy.integrate import solve_ivp
from services.pvlib_research.environment import simulate_environment
from services.pvlib_research import snow_environment as snow, soiling_environment as soil
from services.pvlib_research.thermal import digest


def plan():
    return dict(schemaVersion='dynamic-environment-plan-v1',source='Synthetic assumed thermal/environment fixture',
        target='back_of_module',poaBasis='unshaded_front',stepS=1,
        thermal=dict(source='Synthetic areal balance coefficients, not fitted Faiman',capacityJm2K=12000,absorptance=.9,
            h0Wm2K=20,hWindWm2KPerMps=5,windHeightM=3,coefficientWindHeightM=3,
            domain=dict(source='Synthetic declared domain, not engineering approved',airMinC=-30,airMaxC=50,windMaxMps=20,
                        poaMaxWm2=1500,backMinC=-40,backMaxC=120)),
        snow=dict(source='Assumed degree-day cover, not Marion',coverageSweMm=2,meltMmPerHourPerC=.2,coveredTransmission=.1),
        soiling=dict(source='Assumed optical depth, not Kimber',depositionTauPerHour=0,rainWashPerMm=.5),
        initial=dict(moduleBackC=20,snowSweMm=0,soilOpticalDepth=0),
        intervals=[dict(start='2026-01-01T00:00:00Z',durationS=600,poaWm2=1000,extractedElectricalWm2=100,
            airC=20,windMps=2,rainMmPerHour=0,snowfallSweMmPerHour=0,soilCleaningFraction=0,snowRemovalFraction=0)])


class EnvironmentTests(unittest.TestCase):
    def test_thermal_step_exact_steady_energy_and_sensor(self):
        p=plan();eq=20+(900-100)/30;expected=eq+(20-eq)*math.exp(-600*30/12000)
        p['intervals'][0]['observedEndModuleBackC']=expected
        before=copy.deepcopy(p);r=simulate_environment(p);t=r['trace'][0]
        self.assertEqual(p,before);self.assertEqual(r['planSha256'],digest(p))
        self.assertAlmostEqual(t['moduleBackC'],expected,places=10)
        self.assertLess(r['comparison']['rmseC'],1e-9)
        self.assertAlmostEqual(r['absorbedWhm2'],900*600/3600,places=9)
        self.assertLess(abs(r['thermalResidualJm2']),1e-7)
        self.assertEqual(r['projectApproval'],'blocked')
        self.assertEqual(simulate_environment(copy.deepcopy(r['plan'])),r)

    def test_cooling_and_coefficient_sensitivity(self):
        p=plan();p['initial']['moduleBackC']=50;p['intervals'][0].update(poaWm2=0,extractedElectricalWm2=0)
        r=simulate_environment(p)
        self.assertAlmostEqual(r['trace'][0]['moduleBackC'],20+30*math.exp(-1.5),places=10)
        self.assertGreater(r['heatToAmbientWhm2'],0)
        base=simulate_environment(plan())['trace'][0]['moduleBackC']
        for name,value in [('capacityJm2K',24000),('h0Wm2K',40),('hWindWm2KPerMps',10),('absorptance',.6)]:
            p=plan();p['thermal'][name]=value
            self.assertLess(simulate_environment(p)['trace'][0]['moduleBackC'],base)

    def test_snow_inventory_fraction_and_exhaustion(self):
        s=snow.advance(2,3,5,.2,3600)
        self.assertAlmostEqual(s['sweMm'],4);self.assertAlmostEqual(s['meltedMm'],1)
        self.assertEqual(s['balanceResidualMm'],0)
        s=snow.advance(.1,0,10,.2,3600)
        self.assertEqual(s['sweMm'],0);self.assertAlmostEqual(s['meltedMm'],.1)
        self.assertAlmostEqual(snow.transmission(1,2,.1),.55)
        self.assertAlmostEqual(snow.transmission(5,2,.1),.1)
        p=plan();p['initial']['snowSweMm']=2;p['intervals'][0].update(snowRemovalFraction=.5,extractedElectricalWm2=0)
        r=simulate_environment(p)['trace'][0]
        self.assertAlmostEqual(r['snowRemovedMm'],1)
        self.assertLess(abs(r['snowBalanceResidualMm']),1e-10)

    def test_soil_exact_rain_deposition_cleaning(self):
        r=soil.advance(.2,.01,.5,2,3600)
        self.assertAlmostEqual(r['opticalDepth'],.01+(.2-.01)*math.exp(-1),places=12)
        self.assertLess(abs(r['balanceResidualTau']),1e-14)
        self.assertAlmostEqual(soil.advance(.2,.01,0,0,3600)['opticalDepth'],.21)
        p=plan();p['initial']['soilOpticalDepth']=.2;p['intervals'][0]['soilCleaningFraction']=1
        r=simulate_environment(p)['trace'][0]
        self.assertEqual(r['soilOpticalDepth'],0);self.assertAlmostEqual(r['soilCleanedTau'],.2)
        self.assertAlmostEqual(r['soilBalanceResidualTau'],0)

    def test_near_zero_wash_stability_and_snow_exhaustion_refinement(self):
        for wash in (0,1e-15,5e-324):
            result=soil.advance(.2,.01,wash,1,600)
            self.assertAlmostEqual(result['opticalDepth'],.2+.01/6,places=14)
        p=plan();p['initial']['snowSweMm']=.1
        p['intervals'][0].update(airC=10,extractedElectricalWm2=0)
        # Snow inventory reaches zero at 180 s, midpoint quadrature stays bounded.
        energies=[]
        for step in (2,1,.5):
            p['stepS']=step;r=simulate_environment(p)
            self.assertEqual(r['trace'][0]['snowSweMm'],0)
            self.assertAlmostEqual(r['trace'][0]['snowMeltedMm'],.1,places=12)
            energies.append(r['effectiveIncidentWhm2'])
        expected=(1000*600-1000*.9*(.1/2)*180/2)/3600
        for energy in energies:self.assertAlmostEqual(energy,expected,places=9)

    def test_coupled_environment_independent_dop853_and_refinement(self):
        p=plan();p['initial'].update(snowSweMm=.5,soilOpticalDepth=.2)
        p['soiling']['depositionTauPerHour']=.02
        p['intervals'][0].update(extractedElectricalWm2=0,airC=5,rainMmPerHour=2,snowfallSweMmPerHour=.1)
        def rhs(t,y):
            temp,swe,tau,energy=y
            cover=min(1,max(0,swe)/2);trans=(1-.9*cover)*math.exp(-tau)
            absorbed=900*trans
            return [(absorbed-30*(temp-5))/12000,(.1-.2*5)/3600,(.02-1*tau)/3600,1000*trans]
        ref=solve_ivp(rhs,(0,600),[20,.5,.2,0],method='DOP853',rtol=1e-12,atol=1e-12)
        self.assertTrue(ref.success)
        errors=[]
        for step in (2,1,.5):
            p['stepS']=step;r=simulate_environment(p);end=r['trace'][0]
            errors.append(abs(end['moduleBackC']-ref.y[0,-1]))
            self.assertAlmostEqual(end['snowSweMm'],ref.y[1,-1],places=10)
            self.assertAlmostEqual(end['soilOpticalDepth'],ref.y[2,-1],places=10)
            self.assertLess(abs(r['effectiveIncidentWhm2']-ref.y[3,-1]/3600),1e-5)
            self.assertLess(abs(r['thermalResidualJm2']),1e-7)
        self.assertLess(errors[-1],errors[0]/3)
        self.assertLess(errors[-1],1e-6)

    def test_continuity_no_daily_reset_no_doublecount(self):
        p=plan();p['initial'].update(snowSweMm=1,soilOpticalDepth=.1)
        p['snow']['meltMmPerHourPerC']=0;p['intervals'][0].update(extractedElectricalWm2=0,start='2026-01-01T23:50:00Z')
        row=copy.deepcopy(p['intervals'][0]);row['start']='2026-01-02T01:00:00+01:00';p['intervals'].append(row)
        r=simulate_environment(p)
        self.assertEqual(r['trace'][1]['snowSweMm'],1)
        self.assertEqual(r['trace'][1]['soilOpticalDepth'],.1)
        self.assertAlmostEqual(r['effectiveIncidentWhm2'],1000*.55*math.exp(-.1)*1200/3600)
        self.assertEqual(r['comparison']['pairs'],0);self.assertIsNone(r['comparison']['rmseC'])
        p['intervals'][1]['start']='2026-01-02T00:00:01Z'
        with self.assertRaisesRegex(ValueError,'Gap'):simulate_environment(p)

    def test_domain_target_strict_inputs_budget_cancel(self):
        for key,val in [('target','cell'),('poaBasis','already_soiled'),('stepS',True),('stepS',60)]:
            p=plan();p[key]=val
            with self.subTest(key=key),self.assertRaises(ValueError):simulate_environment(p)
        for mutate in [lambda p:p['thermal'].update(windHeightM=None),
            lambda p:p['thermal'].update(coefficientWindHeightM=10),
            lambda p:p['thermal']['domain'].update(poaMaxWm2=500),
            lambda p:p['intervals'][0].update(airC=60),
            lambda p:p['intervals'][0].update(observedEndCellC=20),
            lambda p:p['intervals'][0].update(windMps=float('nan')),
            lambda p:p['intervals'][0].update(start='2026-01-01T00:00:00'),
            lambda p:p['initial'].update(snowSweMm=-1)]:
            p=plan();mutate(p)
            with self.assertRaises(ValueError):simulate_environment(p)
        p=plan();p['maxSteps']=1
        with self.assertRaisesRegex(RuntimeError,'budget'):simulate_environment(p)
        with self.assertRaisesRegex(RuntimeError,'cancelled'):simulate_environment(plan(),cancel=lambda:True)
        p=plan();p['initial']['snowSweMm']=2
        with self.assertRaisesRegex(ValueError,'extraction'):simulate_environment(p)
        p=plan();p['thermal']['domain']['backMaxC']=21
        with self.assertRaisesRegex(RuntimeError,'domain'):simulate_environment(p)

    def test_cli_readback_and_cancel(self):
        with tempfile.TemporaryDirectory() as tmp:
            inp=Path(tmp)/'plan.json';out=Path(tmp)/'result.json';flag=Path(tmp)/'cancel'
            inp.write_text(json.dumps(plan()))
            cmd=[sys.executable,'-m','services.pvlib_research','environment','--plan',str(inp),'--output',str(out)]
            r=subprocess.run(cmd,capture_output=True,text=True,timeout=30)
            self.assertEqual(r.returncode,0,r.stderr)
            self.assertEqual(json.loads(out.read_text())['planSha256'],digest(plan()))
            out.unlink();flag.touch()
            r=subprocess.run(cmd+['--cancel-file',str(flag)],capture_output=True,text=True,timeout=30)
            self.assertNotEqual(r.returncode,0);self.assertFalse(out.exists())


if __name__=='__main__':unittest.main()
