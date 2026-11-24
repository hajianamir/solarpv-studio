"""Actual tmm all-incoherent normal-incidence adapter, not technology EQE."""
import math
import numpy as np
from .science_d import header
from .electrical import keys
from .portfolio import numeric_fields,result
from .reference_models import runtime,evidence


def incoherent_optics(p):
    header(p,'incoherent-optics-v1',('incidence','coherenceBasis','wavelengthNm','irradianceWm2Nm','layers'))
    if p['incidence']!='normal':raise ValueError('Normal incidence only')
    if not isinstance(p['coherenceBasis'],str) or not 20<=len(p['coherenceBasis'].strip())<=1000:raise ValueError('Explicit physical incoherence justification required')
    w=p['wavelengthNm'];g=p['irradianceWm2Nm'];layers=p['layers']
    if not isinstance(w,list) or not 2<=len(w)<=256 or not isinstance(g,list) or len(g)!=len(w) or not isinstance(layers,list) or not 3<=len(layers)<=12:raise ValueError('Optical grid/layer budget')
    for i,(x,y) in enumerate(zip(w,g)):
        numeric_fields(dict(w=x,g=y),dict(w=(20,4000),g=(0,10)))
        if i and x<=w[i-1]:raise ValueError('Increasing exact optical grid')
    for j,l in enumerate(layers):
        keys(l,('thicknessNm','n','k','source'))
        if not isinstance(l['source'],str) or not 10<=len(l['source'].strip())<=1000:raise ValueError('Optical provenance')
        if j in (0,len(layers)-1):
            if l['thicknessNm'] is not None:raise ValueError('Semi-infinite outer media')
        else:
            numeric_fields(l,dict(thicknessNm=(.01,1e9)))
            if l['thicknessNm']<10*max(w):raise ValueError('Declared incoherent layers must be >=10 maximum wavelengths; still requires physical justification')
        if not isinstance(l['n'],list) or not isinstance(l['k'],list) or len(l['n'])!=len(w) or len(l['k'])!=len(w):raise ValueError('No interpolation/extrapolation')
        for nr,ki in zip(l['n'],l['k']):numeric_fields(dict(n=nr,k=ki),dict(n=(.01,10),k=(0,10)))
        if j in (0,len(layers)-1) and any(l['k']):raise ValueError('Nonabsorbing outer media required')
    for l in layers[1:-1]:
        if any(4*math.pi*ki*l['thicknessNm']/x>60 for ki,x in zip(l['k'],w)):raise ValueError('Reject upstream opacity clamp region')
    import tmm
    rt=runtime('tmm','0.2.0',tmm.tmm_core);trace=[]
    for i,x in enumerate(w):
        indices=[complex(l['n'][i],l['k'][i]) for l in layers];d=[float('inf') if l['thicknessNm'] is None else l['thicknessNm'] for l in layers]
        s=tmm.inc_tmm('s',indices,d,['i']*len(layers),0,x);r=float(s['R']);t=float(s['T']);a=1-r-t
        if any(not math.isfinite(v) or v< -1e-9 for v in [r,t,a]):raise ValueError('Optical passivity')
        trace.append(dict(wavelengthNm=x,reflectance=r,transmittance=t,absorptance=a))
    integrate=lambda values:float(np.trapezoid(values,w))
    incident=integrate(g);reflected=integrate([y*r['reflectance'] for y,r in zip(g,trace)]);transmitted=integrate([y*r['transmittance'] for y,r in zip(g,trace)]);absorbed=integrate([y*r['absorptance'] for y,r in zip(g,trace)])
    return result(p,'incoherent_optics',dict(runtime=rt,referenceHashes=evidence(['docs/reference-data/tmm/upstream-tests.txt','docs/reference-data/tmm/LICENSE.txt','docs/reference-data/tmm/engine-source.txt']),trace=trace,incidentWm2=incident,reflectedWm2=reflected,transmittedWm2=transmitted,absorbedWm2=absorbed,residualWm2=incident-reflected-transmitted-absorbed,scope='Actual tmm0.2.0 all-incoherent planar intensity transport at normal incidence, nonabsorbing outer media. Thickness threshold is an admission guard, not proof of incoherence. Caller must justify phase averaging. No mixed coherent stack, roughness, scattering, depth absorption, measured EQE, electrical output or technology qualification.'),'insufficient_evidence')
