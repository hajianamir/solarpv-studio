"""Explicit synthetic auxiliary schedules; independent conservation/integration witnesses."""
import copy
import unittest
from datetime import datetime, timedelta, timezone
from test_worker import BASE, worker
from test_ac_plant import request as plant_request, root, PLANT
from test_inverter_blocks import request as blocks_request
from test_multi_mppt import request as mppt_request


def scheduled(req=None, powers=None):
    r=copy.deepcopy(req if req is not None else BASE)
    r['system'].pop('auxiliaryPowerW',None)
    powers=powers if powers is not None else [0,20,100,0,50,300]
    r['system']['auxiliarySchedule']=dict(source='SYNTHETIC interval demand, not operational',quality='assumed',records=[dict(timestamp=row['timestamp'],powerW=p) for row,p in zip(r['weather']['records'],powers)])
    return r


class AuxiliaryScheduleTests(unittest.TestCase):
    def test_constant_schedule_matches_legacy_samples_and_totals(self):
        for base in [BASE,plant_request(),blocks_request(),mppt_request()]:
            r=copy.deepcopy(base);r['system']['auxiliaryPowerW']=40
            a=worker.run_study(r);b=worker.run_study(scheduled(r,[40]*len(r['weather']['records'])))
            for key in ('samples','summary','monthly'):self.assertEqual(a[key],b[key])

    def test_signed_transformer_conservation_and_export_cap(self):
        r=scheduled(plant_request());r['system']['acExportLimitW']=100
        out=worker.run_study(r);exported=imported=0
        for row,a in zip(out['samples'],r['system']['auxiliarySchedule']['records']):
            pin=row['acPlantInputW']-row['availabilityLossW']-a['powerW']
            net=root(pin,PLANT['transformer'])
            self.assertAlmostEqual(row['auxiliaryConsumptionW'],a['powerW'])
            self.assertAlmostEqual(row['acW'],min(100,max(0,net)),places=8)
            self.assertAlmostEqual(row['gridImportW'],max(0,-net),places=8)
            exported+=min(100,max(0,net));imported+=max(0,-net)
        self.assertAlmostEqual(out['summary']['netGridWh'],exported-imported,places=7)
        self.assertEqual(out['summary']['auxiliaryConsumptionWh'],470)

    def test_night_zero_availability_zero_cap_and_inverter_consumption_once(self):
        for night in (False,True):
            r=scheduled(plant_request());r['system'].pop('transformer');r['system']['acExportLimitW']=0
            for a in r['system']['acAvailability']['records']:a['availableFraction']=0
            if night:
                for row in r['weather']['records']:
                    for key in ('ghiWm2','dniWm2','dhiWm2'):row[key]=0
            out=worker.run_study(r)
            for row,p in zip(out['samples'],[0,20,100,0,50,300]):
                self.assertEqual(row['acW'],0)
                self.assertAlmostEqual(row['gridImportW'],p+max(0,-row['acPlantInputW']))
            self.assertAlmostEqual(out['summary']['netGridWh'],-out['summary']['gridImportWh'])
            if night:self.assertAlmostEqual(out['summary']['gridImportWh'],470+6*2.4)

    def test_quarter_hour_month_boundary_and_equivalent_offsets(self):
        r=scheduled();r['weather']['intervalMinutes']=15
        start=datetime(2024,2,1,tzinfo=timezone.utc)
        for i,(w,a) in enumerate(zip(r['weather']['records'],r['system']['auxiliarySchedule']['records'])):
            t=start+timedelta(minutes=15*(i-1))
            w['timestamp']=t.isoformat();a['timestamp']=t.astimezone(timezone(timedelta(hours=-5))).isoformat()
        out=worker.run_study(r)
        self.assertEqual(out['summary']['auxiliaryConsumptionWh'],117.5)
        self.assertEqual([m['auxiliaryConsumptionWh'] for m in out['monthly']],[5,112.5])

    def test_blocks_apply_common_auxiliary_only_once(self):
        r=scheduled(blocks_request());out=worker.run_study(r)
        self.assertEqual(out['summary']['auxiliaryConsumptionWh'],470)
        for row in out['samples']:
            self.assertAlmostEqual(row['acPlantInputW']-row['auxiliaryConsumptionW'],row['acW']-row['gridImportW'])
        for child in out['blockResults']:self.assertNotIn('auxiliaryConsumptionWh',child['summary'])

    def test_strict_invalid_contracts(self):
        patches=[lambda r:r['system'].update(auxiliaryPowerW=0),
                 lambda r:r['system']['auxiliarySchedule'].update(source=' '),
                 lambda r:r['system']['auxiliarySchedule'].update(quality='guessed'),
                 lambda r:r['system']['auxiliarySchedule']['records'].pop(),
                 lambda r:r['system']['auxiliarySchedule']['records'].reverse(),
                 lambda r:r['system']['auxiliarySchedule']['records'][0].update(powerW=-1),
                 lambda r:r['system']['auxiliarySchedule']['records'][0].update(powerW=True),
                 lambda r:r['system']['auxiliarySchedule']['records'][0].update(powerW=float('nan')),
                 lambda r:r['system']['auxiliarySchedule']['records'][0].update(powerW=1e9+1),
                 lambda r:r['system']['auxiliarySchedule']['records'][0].pop('powerW'),
                 lambda r:r['system']['auxiliarySchedule']['records'][0].update(timestamp='2024-01-01T00:00:00'),
                 lambda r:r['system']['auxiliarySchedule']['records'][0].update(extra=1)]
        for patch in patches:
            r=scheduled();patch(r)
            with self.subTest(request=r),self.assertRaises(worker.InputError):worker.validate(r)
        r=blocks_request();r['system']['inverterBlocks'][0]['system']['auxiliarySchedule']=scheduled()['system']['auxiliarySchedule']
        with self.assertRaises(worker.InputError):worker.validate(r)

    def test_budget_boundary(self):
        r=scheduled();template=copy.deepcopy(r['weather']['records'][0]);start=datetime(2024,1,1,tzinfo=timezone.utc)
        r['weather']['records']=[dict(template,timestamp=(start+timedelta(hours=i+1)).isoformat()) for i in range(8784)]
        r=scheduled(r,[0]*8784);worker.validate(r)
        r['weather']['records'].append(dict(template,timestamp=(start+timedelta(hours=8785)).isoformat()))
        with self.assertRaises(worker.InputError):worker.validate(r)
