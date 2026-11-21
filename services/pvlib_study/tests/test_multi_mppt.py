"""Independent inputs, Kirchhoff inherited cable witnesses, aggregate inverter equation.
Only synthetic numerical fixtures; not measurements or annual yield validation.
"""
import copy
import json
import unittest
import pandas as pd
from test_electrical import request as single_request, worker
from test_dc_cable import CABLE


def request():
    r=single_request();s=r['system'];e=s.pop('electrical');s['additionalDcLossPct']=0
    s['inverterPdc0W']=10000;s['arrayPdc0W']=15840
    s['mpptInputs']=[]
    for n in range(2):
        params=copy.deepcopy(e);params['modulesPerString']=10 if n==0 else 8;params['dcCable']=copy.deepcopy(CABLE)
        s['mpptInputs'].append(dict(id=f'input{n}',source='SYNTHETIC numerical subarray test only',quality='assumed',arrayPdc0W=8800 if n==0 else 7040,surfaceTiltDeg=30,surfaceAzimuthDeg=90 if n==0 else 270,electrical=params))
    return r


class MultiMpptTests(unittest.TestCase):
    def test_separate_operating_points_power_sum_and_analytic_inverter(self):
        r=request();out=worker.run_study(r)
        children=[worker.run_study(worker.mppt_request(r,i)) for i in r['system']['mpptInputs']]
        self.assertTrue(any(abs(row['m0_operatingVoltageV']-row['m1_operatingVoltageV'])>20 for row in out['samples']))
        for n,row in enumerate(out['samples']):
            self.assertNotIn('operatingVoltageV',row)
            self.assertNotIn('dcOperatingState',row)
            for index,child in enumerate(children):
                for key in ('dcW','operatingVoltageV','operatingCurrentA','dcOperatingState','poaGlobalWm2','cellTemperatureC','dcCableLossW'):
                    self.assertEqual(row[f'm{index}_'+key],child['samples'][n][key])
            dc=sum(child['samples'][n]['dcW'] for child in children)
            self.assertAlmostEqual(row['dcW'],dc,places=8)
            # Published PVWatts equation on SUMMED DC; clipping once, not per child.
            z=dc/10000
            expected=max(0,min(9600,.96/.9637*10000*(-.0162*z*z-.0059+.9858*z)))
            self.assertAlmostEqual(row['acW'],expected,places=8)
        s=out['summary']
        self.assertAlmostEqual(s['availableMppWh'],s['dcWh']+s['dcCableLossWh']+s['mpptConstraintLossWh'],places=7)

    def test_one_input_constraint_does_not_change_other_input(self):
        r=request();before=worker.run_study(r)
        r['system']['mpptInputs'][0]['electrical']['maxInputCurrentA']=5
        after=worker.run_study(r)
        self.assertLess(after['summary']['dcWh'],before['summary']['dcWh'])
        for a,b in zip(before['samples'],after['samples']):
            for key in a:
                if key.startswith('m1_'):self.assertEqual(a[key],b[key])

    def test_orientation_not_global_reference_and_thermal_independence(self):
        r=request();a=worker.run_study(r)
        r['system']['surfaceTiltDeg']=80;r['system']['surfaceAzimuthDeg']=0
        b=worker.run_study(r)
        self.assertEqual(a['summary']['dcWh'],b['summary']['dcWh'])
        self.assertNotEqual(a['samples'][0]['poaGlobalWm2'],b['samples'][0]['poaGlobalWm2'])
        self.assertTrue(any(abs(row['m0_cellTemperatureC']-row['m1_cellTemperatureC'])>1 for row in a['samples']))

    def test_plant_cap_applied_once_after_shared_inverter(self):
        r=request();r['system'].update(auxiliaryPowerW=40,acExportLimitW=1000)
        out=worker.run_study(r)
        for row in out['samples']:
            self.assertAlmostEqual(row['acBeforeExportLimitW'],max(0,row['acPlantInputW']-40),places=8)
            self.assertAlmostEqual(row['acW'],min(1000,row['acBeforeExportLimitW']),places=8)

    def test_strict_contracts_no_silent_shared_voltage_fallback(self):
        mutations=[lambda r:r['system']['mpptInputs'][1].update(id='input0'),lambda r:r['system'].update(arrayPdc0W=8800),lambda r:r['system'].update(additionalDcLossPct=1),lambda r:r['system']['mpptInputs'].pop(),lambda r:r['system']['mpptInputs'][0]['electrical'].update(mpptMaxV=100),lambda r:r['system']['mpptInputs'][0].update(quality='verified'),lambda r:r['system']['mpptInputs'][0].update(source=' '),lambda r:r['system'].update(electrical=copy.deepcopy(r['system']['mpptInputs'][0]['electrical'])),lambda r:r['system']['mpptInputs'][0].update(unknown=True)]
        for mutate in mutations:
            r=request();mutate(r)
            with self.assertRaises(worker.InputError):worker.validate(r)

    def test_four_inputs_and_night_auxiliary_import_only_once(self):
        r=request();extra=copy.deepcopy(r['system']['mpptInputs'])
        for entry in extra:entry['id']+='extra'
        r['system']['mpptInputs']+=extra
        r['system']['arrayPdc0W']*=2;r['system']['inverterPdc0W']*=2
        active=worker.run_study(r)
        self.assertTrue(all(row['m3_dcW']==row['m1_dcW'] for row in active['samples']))
        self.assertGreater(active['summary']['dcWh'],0)
        r['system']['auxiliaryPowerW']=40
        for index,row in enumerate(r['weather']['records']):
            row.update(timestamp=f'2017-04-01T0{index+1}:00:00Z',ghiWm2=0,dniWm2=0,dhiWm2=0)
        out=worker.run_study(r)
        self.assertEqual(out['summary']['dcWh'],0)
        self.assertEqual(out['summary']['gridImportWh'],240)
        self.assertTrue(all(row['m3_operatingVoltageV']==0 for row in out['samples']))

    def test_maximum_bounded_output_and_explicit_resource_rejection(self):
        r=request();dates=pd.date_range('2024-01-01T01:00:00Z',periods=8784,freq='h')
        r['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=500 if t.hour==18 else 0,dniWm2=0,dhiWm2=500 if t.hour==18 else 0,tempAirC=25,windSpeedMs=1) for t in dates]
        out=worker.run_study(r)
        self.assertLess(len(json.dumps(out).encode()),16*1024*1024)
        self.assertTrue(out['manifest']['period']['completeUtcCalendarYear'])
        self.assertAlmostEqual(out['summary']['dcCableLossWh'],sum(m['dcCableLossWh'] for m in out['monthly']),places=7)
        r['weather']['records']=r['weather']['records'][:4393]
        extra=copy.deepcopy(r['system']['mpptInputs'])
        for entry in extra:entry['id']+='extra'
        r['system']['mpptInputs']+=extra
        r['system']['arrayPdc0W']*=2;r['system']['inverterPdc0W']*=2
        with self.assertRaisesRegex(worker.InputError,'input-intervals'):worker.validate(r)
