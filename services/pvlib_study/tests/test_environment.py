"""Independent geometric/optical checks; explicit synthetic fixtures only."""
import copy
import json
import math
from pathlib import Path
import unittest
import pandas as pd
from test_worker import BASE,worker
from test_ac_plant import request as plant_request
from test_tracking import TRACK
from test_rows import ROWS

ENV=json.loads(Path(__file__).with_name('environment-reference-parameters.json').read_text())


def request():
    r=plant_request();r['system'].update(copy.deepcopy(ENV));return r


class EnvironmentTests(unittest.TestCase):
    def test_horizon_independent_interpolation_and_boundary(self):
        # 0..180 rising line, 180..360 falling line; equality means blocked.
        p={'points':[dict(azimuthDeg=0,elevationDeg=10),dict(azimuthDeg=180,elevationDeg=50),dict(azimuthDeg=360,elevationDeg=10)]}
        az=pd.Series([0.,45.,90.,180.,270.,315.,360.])
        expected=[10.,20.,30.,50.,30.,20.,10.]
        h,v=worker.horizon_visibility(az,pd.Series([80.,69.,61.,39.,59.,70.,79.]),p)
        self.assertEqual(list(h),expected)
        self.assertEqual(list(v),[0,1,0,1,1,0,1])

    def test_horizon_beam_only_and_thermal_closure(self):
        r=copy.deepcopy(BASE);before=worker.run_study(r)
        r['system']['horizonProfile']=copy.deepcopy(ENV['horizonProfile'])
        for p in r['system']['horizonProfile']['points']:p['elevationDeg']=85
        after=worker.run_study(r)
        for a,b in zip(after['samples'],before['samples']):
            self.assertEqual(a['poaDirectWm2'],0)
            self.assertEqual(a['poaSkyDiffuseWm2'],b['poaSkyDiffuseWm2'])
            self.assertEqual(a['poaGroundDiffuseWm2'],b['poaGroundDiffuseWm2'])
            self.assertAlmostEqual(a['horizonBlockedBeamWm2'],b['poaDirectWm2'])
            self.assertAlmostEqual(a['poaGlobalWm2'],b['poaGlobalWm2']-b['poaDirectWm2'])
            self.assertLess(a['cellTemperatureC'],b['cellTemperatureC'])
        self.assertAlmostEqual(after['summary']['horizonBlockedBeamWhm2'],sum(row['poaDirectWm2'] for row in before['samples']))

    def test_flat_horizon_identity_and_tracking_perez(self):
        r=copy.deepcopy(BASE);r['system'].update(tracking=TRACK.copy(),skyDiffuseModel='perez')
        before=worker.run_study(r)
        r['system']['horizonProfile']=copy.deepcopy(ENV['horizonProfile'])
        for p in r['system']['horizonProfile']['points']:p['elevationDeg']=0
        after=worker.run_study(r)
        for a,b in zip(after['samples'],before['samples']):
            self.assertAlmostEqual(a['dcW'],b['dcW'],places=8)
            self.assertAlmostEqual(a['poaGlobalWm2'],b['poaGlobalWm2'],places=8)
        self.assertEqual(after['summary']['horizonBlockedBeamWhm2'],0)

    def test_albedo_independent_ground_equation_and_inactive_scalar(self):
        r=copy.deepcopy(BASE);r['system']['albedoSchedule']=copy.deepcopy(ENV['albedoSchedule'])
        out=worker.run_study(r)
        for sample,w,a in zip(out['samples'],r['weather']['records'],r['system']['albedoSchedule']['records']):
            expected=w['ghiWm2']*a['albedo']*(1-math.cos(math.radians(r['system']['surfaceTiltDeg'])))/2
            self.assertAlmostEqual(sample['poaGroundDiffuseWm2'],expected,places=9)
            self.assertEqual(sample['usedAlbedo'],a['albedo'])
        r['system']['albedo']=.99
        self.assertEqual(out['samples'],worker.run_study(r)['samples'])

    def test_albedo_series_row_route_matches_constant_interval_oracle(self):
        r=copy.deepcopy(BASE);r['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),albedoSchedule=copy.deepcopy(ENV['albedoSchedule']))
        out=worker.run_study(r)
        for i,a in enumerate(r['system']['albedoSchedule']['records']):
            constant=copy.deepcopy(r);constant['system'].pop('albedoSchedule');constant['system']['albedo']=a['albedo']
            expected=worker.run_study(constant)['samples'][i]
            for key in ('poaGroundDiffuseWm2','rearGroundDiffuseWm2','effectiveIrradianceWm2'):self.assertAlmostEqual(out['samples'][i][key],expected[key],places=8)

    def test_soiling_independent_ratios_and_inactive_rear(self):
        r=copy.deepcopy(BASE);before=worker.run_study(r);r['system']['soilingSchedule']=copy.deepcopy(ENV['soilingSchedule']);after=worker.run_study(r)
        for a,b,sr in zip(after['samples'],before['samples'],r['system']['soilingSchedule']['records']):
            self.assertAlmostEqual(a['effectiveIrradianceWm2'],b['effectiveIrradianceWm2']*sr['frontRatio'])
            self.assertAlmostEqual(a['soilingLossWm2'],b['effectiveIrradianceWm2']*(1-sr['frontRatio']))
            self.assertEqual(a['cellTemperatureC'],b['cellTemperatureC'])
        for row in r['system']['soilingSchedule']['records']:row['rearRatio']=0
        for a,b in zip(after['samples'],worker.run_study(r)['samples']):self.assertEqual(a['dcW'],b['dcW'])

    def test_rows_soiling_once_before_spectral_full_chain(self):
        r=request();r['system'].pop('horizonProfile');r['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),faiman=dict(u0=30,u1=5,windHeightM=10),acExportLimitW=100)
        out=worker.run_study(r)
        for a,sr in zip(out['samples'],r['system']['soilingSchedule']['records']):
            expected=a['frontEffectiveIrradianceWm2']*sr['frontRatio']+a['rearEffectiveIrradianceWm2']*sr['rearRatio']
            self.assertAlmostEqual(a['spectralInputIrradianceWm2'],expected,places=8)
            self.assertAlmostEqual(a['effectiveIrradianceWm2'],expected*a['spectralFactor'],places=8)
        self.assertGreater(out['summary']['soilingLossWhm2'],0)
        self.assertGreater(out['summary']['gridImportWh'],0)
        r['system'].pop('rowIrradiance');r['system']['horizonProfile']=copy.deepcopy(ENV['horizonProfile']);r['system']['skyDiffuseModel']='perez'
        self.assertGreater(worker.run_study(r)['summary']['horizonBlockedBeamWhm2'],0)

    def test_zero_irradiance_night_and_complete_opacity(self):
        r=request()
        for row in r['weather']['records']:
            for k in ('ghiWm2','dniWm2','dhiWm2'):row[k]=0
        out=worker.run_study(r)
        self.assertEqual(out['summary']['soilingLossWhm2'],0)
        self.assertEqual(out['summary']['horizonBlockedBeamWhm2'],0)
        self.assertLess(out['summary']['netGridWh'],0)
        r=request()
        for row in r['system']['soilingSchedule']['records']:row['frontRatio']=0
        out=worker.run_study(r);self.assertEqual(out['summary']['dcWh'],0)

    def test_strict_profile_contract(self):
        for pts in [[dict(azimuthDeg=10,elevationDeg=0),dict(azimuthDeg=360,elevationDeg=0)],[dict(azimuthDeg=0,elevationDeg=0),dict(azimuthDeg=360,elevationDeg=1)],[dict(azimuthDeg=0,elevationDeg=0),dict(azimuthDeg=0,elevationDeg=0),dict(azimuthDeg=360,elevationDeg=0)],[dict(azimuthDeg=0,elevationDeg=90),dict(azimuthDeg=360,elevationDeg=90)]]:
            r=request();r['system']['horizonProfile']['points']=pts
            with self.assertRaises(worker.InputError):worker.validate(r)
        r=request();r['system']['rowIrradiance']=ROWS.copy()
        with self.assertRaisesRegex(worker.InputError,'no fallback'):worker.validate(r)

    def test_schedule_alignment_bounds_source_and_offsets(self):
        for name,field in [('soilingSchedule','frontRatio'),('albedoSchedule','albedo')]:
            r=request();r['system'][name]['records'][0]['timestamp']='2017-04-01T10:00:00-07:00';worker.validate(r)
            for mutate in [lambda o:o['records'].pop(),lambda o:o['records'].reverse(),lambda o:o['records'][0].update(timestamp='2017-04-01T16:00:00Z'),lambda o:o['records'][0].update({field:True}),lambda o:o['records'][0].update({field:-1}),lambda o:o.update(source=' '),lambda o:o['records'][0].pop(field)]:
                r=request();mutate(r['system'][name])
                with self.assertRaises(worker.InputError):worker.validate(r)

    def test_subhourly_monthly_integral(self):
        r=copy.deepcopy(BASE);r['weather']['intervalMinutes']=30;r['weather']['records']=r['weather']['records'][:2]
        for row,ts in zip(r['weather']['records'],['2017-04-30T17:00:00-07:00','2017-04-30T17:30:00-07:00']):row['timestamp']=ts
        r['system']['soilingSchedule']=dict(source='synthetic test',quality='assumed',records=[dict(timestamp=row['timestamp'],frontRatio=.5,rearRatio=1) for row in r['weather']['records']])
        out=worker.run_study(r)
        self.assertEqual([m['month'] for m in out['monthly']],['2017-04','2017-05'])
        for month,sample in zip(out['monthly'],out['samples']):self.assertAlmostEqual(month['soilingLossWhm2'],sample['soilingLossWm2']*.5)

    def test_annual_full_combination_resource_contract(self):
        r=request();r['system'].pop('horizonProfile');r['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),acExportLimitW=100)
        idx=pd.date_range('2024-01-01T01:00:00Z','2025-01-01T00:00:00Z',freq='h')
        r['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=0,dniWm2=0,dhiWm2=0,tempAirC=20,windSpeedMs=1) for t in idx]
        for name,values in [('acAvailability',dict(availableFraction=1)),('soilingSchedule',dict(frontRatio=1,rearRatio=1)),('albedoSchedule',dict(albedo=.2))]:r['system'][name]['records']=[dict(timestamp=t.isoformat(),**values) for t in idx]
        out=worker.run_study(r)
        self.assertEqual(len(out['samples']),8784)
        self.assertLess(len(json.dumps(out,separators=(',',':')).encode()),16*1024*1024)
        r['weather']['records'].append(r['weather']['records'][-1])
        with self.assertRaises(worker.InputError):worker.validate(r)


if __name__=='__main__':unittest.main()
