"""Independent IV bisection/grid and Kirchhoff evidence; synthetic, not field data."""
import copy
import json
import unittest
import numpy as np
import pandas as pd
from test_electrical import E, independent_current, request, worker
from test_sandia import request as sandia_request

CABLE=dict(source='SYNTHETIC fixed design-temperature round-trip resistance, not project data',quality='assumed',topology='uniform_strings_shared_home_run',stringLoopResistanceOhm=1.2,sharedLoopResistanceOhm=.3)


def cable_request():
    r=request();r['system']['additionalDcLossPct']=0
    r['system']['electrical']['dcCable']=copy.deepcopy(CABLE)
    return r


class DcCableTests(unittest.TestCase):
    def test_independent_iv_dense_grid_and_terminal_constraints(self):
        # Independent generating IV points: scalar bisection of diode equation,
        # no pvlib or scipy in oracle. Test interior, voltage and current bounds.
        for minv,maxv,limit in [(200,800,30),(200,320,30),(400,800,12)]:
            e=copy.deepcopy(E);e.update(dcCable=copy.deepcopy(CABLE),mpptMinV=minv,mpptMaxV=maxv,maxInputCurrentA=limit)
            power,cols,_,gap=worker.electrical_dc(e,pd.Series([1000.]),pd.Series([25.]),8800)
            resistance=1.2/4+.3
            candidates=[]
            for module_v in np.linspace(0,65,64001):
                module_i=independent_current(float(module_v))
                if module_i is None:continue
                current=module_i*4;array_v=module_v*10
                terminal=array_v-current*resistance
                if minv<=terminal<=maxv and current<=limit:candidates.append(terminal*current)
            self.assertTrue(candidates)
            self.assertGreaterEqual(power.iloc[0]+1e-5,max(candidates))
            self.assertLess(power.iloc[0]-max(candidates),1.5)
            i=cols['operatingCurrentA'].iloc[0];v=cols['operatingVoltageV'].iloc[0]
            self.assertAlmostEqual(independent_current(cols['arrayOperatingVoltageV'].iloc[0]/10)*4,i,places=7)
            self.assertAlmostEqual(cols['dcCableLossW'].iloc[0],i*i*resistance,places=9)
            self.assertAlmostEqual(cols['arrayOperatingVoltageV'].iloc[0]-v,i*resistance,places=9)
            self.assertAlmostEqual(cols['arrayMppW'].iloc[0],power.iloc[0]+cols['dcCableLossW'].iloc[0]+gap.iloc[0],places=7)

    def test_zero_resistance_preserves_original_operating_points(self):
        r=cable_request();a=copy.deepcopy(r);a['system']['electrical'].pop('dcCable')
        r['system']['electrical']['dcCable'].update(stringLoopResistanceOhm=0,sharedLoopResistanceOhm=0)
        x,y=worker.run_study(a),worker.run_study(r)
        for old,new in zip(x['samples'],y['samples']):
            for key in old:self.assertEqual(old[key],new[key])
            self.assertEqual(new['dcCableLossW'],0)
        self.assertEqual(x['summary']['dcWh'],y['summary']['dcWh'])

    def test_resistance_sensitivity_and_energy_no_double_subtraction(self):
        r=cable_request();x=worker.run_study(r)
        r['system']['electrical']['dcCable']['sharedLoopResistanceOhm']=1
        y=worker.run_study(r)
        self.assertLess(y['summary']['dcWh'],x['summary']['dcWh'])
        for out in (x,y):
            s=out['summary']
            self.assertAlmostEqual(s['availableMppWh'],s['dcWh']+s['mpptConstraintLossWh']+s['dcCableLossWh'],places=7)
            self.assertEqual(s['dcWh'],s['dcBeforeAdditionalLossWh'])
            self.assertAlmostEqual(s['dcCableLossWh'],sum(v['dcCableLossWh'] for v in out['monthly']),places=8)

    def test_string_and_shared_topology_equivalence(self):
        a=cable_request();b=copy.deepcopy(a)
        # Four identical parallel string loops: 1.2/4 + .3 == 2.4/4 + 0.
        b['system']['electrical']['dcCable'].update(stringLoopResistanceOhm=2.4,sharedLoopResistanceOhm=0)
        x,y=worker.run_study(a),worker.run_study(b)
        self.assertEqual(x['samples'],y['samples'])
        for parameter in ('stringLoopResistanceOhm','sharedLoopResistanceOhm'):
            r=copy.deepcopy(a);r['system']['electrical']['dcCable'][parameter]*=2
            self.assertLess(worker.run_study(r)['summary']['dcWh'],x['summary']['dcWh'])

    def test_sandia_uses_terminal_voltage_and_power(self):
        r=sandia_request();r['system']['electrical']['dcCable']=copy.deepcopy(CABLE)
        out=worker.run_study(r)
        from test_sandia import independent
        for row in out['samples']:
            self.assertAlmostEqual(row['inverterNetAcW'],independent(row['operatingVoltageV'],row['dcW'],r['system']['sandia']),places=7)

    def test_dark_shutdown_and_no_feasible_current_window(self):
        e=copy.deepcopy(E);e['dcCable']=copy.deepcopy(CABLE);e['mpptMaxV']=220;e['maxInputCurrentA']=.1
        p,c,_,_=worker.electrical_dc(e,pd.Series([0.,1000.]),pd.Series([25.,25.]),8800)
        self.assertEqual(list(c['dcOperatingState']),[0,4])
        self.assertEqual(list(p),[0,0]);self.assertEqual(list(c['dcCableLossW']),[0,0])

    def test_full_leap_year_output_bound_and_utc_monthly_energy(self):
        # Resource/serialization fixture only; not operational weather or annual validity.
        r=cable_request()
        dates=pd.date_range('2024-01-01T01:00:00Z','2025-01-01T00:00:00Z',freq='h')
        r['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=500 if t.hour==18 else 0,dniWm2=0,dhiWm2=500 if t.hour==18 else 0,tempAirC=25,windSpeedMs=1) for t in dates]
        out=worker.run_study(r)
        self.assertEqual(len(out['samples']),8784)
        self.assertLess(len(json.dumps(out).encode()),16*1024*1024)
        self.assertEqual(len(out['monthly']),12)
        self.assertGreater(out['summary']['dcCableLossWh'],0)
        self.assertAlmostEqual(out['summary']['dcCableLossWh'],sum(m['dcCableLossWh'] for m in out['monthly']),places=7)

    def test_strict_cable_contract(self):
        for key,value in [('stringLoopResistanceOhm',-1),('sharedLoopResistanceOhm',float('nan')),('sharedLoopResistanceOhm',True),('topology','asymmetric'),('source',' '),('quality','verified')]:
            r=cable_request();r['system']['electrical']['dcCable'][key]=value
            with self.subTest(key=key),self.assertRaises(worker.InputError):worker.validate(r)
        r=cable_request();r['system']['additionalDcLossPct']=1
        with self.assertRaises(worker.InputError):worker.validate(r)
