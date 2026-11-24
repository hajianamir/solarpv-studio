import copy
import csv
import hashlib
import io
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import unittest
from services.pvlib_research.material_inventory import pvice_inventory,MATERIALS
from services.pvlib_research.reference_models import pvice_massflow

ROOT=Path(__file__).resolve().parents[1]
def fixture():return json.loads((ROOT/'docs/examples/references/inventory.json').read_text())['plan']

class MaterialInventory(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.sample=pvice_inventory(fixture())['output']

    def test_seven_material_registered_inputs(self):
        o=self.sample;self.assertEqual([m['material'] for m in o['materials']],list(MATERIALS));projection=json.loads((ROOT/'docs/reference-data/pvice/material-summary.json').read_text())
        for m in o['materials']:
            reader=csv.DictReader(io.StringIO((ROOT/f"docs/reference-data/pvice/us-{m['material']}.csv").read_text(encoding='utf-8-sig')));next(reader);rows=list(reader);self.assertEqual(len(rows),56)
            for row,b,material in zip(m['trace'],projection,rows):
                self.assertEqual(row['year'],int(material['year']));self.assertEqual(b['massGM2'][m['material']],float(material['mat_massperm2']));expected=row['areaM2']*float(material['mat_massperm2'])/1000;self.assertAlmostEqual(row['usedInModulesKg']/expected,1,12)
        for path,h in o['referenceHashes'].items():self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),h)

    def test_glass_regression_against_existing_actual_adapter(self):
        p=fixture();old=dict(schemaVersion='pvice-massflow-v1',source=p['source'],contextSha256=p['contextSha256'],baseline='us_glass_baseline',installationScale=p['installationScale'],collectionPct=None,lifetimeYears=None);previous=pvice_massflow(old)['output'];self.assertEqual(self.sample['materials'][0]['trace'],previous['trace']);self.assertEqual(self.sample['materials'][0]['totals'],previous['totals'])

    def test_absolute_tolerance_matches_and_ledger(self):
        r=self.sample['reconciliation'];self.assertEqual(r['status'],'within_declared_tolerance');self.assertAlmostEqual(r['comparisons'][0]['modelKg'],800);self.assertAlmostEqual(r['comparisons'][1]['residualKg'],.0376);self.assertEqual(r['provenanceStatus'],'caller_declared_not_independently_verified')
        for material in self.sample['materials']:
            for row in material['trace']:
                self.assertAlmostEqual(row['manufacturingResidualKg']/max(1,row['manufacturingInputKg']),0,10);self.assertAlmostEqual(row['landfillResidualKg']/max(1,row['landfillKg']),0,10)
            for key,total in material['totals'].items():self.assertAlmostEqual(total,math.fsum(r[key] for r in material['trace']),delta=1e-10*max(1,total))

    def test_mismatch_is_not_silently_accepted(self):
        p=fixture();p['inventory']['contextSha256']='b'*64;r=pvice_inventory(p)['output']['reconciliation'];self.assertEqual(r['status'],'context_mismatch');self.assertEqual(r['comparisons'],[])

    def test_absent_inventory_not_validated(self):
        p=fixture();p['inventory']=None;r=pvice_inventory(p);self.assertEqual(r['output']['reconciliation']['status'],'not_provided');self.assertEqual(r['projectApproval'],'blocked')

    def test_outside_and_zero_tolerance(self):
        p=fixture();p['inventory']['observations']=p['inventory']['observations'][:1];p['inventory']['observations'][0].update(observedKg=0,absoluteToleranceKg=0);r=pvice_inventory(p)['output']['reconciliation'];self.assertEqual(r['status'],'outside_declared_tolerance');self.assertEqual(r['comparisons'][0]['residualKg'],800)

    def test_scale_and_selected_material_independence(self):
        p=fixture();p.update(materials=['glass'],inventory=None,installationScale=.002);o=pvice_inventory(p)['output'];self.assertEqual(len(o['materials']),1)
        for key,total in o['materials'][0]['totals'].items():self.assertAlmostEqual(total,2*self.sample['materials'][0]['totals'][key],delta=1e-10*max(1,total))
        self.assertEqual(o['selectedMaterialTotals'],o['materials'][0]['totals'])

    def test_selection_and_schema_fail_closed(self):
        for mutate in [lambda p:p.update(materials=['glass','glass']),lambda p:p.update(materials=['steel']),lambda p:p.update(materials=[]),lambda p:p.update(installationScale=True),lambda p:p.update(path='/etc/passwd'),lambda p:p['inventory'].update(unit='tonne'),lambda p:p['inventory'].update(boundary='whole_module'),lambda p:p['inventory'].update(documentSha256='bad')]:
            p=fixture();mutate(p)
            with self.assertRaises(ValueError):pvice_inventory(p)

    def test_observation_identity_budget_and_domains(self):
        for mutate in [lambda p:p['inventory']['observations'].append(copy.deepcopy(p['inventory']['observations'][0])),lambda p:p['inventory']['observations'][0].update(year=2051),lambda p:p['inventory']['observations'][0].update(metric='carbonKg'),lambda p:p['inventory']['observations'][0].update(observedKg=float('nan')),lambda p:p['inventory']['observations'][0].update(absoluteToleranceKg=-1),lambda p:p.update(materials=['silicon'])]:
            p=fixture();mutate(p)
            with self.assertRaises(ValueError):pvice_inventory(p)

    def test_cwd_input_and_research_boundary(self):
        p=fixture();before=copy.deepcopy(p);cwd=os.getcwd();r=pvice_inventory(p);self.assertEqual(os.getcwd(),cwd);self.assertEqual(before,p);self.assertEqual(r['status'],'insufficient_evidence');self.assertEqual(r['validationStatus'],'not_field_validated');self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['safetyApproval'],'not_assessed')

    def test_offline_fresh_process(self):
        code="import socket;deny=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('network forbidden'));socket.socket.connect=deny;socket.getaddrinfo=deny;from scripts.test_material_inventory import fixture;from services.pvlib_research.material_inventory import pvice_inventory;pvice_inventory(fixture())"
        subprocess.run([sys.executable,'-c',code],cwd=ROOT,check=True,timeout=60)

if __name__=='__main__':unittest.main()
