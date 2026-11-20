"""Row/bifacial optics: synthetic numerical tests, never field calibration.
Analytic limiting cases and projected-shadow geometry are independent of
pvlib's view-factor implementation. Separate one-side calls test wiring only.
"""
import copy
import json
import math
import unittest
import numpy as np
import pandas as pd
import pvlib
from test_worker import BASE, worker
from test_tracking import TRACK

ROWS = dict(gcr=.4,heightM=2,pitchM=5,bifaciality=.7,
            rearShadeLossPct=2,rearTransmissionLossPct=1,rearIamB=.05,
            temperatureIrradiance='front_plus_rear')


def request(**changes):
    req = copy.deepcopy(BASE)
    req['system']['rowIrradiance'] = dict(ROWS,**changes)
    return req


class RowTests(unittest.TestCase):
    def test_independent_horizontal_direct_only_limit(self):
        req=request();s=req['system']
        s.update(surfaceTiltDeg=0,albedo=0,iamB=0)
        for row in req['weather']['records']:
            row.update(dhiWm2=0,dniWm2=500,ghiWm2=500)
        out=worker.run_study(req)
        for row in out['samples']:
            expected=500*math.cos(math.radians(row['solarZenithDeg']))
            self.assertAlmostEqual(row['poaGlobalWm2'],expected,places=8)
            self.assertAlmostEqual(row['rearIncidentWm2'],0,places=9)
            self.assertAlmostEqual(row['effectiveIrradianceWm2'],expected,places=8)
            self.assertEqual(row['frontShadedFraction'],0)

    def test_independent_beam_shadow_projection(self):
        req=request(gcr=.8,heightM=3)
        req['system'].update(surfaceTiltDeg=60,surfaceAzimuthDeg=90,albedo=0,iamB=0)
        for i,row in enumerate(req['weather']['records']):
            row.update(timestamp=f'2017-04-01T{14+i}:00:00Z',dniWm2=500,dhiWm2=0,ghiWm2=500)
        out=worker.run_study(req);w=.8*5;witness=False
        for row in out['samples']:
            z=math.radians(row['solarZenithDeg']);az=math.radians(row['solarAzimuthDeg']-90)
            # Compare row width projected perpendicular to the solar ray with
            # pitch projected onto the same direction (independent 2-D geometry).
            sx,sz=math.sin(z)*math.cos(az),math.cos(z)
            incidence=math.sin(math.radians(60))*sx+math.cos(math.radians(60))*sz
            projected_width=w*incidence;projected_pitch=5*sz
            fraction=max(0,1-projected_pitch/projected_width) if projected_width>0 else 0
            self.assertAlmostEqual(row['frontShadedFraction'],fraction,places=9)
            self.assertAlmostEqual(row['poaDirectWm2'],500*max(0,incidence)*(1-fraction),places=8)
            witness |= fraction>.1
        self.assertTrue(witness,'fixture must actually witness direct row shading')

    def test_independent_rear_weight_iam_and_sapm_accounting(self):
        req=request(rearShadeLossPct=12,rearTransmissionLossPct=8)
        out=worker.run_study(req);s=req['system'];r=s['rowIrradiance']
        for row,weather in zip(out['samples'],req['weather']['records']):
            front=row['poaDirectWm2']*row['beamIam']+row['poaSkyDiffuseWm2']+row['poaGroundDiffuseWm2']
            rear=(row['rearDirectWm2']*row['rearBeamIam']+row['rearSkyDiffuseWm2']+row['rearGroundDiffuseWm2'])*.7*.88*.92
            self.assertAlmostEqual(row['frontEffectiveIrradianceWm2'],front,places=9)
            self.assertAlmostEqual(row['rearEffectiveIrradianceWm2'],rear,places=9)
            self.assertAlmostEqual(row['effectiveIrradianceWm2'],front+rear,places=9)
            thermal=row['poaGlobalWm2']+row['rearIncidentWm2']
            self.assertAlmostEqual(row['temperatureIrradianceWm2'],thermal,places=9)
            temp=weather['tempAirC']+thermal*math.exp(s['temperature']['a']+s['temperature']['b']*weather['windSpeedMs'])+thermal/1000*s['temperature']['deltaT']
            self.assertAlmostEqual(row['cellTemperatureC'],temp,places=9)
            dc=(front+rear)/1000*s['arrayPdc0W']*(1+s['gammaPdcPerC']*(temp-25))*.95
            self.assertAlmostEqual(row['dcW'],dc,places=8)
        for summary,column in [('frontIncidentWhm2','poaGlobalWm2'),('rearIncidentWhm2','rearIncidentWm2'),('rearEffectiveWhm2','rearEffectiveIrradianceWm2')]:
            self.assertAlmostEqual(out['summary'][summary],sum(row[column] for row in out['samples']),places=8)
            self.assertAlmostEqual(out['summary'][summary],sum(row[summary] for row in out['monthly']),places=8)

    def test_separate_front_and_rear_poa_calls_wiring(self):
        req=request();out=worker.run_study(req);rows=req['system']['rowIrradiance'];s=req['system']
        idx=pd.DatetimeIndex([row['midpointUtc'] for row in out['samples']])
        frame=pd.DataFrame(req['weather']['records'],index=idx)
        z=pd.Series([row['solarZenithDeg'] for row in out['samples']],index=idx)
        az=pd.Series([row['solarAzimuthDeg'] for row in out['samples']],index=idx)
        for rear,tilt,face in [(False,20,180),(True,160,0)]:
            poa=pvlib.bifacial.infinite_sheds.get_irradiance_poa(tilt,face,z,az,rows['gcr'],rows['heightM'],rows['pitchM'],frame.ghiWm2,frame.dhiWm2,frame.dniWm2,s['albedo'],model='haydavies',dni_extra=pvlib.irradiance.get_extra_radiation(idx,solar_constant=1366.1,method='spencer'),iam=1,npoints=100,vectorize=False)
            expected=poa.poa_global
            np.testing.assert_allclose([row['rearIncidentWm2' if rear else 'poaGlobalWm2'] for row in out['samples']],expected,rtol=1e-10,atol=1e-8)

    def test_bifaciality_and_rear_loss_do_not_weight_thermal_input(self):
        a=worker.run_study(request(bifaciality=0))
        b=worker.run_study(request(bifaciality=1))
        c=worker.run_study(request(rearShadeLossPct=100))
        self.assertGreater(b['summary']['dcWh'],a['summary']['dcWh'])
        for x,y,z in zip(a['samples'],b['samples'],c['samples']):
            self.assertEqual(x['cellTemperatureC'],y['cellTemperatureC'])
            self.assertEqual(x['cellTemperatureC'],z['cellTemperatureC'])
            self.assertEqual(x['rearEffectiveIrradianceWm2'],0)
            self.assertEqual(z['rearEffectiveIrradianceWm2'],0)
            self.assertEqual(x['effectiveIrradianceWm2'],x['frontEffectiveIrradianceWm2'])

    def test_albedo_and_explicit_thermal_policy_sensitivity(self):
        dark=request();dark['system']['albedo']=0
        light=request();light['system']['albedo']=.7
        a,b=worker.run_study(dark),worker.run_study(light)
        self.assertGreater(b['summary']['rearIncidentWhm2'],a['summary']['rearIncidentWhm2'])
        front=request(temperatureIrradiance='front_only')
        c,d=worker.run_study(front),worker.run_study(request())
        for x,y in zip(c['samples'],d['samples']):
            self.assertEqual(x['effectiveIrradianceWm2'],y['effectiveIrradianceWm2'])
            self.assertEqual(x['temperatureIrradianceWm2'],x['poaGlobalWm2'])
            self.assertLess(x['cellTemperatureC'],y['cellTemperatureC'])

    def test_night_is_zero_and_tracker_row_geometry_is_used(self):
        req=request();req['system']['tracking']=dict(TRACK)
        daytime=worker.run_study(req)
        self.assertTrue(any(abs(row['trackerThetaDeg'])>1 for row in daytime['samples']))
        self.assertGreater(daytime['summary']['rearIncidentWhm2'],0)
        for i,row in enumerate(req['weather']['records']):
            row.update(timestamp=f'2017-04-01T{5+i:02d}:00:00Z',ghiWm2=0,dniWm2=0,dhiWm2=0)
        out=worker.run_study(req)
        for row in out['samples']:
            for key in ['effectiveIrradianceWm2','rearIncidentWm2','acW','rearEffectiveIrradianceWm2']:
                self.assertEqual(row[key],0)

    def test_strict_geometry_clearance_slope_and_provenance_contract(self):
        for key,value in [('gcr',0),('bifaciality',1.1),('rearShadeLossPct',-1),('heightM',True),('heightM',100),('rearIamB',float('nan')),('temperatureIrradiance','automatic')]:
            req=request();req['system']['rowIrradiance'][key]=value
            with self.assertRaises(worker.InputError):worker.validate(req)
        for key in ROWS:
            req=request();del req['system']['rowIrradiance'][key]
            with self.assertRaises(worker.InputError):worker.validate(req)
        for change in [dict(axisTiltDeg=5),dict(crossAxisTiltDeg=1),dict(gcr=.5)]:
            req=request();req['system']['tracking']=dict(TRACK,**change)
            with self.assertRaises(worker.InputError):worker.validate(req)
        req=request(heightM=.1)
        with self.assertRaisesRegex(worker.InputError,'ground'):worker.validate(req)
        req=request();req['system']['rowIrradiance']['extra']=1
        with self.assertRaises(worker.InputError):worker.validate(req)
        req=request();req['system']['rowIrradiance']=None
        with self.assertRaises(worker.InputError):worker.validate(req)

    def test_annual_hourly_within_resource_and_output_contract(self):
        req=request(heightM=10);req['system']['tracking']=dict(TRACK)
        idx=pd.date_range('2024-01-01T01:00:00Z','2025-01-01T00:00:00Z',freq='h')
        req['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=0,dniWm2=0,dhiWm2=0,tempAirC=20,windSpeedMs=1) for t in idx]
        out=worker.run_study(req)
        self.assertTrue(out['manifest']['period']['completeUtcCalendarYear'])
        self.assertEqual(len(out['samples']),8784)
        self.assertLess(len(json.dumps(out,separators=(',',':')).encode()),16*1024*1024)
        req['weather']['records'].append(req['weather']['records'][-1])
        with self.assertRaisesRegex(worker.InputError,'8784'):worker.validate(req)


if __name__=='__main__':
    unittest.main()
