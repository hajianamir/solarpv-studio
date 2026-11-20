"""Independent heat-balance/export accounting checks; synthetic, not field evidence."""
import copy
import unittest
from test_worker import BASE, worker
from test_tracking import TRACK
from test_rows import ROWS
from test_electrical import request


class ThermalExportTests(unittest.TestCase):
    def test_faiman_independent_heat_balance(self):
        for wind in (0, 2, 15):
            req=copy.deepcopy(BASE)
            req['system']['faiman']=dict(u0=30,u1=5,windHeightM=10)
            for row in req['weather']['records']:row['windSpeedMs']=wind
            out=worker.run_study(req)
            for row,weather in zip(out['samples'],req['weather']['records']):
                self.assertAlmostEqual(row['cellTemperatureC'],weather['tempAirC']+row['poaGlobalWm2']/(30+5*wind),places=10)
            self.assertTrue(out['manifest']['models']['temperature'].startswith('faiman;'))

    def test_sapm_parameters_inactive_with_faiman(self):
        req=copy.deepcopy(BASE);req['system']['faiman']=dict(u0=30,u1=5,windHeightM=10)
        before=worker.run_study(req)
        req['system']['temperature']=dict(a=-2,b=-.1,deltaT=10)
        after=worker.run_study(req)
        for k in ('samples','summary','monthly'):self.assertEqual(before[k],after[k])

    def test_zero_irradiance_equals_ambient(self):
        req=copy.deepcopy(BASE);req['system']['faiman']=dict(u0=30,u1=5,windHeightM=10)
        for r in req['weather']['records']:
            for k in ('ghiWm2','dniWm2','dhiWm2'):r[k]=0
        out=worker.run_study(req)
        for row,weather in zip(out['samples'],req['weather']['records']):
            self.assertEqual(row['cellTemperatureC'],weather['tempAirC'])
        self.assertEqual(out['summary']['acWh'],0)

    def test_export_cap_independent_samples_and_energy(self):
        req=copy.deepcopy(BASE);baseline=worker.run_study(req)
        for cap in (0,100,1e9):
            req['system']['acExportLimitW']=cap
            out=worker.run_study(req)
            total=loss=0
            dt=req['weather']['intervalMinutes']/60
            for row,original in zip(out['samples'],baseline['samples']):
                expected=min(original['acW'],cap)
                self.assertEqual(row['acW'],expected)
                self.assertEqual(row['dcW'],original['dcW'])
                self.assertEqual(row['acBeforeExportLimitW'],original['acW'])
                self.assertAlmostEqual(row['acExportLimitLossW'],original['acW']-expected,places=10)
                total+=expected*dt;loss+=(original['acW']-expected)*dt
            self.assertAlmostEqual(out['summary']['acWh'],total)
            self.assertAlmostEqual(out['summary']['acExportLimitLossWh'],loss)
            for key in ('acWh','acBeforeExportLimitWh','acExportLimitLossWh'):
                self.assertAlmostEqual(out['summary'][key],sum(m[key] for m in out['monthly']))
            self.assertAlmostEqual(out['summary']['acBeforeExportLimitWh'],total+loss)

    def test_combined_tracker_rows_diode(self):
        req=request();req['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),faiman=dict(u0=30,u1=5,windHeightM=10),acExportLimitW=100)
        out=worker.run_study(req)
        for row,weather in zip(out['samples'],req['weather']['records']):
            self.assertAlmostEqual(row['cellTemperatureC'],weather['tempAirC']+row['temperatureIrradianceWm2']/(30+5*weather['windSpeedMs']),places=10)
            self.assertLessEqual(row['acW'],100)
        self.assertGreater(out['summary']['acExportLimitLossWh'],0)

    def test_subhourly_utc_month_boundary(self):
        req=copy.deepcopy(BASE)
        req['weather']['intervalMinutes']=30
        req['weather']['records']=req['weather']['records'][:2]
        # Explicit -07 offset becomes UTC May 1; interval midpoints straddle month.
        for row,ts in zip(req['weather']['records'],['2017-04-30T17:00:00-07:00','2017-04-30T17:30:00-07:00']):row['timestamp']=ts
        req['system']['acExportLimitW']=100
        out=worker.run_study(req)
        self.assertEqual([m['month'] for m in out['monthly']],['2017-04','2017-05'])
        for month,sample in zip(out['monthly'],out['samples']):
            self.assertAlmostEqual(month['acWh'],sample['acW']*.5)
            self.assertAlmostEqual(month['acExportLimitLossWh'],sample['acExportLimitLossW']*.5)
        self.assertAlmostEqual(out['summary']['acBeforeExportLimitWh'],out['summary']['acWh']+out['summary']['acExportLimitLossWh'])

    def test_strict_validation(self):
        for bad in (dict(u0=0,u1=5,windHeightM=10),dict(u0=30,u1=-1,windHeightM=10),dict(u0=30,u1=5,windHeightM=2),dict(u0=True,u1=5,windHeightM=10),dict(u0=30,u1=5,windHeightM=10,extra=1)):
            req=copy.deepcopy(BASE);req['system']['faiman']=bad
            with self.assertRaises(worker.InputError):worker.run_study(req)
        for bad in (-1,True,float('nan'),1e10):
            req=copy.deepcopy(BASE);req['system']['acExportLimitW']=bad
            with self.assertRaises(worker.InputError):worker.run_study(req)

    def test_unsupported_hot_temperature_rejected(self):
        req=copy.deepcopy(BASE);req['system']['faiman']=dict(u0=.1,u1=0,windHeightM=10)
        with self.assertRaisesRegex(worker.InputError,'temperature'):worker.run_study(req)


if __name__=='__main__':unittest.main()
