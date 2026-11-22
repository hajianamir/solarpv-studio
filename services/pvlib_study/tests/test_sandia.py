"""Independent Sandia polynomial, boundary/energy checks. Not field validation.
Nine coefficients: pvlib 0.13.1 bundled CEC SMA_America__SB8000TL_US__240V_.
Declared domain in fixture is SYNTHETIC TEST ONLY, not manufacturer evidence.
"""
import copy
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np
import pandas as pd
from test_worker import worker
from test_electrical import request as diode_request
from test_tracking import TRACK
from test_rows import ROWS

INV=json.loads(Path(__file__).with_name('sandia-reference-parameters.json').read_text())


def request():
    req=diode_request()
    req['system'].update(sandia=INV.copy(),inverterPdc0W=INV['Pdco'],additionalDcLossPct=0)
    return req


def independent(v,p,inv):
    if p<inv['Pso']:return -inv['Pnt']
    delta=v-inv['Vdco']
    a=inv['Pdco']*(1+inv['C1']*delta)
    b=inv['Pso']*(1+inv['C2']*delta)
    c=inv['C0']*(1+inv['C3']*delta)
    return min(inv['Paco'],(inv['Paco']/(a-b)-c*(a-b))*(p-b)+c*(p-b)**2)


def solve(v,p,inv=None):
    return worker.sandia_ac(inv or INV,pd.Series(v,dtype=float),pd.Series(p,dtype=float))


class SandiaTests(unittest.TestCase):
    def test_independent_polynomial_and_voltage_sensitivity(self):
        volts=[250,379,550,379,379,379]
        dc=[4000,4000,4000,INV['Pdco'],10000,INV['Pso']]
        ac,cols=solve(volts,dc)
        expected=[independent(v,p,INV) for v,p in zip(volts,dc)]
        np.testing.assert_allclose(cols['inverterNetAcW'],expected,atol=1e-9,rtol=0)
        np.testing.assert_allclose(ac,np.maximum(expected,0),atol=1e-9,rtol=0)
        self.assertGreater(abs(ac.iloc[0]-ac.iloc[2]),1)
        self.assertAlmostEqual(ac.iloc[3],8000,places=8)
        self.assertEqual(ac.iloc[4],8000)

    def test_startup_dc_threshold_and_night(self):
        # Actual pvlib rule is p_dc<Pso, not p_dc<B or p_ac<Pso.
        p=[0,INV['Pso']-1e-8,INV['Pso'],INV['Pso']+1e-8]
        v=[0,250,250,250]
        _,cols=solve(v,p)
        self.assertEqual(cols['inverterNetAcW'].iloc[0],-2.4)
        self.assertEqual(cols['inverterNetAcW'].iloc[1],-2.4)
        self.assertAlmostEqual(cols['inverterNetAcW'].iloc[2],independent(250,p[2],INV),places=10)
        self.assertNotEqual(cols['inverterNetAcW'].iloc[2],-2.4)

    def test_each_coefficient_has_independent_sensitive_witness(self):
        for key,delta in [('Paco',-100),('Pdco',100),('Vdco',10),('Pso',10),('C0',-1e-6),('C1',1e-4),('C2',1e-3),('C3',1e-3),('Pnt',1)]:
            inv=INV.copy();inv[key]+=delta
            v,p=(0,0) if key=='Pnt' else (450,4000)
            _,cols=solve([v],[p],inv)
            value=cols['inverterNetAcW'].iloc[0]
            self.assertAlmostEqual(value,independent(v,p,inv),places=8)
            self.assertGreater(abs(value-independent(v,p,INV)),1e-6,key)

    def test_no_pvwatts_inverter_and_inactive_eta(self):
        req=request()
        with patch('pvlib.inverter.pvwatts',side_effect=AssertionError('double inverter')):
            before=worker.run_study(req)
        req['system']['inverterEtaNom']=.8
        after=worker.run_study(req)
        for key in ('samples','summary','monthly'):self.assertEqual(before[key],after[key])

    def test_combined_tracker_rows_thermal_export_balance(self):
        req=request();req['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),faiman=dict(u0=30,u1=5,windHeightM=10),acExportLimitW=100)
        out=worker.run_study(req)
        expected_import=expected_export=0
        dt=req['weather']['intervalMinutes']/60
        for row in out['samples']:
            net=independent(row['operatingVoltageV'],row['dcW'],INV)
            self.assertAlmostEqual(row['inverterNetAcW'],net,places=8)
            self.assertAlmostEqual(row['acW'],min(max(0,net),100),places=8)
            expected_export+=min(max(0,net),100)*dt
            expected_import+=max(0,-net)*dt
        self.assertAlmostEqual(out['summary']['acWh'],expected_export)
        self.assertAlmostEqual(out['summary']['netGridWh'],expected_export-expected_import)
        self.assertGreater(out['summary']['acExportLimitLossWh'],0)

    def test_zero_export_does_not_cancel_night_import(self):
        req=request();req['system']['acExportLimitW']=0
        for row in req['weather']['records']:
            for k in ('ghiWm2','dniWm2','dhiWm2'):row[k]=0
        out=worker.run_study(req)
        self.assertEqual(out['summary']['acWh'],0)
        self.assertAlmostEqual(out['summary']['inverterSelfConsumptionWh'],2.4*6)
        self.assertAlmostEqual(out['summary']['netGridWh'],-2.4*6)
        self.assertEqual(out['summary']['acExportLimitLossWh'],0)
        self.assertAlmostEqual(out['monthly'][0]['netGridWh'],out['summary']['netGridWh'])

    def test_annual_resource_and_output_contract(self):
        req=request();req['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),faiman=dict(u0=30,u1=5,windHeightM=10),acExportLimitW=100)
        idx=pd.date_range('2024-01-01T01:00:00Z','2025-01-01T00:00:00Z',freq='h')
        req['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=0,dniWm2=0,dhiWm2=0,tempAirC=20,windSpeedMs=1) for t in idx]
        out=worker.run_study(req)
        self.assertEqual(len(out['samples']),8784)
        self.assertTrue(out['manifest']['period']['completeUtcCalendarYear'])
        self.assertAlmostEqual(out['summary']['netGridWh'],-8784*2.4,places=6)
        self.assertLess(len(json.dumps(out,separators=(',',':')).encode()),16*1024*1024)
        self.assertAlmostEqual(sum(m['netGridWh'] for m in out['monthly']),out['summary']['netGridWh'],places=6)

    def test_strict_contract_rejections(self):
        for patch_ in [dict(Pdco=9000),dict(Paco=10000),dict(Pso=0),dict(Vdco=100),dict(C1=.1),dict(C2=.1),dict(Pnt=-1),dict(Pnt=True),dict(modelMaxDcPowerW=5000),dict(extra=1)]:
            req=request();req['system']['sandia'].update(patch_)
            with self.assertRaises(worker.InputError):worker.run_study(req)
        for key in INV:
            req=request();del req['system']['sandia'][key]
            with self.assertRaises(worker.InputError):worker.run_study(req)
        req=request();del req['system']['electrical']
        with self.assertRaises(worker.InputError):worker.run_study(req)
        req=request();req['system']['additionalDcLossPct']=5
        with self.assertRaises(worker.InputError):worker.run_study(req)

    def test_domain_and_nonphysical_fit_rejection(self):
        for v,p in [(100,4000),(900,4000),(379,13000)]:
            with self.assertRaisesRegex(worker.InputError,'domain'):solve([v],[p])
        inv=INV.copy();inv['Paco']=12000
        with self.assertRaisesRegex(worker.InputError,'exceeds DC'):solve([379],[4000],inv)


if __name__=='__main__':unittest.main()
