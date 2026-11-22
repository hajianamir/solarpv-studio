"""Three optical increments: independent equations, not field validation.
Perez table: Sandia PVPMC Table 1 (Perez 1990 Table 6).
Glazing and spectral coefficients/domain are explicit SYNTHETIC numerical inputs.
"""
import copy
import json
import math
from pathlib import Path
import unittest
import numpy as np
import pandas as pd
import pvlib
from test_worker import BASE, worker
from test_sandia import request as sandia_request
from test_tracking import TRACK
from test_rows import ROWS

OPT=json.loads(Path(__file__).with_name('optical-reference-parameters.json').read_text())
PEREZ=[[-.008,.588,-.062,-.060,.072,-.022],[.130,.683,-.151,-.019,.066,-.029],[.330,.487,-.221,.055,-.064,-.026],[.568,.187,-.295,.109,-.152,-.014],[.873,-.392,-.362,.226,-.462,.001],[1.132,-1.237,-.412,.288,-.823,.056],[1.060,-1.600,-.359,.264,-1.127,.131],[.678,-.327,-.250,.156,-1.377,.251]]


def physical(theta,n,k,length):
    theta=abs(theta)
    if theta>=90:return 0.
    if theta==0:return 1.
    t=math.radians(theta);r=math.asin(math.sin(t)/n)
    reflection=.5*((math.sin(r-t)/math.sin(r+t))**2+(math.tan(r-t)/math.tan(r+t))**2)
    return math.exp(-k*length/math.cos(r))*(1-reflection)/(math.exp(-k*length)*(1-((1-n)/(1+n))**2))


def request():
    req=sandia_request();req['system'].update(copy.deepcopy(OPT));return req


class OpticalModelTests(unittest.TestCase):
    def test_perez_eight_bins_independent_table(self):
        z=math.radians(30);beta=math.radians(40);dhi=100;extra=1366.;am=1.2
        # Same solar/surface azimuth, incidence=10 degrees; use explicit relative AM.
        for coeff,epsilon in zip(PEREZ,[1.03,1.1,1.3,1.7,2.2,3.2,5,7]):
            dni=(epsilon-1)*(1+1.041*z**3)*dhi
            delta=dhi*am/extra
            f1=max(0,coeff[0]+coeff[1]*delta+coeff[2]*z)
            f2=coeff[3]+coeff[4]*delta+coeff[5]*z
            expected=max(0,dhi*((1-f1)*(1+math.cos(beta))/2+f1*math.cos(math.radians(10))/max(math.cos(math.radians(85)),math.cos(z))+f2*math.sin(beta)))
            actual=pvlib.irradiance.perez(40,180,dhi,dni,extra,30,180,am,model='allsitescomposite1990')
            self.assertAlmostEqual(float(actual),expected,places=8)

    def test_perez_worker_routing_and_horizontal_identity(self):
        req=copy.deepcopy(BASE);req['system'].update(skyDiffuseModel='perez',surfaceTiltDeg=0)
        out=worker.run_study(req)
        for row,w in zip(out['samples'],req['weather']['records']):self.assertAlmostEqual(row['poaSkyDiffuseWm2'],w['dhiWm2'],places=8)
        self.assertTrue(out['manifest']['models']['transposition'].startswith('perez '))
        req['system']['surfaceTiltDeg']=40
        alternate=worker.run_study(req)
        req['system'].pop('skyDiffuseModel');legacy=worker.run_study(req)
        self.assertGreater(abs(alternate['summary']['dcWh']-legacy['summary']['dcWh']),1)

    def test_perez_night_zero_and_undefined_airmass_rejected(self):
        req=copy.deepcopy(BASE);req['system']['skyDiffuseModel']='perez'
        for i,row in enumerate(req['weather']['records']):
            row.update(timestamp=f'2017-04-01T{7+i:02d}:00:00Z',ghiWm2=0,dniWm2=0,dhiWm2=0)
        out=worker.run_study(req);self.assertEqual(out['summary']['acWh'],0)
        req['weather']['records'][0]['dhiWm2']=1
        with self.assertRaisesRegex(worker.InputError,'Perez'):worker.run_study(req)

    def test_physical_iam_independent_fresnel_and_parameters(self):
        req=request();p=req['system']['physicalIam']
        for rear in (False,True):
            prefix='rear' if rear else 'front'
            for theta in [0,10,45,70,89,90,120,-45]:
                actual=worker.beam_iam(theta,req['system'],rear=rear)
                self.assertAlmostEqual(float(actual),physical(theta,p[prefix+'N'],p[prefix+'K'],p[prefix+'L']),places=9)
        baseline=float(worker.beam_iam(70,req['system']))
        for key,value in [('frontN',1.8),('frontK',20),('frontL',.01)]:
            modified=copy.deepcopy(req['system']);modified['physicalIam'][key]=value
            self.assertGreater(abs(float(worker.beam_iam(70,modified))-baseline),1e-5)

    def test_physical_legacy_b_inactive_and_thermal_unmodified(self):
        req=request();before=worker.run_study(req)
        req['system']['iamB']=.9;after=worker.run_study(req)
        self.assertEqual(before['samples'],after['samples'])
        req['system'].pop('physicalIam');legacy=worker.run_study(req)
        for a,b in zip(before['samples'],legacy['samples']):
            self.assertEqual(a['cellTemperatureC'],b['cellTemperatureC'])
            self.assertEqual(a['poaGlobalWm2'],b['poaGlobalWm2'])

    def test_spectral_independent_polynomial_and_pressure(self):
        eff=pd.Series([500.,600.,0.]);z=pd.Series([20.,60.,100.]);p=OPT['sapmSpectral']
        corrected,col=worker.spectral_irradiance(eff,z,700,p)
        pressure=100*((44331.514-700)/11880.516)**(1/.1902632)
        for i in (0,1):
            relative=1/(math.cos(math.radians(z[i]))+.50572*(96.07995-z[i])**-1.6364)
            absolute=relative*pressure/101325
            factor=sum(p['A'+str(j)]*absolute**j for j in range(5))
            self.assertAlmostEqual(col['absoluteAirmass'][i],absolute,places=8)
            self.assertAlmostEqual(col['spectralFactor'][i],factor,places=10)
            self.assertAlmostEqual(corrected[i],eff[i]*factor,places=8)
        self.assertEqual(corrected[2],0);self.assertEqual(col['absoluteAirmass'][2],0);self.assertEqual(col['spectralActive'][2],0)

    def test_spectral_coefficient_sensitive_witnesses(self):
        for key in ['A0','A1','A2','A3','A4']:
            p=OPT['sapmSpectral'].copy();p[key]+=.00001
            v,c=worker.spectral_irradiance(pd.Series([500.]),pd.Series([50.]),0,p)
            am=c['absoluteAirmass'].iloc[0]
            self.assertAlmostEqual(v.iloc[0],500*sum(p['A'+str(j)]*am**j for j in range(5)),places=8)
            base,_=worker.spectral_irradiance(pd.Series([500.]),pd.Series([50.]),0,OPT['sapmSpectral'])
            self.assertGreater(abs(v.iloc[0]-base.iloc[0]),1e-5)

    def test_spectral_no_thermal_effect_and_once_after_rows(self):
        req=request();req['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),faiman=dict(u0=30,u1=5,windHeightM=10),acExportLimitW=100)
        out=worker.run_study(req)
        req['system'].pop('sapmSpectral');base=worker.run_study(req)
        for row,original in zip(out['samples'],base['samples']):
            self.assertAlmostEqual(row['spectralInputIrradianceWm2'],row['frontEffectiveIrradianceWm2']+row['rearEffectiveIrradianceWm2'],places=8)
            self.assertAlmostEqual(row['effectiveIrradianceWm2'],original['effectiveIrradianceWm2']*row['spectralFactor'],places=8)
            self.assertEqual(row['cellTemperatureC'],original['cellTemperatureC'])
            self.assertEqual(row['poaGlobalWm2'],original['poaGlobalWm2'])
        req['system']['sapmSpectral']=copy.deepcopy(OPT['sapmSpectral']);req['system'].pop('rowIrradiance');req['system']['skyDiffuseModel']='perez'
        self.assertGreater(worker.run_study(req)['summary']['acWh'],0)

    def test_spectral_rejects_domain_invalid_and_night_active(self):
        for p in [dict(OPT['sapmSpectral'],minAbsoluteAirmass=3),dict(OPT['sapmSpectral'],A0=-5),dict(OPT['sapmSpectral'],A0=5)]:
            with self.assertRaises(worker.InputError):worker.spectral_irradiance(pd.Series([100.]),pd.Series([30.]),0,p)
        with self.assertRaises(worker.InputError):worker.spectral_irradiance(pd.Series([100.]),pd.Series([100.]),0,OPT['sapmSpectral'])

    def test_annual_resource_output_and_record_limit(self):
        req=request();req['system'].update(tracking=TRACK.copy(),rowIrradiance=ROWS.copy(),acExportLimitW=100)
        times=pd.date_range('2024-01-01T01:00:00Z','2025-01-01T00:00:00Z',freq='h')
        req['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=0,dniWm2=0,dhiWm2=0,tempAirC=20,windSpeedMs=1) for t in times]
        out=worker.run_study(req)
        self.assertEqual(len(out['samples']),8784)
        self.assertLess(len(json.dumps(out,separators=(',',':')).encode()),16*1024*1024)
        self.assertTrue(all(row['spectralActive']==0 for row in out['samples']))
        req['weather']['records'].append(req['weather']['records'][-1])
        with self.assertRaises(worker.InputError):worker.validate(req)

    def test_strict_input_contracts(self):
        for patch_ in [dict(skyDiffuseModel='unknown'),dict(physicalIam=dict(OPT['physicalIam'],frontN=1)),dict(sapmSpectral=dict(OPT['sapmSpectral'],minAbsoluteAirmass=11)),dict(physicalIam=dict(OPT['physicalIam'],frontL=True))]:
            req=request();req['system'].update(patch_)
            with self.assertRaises(worker.InputError):worker.run_study(req)
        req=request();req['system'].update(rowIrradiance=ROWS.copy(),skyDiffuseModel='perez')
        with self.assertRaisesRegex(worker.InputError,'no fallback'):worker.run_study(req)
        for obj in ('physicalIam','sapmSpectral'):
            for key in OPT[obj]:
                req=request();del req['system'][obj][key]
                with self.assertRaises(worker.InputError):worker.run_study(req)


if __name__=='__main__':unittest.main()
