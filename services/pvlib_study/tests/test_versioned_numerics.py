"""Frozen analytical/published numbers; expectations never come from pvlib output.

These verify library equations separately from existing full-worker routing tests.
No operational weather, accuracy estimate or calibration is implied.
"""
import json
from pathlib import Path
import unittest
import hashlib
import pandas as pd
from test_worker import worker
import pvlib

REFERENCE = Path(__file__).resolve().parents[3] / 'docs/reference/study-independent-numerics-v2.json'


class VersionedNumericsTests(unittest.TestCase):
    def test_frozen_heat_and_inverter_references(self):
        ref = json.loads(REFERENCE.read_text())
        self.assertEqual(ref['schemaVersion'], 'study-independent-numerics-v2')
        tolerance = ref['absoluteTolerance']
        self.assertGreater(tolerance, 0)
        self.assertLessEqual(tolerance, 1e-9)
        for row in ref['heat']:
            with self.subTest(heat=row):
                actual = pvlib.temperature.pvsyst_cell(
                    row['poa'], row['ambient'], wind_speed=row['wind'],
                    u_c=row['uc'], u_v=row['uv'], module_efficiency=row['eta'],
                    alpha_absorption=row['alpha'])
                self.assertAlmostEqual(actual, row['expectedC'], delta=tolerance)
        for row in ref['pvwatts']:
            with self.subTest(inverter=row):
                actual = pvlib.inverter.pvwatts(
                    row['dcW'], row['dcLimitW'], eta_inv_nom=row['etaNom'], eta_inv_ref=.9637)
                self.assertAlmostEqual(actual, row['expectedW'], delta=tolerance)

    def test_references_detect_sensitive_parameter_mutations(self):
        ref = json.loads(REFERENCE.read_text())
        r = ref['heat'][1]
        for parameter in ['uc', 'uv', 'eta', 'alpha']:
            changed = dict(r)
            changed[parameter] *= 1.1
            actual = pvlib.temperature.pvsyst_cell(
                changed['poa'], changed['ambient'], wind_speed=changed['wind'],
                u_c=changed['uc'], u_v=changed['uv'], module_efficiency=changed['eta'],
                alpha_absorption=changed['alpha'])
            self.assertGreater(abs(actual-r['expectedC']), ref['absoluteTolerance'])
        r = ref['pvwatts'][1]
        self.assertGreater(abs(pvlib.inverter.pvwatts(
            r['dcW'], r['dcLimitW'], eta_inv_nom=.95)-r['expectedW']), 1)

    def test_versioned_ground_cable_integration_and_parameter_sources(self):
        ref=json.loads(REFERENCE.read_text())
        for r in ref['ground']:
            actual=pvlib.irradiance.get_ground_diffuse(r['tilt'],r['ghi'],albedo=r['albedo'])
            self.assertAlmostEqual(actual,r['expectedWm2'],delta=ref['absoluteTolerance'])
            if r['tilt']>0:self.assertGreater(abs(pvlib.irradiance.get_ground_diffuse(r['tilt'],r['ghi'],albedo=.3)-r['expectedWm2']),1)
        for r in ref['acCable']:
            _,col=worker.ac_plant({'acCable':dict(resistancePerPhaseOhm=r['R'],receivingLineVoltageV=r['Vll'],maxCurrentA=100)},pd.Series([r['pinW']]))
            self.assertAlmostEqual(col['acCableOutputW'][0],r['poutW'],delta=ref['absoluteTolerance'])
            self.assertAlmostEqual(col['acCableLossW'][0],r['lossW'],delta=ref['absoluteTolerance'])
        from test_auxiliary_schedule import AuxiliaryScheduleTests
        suite=AuxiliaryScheduleTests('test_quarter_hour_month_boundary_and_equivalent_offsets');result=unittest.TestResult();suite.run(result);self.assertTrue(result.wasSuccessful(),result.errors+result.failures)
        self.assertEqual(sum(ref['integration']['powersW'])*ref['integration']['intervalMinutes']/60,ref['integration']['expectedWh'])
        self.assertEqual(len(ref['equationEvidence']),18)
        root=REFERENCE.resolve().parents[2]
        for r in ref['versionedParameterFixtures']:
            self.assertEqual(hashlib.sha256((root/r['path']).read_bytes()).hexdigest(),r['sha256'])
