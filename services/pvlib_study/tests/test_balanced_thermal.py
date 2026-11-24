"""Analytic, published and input-override evidence; synthetic only, not calibration."""
import copy
import json
import unittest
import pandas as pd
from test_worker import BASE,worker
from test_tracking import TRACK
from test_rows import ROWS
from test_ac_plant import request as plant_request
P=dict(source='SYNTHETIC analytic test coefficients fitted to test 10 m wind, not a project fit',quality='assumed',uc=29,uv=2,moduleEfficiency=.2,alphaAbsorption=.9,windHeightM=10)
def explicit(r):return dict(source='SYNTHETIC test-only cell temperatures, not measurements',quality='assumed',records=[dict(timestamp=row['timestamp'],cellTemperatureC=v) for row,v in zip(r['weather']['records'],[-10,0,25,40,60,90])])
class BalancedThermalTests(unittest.TestCase):
 def test_independent_heat_equation_and_sensitivity(self):
  for uc,uv,eta,alpha,wind in [(29,0,.1,.9,1),(25,3,.2,.8,0),(25,3,.2,.8,10),(40,2,.4,.5,2)]:
   r=copy.deepcopy(BASE);r['system']['pvsystTemperature']=dict(P,uc=uc,uv=uv,moduleEfficiency=eta,alphaAbsorption=alpha)
   for row in r['weather']['records']:row['windSpeedMs']=wind
   out=worker.run_study(r)
   for s,w in zip(out['samples'],r['weather']['records']):self.assertAlmostEqual(s['cellTemperatureC'],w['tempAirC']+alpha*s['poaGlobalWm2']*(1-eta)/(uc+uv*wind),places=10)
 def test_published_pvlib_example(self):
  # PVlib0.13.1 documented E=1000, Ta=10, Uc=29,Uv=0,eta=.1,alpha=.9.
  import pvlib
  self.assertAlmostEqual(pvlib.temperature.pvsyst_cell(1000,10,wind_speed=1,u_c=29,u_v=0,module_efficiency=.1,alpha_absorption=.9),37.93103448275862,places=12)
 def test_pvsyst_zero_poa_ambient_and_inactive_sapm(self):
  r=copy.deepcopy(BASE);r['system']['pvsystTemperature']=P.copy()
  for row in r['weather']['records']:
   for k in ['ghiWm2','dniWm2','dhiWm2']:row[k]=0
  a=worker.run_study(r)
  for row,w in zip(a['samples'],r['weather']['records']):self.assertEqual(row['cellTemperatureC'],w['tempAirC'])
  r['system']['temperature']=dict(a=-2,b=-.1,deltaT=10)
  self.assertEqual(a['samples'],worker.run_study(r)['samples'])
 def test_pvsyst_rows_thermal_proxy_and_full_chain(self):
  r=plant_request();r['system'].pop('faiman',None);r['system'].update(pvsystTemperature=P.copy(),tracking=TRACK.copy(),rowIrradiance=ROWS.copy())
  out=worker.run_study(r)
  for s,w in zip(out['samples'],r['weather']['records']):
   irradiance=s['poaGlobalWm2']+(s['rearIncidentWm2'] if r['system']['rowIrradiance']['temperatureIrradiance']=='front_plus_rear' else 0)
   self.assertAlmostEqual(s['cellTemperatureC'],w['tempAirC']+P['alphaAbsorption']*irradiance*(1-P['moduleEfficiency'])/(P['uc']+P['uv']*w['windSpeedMs']),places=10)
 def test_explicit_temperatures_exact_dc_and_poa(self):
  r=copy.deepcopy(BASE);before=worker.run_study(r);r['system']['cellTemperatureSchedule']=explicit(r);out=worker.run_study(r)
  for a,b,temp in zip(out['samples'],before['samples'],r['system']['cellTemperatureSchedule']['records']):
   self.assertEqual(a['cellTemperatureC'],temp['cellTemperatureC']);self.assertEqual(a['poaGlobalWm2'],b['poaGlobalWm2']);self.assertEqual(a['effectiveIrradianceWm2'],b['effectiveIrradianceWm2'])
   expected=a['effectiveIrradianceWm2']/1000*r['system']['arrayPdc0W']*(1+r['system']['gammaPdcPerC']*(temp['cellTemperatureC']-25))
   self.assertAlmostEqual(a['dcBeforeAdditionalLossW'],expected,places=8)
 def test_explicit_no_weather_temperature_feedback(self):
  r=copy.deepcopy(BASE);r['system']['cellTemperatureSchedule']=explicit(r);a=worker.run_study(r)
  for row in r['weather']['records']:row['windSpeedMs']=0
  r['system']['temperature']=dict(a=-2,b=-.1,deltaT=10)
  b=worker.run_study(r)
  for x,y in zip(a['samples'],b['samples']):self.assertEqual(x['cellTemperatureC'],y['cellTemperatureC']);self.assertEqual(x['dcW'],y['dcW'])
 def test_schedule_utc_offset_and_missing_rejection(self):
  r=copy.deepcopy(BASE);r['system']['cellTemperatureSchedule']=explicit(r);r['system']['cellTemperatureSchedule']['records'][0]['timestamp']='2017-04-01T10:00:00-07:00';worker.validate(r)
  for mutate in [lambda p:p['records'].pop(),lambda p:p['records'].reverse(),lambda p:p['records'][0].update(timestamp='2017-04-01T17:00:00'),lambda p:p['records'][0].update(cellTemperatureC=True),lambda p:p['records'][0].update(cellTemperatureC=151),lambda p:p['records'][0].pop('cellTemperatureC'),lambda p:p.update(source=' ')]:
   bad=copy.deepcopy(r);mutate(bad['system']['cellTemperatureSchedule'])
   with self.assertRaises(worker.InputError):worker.validate(bad)
 def test_exclusive_and_coefficient_bounds(self):
  for field,value in [('uc',0),('uv',-1),('moduleEfficiency',.51),('alphaAbsorption',0),('windHeightM',2),('quality','invalid')]:
   r=copy.deepcopy(BASE);r['system']['pvsystTemperature']=dict(P,**{field:value})
   with self.assertRaises(worker.InputError):worker.validate(r)
  for other in ['faiman','cellTemperatureSchedule']:
   r=copy.deepcopy(BASE);r['system']['pvsystTemperature']=P.copy();r['system'][other]=dict(u0=30,u1=5,windHeightM=10) if other=='faiman' else explicit(r)
   with self.assertRaisesRegex(worker.InputError,'mutually exclusive'):worker.validate(r)
 def test_unphysical_hot_proxy_rejected(self):
  r=copy.deepcopy(BASE);r['system']['pvsystTemperature']=dict(P,uc=.1,uv=0)
  with self.assertRaisesRegex(worker.InputError,'temperature'):worker.run_study(r)
 def test_max_leap_year_and_output_budget(self):
  r=plant_request();r['system'].pop('faiman',None);r['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy());idx=pd.date_range('2024-01-01T01:00:00Z','2025-01-01T00:00:00Z',freq='h')
  r['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=0,dniWm2=0,dhiWm2=0,tempAirC=20,windSpeedMs=1) for t in idx]
  r['system']['acAvailability']['records']=[dict(timestamp=t.isoformat(),availableFraction=1) for t in idx]
  r['system']['cellTemperatureSchedule']=dict(source='SYNTHETIC workload only',quality='assumed',records=[dict(timestamp=t.isoformat(),cellTemperatureC=20) for t in idx])
  out=worker.run_study(r);self.assertEqual(len(out['samples']),8784);self.assertLess(len(json.dumps(out).encode()),16*1024*1024)
  r['weather']['records'].append(r['weather']['records'][-1])
  with self.assertRaises(worker.InputError):worker.validate(r)
if __name__=='__main__':unittest.main()
