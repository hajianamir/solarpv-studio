"""Tracker numerical/orchestration tests. Synthetic inputs, not field validation.
Independent flat-ground oracle uses vector projection and a shade-free root,
not pvlib's tracking routines. ModelChain parity is a separate wiring test.
"""
import copy
import math
import json
import unittest
import numpy as np
import pandas as pd
import pvlib
from test_worker import BASE, worker

TRACK = dict(axisTiltDeg=0, axisAzimuthDeg=180, maxAngleDeg=60,
             backtrack=True, gcr=.4, crossAxisTiltDeg=0)


def request(**changes):
    req = copy.deepcopy(BASE)
    req['system']['tracking'] = dict(TRACK, **changes)
    return req


def flat_oracle(zenith, azimuth, axis, limit, gcr, backtrack):
    """Horizontal-axis projected beam optimum and no-overlap bisection.
    Projected row width cos(ideal-theta) must not exceed pitch projection
    cos(ideal)/GCR. All angles here are radians, unlike request/output.
    """
    z, az = math.radians(zenith), math.radians(azimuth-axis)
    ideal = math.atan2(math.sin(z)*math.sin(az), math.cos(z))
    theta = ideal
    if backtrack and math.cos(ideal)/gcr < 1:
        lo, hi = 0., abs(ideal)
        for _ in range(80):
            mid = (lo+hi)/2
            if math.cos(abs(ideal)-mid) <= math.cos(ideal)/gcr:
                lo = mid
            else:
                hi = mid
        theta = math.copysign((lo+hi)/2, ideal)
    return max(-limit, min(limit, math.degrees(theta)))


class TrackingTests(unittest.TestCase):
    def test_true_tracking_vector_oracle_and_rotation_limit(self):
        for axis in [0, 90, 180, 270]:
            actual = worker.run_study(request(axisAzimuthDeg=axis, backtrack=False, maxAngleDeg=25))
            for row in actual['samples']:
                expected = flat_oracle(row['solarZenithDeg'], row['solarAzimuthDeg'], axis, 25, .4, False)
                self.assertAlmostEqual(row['trackerThetaDeg'], expected, places=10)
                self.assertAlmostEqual(row['surfaceTiltDeg'], abs(expected), places=10)
                # Independently reconstruct incidence using unit vectors.
                z, az = math.radians(row['solarZenithDeg']), math.radians(row['solarAzimuthDeg'])
                tilt, face = math.radians(row['surfaceTiltDeg']), math.radians(row['surfaceAzimuthDeg'])
                sun = [math.sin(z)*math.sin(az), math.sin(z)*math.cos(az), math.cos(z)]
                normal = [math.sin(tilt)*math.sin(face), math.sin(tilt)*math.cos(face), math.cos(tilt)]
                dot = sum(a*b for a,b in zip(sun, normal))
                aoi = math.degrees(math.acos(max(-1,min(1,dot))))
                self.assertAlmostEqual(row['aoiDeg'], aoi, places=9)

    def test_backtracking_independent_shadow_projection_and_gcr_sensitivity(self):
        # Early/late synthetic daylight intervals ensure backtracking actually activates.
        low, high = [], []
        for gcr, rows in [(.2,low), (.8,high)]:
            req = request(gcr=gcr, maxAngleDeg=90)
            req['weather']['records'] = [dict(row, timestamp=f'2017-04-01T{hour:02d}:00:00Z')
                for row,hour in zip(req['weather']['records'],range(14,20))]
            actual = worker.run_study(req)
            for row in actual['samples']:
                expected = flat_oracle(row['solarZenithDeg'],row['solarAzimuthDeg'],180,90,gcr,True)
                self.assertAlmostEqual(row['trackerThetaDeg'],expected,places=9)
                rows.append(abs(row['trackerThetaDeg']))
        self.assertTrue(any(a>b+1 for a,b in zip(low,high)), 'fixture must witness GCR backtracking sensitivity')

    def test_documented_sign_convention(self):
        # Published API convention: south axis, +30 west, -90 east.
        orientation = pvlib.tracking.calc_surface_orientation(np.array([30.,-90.]),axis_tilt=0,axis_azimuth=180)
        np.testing.assert_allclose(orientation['surface_tilt'],[30,90],atol=1e-12)
        np.testing.assert_allclose(orientation['surface_azimuth'],[270,90],atol=1e-12)

    def test_tilted_axis_separate_modelchain_oracle(self):
        req = request(axisTiltDeg=12, crossAxisTiltDeg=7, gcr=.7)
        req['system']['additionalDcLossPct'] = 0
        actual = worker.run_study(req)
        s, t, site = req['system'], req['system']['tracking'], req['site']
        mid = pd.to_datetime([r['timestamp'] for r in req['weather']['records']],utc=True)-pd.Timedelta(minutes=30)
        weather = pd.DataFrame(req['weather']['records'],index=mid).rename(columns=dict(ghiWm2='ghi',dniWm2='dni',dhiWm2='dhi',tempAirC='temp_air',windSpeedMs='wind_speed'))
        weather['pressure'] = pvlib.atmosphere.alt2pres(site['altitudeM'])
        mount = pvlib.pvsystem.SingleAxisTrackerMount(axis_tilt=t['axisTiltDeg'],axis_azimuth=t['axisAzimuthDeg'],max_angle=t['maxAngleDeg'],backtrack=t['backtrack'],gcr=t['gcr'],cross_axis_tilt=t['crossAxisTiltDeg'])
        array = pvlib.pvsystem.Array(mount=mount,albedo=s['albedo'],module_parameters=dict(pdc0=s['arrayPdc0W'],gamma_pdc=s['gammaPdcPerC'],b=s['iamB']),temperature_model_parameters=s['temperature'])
        system = pvlib.pvsystem.PVSystem(arrays=[array],inverter_parameters=dict(pdc0=s['inverterPdc0W'],eta_inv_nom=s['inverterEtaNom'],eta_inv_ref=s['inverterEtaRef']))
        location = pvlib.location.Location(site['latitude'],site['longitude'],altitude=site['altitudeM'],tz=site['timezone'])
        chain = pvlib.modelchain.ModelChain(system,location,solar_position_method='nrel_numpy',transposition_model='haydavies',aoi_model='ashrae',spectral_model='no_loss',temperature_model='sapm',dc_model='pvwatts',ac_model='pvwatts',losses_model='no_loss')
        chain.run_model(weather)
        for key,expected in [('aoiDeg',chain.results.aoi),('poaGlobalWm2',chain.results.total_irrad.poa_global),('cellTemperatureC',chain.results.cell_temperature),('dcW',chain.results.dc),('acW',chain.results.ac)]:
            np.testing.assert_allclose([r[key] for r in actual['samples']],expected,rtol=1e-10,atol=1e-8)

    def test_cross_axis_slope_is_not_ignored(self):
        a = request(gcr=.9,crossAxisTiltDeg=-15)
        b = request(gcr=.9,crossAxisTiltDeg=15)
        ra, rb = worker.run_study(a), worker.run_study(b)
        self.assertTrue(any(abs(x['trackerThetaDeg']-y['trackerThetaDeg'])>1 for x,y in zip(ra['samples'],rb['samples'])))
        self.assertNotEqual(ra['manifest']['inputSha256'],rb['manifest']['inputSha256'])

    def test_night_axis_neutral_park_is_not_weather_imputation(self):
        req = request(axisTiltDeg=15)
        req['weather']['records'] = [dict(row,timestamp=f'2017-04-01T{hour:02d}:00:00Z',ghiWm2=0,dniWm2=0,dhiWm2=0) for row,hour in zip(req['weather']['records'],range(5,11))]
        actual = worker.run_study(req)
        self.assertEqual(actual['request'],req)
        for row in actual['samples']:
            self.assertEqual(row['trackerThetaDeg'],0)
            self.assertEqual(row['trackerActive'],0)
            self.assertAlmostEqual(row['surfaceTiltDeg'],15,places=10)
            self.assertAlmostEqual(row['surfaceAzimuthDeg'],180,places=10)
            self.assertEqual(row['acW'],0)
        self.assertEqual(actual['summary']['acWh'],0)

    def test_tracker_zero_rotation_matches_fixed_surface_and_dc_accounting(self):
        fixed = copy.deepcopy(BASE)
        fixed['system']['surfaceTiltDeg'] = 0
        tracked = request(maxAngleDeg=0)
        a,b = worker.run_study(fixed),worker.run_study(tracked)
        for key in ['dcBeforeAdditionalLossWh','dcWh','acWh']:
            self.assertAlmostEqual(a['summary'][key],b['summary'][key],places=8)
        for row in b['samples']:
            self.assertAlmostEqual(row['dcW'],row['dcBeforeAdditionalLossW']*.95,places=9)
        tracked['system']['surfaceTiltDeg']=80
        tracked['system']['surfaceAzimuthDeg']=5
        c = worker.run_study(tracked)
        self.assertEqual(b['summary'],c['summary'],'inactive fixed reference must not influence tracker')

    def test_max_record_leap_year_tracker_output_fits_process_limit(self):
        req = request()
        req['weather']['intervalMinutes'] = 30
        idx = pd.date_range('2024-01-01T00:30:00Z','2025-01-01T00:00:00Z',freq='30min')
        req['weather']['records'] = [dict(timestamp=t.isoformat(),ghiWm2=0,dniWm2=0,dhiWm2=0,tempAirC=20,windSpeedMs=1) for t in idx]
        out = worker.run_study(req)
        self.assertEqual(len(out['samples']),17568)
        self.assertTrue(out['manifest']['period']['completeUtcCalendarYear'])
        self.assertEqual(out['summary']['acWh'],0)
        self.assertLess(len(json.dumps(out,separators=(',',':')).encode()),16*1024*1024)

    def test_strict_tracker_contract(self):
        for key,value in [('gcr',0),('maxAngleDeg',91),('axisTiltDeg',-1),('crossAxisTiltDeg',31),('backtrack',1),('gcr',True),('axisAzimuthDeg',float('nan'))]:
            with self.subTest(key=key,value=value):
                req = request();req['system']['tracking'][key]=value
                with self.assertRaises(worker.InputError):worker.validate(req)
        for key in TRACK:
            req = request();del req['system']['tracking'][key]
            with self.assertRaises(worker.InputError):worker.validate(req)
        req = request();req['system']['tracking']['unknown']=1
        with self.assertRaises(worker.InputError):worker.validate(req)
        req = request();req['system']['tracking']=None
        with self.assertRaises(worker.InputError):worker.validate(req)


if __name__ == '__main__':
    unittest.main()
