"""Independent power conservation/root checks; all schedules synthetic test-only."""
import copy
import json
from pathlib import Path
import unittest
import pandas as pd
from test_worker import BASE,worker
from test_optical_models import request as optical_request
from test_tracking import TRACK
from test_rows import ROWS

PLANT=json.loads(Path(__file__).with_name('ac-plant-reference-parameters.json').read_text())


def request():
    req=optical_request();req['system'].update(copy.deepcopy(PLANT));return req


def root(pin,t):
    # Independent bisection on conservation, not the worker's quadratic formula.
    r=t['ratingVa'];lo=-r;hi=r
    def residual(out):return out+r*t['noLoadLossFraction']+t['loadLossFraction']*out*out/r-pin
    if residual(lo)>0 or residual(hi)<0:raise ValueError('outside test rating')
    for _ in range(90):
        mid=(lo+hi)/2
        if residual(mid)>0:hi=mid
        else:lo=mid
    return (lo+hi)/2


class AcPlantTests(unittest.TestCase):
    def test_transformer_independent_signed_conservation(self):
        sys={'transformer':PLANT['transformer']}
        inputs=pd.Series([-1000.,0.,1000.,8000.])
        ac,col=worker.ac_plant(sys,inputs)
        for i,pin in enumerate(inputs):
            out=root(pin,sys['transformer'])
            self.assertAlmostEqual(ac[i]-col['gridImportW'][i],out,places=8)
            self.assertAlmostEqual(col['transformerLossW'][i],pin-out,places=8)
        self.assertGreater(col['gridImportW'][1],0)

    def test_transformer_zero_loss_and_parameter_sensitivity(self):
        for nll,ll in [(0,0),(.002,0),(0,.015),(.002,.015)]:
            t=dict(PLANT['transformer'],noLoadLossFraction=nll,loadLossFraction=ll)
            ac,col=worker.ac_plant({'transformer':t},pd.Series([5000.]))
            self.assertAlmostEqual(ac[0],root(5000,t),places=8)
        base,_=worker.ac_plant({'transformer':PLANT['transformer']},pd.Series([5000.]))
        for patch in [dict(ratingVa=20000),dict(noLoadLossFraction=.003),dict(loadLossFraction=.03)]:
            ac,_=worker.ac_plant({'transformer':dict(PLANT['transformer'],**patch)},pd.Series([5000.]))
            self.assertGreater(abs(ac[0]-base[0]),.01)

    def test_rated_endpoints_and_pvlib_crosscheck(self):
        import pvlib
        t=PLANT['transformer'];r=t['ratingVa']
        for output in (-r,0,r):
            pin=output+r*t['noLoadLossFraction']+t['loadLossFraction']*output*output/r
            ac,col=worker.ac_plant({'transformer':t},pd.Series([pin]))
            actual=ac[0]-col['gridImportW'][0]
            self.assertAlmostEqual(actual,output,places=7)
            self.assertAlmostEqual(actual,pvlib.transformer.simple_efficiency(pin,t['noLoadLossFraction'],t['loadLossFraction'],r),places=7)

    def test_availability_only_positive_generation_and_auxiliary_always_on(self):
        sys=dict(auxiliaryPowerW=40,acAvailability={'records':[{'availableFraction':f} for f in [1,.5,0,0]]})
        ac,col=worker.ac_plant(sys,pd.Series([1000.,1000.,1000.,-2.4]))
        self.assertEqual(list(ac),[960,460,0,0])
        self.assertAlmostEqual(col['gridImportW'][2],40)
        self.assertAlmostEqual(col['gridImportW'][3],42.4)
        self.assertEqual(list(col['availabilityLossW']),[0,500,1000,0])

    def test_combined_optics_rows_sandia_plant_and_export(self):
        req=request();req['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),faiman=dict(u0=30,u1=5,windHeightM=10),acExportLimitW=100)
        out=worker.run_study(req)
        expected_import=expected_export=0
        for row,a in zip(out['samples'],req['system']['acAvailability']['records']):
            raw=row['inverterNetAcW'];lost=max(0,raw)*(1-a['availableFraction'])
            lv=raw-lost-40;net=root(lv,PLANT['transformer'])
            exported=min(max(0,net),100);imported=max(0,-net)
            self.assertAlmostEqual(row['acW'],exported,places=8)
            self.assertAlmostEqual(row['gridImportW'],imported,places=8)
            self.assertAlmostEqual(row['transformerLossW'],lv-net,places=8)
            expected_import+=imported;expected_export+=exported
        self.assertAlmostEqual(out['summary']['gridImportWh'],expected_import,places=7)
        self.assertAlmostEqual(out['summary']['netGridWh'],expected_export-expected_import,places=7)
        self.assertGreater(out['summary']['acExportLimitLossWh'],0)

    def test_night_and_zero_export_keep_all_imports(self):
        req=request();req['system']['acExportLimitW']=0
        for r in req['weather']['records']:
            for k in ('ghiWm2','dniWm2','dhiWm2'):r[k]=0
        out=worker.run_study(req)
        imports=-root(-2.4-40,PLANT['transformer'])*6
        self.assertEqual(out['summary']['acWh'],0)
        self.assertAlmostEqual(out['summary']['gridImportWh'],imports)
        self.assertAlmostEqual(out['summary']['netGridWh'],-imports)
        self.assertAlmostEqual(out['summary']['inverterSelfConsumptionWh'],2.4*6)
        self.assertEqual(out['summary']['availabilityLossWh'],0)

    def test_no_dc_feedback_and_pvwatts_plant_path(self):
        req=copy.deepcopy(BASE);before=worker.run_study(req)
        req['system'].update(copy.deepcopy(PLANT));out=worker.run_study(req)
        for a,b in zip(before['samples'],out['samples']):
            for k in ('dcW','cellTemperatureC','effectiveIrradianceWm2'):self.assertEqual(a[k],b[k])
        self.assertAlmostEqual(out['summary']['netGridWh'],out['summary']['acWh']-out['summary']['gridImportWh'])

    def test_each_optional_stage_independently(self):
        for key in PLANT:
            req=copy.deepcopy(BASE);req['system'][key]=copy.deepcopy(PLANT[key])
            out=worker.run_study(req)
            for name in ['availabilityLossWh','auxiliaryConsumptionWh','transformerLossWh','gridImportWh','netGridWh']:
                self.assertAlmostEqual(out['summary'][name],sum(m[name] for m in out['monthly']))
            self.assertGreater(out['summary']['acWh'],0)

    def test_strict_schedule_alignment_and_offsets(self):
        req=request();req['system']['acAvailability']['records'][0]['timestamp']='2017-04-01T10:00:00-07:00'
        worker.validate(req)
        for mutate in [lambda r:r['system']['acAvailability']['records'].pop(),lambda r:r['system']['acAvailability']['records'].reverse(),lambda r:r['system']['acAvailability']['records'][0].update(timestamp='2017-04-01T16:00:00Z'),lambda r:r['system']['acAvailability'].update(source=' '),lambda r:r['system']['acAvailability']['records'][0].update(availableFraction=True),lambda r:r['system']['acAvailability']['records'][0].update(availableFraction=1.1),lambda r:r['system']['acAvailability']['records'][0].pop('availableFraction')]:
            bad=request();mutate(bad)
            with self.assertRaises(worker.InputError):worker.validate(bad)

    def test_transformer_domain_and_input_rejections(self):
        for t in [dict(PLANT['transformer'],ratingVa=0),dict(PLANT['transformer'],noLoadLossFraction=-1),dict(PLANT['transformer'],loadLossFraction=True),dict(PLANT['transformer'],extra=1)]:
            req=request();req['system']['transformer']=t
            with self.assertRaises(worker.InputError):worker.validate(req)
        req=request();req['system']['auxiliaryPowerW']=-1
        with self.assertRaises(worker.InputError):worker.validate(req)
        for power in [20000.,-20000.,-1e6]:
            with self.assertRaises(worker.InputError):worker.ac_plant({'transformer':PLANT['transformer']},pd.Series([power]))

    def test_subhourly_utc_monthly_accounting(self):
        req=copy.deepcopy(BASE);req['weather']['intervalMinutes']=30;req['weather']['records']=req['weather']['records'][:2]
        for row,ts in zip(req['weather']['records'],['2017-04-30T17:00:00-07:00','2017-04-30T17:30:00-07:00']):row['timestamp']=ts
        req['system']['auxiliaryPowerW']=50
        out=worker.run_study(req)
        self.assertEqual([m['month'] for m in out['monthly']],['2017-04','2017-05'])
        self.assertEqual(out['summary']['auxiliaryConsumptionWh'],50)
        self.assertEqual([m['auxiliaryConsumptionWh'] for m in out['monthly']],[25,25])

    def test_annual_full_combination_resource_contract(self):
        req=request();req['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),acExportLimitW=100)
        idx=pd.date_range('2024-01-01T01:00:00Z','2025-01-01T00:00:00Z',freq='h')
        req['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=0,dniWm2=0,dhiWm2=0,tempAirC=20,windSpeedMs=1) for t in idx]
        req['system']['acAvailability']['records']=[dict(timestamp=t.isoformat(),availableFraction=1) for t in idx]
        out=worker.run_study(req)
        self.assertEqual(len(out['samples']),8784)
        self.assertLess(len(json.dumps(out,separators=(',',':')).encode()),16*1024*1024)
        req['weather']['records'].append(req['weather']['records'][-1])
        with self.assertRaises(worker.InputError):worker.validate(req)


if __name__=='__main__':unittest.main()
