"""Offline numerical witnesses, not experimental cell qualification."""
import ast
import copy
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch
os.environ['PYBAMM_DISABLE_TELEMETRY']='true'
import numpy as np
from services.pvlib_research.battery_protocol import battery_protocol
from services.pvlib_research.battery_pybamm import battery_pybamm

ROOT=Path(__file__).resolve().parents[1]

class ProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan=json.loads((ROOT/'docs/examples/science-b/protocol.synthetic.json').read_text())['plan']
        cls.result=battery_protocol(copy.deepcopy(cls.plan))

    def test_signed_integral_rest_and_continuity(self):
        r=self.result
        self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['safetyApproval'],'not_assessed')
        self.assertEqual(r['output']['numericalGate'],'passed')
        self.assertEqual(len(r['output']['runs']),4)
        for run in r['output']['runs']:
            for index,segment in enumerate(run['segments']):
                for row in segment['trace']:
                    expected=[row['stepTimeS']/3600,30/3600,(30-row['stepTimeS'])/3600][index]
                    self.assertAlmostEqual(row['capacityAh'],expected,places=10)
                    self.assertAlmostEqual(row['currentA'],[1,0,-1][index],places=10)
                    self.assertAlmostEqual(row['totalHeatingWm3'],sum(row[k] for k in ('irreversibleHeatingWm3','reversibleHeatingWm3','ohmicHeatingWm3')),places=7)
                if index:
                    previous=run['segments'][index-1]['trace'][-1];first=segment['trace'][0]
                    self.assertAlmostEqual(previous['capacityAh'],first['capacityAh'],places=10)
                    self.assertAlmostEqual(previous['temperatureK'],first['temperatureK'],places=7)
                    self.assertEqual(previous['timeS'],first['timeS'])

    def test_independent_refinement_axes(self):
        runs=self.result['output']['runs'];a,b,c,d=runs
        self.assertEqual(b['meshPoints'],2*a['meshPoints']);self.assertEqual(a['maxTimeStepS'],b['maxTimeStepS'])
        self.assertEqual(b['meshPoints'],c['meshPoints']);self.assertEqual(c['relativeTolerance'],b['relativeTolerance']/10)
        self.assertEqual(c['relativeTolerance'],d['relativeTolerance']);self.assertEqual(d['maxTimeStepS'],c['maxTimeStepS']/2)
        for name,x,y in [('meshDelta',a,b),('solverDelta',b,c),('timeDelta',c,d)]:
            for key in ('voltageV','temperatureK','capacityAh'):
                actual=max(abs(i[key]-j[key]) for s,t in zip(x['segments'],y['segments']) for i,j in zip(s['trace'],t['trace']))
                self.assertEqual(actual,self.result['output'][name][key])

    def test_constant_current_regression(self):
        p=copy.deepcopy(self.plan);p['steps']=[dict(currentA=1,durationS=60)];p['samplesPerStep']=7
        old=json.loads((ROOT/'docs/examples/science-b/battery.synthetic.json').read_text())['plan']
        a=battery_protocol(p)['output']['runs'][-1]['segments'][0]['trace'];b=battery_pybamm(old)['output']['runs'][-1]['trace']
        for x,y in zip(a,b):
            for k,tol in [('voltageV',1e-5),('temperatureK',1e-5),('capacityAh',1e-8)]:self.assertLess(abs(x[k]-y[k]),tol)

    def test_offline(self):
        with patch('socket.socket',side_effect=AssertionError('Network forbidden')):
            self.assertEqual(battery_protocol(copy.deepcopy(self.plan))['output']['numericalGate'],'passed')

    def test_strict_budgets(self):
        for update in [dict(steps=[]),dict(steps=[dict(currentA=11,durationS=30)]),dict(steps=[dict(currentA=1,durationS=600)]*4),dict(samplesPerStep=22),dict(meshPoints=13),dict(maxTimeStepS=0),dict(sei=True),dict(steps=[dict(currentA=1,durationS=30,extra=1)])]:
            p=copy.deepcopy(self.plan);p.update(update)
            with self.subTest(update=update),self.assertRaises(ValueError):battery_protocol(p)

    def test_supported_models_and_sei(self):
        for model,parameters,sei in [('SPM','Chen2020',False),('DFN','Chen2020',False),('SPMe','OKane2022',True)]:
            p=copy.deepcopy(self.plan);p.update(model=model,parameterSet=parameters,sei=sei)
            with self.subTest(model=model,parameters=parameters):
                self.assertEqual(battery_protocol(p)['output']['numericalGate'],'passed')

    def test_cutoff_rejects_partial_horizon(self):
        p=copy.deepcopy(self.plan);p.update(initialSoc=.1,steps=[dict(currentA=10,durationS=600)])
        with self.assertRaisesRegex(ValueError,'cutoff/early termination'):battery_protocol(p)

    def test_actual_frozen_upstream_input_step(self):
        # Execute only the pinned upstream method, not a rewritten approximation.
        import pybamm
        tree=ast.parse((ROOT/'docs/reference-data/pybamm/simulation-tests.txt').read_text())
        node=next(n for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) and n.name=='test_step_with_inputs')
        node.decorator_list=[];scope={'pybamm':pybamm,'np':np}
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<pinned upstream test_step_with_inputs>','exec'),scope)
        scope[node.name](None)

if __name__=='__main__':unittest.main()
