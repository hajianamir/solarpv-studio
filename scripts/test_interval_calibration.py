import ast
import copy
from datetime import datetime,timedelta,timezone
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest
import numpy as np
from services.pvlib_research.interval_calibration import interval_calibration

ROOT=Path(__file__).resolve().parents[1]
def fixture():return json.loads((ROOT/'docs/examples/references/calibration.json').read_text())['plan']
def population(scores,alpha):
    p=fixture();start=datetime(2026,1,1,tzinfo=timezone.utc);p['calibration']=[dict(siteId='calibration-site',timestamp=(start+timedelta(days=i)).isoformat(),predictionKwh=0,observedKwh=s) for i,s in enumerate(scores)];p['evaluation']=[dict(siteId='evaluation-site',timestamp=(start+timedelta(days=len(scores)+1)).isoformat(),predictionKwh=0,observedKwh=0)];p['alpha']=alpha;return p

class IntervalCalibration(unittest.TestCase):
    def test_golden_rank_and_holdout_metrics(self):
        o=interval_calibration(fixture())['output'];self.assertEqual(o['rank'],9);self.assertEqual(o['radiusKwh'],9);self.assertEqual(o['metrics']['empiricalCoverage'],.5);self.assertEqual(o['metrics']['maeKwh'],10);self.assertAlmostEqual(o['metrics']['rmseKwh'],math.sqrt(125));self.assertEqual(o['metrics']['biasKwh'],-10);self.assertEqual(o['metrics']['meanWidthKwh'],18);self.assertEqual(len(o['bySite']),2)

    def test_frozen_author_rank_convention(self):
        notebook=json.loads((ROOT/'docs/reference-data/conformal/correctness-checks.ipynb').read_text());source=''.join(notebook['cells'][7]['source']);tree=ast.parse(source);assignments=[node for node in tree.body if isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(node.targets[0],ast.Name) and node.targets[0].id in ['l','a','b']];self.assertEqual(len(assignments),3)
        # Execute only the original author's three rank/Beta-parameter assignments; no notebook plots/MC/data imports.
        for n in [100,1000,10000]:
            env={'np':np,'n':n,'alpha':.1};exec(compile(ast.Module(body=assignments,type_ignores=[]),'frozen-author-rank','exec'),env);self.assertEqual(int(env['a']),math.ceil((n+1)*.9))

    def test_exchangeable_finite_population_rank_enumeration(self):
        # Enumerate every possible held-out rank; not a field coverage claim.
        for values,alpha in [([1,2,3,4],.25),(list(range(1,11)),.1),([1,1,1,1],.25)]:
            hits=0
            for i,value in enumerate(values):
                p=population(values[:i]+values[i+1:],alpha);p['evaluation'][0]['observedKwh']=value;hits+=interval_calibration(p)['output']['evaluation'][0]['covered']
            self.assertGreaterEqual(hits/len(values),1-alpha)

    def test_insufficient_size_full_space_not_clipped(self):
        o=interval_calibration(population([1,2,3,4],.1))['output'];self.assertEqual(o['rank'],5);self.assertIsNone(o['radiusKwh']);self.assertIsNone(o['evaluation'][0]['lowerKwh']);self.assertIsNone(o['evaluation'][0]['upperKwh']);self.assertEqual(o['metrics']['empiricalCoverage'],1);self.assertIsNone(o['metrics']['meanWidthKwh']);self.assertEqual(o['bandStatus'],'unbounded_insufficient_calibration')

    def test_decimal_rank_boundary_no_interpolation(self):
        o=interval_calibration(population(list(range(99)),.07))['output'];self.assertEqual(o['rank'],93);self.assertEqual(o['radiusKwh'],92)
        o=interval_calibration(population(list(range(9)),.1))['output'];self.assertEqual(o['rank'],9);self.assertEqual(o['radiusKwh'],8)

    def test_evaluation_outcomes_do_not_calibrate_radius(self):
        p=fixture();a=interval_calibration(p)['output'];p['evaluation'][0]['observedKwh']=1e12;b=interval_calibration(p)['output'];self.assertEqual(a['radiusKwh'],b['radiusKwh']);self.assertEqual(a['sortedScoresKwh'],b['sortedScoresKwh']);self.assertNotEqual(a['metrics'],b['metrics'])

    def test_negative_lower_and_ties_preserved(self):
        p=fixture();p['evaluation'][0]['predictionKwh']=1;o=interval_calibration(p)['output'];self.assertEqual(o['evaluation'][0]['lowerKwh'],-8)
        o=interval_calibration(population([2]*9,.1))['output'];self.assertEqual(o['radiusKwh'],2)

    def test_no_site_or_temporal_leakage(self):
        for mutate in [lambda p:p['evaluation'][0].update(siteId='calibration-site'),lambda p:p['trainingSites'].append('evaluation-site'),lambda p:p.update(modelTrainingEndTimestamp=p['calibration'][0]['timestamp']),lambda p:p['evaluation'][0].update(timestamp=p['calibration'][0]['timestamp']),lambda p:p['calibration'].append(copy.deepcopy(p['calibration'][0])),lambda p:p['calibration'][1].update(timestamp='2026-01-01T12:00:00Z'),lambda p:p['evaluation'][0].update(timestamp='2026-01-09T12:00:00Z')]:
            p=fixture();mutate(p)
            with self.assertRaises(ValueError):interval_calibration(p)

    def test_invalid_contract_numeric_and_units(self):
        for mutate in [lambda p:p.update(alpha=.0001),lambda p:p.update(durationHours=True),lambda p:p.update(modelSha256='bad'),lambda p:p.update(calibration=[]),lambda p:p.update(extra=1),lambda p:p['evaluation'][0].update(observedKwh=float('nan')),lambda p:p['evaluation'][0].update(unit='MWh'),lambda p:p['evaluation'][0].update(timestamp='2026-01-11T00:00:00')]:
            p=fixture();mutate(p)
            with self.assertRaises(ValueError):interval_calibration(p)

    def test_unverified_guarantee_and_immutable_provenance(self):
        p=fixture();before=copy.deepcopy(p);r=interval_calibration(p);self.assertEqual(p,before);self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['status'],'insufficient_evidence');self.assertEqual(r['output']['guaranteeStatus'],'blocked_exchangeability_and_model_freeze_not_verified')
        for path,h in r['output']['referenceHashes'].items():self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),h)

    def test_offline_fresh_process(self):
        code="import socket;deny=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('network forbidden'));socket.socket.connect=deny;socket.getaddrinfo=deny;from scripts.test_interval_calibration import fixture;from services.pvlib_research.interval_calibration import interval_calibration;interval_calibration(fixture())"
        subprocess.run([sys.executable,'-c',code],cwd=ROOT,check=True,timeout=30)

if __name__=='__main__':unittest.main()
