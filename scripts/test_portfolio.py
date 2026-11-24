"""Independent analytical witnesses, not field validation."""
import unittest
import json
import copy
from pathlib import Path
import numpy as np
from services.pvlib_research.portfolio import project_uq, hybrid_sizing, batch_twin
ROOT=Path(__file__).resolve().parents[1]
def plan(name):return json.loads((ROOT/f'docs/examples/portfolio/{name}.synthetic.json').read_text())['plan']

class PortfolioTests(unittest.TestCase):
    def test_uq_law_and_tail(self):
        p=plan('uq');before=copy.deepcopy(p);r=project_uq(p);o=r['output'];self.assertEqual(p,before)
        self.assertAlmostEqual(o['nested']['reconciliationKwh2'],0,places=8)
        for seedrun in o['quantileRuns']:
            self.assertEqual([q['label'] for q in seedrun],['P50','P75','P90','P99'])
            for q in seedrun:self.assertLessEqual(q['ciLowerKwh'],o['analyticQuantilesKwh'][q['label']]);self.assertGreaterEqual(q['ciUpperKwh'],o['analyticQuantilesKwh'][q['label']])
        self.assertTrue(all(c['publishableUnderAssumptions'] for c in o['convergence']))
        self.assertEqual(r['status'],'insufficient_evidence');self.assertEqual(r['projectApproval'],'blocked')
        self.assertEqual(project_uq(p),r)
        self.assertEqual(o['literatureComparison']['record']['publishedMeasuredMean2010to2019'],1275)

    def test_uq_gsa_oracles_and_missing_calibration(self):
        p=plan('uq');o=project_uq(p)['output'];ve=.05**2;va=.03**2;v=ve+va+ve*va
        self.assertAlmostEqual(o['correlatedGaussianLinear']['variance'],7)
        self.assertAlmostEqual(o['correlatedGaussianLinear']['shares'][0],2.375/7)
        self.assertAlmostEqual(sum(o['correlatedGaussianLinear']['shares']),1)
        self.assertAlmostEqual(sum(o['gsa']['S1'])+o['gsa']['interaction'],1)
        self.assertAlmostEqual(o['gsa']['ST'][0],ve*(1+va)/v)
        for actual,expected in zip(o['ishigami']['S1'],[.313905,.442411,0]):self.assertAlmostEqual(actual,expected,delta=.05)
        for actual,expected in zip(o['ishigami']['ST'],[.557589,.442411,.243684]):self.assertAlmostEqual(actual,expected,delta=.05)
        p.update(outer=100,inner=100,relativeCiTolerance=.001)
        self.assertFalse(all(x['publishableUnderAssumptions'] for x in project_uq(p)['output']['convergence']))
        p.update(epistemicCv=0,aleatoryCv=0)
        self.assertEqual(project_uq(p)['output']['nested']['totalKwh2'],0)
        for ident in ['alice-springs-iea2020','golden-nrel2023']:
            p['referenceId']=ident;self.assertEqual(project_uq(p)['output']['literatureComparison']['record']['id'],ident)

    def test_lp_against_hand_enumerated_candidates(self):
        p=plan('hybrid');r=hybrid_sizing(p);rows={r['id']:r for r in r['output']['candidates']}
        self.assertAlmostEqual(rows['grid']['objective'],20)
        self.assertAlmostEqual(rows['pv']['objective'],9)
        # Day surplus 1kWh -> stored .9 -> delivered .81. Import .19, wear on 1+.81.
        self.assertAlmostEqual(rows['pv-bess']['objective'],.19*10+.01*(1+.81))
        self.assertEqual(r['output']['bestCandidateId'],'pv-bess')
        self.assertIsNone(r['output']['continuousSizingGap'])
        # Independent reduced 1D grid search for storage case, including wear, not using LP code.
        charges=np.linspace(0,1,10001);cost=10*(1-.81*charges)-(1-charges)+.01*(1+.81)*charges
        self.assertAlmostEqual(rows['pv-bess']['objective'],float(cost.min()))

    def test_hvac_and_cost_ledger(self):
        p=plan('hybrid');p.update(standbyW=100,pumpW=50,hvacWPerKwhC=2)
        row=hybrid_sizing(p)['output']['candidates'][2]
        self.assertAlmostEqual(row['auxiliaryKwh'],.32)
        self.assertAlmostEqual(row['objective'],10*.4796+.01*(.84+.6804))
        self.assertAlmostEqual(row['objective'],sum(10*t['importKwh']-t['exportKwh']+.01*(t['chargeKwh']+t['dischargeKwh']) for t in row['trace']))
        for t in row['trace']:
            self.assertAlmostEqual(t['generationKwh']+t['dischargeKwh']+t['importKwh'],t['loadKwh']+t['auxiliaryKwh']+t['chargeKwh']+t['exportKwh']+t['curtailedKwh'])

    def test_infeasibility_and_standalone(self):
        p=plan('hybrid');p['minimumDeliveredKwh']=100
        self.assertEqual(hybrid_sizing(p)['status'],'infeasible')
        p=plan('hybrid');p['candidates']=p['candidates'][:1];p['minimumDeliveredKwh']=.1
        # A grid-only design cannot buy and immediately re-sell to fake net delivery.
        self.assertEqual(hybrid_sizing(p)['status'],'infeasible')
        p=plan('hybrid');p['allowGridCharging']=True
        for r in p['records']:r.update(pvKwhPerKwp=0,externalGenerationKwh=1,externalOrigin='wind')
        result=hybrid_sizing(p);self.assertEqual(result['status'],'completed')
        self.assertEqual(result['output']['bestCandidateId'],'grid')
        p['records'][1]['timestamp']=p['records'][0]['timestamp']
        with self.assertRaises(ValueError):hybrid_sizing(p)

    def test_twin_holdout_exclusions_health(self):
        p=plan('twin');r=batch_twin(p);a=r['output']['assets'][0]
        self.assertAlmostEqual(a['healthIndex'],.8);self.assertEqual(a['cluster'],'underperforming');self.assertEqual(a['anomalyCount'],2)
        self.assertIsNone(a['falseAlarmsPerLabelledHealthyAssetDay']);self.assertEqual(r['status'],'insufficient_evidence')
        p['records'][-1]['event']='curtailment'
        self.assertEqual(batch_twin(p)['output']['assets'][0]['status'],'insufficient_pairs')
        p=plan('twin');p['baselineContextSha256']='c'*64
        self.assertEqual(batch_twin(p)['output']['reason'],'context_mismatch')

    def test_twin_false_alarms_and_drift_no_refit(self):
        p=plan('twin')
        for r in p['records'][2:]:r['knownHealthy']=True
        a=batch_twin(p)['output']['assets'][0];self.assertEqual(a['falseAlarmsPerLabelledHealthyAssetDay'],24)
        for r in p['records'][:2]:r['measuredW']=1
        b=batch_twin(p)['output']['assets'][0];self.assertEqual(a['healthIndex'],b['healthIndex'])
        self.assertEqual(a['thresholdFraction'],b['thresholdFraction'])
        p['records'][-1]['measuredW']=60
        self.assertAlmostEqual(batch_twin(p)['output']['assets'][0]['driftFraction'],-.2)

    def test_correlated_psd_guard(self):
        p=plan('uq');p['correlatedGaussianLinear']['correlation']=[[1,2],[2,1]]
        with self.assertRaises(ValueError):project_uq(p)

    def test_twin_unsupervised_groups(self):
        p=plan('twin');original=copy.deepcopy(p['records']);p['records']=[]
        for j,power in enumerate([100,99,70,69]):
            for row in original:
                row=copy.deepcopy(row);row['assetId']=f'asset{j}'
                if row['timestamp']>p['trainEndUtc']:row['measuredW']=power
                p['records'].append(row)
        g=batch_twin(p)['output']['unsupervisedGrouping']
        self.assertEqual(g['status'],'research_only');self.assertEqual(len(g['assignments']),4)
        self.assertEqual(g['assignments'][0]['group'],g['assignments'][1]['group'])
        self.assertNotEqual(g['assignments'][0]['group'],g['assignments'][2]['group'])
        self.assertLess(g['inertia'],.001)

if __name__=='__main__':unittest.main()
