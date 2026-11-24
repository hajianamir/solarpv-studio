"""Operational/numerical regressions, not field validation. No network access required."""
import copy
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch
import numpy as np
import pandas as pd
import pvlib

ROOT = Path(__file__).resolve().parents[3]
WORKER = ROOT/'services/pvlib_study/worker.py'
spec = importlib.util.spec_from_file_location('study_worker', WORKER)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)
BASE = json.loads(Path(__file__).with_name('synthetic-study.json').read_text())

class StudyTests(unittest.TestCase):
    def test_published_sapm_example(self):
        # pvlib 0.13.1 sapm_cell documentation example; independently published value.
        params = pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_glass']
        self.assertAlmostEqual(pvlib.temperature.sapm_cell(1000,10,0,**params),44.11703066106086,places=10)

    def test_published_spa_reference(self):
        # Reda/Andreas SPA reference example, also exercised by pvlib's SPA tests.
        solar=pvlib.solarposition.spa_python(pd.DatetimeIndex(['2003-10-17T12:30:30-07:00']),39.742476,-105.1786,altitude=1830.14,pressure=82000,temperature=11,delta_t=67)
        self.assertAlmostEqual(float(solar.apparent_zenith.iloc[0]),50.111622,places=5)
        self.assertAlmostEqual(float(solar.azimuth.iloc[0]),194.340241,places=5)

    def test_separate_modelchain_oracle(self):
        req=copy.deepcopy(BASE);req['system']['additionalDcLossPct']=0
        actual=worker.run_study(req)
        s=req['system'];site=req['site']
        mid=pd.to_datetime([r['timestamp'] for r in req['weather']['records']],utc=True)-pd.Timedelta(minutes=30)
        weather=pd.DataFrame(req['weather']['records'],index=mid).rename(columns=dict(ghiWm2='ghi',dniWm2='dni',dhiWm2='dhi',tempAirC='temp_air',windSpeedMs='wind_speed'))
        weather['pressure']=pvlib.atmosphere.alt2pres(site['altitudeM'])
        system=pvlib.pvsystem.PVSystem(surface_tilt=s['surfaceTiltDeg'],surface_azimuth=s['surfaceAzimuthDeg'],albedo=s['albedo'],
            module_parameters=dict(pdc0=s['arrayPdc0W'],gamma_pdc=s['gammaPdcPerC'],b=s['iamB']),
            inverter_parameters=dict(pdc0=s['inverterPdc0W'],eta_inv_nom=s['inverterEtaNom'],eta_inv_ref=s['inverterEtaRef']),temperature_model_parameters=s['temperature'])
        location=pvlib.location.Location(site['latitude'],site['longitude'],altitude=site['altitudeM'],tz=site['timezone'])
        chain=pvlib.modelchain.ModelChain(system,location,solar_position_method='nrel_numpy',transposition_model='haydavies',aoi_model='ashrae',spectral_model='no_loss',temperature_model='sapm',dc_model='pvwatts',ac_model='pvwatts',losses_model='no_loss')
        chain.run_model(weather)
        for key, expected in [('poaGlobalWm2',chain.results.total_irrad.poa_global),('cellTemperatureC',chain.results.cell_temperature),('dcW',chain.results.dc),('acW',chain.results.ac)]:
            np.testing.assert_allclose([s[key] for s in actual['samples']],expected,rtol=1e-10,atol=1e-8)

    def test_independent_dc_inverter_and_energy_equations(self):
        result=worker.run_study(BASE);s=BASE['system']
        for row in result['samples']:
            dc=row['effectiveIrradianceWm2']/1000*s['arrayPdc0W']*(1+s['gammaPdcPerC']*(row['cellTemperatureC']-25))
            self.assertAlmostEqual(row['dcBeforeAdditionalLossW'],dc,places=8)
            retained=dc*.95
            zeta=retained/s['inverterPdc0W']
            eta=s['inverterEtaNom']/s['inverterEtaRef']*(-.0162*zeta-.0059/zeta+.9858)
            ac=max(0,min(eta*retained,s['inverterEtaNom']*s['inverterPdc0W']))
            self.assertAlmostEqual(row['dcW'],retained,places=8)
            self.assertAlmostEqual(row['acW'],ac,places=8)
            self.assertAlmostEqual(row['poaGlobalWm2'],row['poaDirectWm2']+row['poaSkyDiffuseWm2']+row['poaGroundDiffuseWm2'],places=9)
        for summary,column in [('dcWh','dcW'),('acWh','acW')]:
            self.assertAlmostEqual(result['summary'][summary],sum(row[column] for row in result['samples']),places=8)
            self.assertAlmostEqual(sum(m[summary] for m in result['monthly']),result['summary'][summary],places=8)
        self.assertFalse(result['manifest']['period']['completeUtcCalendarYear'])
        self.assertEqual(result['samples'][0]['midpointUtc'],'2017-04-01T16:30:00Z')
        self.assertEqual(result['request'],BASE)
        digest=hashlib.sha256(json.dumps(BASE,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()).hexdigest()
        self.assertEqual(result['manifest']['inputSha256'],digest)

    def test_offset_equivalence_and_clipping(self):
        req=copy.deepcopy(BASE)
        for row in req['weather']['records']:
            row['timestamp']=pd.Timestamp(row['timestamp']).tz_convert('Asia/Tehran').isoformat()
        a,b=worker.run_study(BASE),worker.run_study(req)
        self.assertEqual(a['summary'],b['summary']);self.assertNotEqual(a['manifest']['inputSha256'],b['manifest']['inputSha256'])
        req['system']['inverterPdc0W']=5000
        clipped=worker.run_study(req)
        self.assertTrue(all(row['acW']<=4800+1e-9 for row in clipped['samples']))
        self.assertTrue(any(abs(row['acW']-4800)<1e-9 for row in clipped['samples']))
        req['system']['additionalDcLossPct']=100
        self.assertEqual(worker.run_study(req)['summary']['acWh'],0)

    def test_missing_gaps_invalid_and_no_silent_defaults(self):
        mutations=[lambda r:r['weather']['records'][0].pop('windSpeedMs'),lambda r:r['weather']['records'][0].update(timestamp='2017-04-01T17:00:00'),
            lambda r:r['weather']['records'][0].update(timestamp='2017-02-30T17:00:00Z'),lambda r:r['weather']['records'][0].update(timestamp='2017-04-01T24:00:00Z'),
            lambda r:r['weather']['records'][1].update(timestamp=r['weather']['records'][0]['timestamp']),lambda r:r['weather'].update(windHeightM=2),
            lambda r:r['weather']['records'][0].update(ghiWm2=float('nan')),lambda r:r['system'].update(unknownCoefficient=1),
            lambda r:r['system'].update(inverterEtaRef=.8),lambda r:r['system'].update(arrayPdc0W=True),lambda r:r.update(label=' '),
            lambda r:r['weather'].update(timestampConvention='instantaneous')]
        for mutate in mutations:
            req=copy.deepcopy(BASE);mutate(req)
            with self.subTest(req=str(req)[:80]),self.assertRaises(worker.InputError):worker.run_study(req)

    def test_night_and_unsupported_dni(self):
        req=copy.deepcopy(BASE);req['weather']['records']=req['weather']['records'][:2]
        for i,row in enumerate(req['weather']['records']):
            row.update(timestamp=f'2017-04-01T0{7+i}:00:00Z',ghiWm2=0,dniWm2=0,dhiWm2=0)
        self.assertEqual(worker.run_study(req)['summary']['acWh'],0)
        req['weather']['records'][0]['dniWm2']=100
        with self.assertRaisesRegex(worker.InputError,'horizon'):worker.run_study(req)

    def test_leap_year_period_and_resource_limit(self):
        req=copy.deepcopy(BASE);idx=pd.date_range('2024-01-01T01:00:00Z','2025-01-01T00:00:00Z',freq='h')
        req['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=0,dniWm2=0,dhiWm2=0,tempAirC=20,windSpeedMs=1) for t in idx]
        out=worker.run_study(req)
        self.assertEqual(len(idx),8784);self.assertTrue(out['manifest']['period']['completeUtcCalendarYear'])
        self.assertEqual(len(out['monthly']),12)
        req['weather']['records']=[req['weather']['records'][0]]*17569
        with self.assertRaises(worker.InputError):worker.validate(req)

    def test_dependency_mismatch_is_unavailable_not_a_fallback(self):
        with patch.object(worker,'version',return_value='incompatible'):
            with self.assertRaisesRegex(RuntimeError,'version mismatch'):worker.run_study(BASE)

    def test_cli_protocol_and_duplicate_json(self):
        process=subprocess.run([sys.executable,'-I',str(WORKER)],input=json.dumps(BASE),text=True,capture_output=True,check=False)
        self.assertEqual(process.returncode,0,process.stdout+process.stderr)
        self.assertEqual(json.loads(process.stdout)['status'],'completed')
        malformed=subprocess.run([sys.executable,'-I',str(WORKER)],input='{"schemaVersion":1,"schemaVersion":2}',text=True,capture_output=True,check=False)
        self.assertEqual(malformed.returncode,2)
        self.assertEqual(json.loads(malformed.stdout)['status'],'invalid_input')

if __name__=='__main__':unittest.main()
