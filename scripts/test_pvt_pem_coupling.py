import copy
import json
from pathlib import Path
import subprocess
import sys
import unittest
from services.pvlib_research.pvt_pem_coupling import pvt_pem_coupled
from services.pvlib_research.science_c import pvt_pcm,pem_dispatch,F,H2_MOLAR_KG

ROOT=Path(__file__).resolve().parents[1]
def fixture():return json.loads((ROOT/'docs/examples/science-c/coupled.request.json').read_text())['plan']
def series(p,solar):
    p['collector']['records']=[dict(timestamp=f'2026-01-01T00:{i*2:02d}:00Z',solarWm2=g,airC=30,inletC=30,flowHeatCapacityWm2K=0) for i,g in enumerate(solar)];p['collector']['intervalS']=p['electrolyzer']['intervalS']=120

class Coupling(unittest.TestCase):
    def test_closed_form_energy_faraday(self):
        p=fixture();o=pvt_pem_coupled(p)['output'];t=o['totals'];self.assertAlmostEqual(t['collectorElectricJ'],1000);self.assertAlmostEqual(t['transferredJ'],950);self.assertAlmostEqual(t['transferLossJ'],50);self.assertAlmostEqual(t['collectorStorageJ'],4000);expected=950/1.5/(2*F)*H2_MOLAR_KG;self.assertAlmostEqual(o['finePemResult']['output']['hydrogenKg'],expected,15);self.assertAlmostEqual(t['combinedResidualJ'],0,9)

    def test_existing_kernels_unchanged_composition(self):
        p=fixture();o=pvt_pem_coupled(p)['output'];self.assertEqual(o['collectorResult'],pvt_pcm(p['collector']));self.assertEqual(o['finePemResult'],pem_dispatch(o['finePemResult']['plan']));self.assertFalse(o['thermalFeedback']);self.assertEqual(o['powerAvailabilityBasis'],'interval_average_from_collector_energy')

    def test_zero_transfer_and_dark(self):
        p=fixture();p['transferEfficiency']=0;o=pvt_pem_coupled(p)['output'];self.assertEqual(o['finePemResult']['output']['hydrogenKg'],0);self.assertEqual(o['totals']['transferLossJ'],1000)
        p=fixture();p['collector']['records'][0]['solarWm2']=0;o=pvt_pem_coupled(p)['output'];self.assertEqual(o['totals']['transferredJ'],0);self.assertEqual(o['finePemResult']['output']['hydrogenKg'],0)

    def test_area_scaling_and_curtailment(self):
        p=fixture();a=pvt_pem_coupled(p)['output'];p['areaM2']=2;b=pvt_pem_coupled(p)['output'];self.assertAlmostEqual(b['finePemResult']['output']['hydrogenKg'],2*a['finePemResult']['output']['hydrogenKg'],15)
        p['electrolyzer']['maximumCurrentA']=1;o=pvt_pem_coupled(p)['output'];self.assertGreater(o['totals']['pemCurtailedJ'],0);self.assertAlmostEqual(o['totals']['combinedResidualJ'],0,9)

    def test_startup_scheduling_and_power_loss(self):
        p=fixture();series(p,[50,50,50,0]);p['electrolyzer'].update(startupS=150,startupW=1,minimumCurrentA=1);o=pvt_pem_coupled(p)['output'];rows=o['finePemResult']['output']['trace'];self.assertEqual([r['state'] for r in rows[:3]],['starting','starting','running']);self.assertEqual(rows[0]['hydrogenKg'],0);self.assertEqual(rows[1]['startupJ'],30);self.assertTrue(rows[3]['emergencyRampDown']);self.assertEqual(rows[3]['hydrogenKg'],0);self.assertAlmostEqual(o['totals']['combinedResidualJ'],0,8)

    def test_signed_external_heat_requirement_not_free_credit(self):
        p=fixture();p['electrolyzer']['reversibleV']=1.2;o=pvt_pem_coupled(p)['output'];self.assertLess(o['totals']['pemHeatJ'],0);self.assertGreater(o['totals']['chemicalHhvJ'],o['totals']['transferredJ']);self.assertAlmostEqual(o['totals']['combinedResidualJ'],0,8)

    def test_refinement_gate_sensitive_to_hydrogen(self):
        p=fixture();p['collector'].update(gammaPerK=-.004,initialC=25,meltC=30,massKgM2=10,stepS=100,temperatureToleranceC=2,ambientLossWm2K=20);p['collector']['records'][0]['solarWm2']=1000;p['hydrogenToleranceKg']=1e-12;p['electrolyzer']['maximumCurrentA']=1000;o=pvt_pem_coupled(p)['output'];self.assertGreater(o['hydrogenDeltaKg'],1e-12);self.assertEqual(o['numericalGate'],'failed_refinement')
        p['collector']['temperatureToleranceC']=1e-6
        with self.assertRaisesRegex(ValueError,'Collector refinement'):pvt_pem_coupled(p)

    def test_context_interval_and_manual_forcing_rejected(self):
        for mutate in [lambda p:p['electrolyzer'].update(contextSha256='a'*64),lambda p:p['collector'].update(contextSha256='a'*64),lambda p:p['electrolyzer'].update(intervalS=101),lambda p:p['electrolyzer'].update(records=[]),lambda p:p.update(transferEfficiency=1.1),lambda p:p.update(areaM2=True),lambda p:p.update(extra=1)]:
            p=fixture();mutate(p)
            with self.assertRaises(ValueError):pvt_pem_coupled(p)

    def test_input_immutable_research_boundary(self):
        p=fixture();before=copy.deepcopy(p);r=pvt_pem_coupled(p);self.assertEqual(p,before);self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['validationStatus'],'not_field_validated');self.assertEqual(r['status'],'insufficient_evidence')

    def test_offline_fresh_process(self):
        code="import socket;deny=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('network forbidden'));socket.socket.connect=deny;socket.getaddrinfo=deny;from scripts.test_pvt_pem_coupling import fixture;from services.pvlib_research.pvt_pem_coupling import pvt_pem_coupled;pvt_pem_coupled(fixture())"
        subprocess.run([sys.executable,'-c',code],cwd=ROOT,check=True,timeout=30)

if __name__=='__main__':unittest.main()
