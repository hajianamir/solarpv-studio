"""Balanced three-phase signed cable circuit; independent bisection and sensitive witnesses."""
import copy
import math
import json
from datetime import datetime,timedelta,timezone
import unittest
import pandas as pd
from test_worker import BASE,worker
from test_ac_plant import root as transformer_root,PLANT
from test_auxiliary_schedule import scheduled
from test_inverter_blocks import request as blocks_request

C=dict(source='SYNTHETIC explicit impedance',quality='assumed',topology='balanced_three_phase_lv',resistancePerPhaseOhm=.4,receivingLineVoltageV=400,maxCurrentA=100)

def cable_root(pin,c):
    # Bisect signed output on the monotone receiving-voltage circuit, not quadratic formula.
    k=c['resistancePerPhaseOhm']/c['receivingLineVoltageV']**2
    lo=-math.sqrt(3)*c['receivingLineVoltageV']*c['maxCurrentA'];hi=-lo
    if k and 1+2*k*lo<=0:lo=-.499999999/k
    for _ in range(100):
        mid=(lo+hi)/2
        if mid+k*mid*mid>pin:hi=mid
        else:lo=mid
    return (lo+hi)/2

class AcCableTests(unittest.TestCase):
    def test_independent_signed_circuit_and_sensitivity(self):
        for patch in [{},{'resistancePerPhaseOhm':0},{'resistancePerPhaseOhm':.8},{'receivingLineVoltageV':500}]:
            c=dict(C,**patch);inputs=pd.Series([-1000.,0.,1000.,10000.]);ac,col=worker.ac_plant({'acCable':c},inputs)
            for i,pin in enumerate(inputs):
                expected=cable_root(pin,c);current=abs(expected)/(math.sqrt(3)*c['receivingLineVoltageV'])
                self.assertAlmostEqual(ac[i]-col['gridImportW'][i],expected,places=8)
                self.assertAlmostEqual(col['acCableLossW'][i],3*c['resistancePerPhaseOhm']*current*current,places=8)
            if patch.get('resistancePerPhaseOhm')==0:self.assertEqual(list(col['acCableLossW']),[0,0,0,0])
        base=worker.ac_plant({'acCable':C},pd.Series([10000.]))[0][0]
        for patch in [{'resistancePerPhaseOhm':.8},{'receivingLineVoltageV':500}]:self.assertGreater(abs(worker.ac_plant({'acCable':dict(C,**patch)},pd.Series([10000.]))[0][0]-base),1)

    def test_analytical_frozen_point(self):
        # Pout=10000 W, R=.4 Ohm, Vll=400 V => loss=250 W, Pin=10250 W.
        for output,pin in [(10000,10250),(-10000,-9750)]:
            ac,col=worker.ac_plant({'acCable':C},pd.Series([float(pin)]))
            self.assertAlmostEqual(ac[0]-col['gridImportW'][0],output,places=8)
            self.assertAlmostEqual(col['acCableLossW'][0],250,places=8)

    def test_full_chain_order_blocks_and_monthly(self):
        r=scheduled(blocks_request());r['system'].update(acCable=copy.deepcopy(C),transformer=PLANT['transformer'],acExportLimitW=100)
        out=worker.run_study(r)
        for row in out['samples']:
            pin=row['acPlantInputW']-row['auxiliaryConsumptionW'];cable=cable_root(pin,C);net=transformer_root(cable,PLANT['transformer'])
            self.assertAlmostEqual(row['acW'],min(100,max(0,net)),places=8)
            self.assertAlmostEqual(row['gridImportW'],max(0,-net),places=8)
        self.assertAlmostEqual(out['summary']['acCableLossWh'],sum(row['acCableLossW'] for row in out['samples']))
        self.assertEqual(out['summary']['acCableLossWh'],out['monthly'][0]['acCableLossWh'])

    def test_night_and_domain_current_rejections(self):
        r=copy.deepcopy(BASE);r['system'].update(acCable=copy.deepcopy(C),auxiliaryPowerW=100)
        for w in r['weather']['records']:w.update(ghiWm2=0,dniWm2=0,dhiWm2=0)
        out=worker.run_study(r);self.assertGreater(out['summary']['gridImportWh'],600)
        with self.assertRaises(worker.InputError):worker.ac_plant({'acCable':dict(C,maxCurrentA=.1)},pd.Series([1000.]))
        with self.assertRaises(worker.InputError):worker.ac_plant({'acCable':dict(C,resistancePerPhaseOhm=100,receivingLineVoltageV=1)},pd.Series([-1.]))
        r['system']['acCable']['resistancePerPhaseOhm']=-1
        with self.assertRaises(worker.InputError):worker.validate(r)
        r=blocks_request();r['system']['inverterBlocks'][0]['system']['acCable']=C
        with self.assertRaises(worker.InputError):worker.validate(r)

    def test_full_budget_night_output_and_overbudget(self):
        r=copy.deepcopy(BASE);r['system'].update(acCable=copy.deepcopy(C),auxiliaryPowerW=40)
        template=copy.deepcopy(r['weather']['records'][0]);template.update(ghiWm2=0,dniWm2=0,dhiWm2=0);start=datetime(2024,1,1,tzinfo=timezone.utc)
        r['weather']['records']=[dict(template,timestamp=(start+timedelta(hours=i+1)).isoformat()) for i in range(8784)]
        out=worker.run_study(r);self.assertLess(len(json.dumps(out,allow_nan=False).encode()),16*1024*1024)
        self.assertGreater(out['summary']['acCableLossWh'],0);self.assertEqual(len(out['monthly']),12)
        r['weather']['records'].append(dict(template,timestamp=(start+timedelta(hours=8785)).isoformat()))
        with self.assertRaises(worker.InputError):worker.validate(r)
