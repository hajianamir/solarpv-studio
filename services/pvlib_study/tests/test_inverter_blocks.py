"""Independent inverters, signed aggregation, no duplicated internal demand.
All inputs are synthetic numerical fixtures; no field or accuracy claims.
"""
import copy
import json
import unittest
import pandas as pd
from test_worker import BASE,worker
from test_sandia import request as sandia_request
from test_multi_mppt import request as multi_request


def request(standby=False):
    r=copy.deepcopy(BASE);a=copy.deepcopy(BASE['system']);a.update(additionalDcLossPct=0,inverterPdc0W=5000,arrayPdc0W=8800)
    b=sandia_request()['system']
    if standby:b['electrical'].update(mpptMinV=200,mpptMaxV=220,maxInputCurrentA=.1)
    r['system'].update(additionalDcLossPct=0,arrayPdc0W=a['arrayPdc0W']+b['arrayPdc0W'],inverterPdc0W=a['inverterPdc0W']+b['inverterPdc0W'],inverterBlocks=[dict(id='pvwatts',source='SYNTHETIC inverter A',quality='assumed',system=a),dict(id='sandia',source='SYNTHETIC inverter B',quality='assumed',system=b)])
    return r


class InverterBlockTests(unittest.TestCase):
    def test_independent_clipping_then_signed_aggregation(self):
        r=request();out=worker.run_study(r)
        for index,block in enumerate(r['system']['inverterBlocks']):self.assertEqual(out['blockResults'][index],worker.run_study(worker.block_request(r,block)))
        for n,row in enumerate(out['samples']):
            children=[child['samples'][n] for child in out['blockResults']]
            expected=sum(child.get('inverterNetAcW',child['acW']) for child in children)
            self.assertAlmostEqual(row['acPlantInputW'],expected,places=8)
            self.assertAlmostEqual(row['acW'],max(0,expected),places=8)
            self.assertLessEqual(children[0]['acW'],4800)
            self.assertLessEqual(children[1]['acW'],r['system']['inverterBlocks'][1]['system']['sandia']['Paco'])
        # Incorrect aggregate-inverter calculation is numerically distinguishable.
        import pvlib
        wrong=sum(pvlib.inverter.pvwatts(row['dcW'],r['system']['inverterPdc0W'],eta_inv_nom=.96) for row in out['samples'])
        self.assertGreater(abs(wrong-out['summary']['acWh']),100)

    def test_pvwatts_unused_capacity_cannot_move_between_inverters(self):
        r=request();a=copy.deepcopy(r['system']['inverterBlocks'][0]['system']);b=copy.deepcopy(a)
        b['arrayPdc0W']=1000
        r['system']['inverterBlocks'][1]['system']=b
        r['system']['arrayPdc0W']=9800;r['system']['inverterPdc0W']=10000
        out=worker.run_study(r)
        def curve(dc,limit):
            z=dc/limit
            return max(0,min(.96*limit,.96/.9637*limit*(-.0162*z*z-.0059+.9858*z)))
        wrong=0
        for n,row in enumerate(out['samples']):
            expected=sum(curve(child['samples'][n]['dcW'],5000) for child in out['blockResults'])
            self.assertAlmostEqual(row['acW'],expected,places=8)
            wrong+=curve(row['dcW'],10000)
        self.assertGreater(abs(wrong-out['summary']['acWh']),100)

    def test_mixed_generation_and_standby_netting_no_double_subtraction(self):
        r=request(True);out=worker.run_study(r);pnt=r['system']['inverterBlocks'][1]['system']['sandia']['Pnt']
        self.assertAlmostEqual(out['summary']['inverterSelfConsumptionWh'],pnt*6,places=8)
        for n,row in enumerate(out['samples']):
            generation=out['blockResults'][0]['samples'][n]['acW']
            self.assertAlmostEqual(row['inverterSelfConsumptionW'],pnt,places=8)
            self.assertAlmostEqual(row['inverterNetAcW'],generation-pnt,places=8)
            self.assertAlmostEqual(row['acW']-row['gridImportW'],generation-pnt,places=8)
        self.assertAlmostEqual(out['summary']['netGridWh'],out['summary']['acWh']-out['summary']['gridImportWh'],places=8)

    def test_zero_availability_preserves_each_inverter_internal_consumption(self):
        r=request(True);r['system']['auxiliaryPowerW']=40
        r['system']['acAvailability']=dict(source='SYNTHETIC zero availability',quality='assumed',records=[dict(timestamp=row['timestamp'],availableFraction=0) for row in r['weather']['records']])
        out=worker.run_study(r);pnt=sum(b['system'].get('sandia',{}).get('Pnt',0) for b in r['system']['inverterBlocks'])
        self.assertEqual(out['summary']['acWh'],0)
        self.assertAlmostEqual(out['summary']['gridImportWh'],6*(40+pnt),places=7)
        self.assertAlmostEqual(out['summary']['inverterSelfConsumptionWh'],6*pnt,places=7)

    def test_night_imports_add_and_export_cap_is_downstream(self):
        r=request();r['system']['acExportLimitW']=0
        r['system']['inverterBlocks'][0]['system']=copy.deepcopy(r['system']['inverterBlocks'][1]['system'])
        r['system']['inverterBlocks'][0]['system']['sandia']['Pnt']=3.1
        r['system']['inverterPdc0W']=sum(b['system']['inverterPdc0W'] for b in r['system']['inverterBlocks'])
        for i,row in enumerate(r['weather']['records']):row.update(timestamp=f'2017-04-01T0{i+1}:00:00Z',ghiWm2=0,dniWm2=0,dhiWm2=0)
        out=worker.run_study(r);pnt=sum(b['system'].get('sandia',{}).get('Pnt',0) for b in r['system']['inverterBlocks'])
        self.assertEqual(out['summary']['acWh'],0)
        self.assertAlmostEqual(out['summary']['gridImportWh'],6*pnt,places=8)
        self.assertAlmostEqual(out['summary']['netGridWh'],-6*pnt,places=8)

    def test_independent_mppt_inside_one_block_is_retained(self):
        r=request();r['system']['inverterBlocks'][0]['system']=multi_request()['system']
        r['system']['arrayPdc0W']=sum(b['system']['arrayPdc0W'] for b in r['system']['inverterBlocks'])
        r['system']['inverterPdc0W']=sum(b['system']['inverterPdc0W'] for b in r['system']['inverterBlocks'])
        out=worker.run_study(r)
        self.assertIn('m1_operatingVoltageV',out['blockResults'][0]['samples'][0])
        self.assertNotIn('operatingVoltageV',out['samples'][0])

    def test_strict_nesting_capacity_and_downstream_rejections(self):
        mutations=[lambda r:r['system']['inverterBlocks'][1].update(id='pvwatts'),lambda r:r['system'].update(arrayPdc0W=8800),lambda r:r['system']['inverterBlocks'][0]['system'].update(auxiliaryPowerW=0),lambda r:r['system']['inverterBlocks'][0]['system'].update(acExportLimitW=0),lambda r:r['system']['inverterBlocks'][0]['system'].update(inverterBlocks=[]),lambda r:r['system']['inverterBlocks'][0]['system'].update(additionalDcLossPct=1)]
        for mutation in mutations:
            r=request();mutation(r)
            with self.assertRaises(worker.InputError):worker.validate(r)

    def test_maximum_serialization_and_budget(self):
        r=request();dates=pd.date_range('2024-01-01T01:00:00Z',periods=4392,freq='h')
        r['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=500 if t.hour==18 else 0,dniWm2=0,dhiWm2=500 if t.hour==18 else 0,tempAirC=25,windSpeedMs=1) for t in dates]
        out=worker.run_study(r)
        self.assertLess(len(json.dumps(out).encode()),16*1024*1024)
        r['weather']['records'].append(dict(r['weather']['records'][-1],timestamp=(dates[-1]+pd.Timedelta(hours=1)).isoformat()))
        with self.assertRaisesRegex(worker.InputError,'block-MPPT'):worker.validate(r)
