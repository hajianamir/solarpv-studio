"""IANA policy fixtures and pvlib goldens/closed-form ledgers, not field accuracy."""
import copy
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest
from services.pvlib_research.applied_research import bill_local_ensemble,pv_lcoe_scenarios

ROOT=Path(__file__).resolve().parents[1]


def fixture(n):return json.loads((ROOT/f'docs/examples/applied/{n}.json').read_text())['plan']


def month(p,name):p['months']=[dict(month=name,energyKwh=300)];return p


class AppliedResearch(unittest.TestCase):
    def test_iana_source_and_tzif_provenance(self):
        m=json.loads((ROOT/'docs/reference-data/manifest.json').read_text())
        for r in m['files']:
            self.assertEqual(hashlib.sha256((ROOT/r['path']).read_bytes()).hexdigest(),r['sha256'])
        text=(ROOT/'docs/reference-data/tz/northamerica.txt').read_text();self.assertIn('Sun>=8',text);self.assertIn('Sun>=1',text)
        o=bill_local_ensemble(fixture('local'))['output'];catalog=json.loads((ROOT/'docs/reference-data/tz/tzif-manifest.json').read_text());self.assertEqual(o['zoneFileSha256'],catalog['zones']['America/New_York']);self.assertEqual(o['ianaVersion'],'2025b')

    def test_new_york_spring_gap(self):
        o=bill_local_ensemble(month(fixture('local'),'2024-03'))['output']
        for member in o['members']:
            self.assertEqual(member['monthly'][0]['hours'],743);self.assertAlmostEqual(member['totalKwh'],300)
            self.assertFalse(any(r['localTimestamp'].startswith('2024-03-10T02:') for r in member['records']))
            self.assertTrue(any(r['localTimestamp']=='2024-03-10T03:00:00-04:00' for r in member['records']))

    def test_new_york_fall_fold(self):
        o=bill_local_ensemble(month(fixture('local'),'2024-11'))['output']
        for member in o['members']:
            self.assertEqual(member['monthly'][0]['hours'],721);rows=[r for r in member['records'] if r['localTimestamp'].startswith('2024-11-03T01:00:00')];self.assertEqual(len(rows),2);self.assertEqual([r['fold'] for r in rows],[0,1]);self.assertEqual([r['offsetMinutes'] for r in rows],[-240,-300]);self.assertAlmostEqual(rows[0]['energyKwh'],rows[1]['energyKwh'])

    def test_full_local_leap_year_energy(self):
        p=fixture('local');p['shapes']=p['shapes'][:1];p['months']=[dict(month=f'2024-{m:02d}',energyKwh=m*10) for m in range(1,13)];o=bill_local_ensemble(p)['output']['members'][0];self.assertEqual(len(o['records']),8784);self.assertAlmostEqual(o['totalKwh'],780)
        for r in o['monthly']:self.assertAlmostEqual(r['residualKwh'],0)

    def test_berlin_and_tehran(self):
        p=month(fixture('local'),'2024-03');p['timeZone']='Europe/Berlin';o=bill_local_ensemble(p)['output']['members'][0];self.assertEqual(o['monthly'][0]['hours'],743)
        p['timeZone']='Asia/Tehran';o=bill_local_ensemble(p)['output']['members'][0];self.assertEqual(o['monthly'][0]['hours'],744);self.assertTrue(all(r['offsetMinutes']==210 for r in o['records']))

    def test_half_hour_offset_and_transition(self):
        p=month(fixture('local'),'2024-04');p['timeZone']='Asia/Kolkata';o=bill_local_ensemble(p)['output']['members'][0];self.assertEqual(o['records'][0]['timestamp'],'2024-03-31T18:30:00Z');self.assertEqual(o['monthly'][0]['hours'],720)
        p['timeZone']='Australia/Lord_Howe'
        with self.assertRaises(ValueError):bill_local_ensemble(p)
        p['intervalMinutes']=30;o=bill_local_ensemble(p)['output']['members'][0];self.assertEqual(o['monthly'][0]['hours'],720.5);self.assertTrue(any(r['fold']==1 for r in o['records']));self.assertAlmostEqual(o['totalKwh'],300)

    def test_zero_bill_and_local_shape_ratios(self):
        p=fixture('local');p['months'][0]['energyKwh']=0;o=bill_local_ensemble(p)['output'];self.assertEqual(o['members'][0]['totalKwh'],0)
        p['months'][0]['energyKwh']=300;o=bill_local_ensemble(p)['output']['members'][1];one=next(r['energyKwh'] for r in o['records'] if r['localHour']==0);three=next(r['energyKwh'] for r in o['records'] if r['localHour']==18);self.assertAlmostEqual(three/one,3)

    def test_local_reject_ambiguous_units_and_paths(self):
        for mutate in [lambda p:p.update(unit='USD'),lambda p:p.update(calendar='persian'),lambda p:p.update(timeZone='../../etc/passwd'),lambda p:p.update(intervalMinutes=15),lambda p:p['months'].append(dict(month='2024-05',energyKwh=1)),lambda p:p['shapes'][0].update(hourWeights=[0]*24)]:
            p=fixture('local');mutate(p)
            with self.assertRaises(ValueError):bill_local_ensemble(p)

    def test_actual_pvlib_upstream_goldens(self):
        import pvlib
        self.assertAlmostEqual(float(pvlib.pvsystem.pvwatts_dc(900,30,100,-.003)),88.65)
        self.assertAlmostEqual(float(pvlib.inverter.pvwatts(90,100,.95)),85.58556604752516)
        self.assertEqual(float(pvlib.inverter.pvwatts(0,100)),0);self.assertEqual(float(pvlib.inverter.pvwatts(.001,1)),0)
        self.assertIn('85.58556604752516',(ROOT/'docs/reference-data/pvlib/inverter-tests.txt').read_text())

    def constant(self,poa=1000,year=2023):
        p=fixture('pv');p.update(years=2,realDiscountRate=0,annualDegradationFraction=0,weather=dict(kind='constant_reference',year=year,poaWm2=poa,cellC=25));p['scenarios']=[dict(id='oracle',dcKwp=.09,acKw=.095,gammaPerK=0,inverterEfficiency=.95,staticLossFraction=0,irradianceScale=1,temperatureShiftC=0,capex=1000,annualOpex=10,replacements=[dict(year=2,cost=100)])];return p

    def test_pv_energy_and_lcoe_closed_form(self):
        p=self.constant();o=pv_lcoe_scenarios(p)['output'];x=o['scenarios'][0];e=85.58556604752516*8760/1000;self.assertEqual(o['weatherHours'],8760);self.assertAlmostEqual(x['firstYearAcKwh'],e);self.assertAlmostEqual(x['discountedCost'],1120);self.assertAlmostEqual(x['discountedEnergyKwh'],2*e);self.assertAlmostEqual(x['lcoe'],1120/(2*e))

    def test_pv_discount_degradation_replacement_timing(self):
        p=self.constant();p.update(realDiscountRate=.1,annualDegradationFraction=.01);x=pv_lcoe_scenarios(p)['output']['scenarios'][0];e=x['firstYearAcKwh'];self.assertAlmostEqual(x['discountedCost'],1000+10/1.1+110/1.1**2);self.assertAlmostEqual(x['discountedEnergyKwh'],e/1.1+.99*e/1.1**2)

    def test_pv_clipping_and_static_loss(self):
        p=self.constant();s=p['scenarios'][0];s.update(dcKwp=1,acKw=.5,inverterEfficiency=.96);x=pv_lcoe_scenarios(p)['output']['scenarios'][0];self.assertAlmostEqual(x['firstYearAcKwh'],.5*8760);self.assertGreater(x['inverterClippedKwh'],0)
        s.update(dcKwp=.09,acKw=.095,inverterEfficiency=.95,staticLossFraction=.1);x=pv_lcoe_scenarios(p)['output']['scenarios'][0];expected=float(__import__('pvlib').inverter.pvwatts(81,100,.95))*8760/1000;self.assertAlmostEqual(x['firstYearAcKwh'],expected)

    def test_dark_zero_and_leap_year(self):
        p=self.constant(poa=0,year=2024);o=pv_lcoe_scenarios(p)['output'];self.assertEqual(o['weatherHours'],8784);self.assertEqual(o['scenarios'][0]['firstYearAcKwh'],0);self.assertIsNone(o['scenarios'][0]['lcoe'])
        p['weather']['poaWm2']=1000;x=pv_lcoe_scenarios(p)['output']['scenarios'][0];self.assertAlmostEqual(x['firstYearAcKwh'],85.58556604752516*8784/1000)

    def test_registered_modeled_year_and_nonlinearity(self):
        o=pv_lcoe_scenarios(fixture('pv'))['output'];self.assertEqual(o['weatherYear'],1999);self.assertEqual(o['weatherHours'],8760);self.assertEqual(len(o['referenceHashes']),3);a,b,c=o['scenarios'];self.assertGreater(a['firstYearAcKwh'],0);self.assertGreater(b['firstYearAcKwh'],a['firstYearAcKwh']);self.assertLess(b['firstYearAcKwh'],a['firstYearAcKwh']*1.1);self.assertGreater(c['inverterClippedKwh'],a['inverterClippedKwh'])

    def test_reject_double_count_extreme_and_order(self):
        for mutate in [lambda p:p.update(alreadyAppliedMechanisms=['aging']),lambda p:p.update(baseEnergyBasis='degraded'),lambda p:p.update(weather='file.csv'),lambda p:p['scenarios'][0].update(acKw=.001),lambda p:p['scenarios'][0].update(replacements=[dict(year=2,cost=1),dict(year=1,cost=2)])]:
            p=self.constant();mutate(p)
            with self.assertRaises(ValueError):pv_lcoe_scenarios(p)

    def test_input_immutability_strict_boundary(self):
        for name,fn in [('local',bill_local_ensemble),('pv',pv_lcoe_scenarios)]:
            p=fixture(name);before=copy.deepcopy(p);r=fn(p);self.assertEqual(p,before);self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['validationStatus'],'not_field_validated');p['extra']=1
            with self.assertRaises(ValueError):fn(p)

    def test_fresh_offline_process(self):
        code="import socket; deny=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('network forbidden')); socket.socket.connect=deny; socket.socket.connect_ex=deny; socket.socket.sendto=deny; socket.getaddrinfo=deny; from scripts.test_applied_research import fixture; from services.pvlib_research.applied_research import *; bill_local_ensemble(fixture('local')); pv_lcoe_scenarios(fixture('pv'))"
        subprocess.run([sys.executable,'-c',code],check=True,cwd=ROOT,timeout=60)


if __name__=='__main__':unittest.main()
