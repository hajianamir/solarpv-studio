"""Analytical and independent SciPy witnesses; no field accuracy claims."""
import copy
import json
import math
import unittest
from pathlib import Path
from statistics import NormalDist
import numpy as np
from scipy.stats import CensoredData, ecdf
from services.pvlib_research.survival import cohort_survival, curve, censoring_curve, value


def plan():return json.loads((Path(__file__).resolve().parents[1]/'docs/examples/portfolio/survival.synthetic.json').read_text())['plan']


class SurvivalTests(unittest.TestCase):
    def test_hand_ties_confidence_and_restricted_life(self):
        p=plan();before=copy.deepcopy(p);r=cohort_survival(p);o=r['output'];self.assertEqual(p,before);self.assertEqual(r,cohort_survival(p))
        self.assertEqual([x['atRisk'] for x in o['curve']],[5,3,2,1])
        np.testing.assert_allclose([x['survival'] for x in o['curve']],[.8,8/15,8/15,8/15],rtol=0,atol=1e-12)
        self.assertIsNone(o['medianLifetimeDays']);self.assertAlmostEqual(o['conditional']['survivalProbability'],2/3,places=12)
        self.assertAlmostEqual(o['conditional']['restrictedMeanRemainingDays'],8/3,places=12)
        # Independent closed-form Greenwood at first failure, including tied censor.
        s=.8;v=1/(5*4);z=NormalDist().inv_cdf(.975);e=math.sqrt(v)/abs(math.log(s))
        self.assertAlmostEqual(o['curve'][0]['ciLower'],math.exp(-math.exp(math.log(-math.log(s))+z*e)),places=12)
        self.assertAlmostEqual(o['curve'][0]['ciUpper'],math.exp(-math.exp(math.log(-math.log(s))-z*e)),places=12)
        self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['status'],'insufficient_evidence')

    def test_scipy_independent_random_censored_oracle(self):
        rng=np.random.default_rng(410)
        for size in (10,100,1000):
            durations=rng.integers(1,100,size);failed=rng.random(size)>.4
            reference=ecdf(CensoredData.right_censored(durations,~failed)).sf
            points=curve(list(zip(map(float,durations),map(bool,failed))))
            np.testing.assert_allclose([x['days'] for x in points],reference.quantiles,rtol=0,atol=0)
            np.testing.assert_allclose([x['survival'] for x in points],reference.probabilities,rtol=0,atol=1e-12)

    def test_reverse_censor_tie_and_ipcw_hand_oracle(self):
        points=censoring_curve([(2,True),(2,False),(4,True),(6,False),(8,False)])
        self.assertEqual(value(points,2,left=True),1);self.assertEqual(value(points,2),.75)
        self.assertEqual(value(points,6),.375)
        o=cohort_survival(plan())['output']['evaluation']
        expected=((8/15)**2/.75+(7/15)**2/.75)/3
        self.assertAlmostEqual(o['ipcwBrier'],expected,places=12);self.assertEqual(o['earlyCensoredAssets'],1)

    def test_no_censoring_is_ordinary_brier(self):
        p=plan()
        for row in p['records']:row['failed']=True
        o=cohort_survival(p)['output'];prediction=2/5
        self.assertAlmostEqual(o['evaluation']['ipcwBrier'],(2*prediction**2+(1-prediction)**2)/3,places=12)
        self.assertEqual(o['medianLifetimeDays'],4)

    def test_evaluation_cannot_fit_prediction(self):
        p=plan();o=cohort_survival(p)['output']
        for row in p['records']:
            if row['siteId']=='future':row['failed']=not row['failed']
        other=cohort_survival(p)['output'];self.assertEqual(o['curve'],other['curve']);self.assertEqual(o['conditional'],other['conditional'])
        self.assertEqual(o['evaluation']['predictedSurvival'],other['evaluation']['predictedSurvival'])

    def test_no_extrapolation_or_insufficient_risk(self):
        p=plan();p['remainingHorizonDays']=20;p['scoreHorizonDays']=20
        o=cohort_survival(p)['output'];self.assertIsNone(o['conditional']['survivalProbability']);self.assertIsNone(o['conditional']['restrictedMeanRemainingDays']);self.assertIsNone(o['evaluation']['ipcwBrier'])
        p=plan();p['minimumAtRisk']=5
        self.assertEqual(cohort_survival(p)['output']['conditional']['status'],'insufficient_support')

    def test_censoring_positivity_guard(self):
        p=plan();p['scoreHorizonDays']=6;p['minimumCensorSurvival']=.5
        o=cohort_survival(p)['output']['evaluation'];self.assertEqual(o['status'],'insufficient_support');self.assertIsNone(o['ipcwBrier'])

    def test_no_evaluable_outcomes_cannot_claim_zero_score(self):
        p=plan()
        for row in p['records']:
            if row['siteId']=='future':row.update(failed=False,observedUntilUtc='2024-01-02T00:00:00Z')
        o=cohort_survival(p)['output']['evaluation'];self.assertEqual(o['scoredAssets'],0);self.assertIsNone(o['ipcwBrier']);self.assertEqual(o['status'],'insufficient_support')

    def test_all_censored_or_all_failures_endpoint(self):
        p=plan()
        for row in p['records']:row['failed']=False
        o=cohort_survival(p)['output'];self.assertIsNone(o['medianLifetimeDays']);self.assertEqual(o['conditional']['survivalProbability'],1)
        for x in o['curve']:self.assertEqual((x['survival'],x['ciLower'],x['ciUpper']),(1,1,1))
        for x in curve([(1,True),(1,True)]):self.assertEqual((x['survival'],x['ciLower'],x['ciUpper']),(0,0,0))

    def test_maximum_cohort_budget(self):
        from datetime import datetime,timedelta,timezone
        p=plan();p['records']=[]
        for site,start in [('train',datetime(1980,1,1,tzinfo=timezone.utc)),('future',datetime(2024,1,1,tzinfo=timezone.utc))]:
            for i in range(5000):p['records'].append(dict(siteId=site,assetId=f'{site}-{i}',installedUtc=start.isoformat(),observedUntilUtc=(start+timedelta(days=i+1)).isoformat(),failed=i%3==0))
        o=cohort_survival(p)['output'];self.assertEqual(len(o['curve']),5000);self.assertEqual(o['trainingAssets'],5000);self.assertEqual(o['evaluationAssets'],5000)
        p['records'].append(copy.deepcopy(p['records'][0]))
        with self.assertRaises(ValueError):cohort_survival(p)

    def test_strict_contract_and_leakage(self):
        mutations=[lambda p:p.update(extra=1),lambda p:p.update(schemaVersion='unknown'),lambda p:p.update(confidenceLevel=float('nan')),lambda p:p.update(minimumAtRisk=True),lambda p:p.update(trainSites=['train','train']),lambda p:p.update(evaluationSites=['train']),lambda p:p['records'].append(copy.deepcopy(p['records'][0])),lambda p:p['records'][0].update(failed=1),lambda p:p['records'][0].update(observedUntilUtc='2024-01-01T00:00:00Z'),lambda p:p['records'][0].update(installedUtc='2020-01-01T00:00:00'),lambda p:p['records'][0].update(observedUntilUtc=p['records'][0]['installedUtc']),lambda p:p['records'][-1].update(siteId='unknown'),lambda p:p['records'][-1].update(assetId=p['records'][0]['assetId'])]
        for mutate in mutations:
            p=plan();mutate(p)
            with self.subTest(plan=p),self.assertRaises(ValueError):cohort_survival(p)


if __name__=='__main__':unittest.main()
