"""Analytic witnesses and original-data selection; no tuned physical accuracy gate."""
import copy
import json
import math
from pathlib import Path
import unittest
import numpy as np
from services.pvlib_research.chen_measured_benchmark import measurements,segments,metrics,score,refinement,CASES
ROOT=Path(__file__).resolve().parents[1]

class FakeSolution:
    t=np.array([0.,2.])
    def __getitem__(self,name):
        def evaluate(times):
            if any(t<self.t[0] or t>self.t[-1] for t in times):raise AssertionError('Extrapolation forbidden')
            return times+3 if name=='Voltage [V]' else times+273.15
        return evaluate

class MeasuredTests(unittest.TestCase):
    def test_metric_independent_oracle_and_bias_sign(self):
        p=[1.,6.,3.];o=[2.,4.,0.];r=metrics(p,o);errors=[a-b for a,b in zip(p,o)]
        self.assertEqual(r['count'],3);self.assertAlmostEqual(r['mae'],math.fsum(abs(e) for e in errors)/3);self.assertAlmostEqual(r['bias'],4/3);self.assertAlmostEqual(r['rmse'],math.sqrt(14/3));self.assertEqual(r['maxAbs'],3)
        self.assertIsNone(metrics([],[]))
        for p,o in [([math.nan],[0]),([0],[math.inf]),([1,2],[1]),([[1]],[[1]])]:
            with self.assertRaises(ValueError):metrics(p,o)

    def test_cutoff_never_extrapolates_or_deletes_duplicate_measurements(self):
        rows=[{'Step Time [s]':t,'Voltage [V]':3.,'Temperature Cell [degC]':0.} for t in [1.,2.,2.,3.]]
        r=score(FakeSolution(),rows,0)
        self.assertEqual(r['totalSamples'],4);self.assertEqual(r['scoredSamples'],3);self.assertEqual(r['sampleCoverage'],.75);self.assertAlmostEqual(r['timeCoverage'],2/3)
        self.assertEqual([v['stepTimeS'] for v in r['trace']],[1.,2.,2.]);self.assertAlmostEqual(r['voltageV']['rmse'],math.sqrt(3))
        empty=score(FakeSolution(),rows,10);self.assertIsNone(empty['voltageV']);self.assertEqual(empty['scoredSamples'],0)

    def test_all_fixed_cases_original_clock_and_sign(self):
        for cell in ('02','03','04'):
            rows,_=measurements(cell)
            for d,s,current in CASES:
                discharge,rest=segments(rows,d,s)
                self.assertNotEqual(d,2);self.assertGreater(len(discharge),100);self.assertTrue(all(r['Current [A]']>0 and r['Md']=='D' for r in discharge));self.assertTrue(all(r['Current [A]']==0 for r in rest));self.assertLess(max(abs(r['Current [A]']-current) for r in discharge),.02)
                self.assertGreater(discharge[0]['Step Time [s]'],0);self.assertAlmostEqual(rest[-1]['Step Time [s]'],7200)
                if s==8:self.assertTrue(any(r['Md']=='SBr' for r in rest))
            bad=copy.deepcopy(rows);next(r for r in bad if r['Step']=='7')['Md']='C'
            with self.assertRaises(ValueError):segments(bad,7,8)
        with self.assertRaises(ValueError):measurements('../../other')

    def test_common_support_only_refinement(self):
        a={'discharge':{'trace':[dict(stepTimeS=1,predictedV=2,predictedK=300),dict(stepTimeS=2,predictedV=4,predictedK=301)]},'rest':None}
        b={'discharge':{'trace':[dict(stepTimeS=1,predictedV=3,predictedK=302),dict(stepTimeS=3,predictedV=100,predictedK=400)]},'rest':None}
        r=refinement(a,b);self.assertIsNone(r['rest']);self.assertEqual(r['discharge'],dict(commonSamples=1,maxVoltageDeltaV=1,maxTemperatureDeltaK=2))

    def test_recorded_experiment_invariants(self):
        path=ROOT/'docs/audit/CHEN-MEASURED-BENCHMARK.json'
        if not path.exists():self.skipTest('Run explicit measured experiment first')
        report=json.loads(path.read_text());self.assertEqual(report['physicalQualification'],'not_established');self.assertFalse(report['financeMutation']);self.assertEqual(len(report['cases']),12)
        self.assertEqual({(r['cell'],r['nominalCurrentA']) for r in report['cases']},{(c,i) for c in ['02','03','04'] for i in [.5,2.5,5.,7.5]})
        for c in report['cases']:
            self.assertEqual(c['initialSoc'],1);self.assertEqual(len(c['runs']),2)
            for run in c['runs']:
                self.assertEqual(run['solverStatus'],'completed')
                for phase in ['discharge','rest']:
                    result=run.get(phase)
                    if result is not None:
                        self.assertGreater(result['scoredSamples'],0);self.assertLessEqual(result['scoredSamples'],result['totalSamples']);self.assertLessEqual(result['sampleCoverage'],1)
                        for unit in ['voltageV','temperatureK']:
                            m=result[unit];self.assertGreaterEqual(m['rmse']+1e-12,m['mae']);self.assertGreaterEqual(m['maxAbs']+1e-12,m['rmse']);self.assertGreaterEqual(m['mae']+1e-12,abs(m['bias']))
                if run.get('termination')!='final time':self.assertIsNone(run['rest']);self.assertEqual(run['restStatus'],'blocked_model_cutoff_before_measured_switch')
                else:self.assertLessEqual(run['capacityBoundaryJumpAh'],1e-8);self.assertLessEqual(run['temperatureBoundaryJumpK'],1e-6)

if __name__=='__main__':unittest.main()
