"""Published pvlib example and independent Kirchhoff/IV-grid checks.
All weather/scenarios are synthetic numerical tests, not field validation.
"""
import copy
import json
import math
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np
import pandas as pd
from test_worker import BASE, worker
from test_tracking import TRACK
from test_rows import ROWS

E = json.loads(Path(__file__).with_name('desoto-reference-parameters.json').read_text())


def request():
    req=copy.deepcopy(BASE)
    req['system']['arrayPdc0W']=8800
    req['system']['electrical']=copy.deepcopy(E)
    return req


def solve(e=None,g=None,t=None,nameplate=8800):
    return worker.electrical_dc(e or E,pd.Series(g if g is not None else [1000.,800.]),pd.Series(t if t is not None else [25.,25.]),nameplate)


def independent_current(voltage,g=1000.,t=25.):
    # Independent scalar Shockley/Kirchhoff bisection, no pvlib/scipy solver.
    tk=t+273.15;ref=298.15;k=8.617333262145e-5
    il=g/1000*(E['iLRefA']+E['alphaScAperC']*(t-25))
    eg=E['egRefEv']*(1+E['dEgdTPerK']*(t-25))
    io=E['iORefA']*(tk/ref)**3*math.exp(E['egRefEv']/(k*ref)-eg/(k*tk))
    a=E['aRefV']*tk/ref;rsh=E['rShRefOhm']*1000/g
    def residual(i):
        junction=voltage+i*E['rSOhm']
        return il-io*math.expm1(junction/a)-junction/rsh-i
    if residual(0)<0:return None # beyond open circuit: not a generating point
    lo,hi=0.,il
    for _ in range(65):
        mid=(lo+hi)/2
        if residual(mid)>0:lo=mid
        else:hi=mid
    return (lo+hi)/2


class ElectricalTests(unittest.TestCase):
    def test_six_published_example_points(self):
        # pvlib v0.13.1 gallery/iv-modeling/plot_singlediode.html, rounded table.
        g=[1000,800,600,400,400,400];t=[55,55,55,25,40,55]
        _,columns,_,_=solve(g=g,t=t)
        np.testing.assert_allclose(columns['arrayVocV']/10,[52.129783,51.483033,50.649228,56.987478,53.238567,49.474044],atol=8e-6,rtol=0)
        np.testing.assert_allclose(columns['arrayVmpV']/10,[39.614016,39.867812,39.956701,47.278408,43.490203,39.735025],atol=8e-6,rtol=0)
        np.testing.assert_allclose(columns['arrayMppW']/40,[187.868473,151.725757,114.355380,89.204377,82.676791,75.977656],atol=8e-6,rtol=0)

    def test_operating_points_independent_iv_equation(self):
        for cap in [30.,10.]:
            e=dict(E,maxInputCurrentA=cap)
            dc,cols,_,_=solve(e,g=[1000.,800.],t=[25.,45.])
            for i,(g,t) in enumerate([(1000.,25.),(800.,45.)]):
                v=cols['operatingVoltageV'].iloc[i];actual=cols['operatingCurrentA'].iloc[i]
                expected=independent_current(v/10,g,t)*4
                self.assertAlmostEqual(actual,expected,places=7)
                self.assertAlmostEqual(dc.iloc[i],v*actual,places=7)
                self.assertLessEqual(actual,cap+1e-7)

    def test_voltage_and_current_boundaries_against_independent_dense_grid(self):
        scenarios=[dict(E),dict(E,mpptMaxV=350),dict(E,mpptMinV=500),dict(E,maxInputCurrentA=10),dict(E,mpptMaxV=350,maxInputCurrentA=5)]
        seen=[]
        for e in scenarios:
            dc,cols,_,_=solve(e,g=[1000.],t=[25.]);seen.append(int(cols['dcOperatingState'].iloc[0]))
            best=0.
            for voltage in np.linspace(e['mpptMinV'],e['mpptMaxV'],5001):
                module_current=independent_current(float(voltage)/10)
                if module_current is None:continue
                current=module_current*4
                if current<=e['maxInputCurrentA']+1e-10:best=max(best,float(voltage)*current)
            self.assertGreaterEqual(float(dc.iloc[0])+1e-4,best)
            self.assertLessEqual(float(dc.iloc[0]),best+10)
        self.assertEqual(seen,[1,2,2,3,4])

    def test_current_boundary_moves_voltage_instead_of_clipping_current_at_mpp(self):
        _,unlimited,_,_=solve()
        _,limited,_,_=solve(dict(E,maxInputCurrentA=10))
        self.assertTrue((limited['operatingVoltageV']>unlimited['operatingVoltageV']).all())
        np.testing.assert_allclose(limited['operatingCurrentA'],10,atol=1e-7)
        np.testing.assert_allclose(limited['dcOperatingState'],3)

    def test_uniform_series_parallel_scaling(self):
        p,a,_,_=solve()
        p2,b,_,_=solve(dict(E,stringsInParallel=2),nameplate=4400)
        np.testing.assert_allclose(p2,p/2,rtol=1e-9)
        np.testing.assert_allclose(b['operatingVoltageV'],a['operatingVoltageV'],rtol=1e-9)
        np.testing.assert_allclose(b['operatingCurrentA'],a['operatingCurrentA']/2,rtol=1e-9)
        p3,c,_,_=solve(dict(E,modulesPerString=5,mpptMinV=100,mpptMaxV=400,maxDcV=500),nameplate=4400)
        np.testing.assert_allclose(p3,p/2,rtol=1e-9)
        np.testing.assert_allclose(c['operatingVoltageV'],a['operatingVoltageV']/2,rtol=1e-9)

    def test_night_and_no_voltage_window_are_explicit_states(self):
        dc,cols,_,loss=solve(g=[0.,0.],t=[20.,20.])
        np.testing.assert_array_equal(dc,0);np.testing.assert_array_equal(loss,0)
        for values in cols.values():np.testing.assert_array_equal(values,0)
        dc,cols,_,_=solve(dict(E,mpptMinV=650,mpptMaxV=800))
        np.testing.assert_array_equal(dc,0);np.testing.assert_array_equal(cols['dcOperatingState'],4)

    def test_voc_and_nameplate_rejections_are_not_clipped_success(self):
        with self.assertRaisesRegex(worker.InputError,'2%'):solve(nameplate=10000)
        with self.assertRaisesRegex(worker.InputError,'cold-design'):solve(dict(E,maxDcV=650,mpptMaxV=600))
        with self.assertRaisesRegex(worker.InputError,'sample string Voc'):solve(dict(E,designMinCellTemperatureC=25,designMaxEffectiveIrradianceWm2=1000,maxDcV=650,mpptMaxV=600),g=[1000.],t=[-50.])
        with self.assertRaisesRegex(worker.InputError,'temperature'):solve(t=[200.,200.])
        _,_,checks,_=solve(dict(E,designMinCellTemperatureC=25,designMaxEffectiveIrradianceWm2=1000),g=[1200.],t=[20.])
        self.assertEqual(checks['designEnvelopeExceededIntervals'],1)
        req=request();req['system']['electrical']['designMinCellTemperatureC']=25
        for row in req['weather']['records']:row['tempAirC']=-30
        out=worker.run_study(req)
        self.assertTrue(any('declared electrical design' in warning for warning in out['manifest']['warnings']))

    def test_legacy_gamma_and_nameplate_do_not_scale_diode_power(self):
        a=request();b=copy.deepcopy(a);b['system']['gammaPdcPerC']=0;b['system']['arrayPdc0W']*=1.01
        x,y=worker.run_study(a),worker.run_study(b)
        self.assertEqual(x['samples'],y['samples']);self.assertEqual(x['summary'],y['summary'])

    def test_row_tracker_combination_and_no_second_pvwatts_dc_call(self):
        req=request();req['system']['tracking']=dict(TRACK);req['system']['rowIrradiance']=dict(ROWS)
        with patch('pvlib.pvsystem.pvwatts_dc',side_effect=AssertionError('must not call PVWatts DC in diode mode')):
            out=worker.run_study(req)
        self.assertGreater(out['summary']['dcWh'],0)
        self.assertGreater(out['summary']['rearEffectiveWhm2'],0)
        for row in out['samples']:
            self.assertAlmostEqual(row['dcBeforeAdditionalLossW'],row['operatingVoltageV']*row['operatingCurrentA'],places=8)
            self.assertAlmostEqual(row['dcW'],row['dcBeforeAdditionalLossW']*.95,places=8)
        self.assertAlmostEqual(out['summary']['availableMppWh'],out['summary']['dcBeforeAdditionalLossWh']+out['summary']['mpptConstraintLossWh'],places=7)

    def test_strict_electrical_contract(self):
        for key,value in [('modulesPerString',1.5),('stringsInParallel',True),('iORefA',0),('mpptMaxV',100),('mpptMaxV',2000),('dEgdTPerK',.0002),('maxInputCurrentA',0)]:
            req=request();req['system']['electrical'][key]=value
            with self.assertRaises(worker.InputError):worker.validate(req)
        for key in E:
            req=request();del req['system']['electrical'][key]
            with self.assertRaises(worker.InputError):worker.validate(req)
        req=request();req['system']['electrical']['extra']=1
        with self.assertRaises(worker.InputError):worker.validate(req)

    def test_annual_resource_and_output_contract(self):
        req=request();req['system']['tracking']=dict(TRACK);req['system']['rowIrradiance']=dict(ROWS)
        idx=pd.date_range('2024-01-01T01:00:00Z','2025-01-01T00:00:00Z',freq='h')
        req['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=0,dniWm2=0,dhiWm2=0,tempAirC=20,windSpeedMs=1) for t in idx]
        out=worker.run_study(req)
        self.assertEqual(len(out['samples']),8784);self.assertTrue(out['manifest']['period']['completeUtcCalendarYear'])
        self.assertLess(len(json.dumps(out,separators=(',',':')).encode()),16*1024*1024)
        req['weather']['records'].append(req['weather']['records'][-1])
        with self.assertRaises(worker.InputError):worker.validate(req)


if __name__=='__main__':unittest.main()
