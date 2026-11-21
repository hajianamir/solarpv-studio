"""Stage55 synthetic physics/contract/process witnesses, not field approval."""
import copy
import itertools
import json
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
import numpy as np
from services.pvlib_research.integrated import (validate_plan,run_integrated,shared_ac,execute_child,migrate_legacy,ROOT)
from services.pvlib_research.__main__ import strict_json


def fixture(modes=('fixed','tracker'),thermal='modeled'):
    base=json.loads((ROOT/'services/pvlib_study/tests/synthetic-study.json').read_text())
    diode=json.loads((ROOT/'services/pvlib_study/tests/desoto-reference-parameters.json').read_text())
    inv=json.loads((ROOT/'services/pvlib_study/tests/sandia-reference-parameters.json').read_text())
    inputs=[]
    for i,mode in enumerate(modes):
        r=copy.deepcopy(base);s=r['system'];s.update(electrical=copy.deepcopy(diode),arrayPdc0W=4400,additionalDcLossPct=0)
        s['electrical']['stringsInParallel']=2
        s['surfaceAzimuthDeg']=150+30*i
        # Explicit synthetic zero-irradiance interval exercises shared tare only once.
        for k in ('ghiWm2','dniWm2','dhiWm2'):r['weather']['records'][0][k]=0
        if mode=='tracker':s['tracking']=dict(axisTiltDeg=0,axisAzimuthDeg=180,maxAngleDeg=60,backtrack=True,gcr=.3,crossAxisTiltDeg=0)
        if thermal=='imported':s['cellTemperatureSchedule']=dict(source='Synthetic independent cell fixture, not backsheet',quality='assumed',records=[dict(timestamp=w['timestamp'],cellTemperatureC=35+i*5) for w in r['weather']['records']])
        inputs.append(dict(id=f'input{i}',request=r))
    return dict(schemaVersion='integrated-mppt-plan-v1',source='Synthetic stage55 combination, not equipment/site validation',inverter=inv,inputs=inputs)


def matrix():
    # 2x2x2x2 independent discrete axes: geometry, thermal, nested plant, shared weather.
    for track,imported,plant,mismatch in itertools.product((False,True),repeat=4):
        p=fixture(('fixed','tracker' if track else 'fixed'),'imported' if imported else 'modeled')
        if plant:p['inputs'][1]['request']['system']['auxiliaryPowerW']=1
        if mismatch:p['inputs'][1]['request']['weather']['records'][1]['tempAirC']+=1
        yield p,not(plant or mismatch)


class IntegratedTests(unittest.TestCase):
    def test_discrete_contract_matrix(self):
        for i,(p,expected) in enumerate(matrix()):
            with self.subTest(case=i):
                if expected:self.assertEqual(validate_plan(p),12)
                else:
                    with self.assertRaises(ValueError):validate_plan(p)

    def test_shared_equation_independent_no_double_tare(self):
        inv=fixture()['inverter']
        volts=np.array([[300,500,0,0],[600,650,600,0]],float)
        powers=np.array([[2000,2500,0,0],[1000,1500,1000,0]],float)
        got=shared_ac(volts,powers,inv)
        expected=[]
        for col in range(4):
            total=float(powers[:,col].sum());ac=0.
            if total<inv['Pso']:expected.append(-inv['Pnt']);continue
            for v,p in zip(volts[:,col],powers[:,col]):
                if p==0:continue
                a=inv['Pdco']*(1+inv['C1']*(v-inv['Vdco']))
                b=inv['Pso']*(1+inv['C2']*(v-inv['Vdco']))
                c=inv['C0']*(1+inv['C3']*(v-inv['Vdco']))
                ac+=p/total*((inv['Paco']/(a-b)-c*(a-b))*(total-b)+c*(total-b)**2)
            expected.append(min(inv['Paco'],ac))
        np.testing.assert_allclose(got,expected,rtol=1e-12)
        self.assertEqual(got[-1],-2.4)
        self.assertEqual(shared_ac([[400],[400]],[[5000],[5000]],inv)[0],inv['Paco'])
        self.assertEqual(shared_ac([[0],[400]],[[0],[10]],inv)[0],-inv['Pnt'])
        with self.assertRaises(ValueError):shared_ac([[199],[400]],[[10],[100]],inv)
        with self.assertRaises(ValueError):shared_ac([[400],[400]],[[10000],[10000]],inv)
        # Independent sensitivity to voltage: cannot substitute average voltage.
        changed=shared_ac(volts+np.where(powers>0,40,0),powers,inv)
        self.assertGreater(float(np.max(abs(got-changed))),.01)

    def test_real_mixed_workers_imported_temperature_and_binding(self):
        p=fixture(thermal='imported');before=copy.deepcopy(p);r=run_integrated(p)
        self.assertEqual(p,before);self.assertEqual(r['budget']['childSolves'],2)
        self.assertEqual(r['samples'][0]['importW'],2.4)
        self.assertEqual(r['projectApproval'],'blocked')
        for i,c in enumerate(r['children']):self.assertTrue(all(s['cellTemperatureC']==35+i*5 for s in c['result']['samples']))
        for i,row in enumerate(r['samples']):
            self.assertAlmostEqual(row['dcW'],sum(c['result']['samples'][i]['dcW'] for c in r['children']))
        self.assertAlmostEqual(r['summary']['netWh'],r['summary']['exportWh']-r['summary']['importWh'])

    def test_migration_copy_and_refusal_of_dropped_data(self):
        from services.pvlib_study import worker
        p=fixture(('fixed','fixed'));req=copy.deepcopy(p['inputs'][0]['request']);s=req['system'];s.pop('electrical')
        s['arrayPdc0W']=8800
        s['mpptInputs']=[dict(id=e['id'],source='Synthetic migration',quality='assumed',**{k:e['request']['system'][k] for k in ('surfaceTiltDeg','surfaceAzimuthDeg','arrayPdc0W','electrical')}) for e in p['inputs']]
        worker.validate(req);before=copy.deepcopy(req)
        result=migrate_legacy(req,p['inverter'],'Explicit migration fixture')
        self.assertEqual(req,before)
        self.assertEqual(validate_plan(result),12)
        req['system']['acExportLimitW']=100
        with self.assertRaisesRegex(ValueError,'discarded'):migrate_legacy(req,p['inverter'],'invalid')

    def test_deadline_cancel_failure_output_bounds_and_json_overflow(self):
        with self.assertRaisesRegex(RuntimeError,'cancelled'):run_integrated(fixture(),cancel=lambda:True)
        with self.assertRaises(TimeoutError):run_integrated(fixture(),timeout_s=.001)
        with tempfile.TemporaryDirectory() as tmp:
            script=Path(tmp)/'fake.py'
            script.write_text('import time; time.sleep(10)')
            with self.assertRaises(TimeoutError):execute_child({},time.monotonic()+.1,lambda:False,script)
            script.write_text('raise SystemExit(2)')
            with self.assertRaisesRegex(RuntimeError,'failed'):execute_child({},time.monotonic()+5,lambda:False,script)
            script.write_text('print("x"*2048)')
            with patch('services.pvlib_research.integrated.MAX_OUTPUT',1024):
                with self.assertRaisesRegex(RuntimeError,'output budget'):execute_child({},time.monotonic()+5,lambda:False,script)
            script.write_text('print("{}")')
            with self.assertRaisesRegex(RuntimeError,'receipt'):execute_child({},time.monotonic()+5,lambda:False,script)
            inp=Path(tmp)/'bad.json';inp.write_text('{"x":1e999}')
            with self.assertRaisesRegex(ValueError,'Nonfinite'):strict_json(inp)

    def test_atomic_bounded_utf8_output_preserves_previous_file(self):
        from services.pvlib_research.__main__ import write_result
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'result.json';path.write_bytes(b'previous')
            with self.assertRaisesRegex(ValueError,'budget'):write_result(path,{'x':'a'*100},compact=True,max_bytes=10)
            self.assertEqual(path.read_bytes(),b'previous')
            with patch('services.pvlib_research.__main__.os.replace',side_effect=OSError('injected disk/rename failure')):
                with self.assertRaises(OSError):write_result(path,{'ok':True})
            self.assertEqual(path.read_bytes(),b'previous')
            self.assertEqual(list(Path(tmp).iterdir()),[path])
            write_result(path,{'label':'پژوهش'},compact=True,max_bytes=100)
            self.assertEqual(json.loads(path.read_bytes()),{'label':'پژوهش'})

    def test_resource_and_domain_invalids(self):
        for mutate in [lambda p:p['inputs'][0]['request']['system'].update(additionalDcLossPct=1),
                       lambda p:p['inputs'][1].update(id='input0'),
                       lambda p:p['inverter'].update(modelMaxDcV=300),
                       lambda p:p.update(extra=1)]:
            p=fixture();mutate(p)
            with self.assertRaises(ValueError):validate_plan(p)
        p=fixture();p['inputs']*=3
        with self.assertRaises(ValueError):validate_plan(p)
        # Resource boundary without running thousands of solves or corrupt timestamps.
        from datetime import datetime,timedelta,timezone
        p=fixture(('fixed',)*4)
        for e in p['inputs']:
            template=e['request']['weather']['records'][1]
            e['request']['weather']['records']=[dict(template,timestamp=(datetime(2017,1,1,tzinfo=timezone.utc)+timedelta(hours=i+1)).isoformat()) for i in range(2197)]
        with self.assertRaisesRegex(ValueError,'8784'):validate_plan(p)


    def test_large_input_slow_reader_has_eof(self):
        # Transport-only fixture, not a synthetic substitute for PV physics.
        with tempfile.TemporaryDirectory() as tmp:
            script=Path(tmp)/'slow-reader.py'
            script.write_text("import sys,time,json,hashlib\ntime.sleep(.2)\nraw=sys.stdin.buffer.read()\nr=json.loads(raw)\ncanonical=json.dumps(r,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)\nprint(json.dumps(dict(schemaVersion='pvlib-study-result-v1',status='completed',manifest=dict(inputSha256=hashlib.sha256(canonical.encode()).hexdigest()))))\n",encoding='utf-8')
            result=execute_child({'payload':'x'*(2*1024*1024)},time.monotonic()+5,lambda:False,script=script)
            self.assertEqual(result['status'],'completed')


if __name__=='__main__':unittest.main()
