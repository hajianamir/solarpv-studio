"""Independent closed-form witnesses for unexposed, bounded C research kernels."""
import copy
import json
import math
import unittest
from pathlib import Path
from services.pvlib_research.science_c import grid_support,agri_water,fpv_balance,pem_dispatch,pvt_pcm,F,H2_MOLAR_KG


def fixture(name):
    return json.loads(Path('docs/examples/science-c/'+name+'.synthetic.json').read_text())


def extend(p,n):
    from datetime import datetime,timedelta,timezone
    row=p['records'][0]
    p['records']=[dict(copy.deepcopy(row),timestamp=(datetime(2026,1,1,tzinfo=timezone.utc)+timedelta(seconds=i*p.get('intervalS',86400))).isoformat()) for i in range(n)]
    return p


class ScienceC(unittest.TestCase):
    def test_grid_analytic_step(self):
        p=extend(fixture('grid'),4);o=grid_support(p)['output']
        for i,r in enumerate(o['trace']):self.assertAlmostEqual(r['pKw'],8*(1-math.exp(-(i+1)/2)));self.assertAlmostEqual(r['qKvar'],0)
        self.assertEqual(o['tripDeadlineScreen'],'insufficient_evidence');self.assertFalse(o['certificate'])

    def test_grid_sag_current_circle(self):
        p=extend(fixture('grid'),2);p['records'][1]['voltagePu']=.05
        for r in grid_support(p)['output']['trace']:self.assertLessEqual(math.hypot(r['pKw'],r['qKvar']),r['limitKva']+1e-10)

    def test_grid_droop(self):
        p=fixture('grid');p['records'][0]['frequencyHz']=52
        self.assertEqual(grid_support(p)['output']['trace'][0]['targetPKw'],4)

    def test_grid_rule_deadline_unknown_fail_pass_context(self):
        p=extend(fixture('grid'),3);p['rulepack']=dict(id='synthetic',version='1',source='Synthetic non-regulatory band',documentSha256='d'*64,contextSha256=p['contextSha256'],voltageMinPu=.95,voltageMaxPu=1.05,frequencyMinHz=49,frequencyMaxHz=51,tripDeadlineS=2)
        for r in p['records']:r.update(voltagePu=.9,connected=None)
        o=grid_support(p)['output'];self.assertEqual(o['eligibleSamples'],2);self.assertEqual(o['tripDeadlineScreen'],'insufficient_evidence')
        p['records'][1]['connected']=True;self.assertEqual(grid_support(p)['output']['tripDeadlineScreen'],'fail')
        for r in p['records']:r['connected']=False
        self.assertEqual(grid_support(p)['output']['tripDeadlineScreen'],'pass')
        p['rulepack']['contextSha256']='e'*64;self.assertEqual(grid_support(p)['output']['tripDeadlineScreen'],'insufficient_evidence')

    def test_agri_analytic_dli_yield_ler(self):
        o=agri_water(fixture('agri'))['output'];self.assertAlmostEqual(o['reference']['yieldKgHa'],80);self.assertAlmostEqual(o['shaded']['yieldKgHa'],56);self.assertAlmostEqual(o['landEquivalentRatio'],1.2);self.assertAlmostEqual(o['shaded']['trace'][0]['dliMolM2'],31.99)

    def test_agri_equal_control(self):
        p=extend(fixture('agri'),20);p.update(lightTransmission=1,shadedEtMultiplier=1);o=agri_water(p)['output'];self.assertEqual(o['reference'],o['shaded'])

    def test_agri_water_closure_dry_overflow(self):
        p=extend(fixture('agri'),3);p['initialWaterMm']=0;p['records'][1]['rainMm']=200
        o=agri_water(p)['output']
        for scenario in ('reference','shaded'):
            rows=o[scenario]['trace'];self.assertEqual(rows[0]['etMm'],0);self.assertGreater(rows[1]['drainageMm'],0)
            for row in rows:self.assertAlmostEqual(row['waterResidualMm'],0);self.assertGreaterEqual(row['endWaterMm'],0)

    def test_agri_zero_baseline(self):
        p=fixture('agri');p['referencePvKwh']=0;self.assertIsNone(agri_water(p)['output']['landEquivalentRatio'])

    def test_fpv_closed_form_backward_euler(self):
        p=fixture('fpv');p['records'][0]['potentialEvapMmDay']=0;o=fpv_balance(p)['output'];capacity=100*2*4.186e6;ua=1000;steady=20+500*.8*.5/10
        expected=steady+(20-steady)*(capacity/(capacity+ua*30))**120
        self.assertAlmostEqual(o['covered']['trace'][0]['temperatureC'],expected,places=10)
        self.assertEqual(o['numericalGate'],'passed')

    def test_fpv_water_energy_and_uncovered(self):
        p=extend(fixture('fpv'),12);o=fpv_balance(p)['output']
        for scenario in ('reference','coarse','covered'):
            for r in o[scenario]['trace']:self.assertAlmostEqual(r['waterResidualM3'],0,places=9);self.assertAlmostEqual(r['energyResidualJ'],0,delta=.01)
        self.assertAlmostEqual(o['covered']['totalEvaporationM3']/o['reference']['totalEvaporationM3'],.75)
        p['coverageFraction']=0;o=fpv_balance(p)['output'];self.assertEqual(o['reference'],o['covered'])

    def test_fpv_volume_stop(self):
        p=fixture('fpv');p['records'][0]['outflowM3']=20
        with self.assertRaises(ValueError):fpv_balance(p)

    def test_pem_faraday_mass_energy(self):
        o=pem_dispatch(fixture('pem'))['output'];r=o['trace'][0];mol=10*50*10/(2*F)
        self.assertAlmostEqual(r['currentA'],50);self.assertAlmostEqual(o['hydrogenKg'],mol*H2_MOLAR_KG);self.assertAlmostEqual(r['waterConsumedKg'],r['hydrogenKg']+r['oxygenKg']);self.assertAlmostEqual(r['stackJ'],r['chemicalHhvJ']+r['heatJ']);self.assertAlmostEqual(r['energyResidualJ'],0)

    def test_pem_nonlinear_polarization_and_ramp(self):
        p=extend(fixture('pem'),3);p.update(activationV=.1,resistanceOhm=.01,rampAPerS=1)
        o=pem_dispatch(p)['output']
        for i,r in enumerate(o['trace']):
            self.assertLessEqual(r['currentA'],10*(i+1)+1e-8);self.assertAlmostEqual(r['cellVoltageV'],1.5+.1*math.asinh(r['currentA']/2)+.01*r['currentA']);self.assertLessEqual(r['stackJ']+r['auxiliaryJ'],8000+1e-6)

    def test_pem_startup_and_emergency(self):
        p=extend(fixture('pem'),4);p.update(startupS=15,startupW=100);p['records'][3]['availableW']=0;o=pem_dispatch(p)['output']['trace']
        self.assertEqual([x['startupJ'] for x in o],[1000,500,0,0]);self.assertEqual(o[0]['hydrogenKg'],0);self.assertEqual(o[1]['hydrogenKg'],0);self.assertGreater(o[2]['hydrogenKg'],0);self.assertTrue(o[3]['emergencyRampDown'])

    def test_pem_min_current_cannot_jump_ramp(self):
        p=fixture('pem');p.update(minimumCurrentA=20,rampAPerS=1);self.assertEqual(pem_dispatch(p)['output']['trace'][0]['currentA'],0)

    def test_pcm_analytic_latent_and_sensible(self):
        p=extend(fixture('pcm'),3);o=pvt_pcm(p)['output'];rows=o['fine']['trace']
        self.assertAlmostEqual(rows[0]['meltFraction'],.5);self.assertAlmostEqual(rows[0]['temperatureC'],30);self.assertAlmostEqual(rows[1]['meltFraction'],1);self.assertAlmostEqual(rows[2]['temperatureC'],32.5)
        for r in rows:self.assertAlmostEqual(r['residualJm2'],0,places=5)

    def test_pcm_analytic_sensible_transient(self):
        p=fixture('pcm');p.update(initialC=40,ambientLossWm2K=10);p['records'][0].update(solarWm2=0,airC=40,inletC=40)
        o=pvt_pcm(p)['output'];self.assertAlmostEqual(o['fine']['trace'][0]['temperatureC'],40)
        p['records'][0]['airC']=30
        expected=30+10*(2000/(2000+10*5))**20
        self.assertAlmostEqual(pvt_pcm(p)['output']['fine']['trace'][0]['temperatureC'],expected,places=9)

    def test_pcm_energy_with_fluid_and_pv(self):
        p=fixture('pcm');p.update(efficiencyRef=.2,gammaPerK=-.004,ambientLossWm2K=5,fluidUaWm2K=10);p['records'][0].update(solarWm2=500,airC=20,inletC=20,flowHeatCapacityWm2K=20)
        o=pvt_pcm(p)['output']
        for run in ('coarse','fine'):
            for r in o[run]['trace']:self.assertAlmostEqual(r['residualJm2'],0,delta=1e-4);self.assertGreater(r['electricalJm2'],0);self.assertGreater(r['fluidJm2'],0)

    def test_pcm_nonmonotone_step_rejected(self):
        p=fixture('pcm');p.update(massKgM2=.01,heatCapacityJkgK=100,efficiencyRef=.5,gammaPerK=-.01,stepS=100)
        p['records'][0]['solarWm2']=1500
        with self.assertRaisesRegex(ValueError,'nonmonotone'):pvt_pcm(p)

    def test_strict_validation_and_immutability_all(self):
        for name,fn in [('grid',grid_support),('agri',agri_water),('fpv',fpv_balance),('pem',pem_dispatch),('pcm',pvt_pcm)]:
            p=fixture(name);before=copy.deepcopy(p);r=fn(p);self.assertEqual(p,before);self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['validationStatus'],'not_field_validated')
            p['unknown']=1
            with self.assertRaises(ValueError):fn(p)
            p=extend(fixture(name),2);p['records'][1]['timestamp']=p['records'][0]['timestamp']
            with self.assertRaises(ValueError):fn(p)

    def test_offline_fresh_process(self):
        import subprocess,sys
        code="import socket; socket.socket=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('network blocked')); from scripts.test_science_c import fixture; from services.pvlib_research.science_c import *; [fn(fixture(n)) for n,fn in [('grid',grid_support),('agri',agri_water),('fpv',fpv_balance),('pem',pem_dispatch),('pcm',pvt_pcm)]]"
        subprocess.run([sys.executable,'-c',code],check=True,timeout=60)


if __name__=='__main__':unittest.main()
