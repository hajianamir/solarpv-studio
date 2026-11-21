"""Synthetic export schedules. Independent min/conservation/integration assertions."""
import copy
import json
import unittest
from datetime import datetime, timedelta, timezone
from test_worker import BASE, worker
from test_ac_plant import request as plant_request, root, PLANT
from test_auxiliary_schedule import scheduled as auxiliary_request
from test_inverter_blocks import request as blocks_request
from test_multi_mppt import request as mppt_request
from test_sandia import request as sandia_request

LIMITS=[0,100,1e9,500,0,1000]


def scheduled(req=None,limits=None):
    r=copy.deepcopy(req if req is not None else BASE)
    r['system'].pop('acExportLimitW',None)
    vals=limits if limits is not None else LIMITS
    r['system']['acExportLimitSchedule']=dict(source='SYNTHETIC caps only; not operational',quality='assumed',records=[dict(timestamp=w['timestamp'],limitW=v) for w,v in zip(r['weather']['records'],vals)])
    return r


class ExportLimitScheduleTests(unittest.TestCase):
    def test_minimum_and_dc_unchanged(self):
        for base in [BASE,sandia_request(),mppt_request(),blocks_request()]:
            r=scheduled(base);out=worker.run_study(r)
            uncapped=copy.deepcopy(r);uncapped['system'].pop('acExportLimitSchedule');before=worker.run_study(uncapped)
            for i,row in enumerate(out['samples']):
                available=before['samples'][i]['acW'];cap=LIMITS[i]
                self.assertEqual(row['appliedAcExportLimitW'],cap)
                self.assertAlmostEqual(row['acW'],min(available,cap))
                self.assertAlmostEqual(row['acBeforeExportLimitW'],available)
                self.assertAlmostEqual(row['acExportLimitLossW'],available-min(available,cap))
                self.assertEqual(row['dcW'],before['samples'][i]['dcW'])
            self.assertAlmostEqual(out['summary']['acBeforeExportLimitWh'],before['summary']['acWh'])

    def test_constant_schedule_equivalence(self):
        for base in [BASE,plant_request(),blocks_request(),mppt_request()]:
            r=copy.deepcopy(base);r['system']['acExportLimitW']=500
            a=worker.run_study(r);b=worker.run_study(scheduled(r,[500]*len(r['weather']['records'])))
            for row in b['samples']:row.pop('appliedAcExportLimitW')
            for k in ('samples','summary','monthly'):self.assertEqual(a[k],b[k])

    def test_auxiliary_transformer_and_cap_order_independent_root(self):
        r=scheduled(auxiliary_request(plant_request()));out=worker.run_study(r)
        for i,row in enumerate(out['samples']):
            lv=row['acPlantInputW']-row['availabilityLossW']-r['system']['auxiliarySchedule']['records'][i]['powerW']
            net=root(lv,PLANT['transformer'])
            self.assertAlmostEqual(row['acBeforeExportLimitW'],max(0,net),places=8)
            self.assertAlmostEqual(row['acW'],min(max(0,net),LIMITS[i]),places=8)
            self.assertAlmostEqual(row['gridImportW'],max(0,-net),places=8)

    def test_zero_cap_night_and_availability_preserve_imports(self):
        for night in (False,True):
            r=scheduled(auxiliary_request(plant_request()),[0]*6)
            for a in r['system']['acAvailability']['records']:a['availableFraction']=0
            if night:
                for row in r['weather']['records']:
                    for k in ('ghiWm2','dniWm2','dhiWm2'):row[k]=0
            a=worker.run_study(r);uncapped=copy.deepcopy(r);uncapped['system'].pop('acExportLimitSchedule');b=worker.run_study(uncapped)
            self.assertEqual(a['summary']['acWh'],0)
            self.assertEqual(a['summary']['gridImportWh'],b['summary']['gridImportWh'])
            self.assertGreater(a['summary']['gridImportWh'],0)
            self.assertEqual(a['summary']['netGridWh'],-a['summary']['gridImportWh'])

    def test_quarter_hour_month_boundary_and_offset(self):
        r=scheduled(limits=[0]*6);r['weather']['intervalMinutes']=15
        start=datetime(2024,2,1,tzinfo=timezone.utc)
        for i,(w,a) in enumerate(zip(r['weather']['records'],r['system']['acExportLimitSchedule']['records'])):
            t=start+timedelta(minutes=15*(i-1));w['timestamp']=t.isoformat();a['timestamp']=t.astimezone(timezone(timedelta(hours=-5))).isoformat()
        out=worker.run_study(r)
        expected={}
        for row in out['samples']:
            month=row['midpointUtc'][:7];expected[month]=expected.get(month,0)+row['acBeforeExportLimitW']*.25
        self.assertEqual(len(out['monthly']),2)
        for m in out['monthly']:self.assertAlmostEqual(m['acExportLimitLossWh'],expected[m['month']])
        self.assertAlmostEqual(out['summary']['acExportLimitLossWh'],sum(expected.values()))

    def test_strict_invalid_contracts(self):
        patches=[lambda r:r['system'].update(acExportLimitW=0),lambda r:r['system']['acExportLimitSchedule'].update(source=' '),lambda r:r['system']['acExportLimitSchedule'].update(quality='guess'),lambda r:r['system']['acExportLimitSchedule']['records'].pop(),lambda r:r['system']['acExportLimitSchedule']['records'].reverse()]
        for value in [-1,1e9+1,True,float('nan'),'40',None]:patches.append(lambda r,v=value:r['system']['acExportLimitSchedule']['records'][0].update(limitW=v))
        patches.extend([lambda r:r['system']['acExportLimitSchedule']['records'][0].update(timestamp=r['system']['acExportLimitSchedule']['records'][1]['timestamp']),lambda r:r['system']['acExportLimitSchedule']['records'][0].update(timestamp='2024-01-01T00:00:00'),lambda r:r['system']['acExportLimitSchedule']['records'][0].update(extra=1)])
        for patch in patches:
            r=scheduled();patch(r)
            with self.subTest(request=r),self.assertRaises(worker.InputError):worker.validate(r)
        r=blocks_request();r['system']['inverterBlocks'][0]['system']['acExportLimitSchedule']=scheduled()['system']['acExportLimitSchedule']
        with self.assertRaises(worker.InputError):worker.validate(r)

    def test_full_budget_and_output_size(self):
        r=scheduled();template=copy.deepcopy(r['weather']['records'][0]);template.update(ghiWm2=0,dniWm2=0,dhiWm2=0);start=datetime(2024,1,1,tzinfo=timezone.utc)
        r['weather']['records']=[dict(template,timestamp=(start+timedelta(hours=i+1)).isoformat()) for i in range(8784)]
        r=scheduled(r,[0]*8784);out=worker.run_study(r)
        self.assertEqual(out['summary']['acWh'],0);self.assertLess(len(json.dumps(out,allow_nan=False).encode()),16*1024*1024)
        r['weather']['records'].append(dict(template,timestamp=(start+timedelta(hours=8785)).isoformat()))
        r['system']['acExportLimitSchedule']['records'].append(dict(timestamp=r['weather']['records'][-1]['timestamp'],limitW=0))
        with self.assertRaises(worker.InputError):worker.validate(r)
