"""Actual packages + pinned upstream tests; NOT field-accuracy qualification."""
import contextlib
import copy
import importlib.machinery
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from services.pvlib_research.reference_models import pvdeg_acceleration,pvice_massflow,coherent_optics,evidence

ROOT=Path(__file__).resolve().parents[1]


def fixture(name):return json.loads((ROOT/f'docs/examples/references/{name}.json').read_text())['plan']


class ReferenceModels(unittest.TestCase):
    def test_reference_hashes(self):
        subprocess.run([sys.executable,str(ROOT/'scripts/acquire_reference_data.py')],check=True)

    def test_full_year_upstream_pvdeg_chain(self):
        import pvdeg
        evidence(['docs/reference-data/pvdeg/weather.csv'])
        weather,meta=pvdeg.weather.read(str(ROOT/'docs/reference-data/pvdeg/weather.csv'),'psm')
        with contextlib.redirect_stdout(io.StringIO()):
            poa=pvdeg.spectral.poa_irradiance(weather,meta);module_temp=pvdeg.temperature.module(weather,meta,poa=poa);temp=pvdeg.temperature.cell(weather,meta,poa=poa);rh=pvdeg.humidity.surface_relative(weather.relative_humidity,weather.temp_air,module_temp)
            vant=pvdeg.degradation.vantHoff_deg(weather,meta,1000,60);iwa=pvdeg.degradation.IwaVantHoff(weather,meta)
        p=fixture('pvdeg');p['records']=[dict(timestamp=t.isoformat(),irradianceWm2=float(poa.poa_global.iloc[i]),temperatureC=float(temp.iloc[i]),rhPct=float(rh.iloc[i])) for i,t in enumerate(weather.index)]
        o=pvdeg_acceleration(p)['output'];self.assertEqual(len(weather),8760)
        # Tolerances are copied from the pinned upstream tests, not fitted to our run.
        self.assertAlmostEqual(o['accelerationFactor'],12.804,delta=.1);self.assertAlmostEqual(vant,8.178,delta=.01);self.assertAlmostEqual(iwa,240.28,delta=.05)
        self.assertEqual(o['totalHours'],8760)
        print('UPSTREAM PVDeg replay AF=',o['accelerationFactor'],'VantHoff=',vant,'Iwa=',iwa)

    def test_pvdeg_closed_form_constant_exposure(self):
        p=fixture('pvdeg');p['records']=p['records'][:1];p['records'][0].update(irradianceWm2=500,temperatureC=25,rhPct=50)
        expected=(1000/500)**.5*(15/50)*math.exp(40000/8.31446261815324*(1/298.15-1/333.15))
        self.assertAlmostEqual(pvdeg_acceleration(p)['output']['accelerationFactor'],expected)
        p['activationEnergyKjMol']=0;p['humidityExponent']=0;p['irradianceExponent']=0;p['records'][0].update(irradianceWm2=0,rhPct=0)
        self.assertEqual(pvdeg_acceleration(p)['output']['accelerationFactor'],1)

    def test_pvdeg_darkness_and_double_count(self):
        p=fixture('pvdeg')
        for r in p['records']:r['irradianceWm2']=0
        with self.assertRaises(ValueError):pvdeg_acceleration(p)
        p=fixture('pvdeg');p['alreadyAppliedMechanisms']=['aging']
        with self.assertRaises(ValueError):pvdeg_acceleration(p)

    def test_actual_upstream_pvice_tests(self):
        path=ROOT/'docs/reference-data/pvice/upstream-tests.txt';cwd=os.getcwd()
        try:
            with tempfile.TemporaryDirectory() as directory,contextlib.redirect_stdout(io.StringIO()):
                for local,remote in [('test-module.csv','baseline_module_test.csv'),('test-glass.csv','baseline_material_test.csv')]:shutil.copyfile(ROOT/'docs/reference-data/pvice'/local,Path(directory)/remote)
                os.chdir(directory);loader=importlib.machinery.SourceFileLoader('frozen_pvice_test',str(path));spec=importlib.util.spec_from_loader(loader.name,loader);module=importlib.util.module_from_spec(spec);loader.exec_module(module)
                # Three unmodified upstream functions, not the full upstream suite.
                module.test_project_lifetime();module.test_infinite_Weibull();module.test_landfilledArea_vs_AreafromWaste()
        finally:os.chdir(cwd)
        self.assertEqual(os.getcwd(),cwd)

    def test_pvice_adapter_units_horizon_and_scaling(self):
        p=fixture('pvice');p['baseline']='upstream_test';p['installationScale']=1;cwd=os.getcwd();o=pvice_massflow(p)['output'];self.assertEqual(os.getcwd(),cwd);self.assertEqual(len(o['trace']),100)
        first=o['trace'][0];self.assertEqual(first['year'],1995);self.assertAlmostEqual(first['installedMw'],100);self.assertAlmostEqual(first['areaM2'],1e6);self.assertAlmostEqual(first['virginStockKg'],1e7);self.assertEqual(first['scrapKg'],0)
        p['installationScale']=.5;scaled=pvice_massflow(p)['output'];self.assertAlmostEqual(scaled['totals']['usedInModulesKg'],.5*o['totals']['usedInModulesKg'])
        for row in scaled['trace']:self.assertAlmostEqual(row['manufacturingResidualKg'],0,delta=1e-6);self.assertAlmostEqual(row['landfillResidualKg'],0,delta=1e-6)

    def test_pvice_real_baseline_no_collection(self):
        p=fixture('pvice');p['collectionPct']=0;o=pvice_massflow(p)['output'];self.assertGreater(o['totals']['landfillKg'],0);self.assertGreater(o['totals']['virginStockKg'],0)
        self.assertEqual(o['trace'][0]['year'],1995)

    def test_tmm_mathematica_golden(self):
        p=fixture('optics');o=coherent_optics(p)['output'];self.assertAlmostEqual(o['trace'][0]['reflectance'],.37273208839139516,places=13);self.assertAlmostEqual(o['trace'][0]['transmittance'],.22604491247079261,places=13)
        p['polarization']='p';o=coherent_optics(p)['output'];self.assertAlmostEqual(o['trace'][0]['reflectance'],.37016110373044969,places=13);self.assertAlmostEqual(o['trace'][0]['transmittance'],.22824374314132009,places=13)

    def test_tmm_fresnel_quarter_wave_and_passivity(self):
        p=fixture('optics');p.update(angleDeg=0,polarization='unpolarized',wavelengthNm=[500,501]);p['layers']=[dict(thicknessNm=None,n=[1,1],k=[0,0],source='Analytic vacuum interface reference'),dict(thicknessNm=None,n=[1.5,1.5],k=[0,0],source='Analytic dielectric interface reference')];o=coherent_optics(p)['output'];self.assertAlmostEqual(o['trace'][0]['reflectance'],.04);self.assertAlmostEqual(o['trace'][0]['transmittance'],.96)
        n=math.sqrt(1.5);p['layers'].insert(1,dict(thicknessNm=500/(4*n),n=[n,n],k=[0,0],source='Analytic quarter-wave antireflection film'))
        o=coherent_optics(p)['output'];self.assertAlmostEqual(o['trace'][0]['reflectance'],0,places=13);self.assertAlmostEqual(o['residualWm2'],0,places=13)
        for angle in (0,30,60,80):
            for polarization in ('s','p','unpolarized'):
                p=fixture('optics');p.update(angleDeg=angle,polarization=polarization);o=coherent_optics(p)['output']
                for r in o['trace']:self.assertAlmostEqual(r['reflectance']+r['transmittance']+r['absorptance'],1);self.assertGreaterEqual(r['absorptance'],0)

    def test_literature_silicon_constants_fresnel_and_film(self):
        import yaml
        evidence(['docs/reference-data/silicon/Green-2008.yml','docs/reference-data/silicon/LICENSE.txt'])
        data=yaml.safe_load((ROOT/'docs/reference-data/silicon/Green-2008.yml').read_text())
        self.assertIn('10.1016/j.solmat.2008.06.009',data['REFERENCES'])
        p=fixture('silicon');film=coherent_optics(p)['output'];self.assertGreater(film['absorbedWm2'],0)
        p['layers'].pop();p['layers'][-1]['thicknessNm']=None
        o=coherent_optics(p)['output']
        for i,row in enumerate(o['trace']):
            n=p['layers'][-1]['n'][i];k=p['layers'][-1]['k'][i];expected=((n-1)**2+k*k)/((n+1)**2+k*k)
            self.assertAlmostEqual(row['reflectance'],expected,places=12);self.assertAlmostEqual(row['transmittance'],1-expected,places=12)

    def test_optics_reject_extrapolation_and_clamping(self):
        for mutation in [lambda p:p['layers'][1]['n'].append(1),lambda p:p['layers'][1].update(thicknessNm=1e6),lambda p:p['layers'][0]['k'].__setitem__(0,.1),lambda p:p.update(wavelengthNm=[100,100])]:
            p=fixture('optics');mutation(p)
            with self.assertRaises(ValueError):coherent_optics(p)

    def test_strict_contract_and_immutable_boundaries(self):
        for name,fn in [('pvdeg',pvdeg_acceleration),('pvice',pvice_massflow),('optics',coherent_optics)]:
            p=fixture(name);before=copy.deepcopy(p);r=fn(p);self.assertEqual(before,p);self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['safetyApproval'],'not_assessed');self.assertEqual(r['status'],'insufficient_evidence')
            p['path']='/etc/passwd'
            with self.assertRaises(ValueError):fn(p)

    def test_offline_fresh_process_actual_engines(self):
        code="import socket; deny=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('network denied')); socket.socket.connect=deny; socket.socket.connect_ex=deny; socket.socket.sendto=deny; socket.create_connection=deny; socket.getaddrinfo=deny; from scripts.test_reference_models import fixture; from services.pvlib_research.reference_models import *; [f(fixture(n)) for n,f in [('pvdeg',pvdeg_acceleration),('pvice',pvice_massflow),('optics',coherent_optics)]]"
        subprocess.run([sys.executable,'-c',code],check=True,timeout=90,cwd=ROOT)


if __name__=='__main__':unittest.main()
