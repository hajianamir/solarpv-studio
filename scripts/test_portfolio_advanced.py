"""Predeclared numerical witnesses, never field evidence."""
import copy
import json
import unittest
from pathlib import Path
from services.pvlib_research.portfolio_advanced import uq_convergence, hybrid_design, twin_site_holdout


def plan(name):
    return json.loads((Path(__file__).resolve().parents[1]/f'docs/examples/portfolio/{name}.synthetic.json').read_text())['plan']


class AdvancedTests(unittest.TestCase):
    def test_convergence_family_and_reproducibility(self):
        p=plan('convergence');before=copy.deepcopy(p);r=uq_convergence(p);o=r['output']
        self.assertEqual(r,uq_convergence(p));self.assertEqual(p,before)
        self.assertEqual(o['familyComparisons'],16);self.assertEqual(len(o['runs']),4)
        self.assertEqual([x['samples'] for x in o['runs']],[10000,10000,90000,90000])
        for run in o['runs']:
            for q in run['quantiles']:
                self.assertLessEqual(q['ciLowerKwh'],q['estimateKwh']);self.assertGreaterEqual(q['ciUpperKwh'],q['estimateKwh'])
        p['base']['aleatoryCv']=p['base']['epistemicCv']=0
        for run in uq_convergence(p)['output']['runs']:
            for q in run['quantiles']:self.assertEqual(q['relativeWidth'],0)
        p['budgets'].reverse()
        with self.assertRaises(ValueError):uq_convergence(p)

    def test_capacity_integer_and_continuous_oracles(self):
        p=plan('design');before=copy.deepcopy(p);o=hybrid_design(p)['output'];self.assertEqual(p,before)
        self.assertTrue(o['qualified']);self.assertAlmostEqual(o['objective'],5.5,places=7)
        self.assertAlmostEqual(o['dualBound'],5.5,places=7);self.assertEqual(o['relativeGap'],0)
        # Exhaustive integer PV capacity with independent required-inverter cost.
        oracle=min(2*x+1.5 for x in range(11) if x>=1.5)
        self.assertAlmostEqual(o['objective'],oracle,places=7)
        p['capacities']['pvKwp']['integer']=False
        self.assertAlmostEqual(hybrid_design(p)['output']['objective'],4.5,places=7)
        p['capacities']['pvKwp']['maximum']=1
        self.assertEqual(hybrid_design(p)['status'],'infeasible')

    def test_solver_limit_never_claims_optimum(self):
        from unittest.mock import patch
        from types import SimpleNamespace
        with patch('services.pvlib_research.portfolio_advanced.milp',return_value=SimpleNamespace(status=1,x=None)):
            r=hybrid_design(plan('design'));self.assertEqual(r['status'],'incomplete');self.assertFalse(r['output']['qualified']);self.assertIsNone(r['output']['dualBound'])

    def test_storage_energy_and_direction(self):
        p=plan('design');p['capacities']['pvKwp']['integer']=False
        p['capacities']['batteryKwh']['maximum']=10;p['capacities']['batteryKw']['maximum']=10
        p['initialSoc']=0;p['minimumDeliveredKwh']=0
        r=p['records'][0];r.update(loadKwh=0,pvKwhPerKwp=1)
        second=dict(r,timestamp='2024-01-01T02:00:00Z',pvKwhPerKwp=0,loadKwh=1)
        p['records'].append(second)
        o=hybrid_design(p)['output'];self.assertTrue(o['qualified'])
        # One kWh out needs 1/.9 stored and 1/.81 PV input; power sized to charge.
        expected=3/.81+2/.81+.01*(1+1/.81)
        self.assertAlmostEqual(o['objective'],expected,places=6)
        for t in o['trace']:
            self.assertLess(t['chargeKwh']*t['dischargeKwh'],1e-8)
            self.assertLess(t['importKwh']*t['exportKwh'],1e-8)
        self.assertAlmostEqual(o['trace'][-1]['storedKwh'],0,places=8)

    def test_holdout_no_evaluation_fit(self):
        p=plan('holdout');o=twin_site_holdout(p)['output']
        self.assertEqual(o['threshold'],.05);self.assertEqual(o['falseAlarms'],2)
        self.assertEqual(o['falseAlarmsPerAssetDay'],12);self.assertFalse(o['screeningPassed'])
        for row in p['records']:
            if row['siteId']=='future':row['measuredW']=10000
        changed=twin_site_holdout(p)['output'];self.assertEqual(changed['threshold'],o['threshold'])
        self.assertEqual(changed['trainingPairs'],4)
        p['evaluationSites']=['train']
        with self.assertRaises(ValueError):twin_site_holdout(p)

    def test_holdout_missing_exposure_and_training(self):
        p=plan('holdout')
        for row in p['records']:
            if row['siteId']=='future':row['knownHealthy']=None
        o=twin_site_holdout(p)['output'];self.assertIsNone(o['falseAlarmsPerAssetDay']);self.assertFalse(o['screeningPassed'])
        for row in p['records']:
            if row['siteId']=='train':row['event']='outage'
        o=twin_site_holdout(p)['output'];self.assertIsNone(o['threshold']);self.assertEqual(o['trainingPairs'],0)

    def test_direct_python_rejects_invalid_design_before_solver(self):
        from unittest.mock import patch
        mutations=[lambda p:p.update(schemaVersion='unknown'),lambda p:p.update(extra=1),lambda p:p.update(chargeEfficiency=0),lambda p:p.update(minimumSoc=.9),lambda p:p['capacities']['pvKwp'].update(integer=1),lambda p:p['capacities']['pvKwp'].update(unitSize=0),lambda p:p['records'][0].update(timestamp='2024-01-01T01:00:00'),lambda p:p['records'][0].update(loadKwh=-1),lambda p:p['records'][0].update(exportPrice=float('nan'))]
        with patch('services.pvlib_research.portfolio_advanced.milp') as solver:
            for mutate in mutations:
                p=plan('design');mutate(p)
                with self.subTest(plan=p),self.assertRaises(ValueError):hybrid_design(p)
            solver.assert_not_called()

    def test_direct_python_holdout_contract(self):
        mutations=[lambda p:p.update(schemaVersion='unknown'),lambda p:p.update(baselineSha256='b'),lambda p:p.update(trainSites=['train','train']),lambda p:p.update(minimumTrainingPairs=True),lambda p:p.update(intervalMinutes=0),lambda p:p.update(trainEndUtc='2024-01-01T04:00:00'),lambda p:p['records'][0].update(knownHealthy=1),lambda p:p['records'][0].update(quality='made-up'),lambda p:p['records'][0].update(measuredW=-1),lambda p:p['records'][0].update(timestamp='2024-01-01T01:00:00')]
        for mutate in mutations:
            p=plan('holdout');mutate(p)
            with self.subTest(plan=p),self.assertRaises(ValueError):twin_site_holdout(p)

    def test_direct_python_convergence_contract(self):
        for mutate in (lambda p:p.update(schemaVersion='unknown'),lambda p:p.update(extra=1),lambda p:p['budgets'][0].update(extra=1),lambda p:p.update(seeds=[True,42])):
            p=plan('convergence');mutate(p)
            with self.assertRaises(ValueError):uq_convergence(p)

    def test_annual_bound_budget(self):
        # Explicitly test 8760 records, zero capacities, no infeasibility or energy invention.
        from datetime import datetime, timedelta, timezone
        p=plan('design');p['minimumDeliveredKwh']=0
        r=p['records'][0];r.update(loadKwh=0,pvKwhPerKwp=0)
        p['records']=[dict(r,timestamp=(datetime(2024,1,1,tzinfo=timezone.utc)+timedelta(hours=i)).isoformat()) for i in range(8760)]
        p['timeLimitS']=10
        o=hybrid_design(p)['output'];self.assertTrue(o['qualified']);self.assertEqual(o['objective'],0);self.assertEqual(len(o['trace']),8760)


if __name__=='__main__':unittest.main()
