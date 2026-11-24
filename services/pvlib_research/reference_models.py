"""Actual optional upstream engines; fixed offline inputs, never finance adoption."""
import contextlib
import hashlib
import inspect
import io
import json
import math
import os
from pathlib import Path
import tempfile
from importlib.metadata import version
import numpy as np
from .portfolio import numeric_fields,integer,stamps,result
from .electrical import keys
from .science_d import header

@contextlib.contextmanager
def restore_directory():
    previous=os.getcwd()
    try:yield
    finally:os.chdir(previous)


ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'docs/reference-data'


def evidence(paths):
    manifest=json.loads((DATA/'manifest.json').read_text());records={r['path']:r for r in manifest['files']};hashes={}
    for path in paths:
        record=records[path];actual=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
        if actual!=record['sha256']:raise ValueError('Frozen reference identity')
        hashes[path]=actual
    return hashes


def runtime(package,pinned,module):
    if version(package)!=pinned:raise RuntimeError('Pinned optional engine required')
    return dict(package=package,version=pinned,engineSourceSha256=hashlib.sha256(Path(inspect.getfile(module)).read_bytes()).hexdigest())


def pvdeg_acceleration(p):
    header(p,'pvdeg-acceleration-v1',('temperatureBasis','intervalHours','chamberIrradianceWm2','chamberRhPct','chamberTemperatureC','activationEnergyKjMol','irradianceExponent','humidityExponent','baseEnergyBasis','alreadyAppliedMechanisms','records'))
    if p['temperatureBasis'] not in ('cell','module'):raise ValueError('Explicit exposure temperature basis')
    numeric_fields(p,dict(intervalHours=(.01,24),chamberIrradianceWm2=(1,2000),chamberRhPct=(.1,100),chamberTemperatureC=(-40,120),activationEnergyKjMol=(0,150),irradianceExponent=(0,2),humidityExponent=(0,5)))
    if p['baseEnergyBasis']!='undegraded' or p['alreadyAppliedMechanisms']!=[]:raise ValueError('Double degradation guard')
    if not isinstance(p['records'],list) or not 1<=len(p['records'])<=8784:raise ValueError('Exposure budget')
    for r in p['records']:
        keys(r,('timestamp','irradianceWm2','temperatureC','rhPct'));numeric_fields(r,dict(irradianceWm2=(0,2000),temperatureC=(-40,120),rhPct=(0,100)))
    stamps(p['records'],p['intervalHours'])
    import pandas as pd
    import pvdeg
    x=p['irradianceExponent'];n=p['humidityExponent'];ea=p['activationEnergyKjMol'];gas=.00831446261815324
    rates=[r['irradianceWm2']**x*r['rhPct']**n*math.exp(-ea/(gas*(r['temperatureC']+273.15))) for r in p['records']]
    average=math.fsum(rates)/len(rates)
    if average<=0:raise ValueError('Zero exposure denominator')
    ref=p['chamberIrradianceWm2']**x*p['chamberRhPct']**n*math.exp(-ea/(gas*(p['chamberTemperatureC']+273.15)))
    df=pd.DataFrame(p['records']);poa=pd.Series(df.irradianceWm2.to_numpy());temp=pd.Series(df.temperatureC.to_numpy());rh=pd.Series(df.rhPct.to_numpy())
    with contextlib.redirect_stdout(io.StringIO()):
        af=float(pvdeg.degradation.arrhenius_deg(pd.DataFrame(index=df.index),{},rh,p['chamberIrradianceWm2'],p['chamberRhPct'],ea,p['chamberTemperatureC'],poa=poa,temp=temp,p=x,n=n))
    if not math.isfinite(af) or abs(af-ref/average)>1e-10*max(1,abs(af)):raise ValueError('PVDeg independent rate oracle')
    hashes=evidence(['docs/reference-data/pvdeg/upstream-tests.txt','docs/reference-data/pvdeg/LICENSE.txt'])
    return result(p,'pvdeg_acceleration',dict(runtime=runtime('pvdeg','0.7.0',pvdeg.degradation),referenceHashes=hashes,chamberRate=ref,meanFieldRate=average,accelerationFactor=af,totalHours=len(rates)*p['intervalHours'],rulStatus='blocked_missing_failure_calibration',scope='Actual PVDeg arrhenius_deg with caller POA/declared exposure temperature/material RH; chamber-to-field rate ratio, no spectral term. Not retention, calibrated RUL, lifetime, physical-accuracy or automatic energy correction.'),'insufficient_evidence')


def pvice_massflow(p):
    header(p,'pvice-massflow-v1',('baseline','installationScale','collectionPct','lifetimeYears'))
    if p['baseline'] not in ('upstream_test','us_glass_baseline'):raise ValueError('Registered baseline only')
    numeric_fields(p,dict(installationScale=(.001,10)))
    if p['collectionPct'] is not None:numeric_fields(p,dict(collectionPct=(0,100)))
    if p['lifetimeYears'] is not None:numeric_fields(p,dict(lifetimeYears=(1,100)))
    import PV_ICE
    names=('test-module.csv','test-glass.csv') if p['baseline']=='upstream_test' else ('us-module.csv','us-glass.csv')
    paths=['docs/reference-data/pvice/'+n for n in names];hashes=evidence(paths+['docs/reference-data/pvice/LICENSE.txt','docs/reference-data/pvice/input-summary.json'])
    engine=runtime('PV_ICE','0.4.3',PV_ICE.main);cwd=os.getcwd()
    try:
        with tempfile.TemporaryDirectory(prefix='solarpv-reference-') as directory,restore_directory(),contextlib.redirect_stdout(io.StringIO()):
            sim=PV_ICE.Simulation(name='bounded',path=directory,baselinepath=str(DATA/'pvice'));sim.createScenario('fixed',massmodulefile=str(ROOT/paths[0]));s=sim.scenario['fixed'];s.addMaterial('glass',massmatfile=str(ROOT/paths[1]))
            s.dataIn_m['new_Installed_Capacity_[MW]']*=p['installationScale']
            if p['collectionPct'] is not None:s.dataIn_m['mod_EOL_collection_eff']=p['collectionPct']
            if p['lifetimeYears'] is not None:s.dataIn_m['mod_lifetime']=p['lifetimeYears']
            sim.calculateMassFlow();material=s.material['glass'].matdataOut_m;trace=[]
            fields=dict(manufacturingInputKg='mat_Manufacturing_Input',usedInModulesKg='mat_UsedSuccessfullyinModuleManufacturing',remfgYieldKg='mat_reMFG_yield',scrapKg='mat_MFG_Scrap',virginStockKg='mat_Virgin_Stock',landfillKg='mat_Total_Landfilled',eolLandfillKg='mat_Total_EOL_Landfilled',manufacturingLandfillKg='mat_Total_MFG_Landfilled')
            for i,row in material.iterrows():
                values={k:float(row[v])/1000 for k,v in fields.items()}
                if any(not math.isfinite(v) or v< -1e-6 for v in values.values()):raise ValueError('PV ICE nonphysical flow')
                m=values['manufacturingInputKg']+values['remfgYieldKg']-values['usedInModulesKg']-values['scrapKg'];land=values['landfillKg']-values['eolLandfillKg']-values['manufacturingLandfillKg']
                if abs(m)>1e-8*max(1,values['manufacturingInputKg']) or abs(land)>1e-8*max(1,values['landfillKg']):raise ValueError('PV ICE stage ledger')
                trace.append(dict(year=int(s.dataIn_m.loc[i,'year']),installedMw=float(s.dataIn_m.loc[i,'new_Installed_Capacity_[MW]']),areaM2=float(s.dataOut_m.loc[i,'Area']),**values,manufacturingResidualKg=m,landfillResidualKg=land))
            if not 1<=len(trace)<=200:raise ValueError('PV ICE horizon budget')
    finally:os.chdir(cwd)
    totals={k:math.fsum(r[k] for r in trace) for k in ('manufacturingInputKg','usedInModulesKg','remfgYieldKg','scrapKg','virginStockKg','landfillKg','eolLandfillKg','manufacturingLandfillKg')}
    return result(p,'pvice_massflow',dict(runtime=engine,referenceHashes=hashes,trace=trace,totals=totals,scope='Actual PV ICE glass-only baseline mass-flow replay. Baselines include assumptions/projections, not measured site inventory. Two manufacturing/landfill stage closures only, not full global mass qualification, LCA/avoided-carbon credits, cost or operational approval. End-of-horizon in-use stock persists.'),'insufficient_evidence')


def coherent_optics(p):
    header(p,'coherent-optics-v1',('angleDeg','polarization','wavelengthNm','irradianceWm2Nm','layers'))
    numeric_fields(p,dict(angleDeg=(0,80)))
    if p['polarization'] not in ('s','p','unpolarized'):raise ValueError('Polarization')
    wavelengths=p['wavelengthNm'];spectrum=p['irradianceWm2Nm'];layers=p['layers']
    if not isinstance(wavelengths,list) or not 2<=len(wavelengths)<=256 or not isinstance(spectrum,list) or len(spectrum)!=len(wavelengths) or not isinstance(layers,list) or not 2<=len(layers)<=12:raise ValueError('Optical budget/grid')
    for i,(w,g) in enumerate(zip(wavelengths,spectrum)):
        numeric_fields(dict(w=w,g=g),dict(w=(20,4000),g=(0,10)))
        if i and w<=wavelengths[i-1]:raise ValueError('Increasing shared optical grid')
    for j,layer in enumerate(layers):
        keys(layer,('thicknessNm','n','k','source'))
        if not isinstance(layer['source'],str) or not 10<=len(layer['source'].strip())<=1000:raise ValueError('Optical constants provenance')
        if j in (0,len(layers)-1):
            if layer['thicknessNm'] is not None:raise ValueError('Semi-infinite media thickness=null')
        else:numeric_fields(layer,dict(thicknessNm=(.01,1e6)))
        if not isinstance(layer['n'],list) or not isinstance(layer['k'],list) or len(layer['n'])!=len(wavelengths) or len(layer['k'])!=len(wavelengths):raise ValueError('Exact optical constants grid, no extrapolation')
        for nr,ki in zip(layer['n'],layer['k']):numeric_fields(dict(n=nr,k=ki),dict(n=(.01,10),k=(0,10)))
    if any(k!=0 for k in layers[0]['k']):raise ValueError('Nonabsorbing incident medium required')
    import tmm
    rt=runtime('tmm','0.2.0',tmm.tmm_core);trace=[];angle=math.radians(p['angleDeg'])
    for i,w in enumerate(wavelengths):
        indices=[complex(layer['n'][i],layer['k'][i]) for layer in layers];thickness=[float('inf') if layer['thicknessNm'] is None else layer['thicknessNm'] for layer in layers]
        # Reject the opaque-film stabilization region rather than using the package's clamp.
        angles=tmm.list_snell(np.array(indices),angle)
        if any(abs((2*math.pi*indices[j]*np.cos(angles[j])*thickness[j]/w).imag)>20 for j in range(1,len(layers)-1)):raise ValueError('Optical phase-conditioning budget')
        pols=('s','p') if p['polarization']=='unpolarized' else (p['polarization'],);reflection=transmission=0.
        for pol in pols:
            with contextlib.redirect_stdout(io.StringIO()):solution=tmm.coh_tmm(pol,indices,thickness,angle,w)
            reflection+=float(solution['R'])/len(pols);transmission+=float(solution['T'])/len(pols)
        absorbed=1-reflection-transmission
        if not all(math.isfinite(v) and v>=-1e-9 for v in (reflection,transmission,absorbed)):raise ValueError('Optical passivity')
        trace.append(dict(wavelengthNm=w,reflectance=reflection,transmittance=transmission,absorptance=absorbed))
    incident=float(np.trapezoid(spectrum,wavelengths));reflected=float(np.trapezoid([g*r['reflectance'] for g,r in zip(spectrum,trace)],wavelengths));transmitted=float(np.trapezoid([g*r['transmittance'] for g,r in zip(spectrum,trace)],wavelengths));absorbed=float(np.trapezoid([g*r['absorptance'] for g,r in zip(spectrum,trace)],wavelengths))
    return result(p,'coherent_optics',dict(runtime=rt,referenceHashes=evidence(['docs/reference-data/tmm/upstream-tests.txt','docs/reference-data/tmm/LICENSE.txt']),trace=trace,incidentWm2=incident,reflectedWm2=reflected,transmittedWm2=transmitted,absorbedWm2=absorbed,residualWm2=incident-reflected-transmitted-absorbed,scope='Actual coherent planar tmm total-film optics on explicit common-grid n/k; no interpolation/extrapolation. Transmission is power entering semi-infinite substrate, not necessarily external transmitted light. Not measured technology EQE, tandem calibration, rough/incoherent optics, electrical output or field qualification.'),'insufficient_evidence')
