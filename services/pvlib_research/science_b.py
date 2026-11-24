"""Bounded B1/B3 research models. No annual-energy/finance adoption."""
import math
import numpy as np
from scipy.optimize import minimize_scalar, least_squares
from scipy.integrate import trapezoid
from .portfolio import bounded, numeric_fields, integer, result
from .electrical import keys
from .shading import visible, vector

Q=1.602176634e-19
H=6.62607015e-34
C=299792458.
K=1.380649e-23
SIGMA=5.670374419e-8


def positive_id(value):
    import re
    if not isinstance(value,str) or not re.fullmatch('[A-Za-z0-9_-]{1,40}',value):raise ValueError('Identity')


def ideal_series(photo,dark,thermal):
    """Series ideal diodes, nonnegative subcell voltages; no bypass/reverse."""
    photo=np.asarray(photo);dark=np.asarray(dark);thermal=np.asarray(thermal)
    def volts(current):return thermal*np.log1p(np.maximum(0,photo-current)/dark)
    high=float(min(photo))
    if high==0:return 0.,volts(0.)
    optimum=minimize_scalar(lambda i:-i*float(sum(volts(i))),bounds=(0,high),method='bounded',options={'xatol':max(1e-12,high*1e-11)})
    if not optimum.success:raise RuntimeError('Ideal circuit MPP failure')
    candidates=[0.,high,float(optimum.x)];current=max(candidates,key=lambda i:i*float(sum(volts(i))))
    return current,volts(current)


def validate_oet(p):
    bounded(p,('schemaVersion','source','contextSha256','dniWm2','airC','skyC','convectionWm2K','emissivity','surfaceGrid','maxRayPairs','temperatureToleranceC','powerRelativeTolerance','patches','triangles','links'))
    if p['schemaVersion']!='oet-patch-v1':raise ValueError('OET version')
    import re
    if not isinstance(p['contextSha256'],str) or not re.fullmatch('[a-f0-9]{64}',p['contextSha256']):raise ValueError('Context hash')
    numeric_fields(p,dict(dniWm2=(0,1500),airC=(-20,70),skyC=(-40,70),convectionWm2K=(1,100),emissivity=(0,1),temperatureToleranceC=(1e-5,5),powerRelativeTolerance=(1e-5,.2)))
    integer(p['surfaceGrid'],1,16);integer(p['maxRayPairs'],1,1000000)
    if not isinstance(p['patches'],list) or not 1<=len(p['patches'])<=6 or not isinstance(p['triangles'],list) or len(p['triangles'])>64:raise ValueError('Mesh budget')
    if len(p['patches'])*(2*p['surfaceGrid'])**2*len(p['triangles'])>p['maxRayPairs']:raise ValueError('Ray pair budget')
    ids=[]
    for patch in p['patches']:
        keys(patch,('id','origin','widthM','heightM','absorptance','photocurrentRefA','saturationRefA','nVtRefV','alphaPerK','bandgapEv'))
        positive_id(patch['id']);ids.append(patch['id']);origin=vector(patch['origin'])
        if not np.isfinite(origin).all():raise ValueError('Geometry')
        numeric_fields(patch,dict(widthM=(.001,10),heightM=(.001,10),absorptance=(.01,1),photocurrentRefA=(.001,100),saturationRefA=(1e-15,.001),nVtRefV=(.005,5),alphaPerK=(0,.002),bandgapEv=(.1,3)))
    if len(set(ids))!=len(ids):raise ValueError('Unique patches')
    triangles=[]
    for tri in p['triangles']:
        if not isinstance(tri,list) or len(tri)!=3:raise ValueError('Triangle')
        a=np.array([vector(v) for v in tri])
        if np.linalg.norm(np.cross(a[1]-a[0],a[2]-a[0]))<1e-10:raise ValueError('Degenerate triangle')
        triangles.append(a)
    seen=set()
    if not isinstance(p['links'],list) or len(p['links'])>15:raise ValueError('Thermal links')
    for link in p['links']:
        keys(link,('a','b','conductanceWK'));numeric_fields(link,dict(conductanceWK=(0,100)))
        pair=tuple(sorted((link['a'],link['b'])))
        if pair in seen or link['a']==link['b'] or any(x not in ids for x in pair):raise ValueError('Unique undirected links')
        seen.add(pair)
    return triangles


def oet_patch(p):
    triangles=validate_oet(p);patches=p['patches'];areas=np.array([x['widthM']*x['heightM'] for x in patches]);absorptance=np.array([x['absorptance'] for x in patches]);ids=[x['id'] for x in patches]
    links=np.zeros((len(ids),len(ids)))
    for edge in p['links']:
        a=ids.index(edge['a']);b=ids.index(edge['b']);g=edge['conductanceWK'];links[a,b]=links[b,a]=g
    def solve(grid):
        visibility=[]
        for patch in patches:
            origin=np.array(patch['origin']);points=np.array([origin+[patch['widthM']*(i+.5)/grid,patch['heightM']*(j+.5)/grid,0] for i in range(grid) for j in range(grid)])
            visibility.append(float(visible(points,np.array([0.,0.,1.]),triangles).mean()))
        irradiance=p['dniWm2']*np.array(visibility);absorbed=irradiance*areas*absorptance
        def ledger(temp):
            kelvin=temp+273.15;ratio=kelvin/298.15
            photo=np.array([x['photocurrentRefA'] for x in patches])*irradiance/1000*(1+np.array([x['alphaPerK'] for x in patches])*(temp-25))
            dark=np.array([x['saturationRefA'] for x in patches])*ratio**3*np.exp(np.array([x['bandgapEv'] for x in patches])*Q/K*(1/298.15-1/kelvin))
            thermal=np.array([x['nVtRefV'] for x in patches])*ratio
            current,voltage=ideal_series(photo,dark,thermal);electric=current*voltage
            convection=p['convectionWm2K']*areas*(temp-p['airC']);radiation=p['emissivity']*SIGMA*areas*(kelvin**4-(p['skyC']+273.15)**4)
            conduction=(links*(temp[:,None]-temp[None,:])).sum(axis=1)
            return absorbed-electric-convection-radiation-conduction,current,voltage,electric,convection,radiation,conduction
        solution=least_squares(lambda t:ledger(t)[0],np.full(len(ids),p['airC']),bounds=(-40,120),xtol=1e-12,ftol=1e-12,gtol=1e-12,max_nfev=100)
        residual,current,voltage,electric,convection,radiation,conduction=ledger(solution.x)
        if not solution.success or max(abs(residual))>1e-6:raise ValueError('OET temperature domain/convergence failure')
        if np.any(electric>absorbed+1e-6):raise ValueError('Electrical extraction exceeds absorbed power')
        trace=[dict(id=ident,areaM2=float(areas[i]),visibleFraction=visibility[i],irradianceWm2=float(irradiance[i]),temperatureC=float(solution.x[i]),voltageV=float(voltage[i]),electricalW=float(electric[i]),absorbedW=float(absorbed[i]),convectionW=float(convection[i]),radiationW=float(radiation[i]),conductionOutW=float(conduction[i]),residualW=float(residual[i])) for i,ident in enumerate(ids)]
        incident=float(sum(irradiance*areas));unblocked=float(sum(areas)*p['dniWm2'])
        return dict(grid=grid,patches=trace,currentA=float(current),voltageV=float(sum(voltage)),powerW=float(sum(electric)),incidentW=incident,blockedW=unblocked-incident,reflectedW=float(sum(irradiance*areas*(1-absorptance))))
    coarse=solve(p['surfaceGrid']);fine=solve(2*p['surfaceGrid']);temperature=max(abs(x['temperatureC']-y['temperatureC']) for x,y in zip(coarse['patches'],fine['patches']));power=abs(coarse['powerW']-fine['powerW'])/max(1e-9,fine['powerW'])
    return result(p,'oet_patch',dict(coarse=coarse,fine=fine,temperatureDeltaC=temperature,powerRelativeDelta=power,numericalGate='passed' if temperature<=p['temperatureToleranceC'] and power<=p['powerRelativeTolerance'] else 'failed_refinement',scope='Horizontal shared patches; vertical direct beam only, opaque triangles, ideal series diodes without bypass/reverse. Steady thermal feedback with lateral conduction; no arbitrary scene/ray-MC/annual yield.'),'insufficient_evidence')


def tandem_spectrum(p):
    bounded(p,('schemaVersion','source','wavelengthNm','irradianceWm2Nm','referenceWm2Nm','topEqe','bottomEqe','normalizationWm2','topJ0Am2','bottomJ0Am2','topNVtV','bottomNVtV'))
    if p['schemaVersion']!='tandem-spectrum-v1':raise ValueError('Tandem version')
    numeric_fields(p,dict(topJ0Am2=(1e-15,.001),bottomJ0Am2=(1e-15,.001),topNVtV=(.005,.2),bottomNVtV=(.005,.2)))
    arrays=[]
    for key in ('wavelengthNm','irradianceWm2Nm','referenceWm2Nm','topEqe','bottomEqe'):
        raw=p[key]
        if not isinstance(raw,list) or not 3<=len(raw)<=4000 or any(type(v) not in (int,float) or not math.isfinite(v) for v in raw):raise ValueError('Finite spectral arrays')
        arrays.append(np.array(raw,dtype=float))
    wave,irr,ref,top,bottom=arrays
    if len({len(a) for a in arrays})!=1 or np.any(np.diff(wave)<=0) or min(wave)<200 or max(wave)>4000:raise ValueError('Exact common increasing grid, no extrapolation')
    if np.any(irr<0) or np.any(ref<0) or max(max(irr),max(ref))>10 or np.any(top<0) or np.any(bottom<0) or np.any(top+bottom>1+1e-12):raise ValueError('Spectral energy/EQE domain')
    raw=float(trapezoid(irr,wave));reference=float(trapezoid(ref,wave));scale=1.
    if p['normalizationWm2'] is not None:
        numeric_fields(p,dict(normalizationWm2=(.001,2000)))
        if raw<=0:raise ValueError('Cannot normalize dark spectrum')
        scale=p['normalizationWm2']/raw
    irr=irr*scale
    photon_factor=wave*1e-9*Q/(H*C)
    photo=[float(trapezoid(irr*eqe*photon_factor,wave)) for eqe in (top,bottom)];reference_photo=[float(trapezoid(ref*eqe*photon_factor,wave)) for eqe in (top,bottom)]
    dark=[p['topJ0Am2'],p['bottomJ0Am2']];thermal=[p['topNVtV'],p['bottomNVtV']]
    current,voltage=ideal_series(photo,dark,thermal);series_power=float(current*sum(voltage));independent=[];independent_i=[];independent_v=[]
    for il,i0,nvt in zip(photo,dark,thermal):
        i,v=ideal_series([il],[i0],[nvt]);independent.append(float(i*sum(v)));independent_i.append(float(i));independent_v.append(float(sum(v)))
    incident=float(trapezoid(irr,wave));four=sum(independent)
    if series_power>four+1e-7 or four>incident+1e-6:raise ValueError('Nonphysical electrical/optical parameters')
    ratio=[a/b if b>0 else None for a,b in zip(photo,reference_photo)]
    return result(p,'tandem_spectrum',dict(integrationRangeNm=[float(wave[0]),float(wave[-1])],rawIncidentWm2=raw,incidentWm2=incident,referenceIncidentWm2=reference,normalizationScale=scale,photocurrentAm2=photo,referencePhotocurrentAm2=reference_photo,currentRatioToReference=ratio,twoTerminal=dict(currentAm2=float(current),subcellVoltageV=voltage.tolist(),powerWm2=series_power),fourTerminal=dict(subcellPowerWm2=independent,subcellCurrentAm2=independent_i,subcellVoltageV=independent_v,powerWm2=four),currentMismatchAm2=abs(photo[0]-photo[1]),scope='Stack-level external EQE on identical finite spectral grid, trapezoid quadrature, ideal diodes. No optical-stack solution, luminescent coupling, series/shunt resistance or technology validation.'),'insufficient_evidence')
