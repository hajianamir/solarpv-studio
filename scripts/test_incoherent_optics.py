import ast
import inspect
import copy
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest
import numpy as np
from services.pvlib_research.incoherent_optics import incoherent_optics

ROOT=Path(__file__).resolve().parents[1]

def fixture():return json.loads((ROOT/'docs/examples/references/incoherent.json').read_text())['plan']


class IncoherentOptics(unittest.TestCase):
    def test_frozen_engine_relevant_function_bodies(self):
        import tmm
        frozen=ast.parse((ROOT/'docs/reference-data/tmm/engine-source.txt').read_text());installed=ast.parse(Path(inspect.getsourcefile(tmm.tmm_core)).read_text())
        funcs=lambda tree:{n.name:ast.dump(n,include_attributes=False) for n in tree.body if isinstance(n,ast.FunctionDef)}
        a,b=funcs(frozen),funcs(installed)
        # The pinned upstream commit has an unrelated position_resolved overflow fix after PyPI0.2.0.
        self.assertEqual(set(a),set(b));self.assertEqual({k:v for k,v in a.items() if k!='position_resolved'},{k:v for k,v in b.items() if k!='position_resolved'})

    def test_lossless_slab_geometric_series(self):
        p=fixture();p['layers'][1]['k']=[0]*3;o=incoherent_optics(p)['output']
        for r in o['trace']:self.assertAlmostEqual(r['reflectance'],1/13,13);self.assertAlmostEqual(r['transmittance'],12/13,13);self.assertAlmostEqual(r['absorptance'],0,13)

    def test_no_index_contrast(self):
        p=fixture();p['layers'][1].update(n=[1]*3,k=[0]*3);o=incoherent_optics(p)['output'];self.assertTrue(all(abs(r['reflectance'])<1e-14 and abs(r['transmittance']-1)<1e-14 for r in o['trace']))

    def test_absorbing_slab_independent_series(self):
        p=fixture();o=incoherent_optics(p)['output'];n=complex(1.5,.001);r=abs((1-n)/(1+n))**2;tf=abs(2/(1+n))**2*n.real;tb=abs(2*n/(1+n))**2/n.real
        for w,row in zip(p['wavelengthNm'],o['trace']):
            attenuation=math.exp(-4*math.pi*n.imag*10000/w);expected_r=r+tf*tb*r*attenuation**2/(1-r*r*attenuation**2);expected_t=tf*tb*attenuation/(1-r*r*attenuation**2);self.assertAlmostEqual(row['reflectance'],expected_r,13);self.assertAlmostEqual(row['transmittance'],expected_t,13)

    def test_lossless_coherent_phase_average(self):
        import tmm
        p=fixture();p['layers'][1]['k']=[0]*3;expected=incoherent_optics(p)['output']['trace'][0]['reflectance'];values=[]
        for phase in (np.arange(2048)+.5)/2048:
            d=10000+phase*500/(2*1.5);values.append(tmm.coh_tmm('s',[1,1.5,1],[np.inf,d,np.inf],0,500)['R'])
        self.assertAlmostEqual(float(np.mean(values)),expected,12)

    def test_frozen_upstream_three_layer_fixture(self):
        import tmm
        text=(ROOT/'docs/reference-data/tmm/upstream-tests.txt').read_text();self.assertIn("c_list = ['i', 'i', 'i']",text);self.assertIn('d_list = [inf, 567, inf]',text)
        for pol in ['s','p']:
            angles=[math.asin(math.sin(math.pi/3)/n) for n in [1,2,3]];r0=abs(tmm.interface_r(pol,1,2,angles[0],angles[1]))**2;r1=abs(tmm.interface_r(pol,2,3,angles[1],angles[2]))**2;expected=r0+r1*(1-r0)**2/(1-r0*r1);r=tmm.inc_tmm(pol,[1,2,3],[np.inf,567,np.inf],['i']*3,math.pi/3,400);self.assertAlmostEqual(r['R'],expected,13);self.assertAlmostEqual(r['R']+r['T'],1,13)
        # Direct upstream engine check is oblique; adapter deliberately admits normal incidence only.

    def test_multilayer_passivity_and_thickness_loss(self):
        p=fixture();p['layers'].insert(2,dict(thicknessNm=20000,n=[2]*3,k=[.002]*3,source='Synthetic second incoherent layer benchmark'));o=incoherent_optics(p)['output'];self.assertTrue(all(0<=r['absorptance']<=1 for r in o['trace']));self.assertAlmostEqual(o['residualWm2'],0,10)
        p['layers'][1]['thicknessNm']*=2;more=incoherent_optics(p)['output'];self.assertLess(more['transmittedWm2'],o['transmittedWm2'])

    def test_lossless_thickness_independence(self):
        p=fixture();p['layers'][1]['k']=[0]*3;a=incoherent_optics(p)['output']['trace'];p['layers'][1]['thicknessNm']=1e8;b=incoherent_optics(p)['output']['trace'];self.assertEqual(a,b)

    def test_exact_trapezoid_and_zero_spectrum(self):
        p=fixture();o=incoherent_optics(p)['output'];self.assertAlmostEqual(o['incidentWm2'],105);self.assertAlmostEqual(o['reflectedWm2']+o['transmittedWm2']+o['absorbedWm2'],105)
        p['irradianceWm2Nm']=[0]*3;o=incoherent_optics(p)['output'];self.assertEqual(o['incidentWm2'],0);self.assertEqual(o['absorbedWm2'],0)

    def test_reject_coherence_clamp_and_extrapolation(self):
        for mutate in [lambda p:p.update(incidence='oblique'),lambda p:p.update(coherenceBasis='auto'),lambda p:p['layers'][1].update(thicknessNm=500),lambda p:p['layers'][1].update(thicknessNm=1e9),lambda p:p['layers'][1]['n'].pop(),lambda p:p['layers'][-1]['k'].__setitem__(0,.01),lambda p:p.update(wavelengthNm=[500,500,700])]:
            p=fixture();mutate(p)
            with self.assertRaises(ValueError):incoherent_optics(p)

    def test_provenance_runtime_and_immutability(self):
        p=fixture();before=copy.deepcopy(p);r=incoherent_optics(p);self.assertEqual(p,before);self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['status'],'insufficient_evidence');o=r['output'];self.assertEqual(o['runtime']['version'],'0.2.0')
        for path,digest in o['referenceHashes'].items():self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),digest)
        p['path']='/etc/passwd'
        with self.assertRaises(ValueError):incoherent_optics(p)

    def test_offline_fresh_process(self):
        code="import socket;deny=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('network forbidden'));socket.socket.connect=deny;socket.getaddrinfo=deny;from scripts.test_incoherent_optics import fixture;from services.pvlib_research.incoherent_optics import incoherent_optics;incoherent_optics(fixture())"
        subprocess.run([sys.executable,'-c',code],check=True,cwd=ROOT,timeout=30)

if __name__=='__main__':unittest.main()
