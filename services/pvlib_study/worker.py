"""Direct pvlib study v1. JSON stdin/stdout, no network or user-supplied code.
Scientific model contracts and sources: docs/audit/PVLIB-DIRECT-STUDY-DESIGN.fa.md.
"""
import sys
import json
import math
import hashlib
import platform
from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from importlib.metadata import version
import re

MAX_BYTES = 8 * 1024 * 1024
MAX_RECORDS = 17568
ENGINE_VERSION = '1.8.0'
MODELS = dict(solarPosition='nrel_numpy; delta_t=67 s; atmos_refract=0.5667 deg (fixed assumptions)', pressure='alt2pres standard atmosphere from altitude',
              transposition='haydavies', extraterrestrial='spencer; solar_constant=1366.1 W/m2', beamIam='ashrae',
              diffuseIam='unity assumption', temperature='sapm_cell', dc='pvwatts_dc',
              ac='pvwatts inverter (not SAM/PVWatts V8 equivalence)', spectral='unity assumption',
              energyIntegration='interval-average rectangular; solar geometry at interval midpoint')
LIMITATIONS = [
    'Not field validated, calibrated, bankable or a standards-conformity assessment.',
    'Fixed-tilt or single-axis aggregate array and one aggregate inverter; optional uniform-string diode and ideal static MPPT envelope, not certified electrical design.',
    'No horizon, near-obstacle shading, electrical mismatch, snow, soiling, battery, dynamic grid control or financial simulation.',
    'Fixed SPA delta_t=67 s and sunrise/sunset refraction 0.5667 deg are assumptions, not historical/forecast corrections.',
    'Diffuse IAM and spectral factors are unity assumptions; midpoint transposition does not eliminate interval-averaging error.',
    'SAPM wind must be at 10 m; mounting-specific coefficients and all equipment parameters are caller-declared.',
    'Additional DC loss is an explicit constant retained fraction, not a physical decomposition; no legacy waterfall losses are applied.',
    'Period energy is not annualized. No P50/P90 or field accuracy metrics are inferred.'
]

class InputError(ValueError):
    pass


def keys(value, required, label):
    if not isinstance(value, dict) or set(value) != set(required):
        raise InputError(f'{label}: exact required fields are {", ".join(required)}')


def number(value, lo, hi, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not lo <= value <= hi:
        raise InputError(f'{label}: finite number in [{lo}, {hi}] required')


def text(value, label, maximum=500):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise InputError(f'{label}: nonempty string, at most {maximum} characters required')


def timestamp(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)', value):
        raise InputError('weather timestamp requires ISO calendar datetime with explicit Z or signed offset')
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)
    except ValueError as error:
        raise InputError('invalid weather calendar timestamp') from error


def validate(req):
    keys(req, ['schemaVersion', 'label', 'site', 'system', 'weather', 'parameterProvenance'], 'study')
    if req['schemaVersion'] != 'pvlib-study-v1':
        raise InputError('unsupported study schemaVersion')
    text(req['label'], 'label', 200)
    site = req['site']
    keys(site, ['latitude', 'longitude', 'altitudeM', 'timezone'], 'site')
    for key, lo, hi in [('latitude', -90, 90), ('longitude', -180, 180), ('altitudeM', -500, 9000)]:
        number(site[key], lo, hi, 'site.'+key)
    text(site['timezone'], 'site.timezone', 100)
    try:
        ZoneInfo(site['timezone'])
    except (KeyError, ValueError) as error:
        raise InputError('valid IANA timezone required') from error
    system = req['system']
    bounds = dict(surfaceTiltDeg=(0, 90), surfaceAzimuthDeg=(0, 360), albedo=(0, 1), arrayPdc0W=(1, 1e9),
                  gammaPdcPerC=(-.01, 0), inverterPdc0W=(1, 1e9), inverterEtaNom=(.8, .995),
                  inverterEtaRef=(.8, 1), iamB=(0, 1), additionalDcLossPct=(0, 100))
    keys(system, [*bounds, 'temperature', *(['tracking'] if 'tracking' in system else []), *(['rowIrradiance'] if 'rowIrradiance' in system else []), *(['electrical'] if 'electrical' in system else []), *(['faiman'] if 'faiman' in system else []), *(['acExportLimitW'] if 'acExportLimitW' in system else []), *(['sandia'] if 'sandia' in system else []), *([k for k in ('skyDiffuseModel','physicalIam','sapmSpectral','transformer','auxiliaryPowerW','acAvailability','horizonProfile','soilingSchedule','albedoSchedule') if k in system])], 'system')
    for name,fields in [('soilingSchedule',['frontRatio','rearRatio']),('albedoSchedule',['albedo'])]:
        if name not in system:continue
        obj=system[name]
        keys(obj,['source','quality','records'],name)
        text(obj['source'],name+'.source')
        if obj['quality'] not in ('measured','weather_provider','user_configured','assumed'):raise InputError('invalid environment provenance quality')
        if not isinstance(obj['records'],list) or not 2<=len(obj['records'])<=8784:raise InputError(name+' requires 2..8784 complete records')
        for row in obj['records']:
            keys(row,['timestamp',*fields],name+' record')
            timestamp(row['timestamp'])
            for field in fields:number(row[field],0,1,name+'.'+field)
    if 'horizonProfile' in system:
        obj=system['horizonProfile'];keys(obj,['source','quality','points'],'horizonProfile');text(obj['source'],'horizonProfile.source')
        if obj['quality'] not in ('measured','weather_provider','user_configured','assumed'):raise InputError('invalid horizon provenance quality')
        pts=obj['points']
        if not isinstance(pts,list) or not 2<=len(pts)<=361:raise InputError('horizon requires 2..361 points')
        for p in pts:
            keys(p,['azimuthDeg','elevationDeg'],'horizon point');number(p['azimuthDeg'],0,360,'horizon azimuth');number(p['elevationDeg'],0,85,'horizon elevation')
        if pts[0]['azimuthDeg']!=0 or pts[-1]['azimuthDeg']!=360 or pts[0]['elevationDeg']!=pts[-1]['elevationDeg'] or any(b['azimuthDeg']<=a['azimuthDeg'] for a,b in zip(pts,pts[1:])):raise InputError('horizon must span ordered 0..360 degrees with identical seam elevation')
        if 'rowIrradiance' in system:raise InputError('beam-only horizon unsupported with infinite_sheds rows; no fallback')
    if 'transformer' in system:
        t=system['transformer']
        keys(t,['ratingVa','noLoadLossFraction','loadLossFraction'],'transformer')
        number(t['ratingVa'],1,1e9,'transformer.ratingVa')
        number(t['noLoadLossFraction'],0,.1,'transformer.noLoadLossFraction')
        number(t['loadLossFraction'],0,.1,'transformer.loadLossFraction')
    if 'auxiliaryPowerW' in system:number(system['auxiliaryPowerW'],0,1e9,'auxiliaryPowerW')
    if 'acAvailability' in system:
        a=system['acAvailability']
        keys(a,['source','quality','records'],'acAvailability')
        text(a['source'],'acAvailability.source')
        if a['quality'] not in ('measured','weather_provider','user_configured','assumed'):raise InputError('invalid availability provenance quality')
        if not isinstance(a['records'],list) or not 2<=len(a['records'])<=8784:raise InputError('availability requires 2..8784 explicit records')
        for row in a['records']:
            keys(row,['timestamp','availableFraction'],'availability record')
            timestamp(row['timestamp'])
            number(row['availableFraction'],0,1,'availableFraction')
    if 'skyDiffuseModel' in system:
        if system['skyDiffuseModel'] not in ('haydavies','perez'):raise InputError('unsupported skyDiffuseModel')
        if system['skyDiffuseModel']=='perez' and 'rowIrradiance' in system:raise InputError('Perez is unsupported with infinite_sheds rows; no fallback')
    if 'physicalIam' in system:
        p=system['physicalIam']
        limits=dict(frontN=(1.01,3),frontK=(0,100),frontL=(.00001,.02),rearN=(1.01,3),rearK=(0,100),rearL=(.00001,.02))
        keys(p,list(limits),'physicalIam')
        for key,(lo,hi) in limits.items():number(p[key],lo,hi,'physicalIam.'+key)
    if 'sapmSpectral' in system:
        p=system['sapmSpectral']
        limits=dict(A0=(-10,10),A1=(-10,10),A2=(-10,10),A3=(-10,10),A4=(-10,10),minAbsoluteAirmass=(.1,40),maxAbsoluteAirmass=(.1,40))
        keys(p,list(limits),'sapmSpectral')
        for key,(lo,hi) in limits.items():number(p[key],lo,hi,'sapmSpectral.'+key)
        if p['minAbsoluteAirmass']>=p['maxAbsoluteAirmass']:raise InputError('spectral airmass min must be < max')
    if 'acExportLimitW' in system:
        number(system['acExportLimitW'],0,1e9,'acExportLimitW')
    if 'faiman' in system:
        f=system['faiman']
        keys(f,['u0','u1','windHeightM'],'system.faiman')
        number(f['u0'],.1,200,'faiman.u0')
        number(f['u1'],0,100,'faiman.u1')
        number(f['windHeightM'],10,10,'faiman.windHeightM')
    if 'electrical' in system:
        e=system['electrical']
        limits=dict(alphaScAperC=(-.05,.05),aRefV=(.1,10),iLRefA=(.01,30),iORefA=(1e-15,.01),rShRefOhm=(1,1e6),rSOhm=(0,10),egRefEv=(.5,2.5),dEgdTPerK=(-.002,0),modulesPerString=(1,1000),stringsInParallel=(1,100000),mpptMinV=(1,3000),mpptMaxV=(1,3000),maxDcV=(1,3000),maxInputCurrentA=(.1,1e7),designMinCellTemperatureC=(-90,25),designMaxEffectiveIrradianceWm2=(1000,2500))
        keys(e,list(limits),'system.electrical')
        for key,(lo,hi) in limits.items():
            number(e[key],lo,hi,'electrical.'+key)
        for key in ('modulesPerString','stringsInParallel'):
            if int(e[key])!=e[key]:raise InputError('electrical string/module counts must be integers')
        if not e['mpptMinV']<e['mpptMaxV']<=e['maxDcV']:
            raise InputError('require mpptMinV < mpptMaxV <= maxDcV')
    if 'sandia' in system:
        inv=system['sandia']
        limits=dict(Paco=(1,1e9),Pdco=(1,1e9),Vdco=(1,3000),Pso=(.001,1e8),C0=(-1,1),C1=(-.1,.1),C2=(-.1,.1),C3=(-.1,.1),Pnt=(0,1e7),modelMinDcV=(1,3000),modelMaxDcV=(1,3000),modelMaxDcPowerW=(1,1e9))
        keys(inv,list(limits),'system.sandia')
        for key,(lo,hi) in limits.items():number(inv[key],lo,hi,'sandia.'+key)
        if 'electrical' not in system or system['additionalDcLossPct']!=0:
            raise InputError('Sandia requires electrical operating voltage and additionalDcLossPct=0; DC cable voltage drop is not modeled')
        if inv['Pdco']!=system['inverterPdc0W'] or inv['Pdco']<inv['Paco'] or inv['Pdco']<=inv['Pso'] or inv['modelMaxDcPowerW']<inv['Pdco']:
            raise InputError('Sandia requires inverterPdc0W=Pdco >= Paco, Pdco>Pso, modelMaxDcPowerW>=Pdco')
        if not inv['modelMinDcV']<=inv['Vdco']<=inv['modelMaxDcV'] or not inv['modelMinDcV']<=system['electrical']['mpptMinV']<system['electrical']['mpptMaxV']<=inv['modelMaxDcV']:
            raise InputError('Sandia reference and MPPT window must lie in declared model voltage domain')
        for v in (inv['modelMinDcV'],inv['modelMaxDcV']):
            a=inv['Pdco']*(1+inv['C1']*(v-inv['Vdco']))
            b=inv['Pso']*(1+inv['C2']*(v-inv['Vdco']))
            if b<0 or a-b<=1e-6:raise InputError('Sandia requires A>B>=0 throughout voltage domain')
    if 'tracking' in system:
        track = system['tracking']
        tracking_bounds = dict(axisTiltDeg=(0,90), axisAzimuthDeg=(0,360), maxAngleDeg=(0,90), gcr=(.01,1), crossAxisTiltDeg=(-30,30))
        keys(track, [*tracking_bounds, 'backtrack'], 'system.tracking')
        for key, (lo, hi) in tracking_bounds.items():
            number(track[key], lo, hi, 'tracking.'+key)
        if not isinstance(track['backtrack'], bool):
            raise InputError('tracking.backtrack: boolean required')
    if 'rowIrradiance' in system:
        rows = system['rowIrradiance']
        row_bounds = dict(gcr=(.01,1),heightM=(.1,100),pitchM=(.1,100),bifaciality=(0,1),rearShadeLossPct=(0,100),rearTransmissionLossPct=(0,100),rearIamB=(0,1))
        keys(rows, [*row_bounds, 'temperatureIrradiance'], 'system.rowIrradiance')
        for key, (lo, hi) in row_bounds.items():
            number(rows[key],lo,hi,'rowIrradiance.'+key)
        if rows['temperatureIrradiance'] not in ('front_only','front_plus_rear'):
            raise InputError('explicit row temperature irradiance proxy required')
        if rows['heightM']/rows['pitchM'] > 2:
            raise InputError('row center height/pitch must be <=2 for bounded view-factor computation')
        track = system.get('tracking')
        if track and (track['axisTiltDeg'] != 0 or track['crossAxisTiltDeg'] != 0):
            raise InputError('infinite sheds supports horizontal axes on level terrain only')
        if track and abs(track['gcr']-rows['gcr']) > 1e-9:
            raise InputError('tracker and row irradiance GCR must match')
    for key, (lo, hi) in bounds.items():
        number(system[key], lo, hi, 'system.'+key)
    if system['arrayPdc0W']/system['inverterPdc0W'] > 2:
        raise InputError('study configuration supports array DC / inverter DC limit ratio <= 2 only')
    if system['inverterEtaRef'] != 0.9637:
        raise InputError('this model configuration requires PVWatts eta_inv_ref=0.9637')
    if 'rowIrradiance' in system:
        rows = system['rowIrradiance']
        maximum_tilt = system['tracking']['maxAngleDeg'] if 'tracking' in system else system['surfaceTiltDeg']
        if rows['heightM'] <= .5*rows['gcr']*rows['pitchM']*math.sin(math.radians(maximum_tilt)):
            raise InputError('row edge would touch/intersect ground at supported tilt')
    keys(system['temperature'], ['a', 'b', 'deltaT'], 'system.temperature')
    for key, lo, hi in [('a', -10, 0), ('b', -1, 0), ('deltaT', 0, 20)]:
        number(system['temperature'][key], lo, hi, 'temperature.'+key)
    prov = req['parameterProvenance']
    keys(prov, ['source', 'quality'], 'parameterProvenance')
    weather = req['weather']
    keys(weather, ['source', 'quality', 'windHeightM', 'timestampConvention', 'intervalMinutes', 'records'], 'weather')
    for obj in (prov, weather):
        text(obj['source'], 'provenance source')
        if obj['quality'] not in ('measured', 'weather_provider', 'user_configured', 'assumed'):
            raise InputError('explicit provenance quality required')
    if isinstance(weather['windHeightM'], bool) or weather['windHeightM'] != 10 or weather['timestampConvention'] != 'interval_end':
        raise InputError('10 m wind and interval_end average weather required')
    dt = weather['intervalMinutes']
    number(dt, 1, 60, 'intervalMinutes')
    if int(dt) != dt:
        raise InputError('integer intervalMinutes required')
    rows = weather['records']
    if not isinstance(rows, list) or not 2 <= len(rows) <= MAX_RECORDS:
        raise InputError(f'2..{MAX_RECORDS} regular records required')
    if 'rowIrradiance' in system and len(rows)>8784:
        raise InputError('row irradiance mode supports at most 8784 records')
    if 'sapmSpectral' in system and len(rows)>8784:
        raise InputError('spectral detail mode supports at most 8784 records')
    if 'electrical' in system and len(rows)>8784:
        raise InputError('detailed electrical mode supports at most 8784 records')
    times = []
    for row in rows:
        keys(row, ['timestamp', 'ghiWm2', 'dniWm2', 'dhiWm2', 'tempAirC', 'windSpeedMs'], 'weather record')
        times.append(timestamp(row['timestamp']))
        for key in ('ghiWm2', 'dniWm2', 'dhiWm2'):
            number(row[key], 0, 2000, key)
        number(row['tempAirC'], -90, 70, 'tempAirC')
        number(row['windSpeedMs'], 0, 75, 'windSpeedMs')
    if any(b-a != timedelta(minutes=dt) for a, b in zip(times, times[1:])):
        raise InputError('unordered, duplicate, gapped or nonuniform timestamps')
    if (times[0]-timedelta(minutes=dt)).year < 1900 or times[-1].year > 2200 or times[-1]-times[0]+timedelta(minutes=dt) > timedelta(days=366):
        raise InputError('supported period: 1900..2200, at most 366 days')
    if any(k in system for k in ('transformer','auxiliaryPowerW','acAvailability')) and len(rows)>8784:raise InputError('AC plant mode supports at most 8784 records')
    if 'acAvailability' in system:
        records=system['acAvailability']['records']
        if len(records)!=len(times) or any(timestamp(r['timestamp'])!=t for r,t in zip(records,times)):raise InputError('availability records must exactly align with weather interval ends in UTC; no fill')
    for name in ('soilingSchedule','albedoSchedule'):
        if name in system:
            records=system[name]['records']
            if len(records)!=len(times) or any(timestamp(r['timestamp'])!=t for r,t in zip(records,times)):raise InputError(name+' must exactly align with weather interval ends in UTC; no fill')
    if any(k in system for k in ('horizonProfile','soilingSchedule','albedoSchedule')) and len(rows)>8784:raise InputError('environment mode supports at most 8784 records')
    return times


def electrical_dc(e, effective, cell, declared_nameplate):
    """Uniform identical modules, static single-bus ideal MPPT. Not mismatch/control."""
    import numpy as np
    import pandas as pd
    import pvlib
    from scipy.optimize import brentq

    def parameters(g,t):
        return pvlib.pvsystem.calcparams_desoto(g,t,e['alphaScAperC'],e['aRefV'],e['iLRefA'],e['iORefA'],e['rShRefOhm'],e['rSOhm'],EgRef=e['egRefEv'],dEgdT=e['dEgdTPerK'],irrad_ref=1000.,temp_ref=25.)
    ns,np_=e['modulesPerString'],e['stringsInParallel']
    reference=pvlib.pvsystem.singlediode(*parameters(1000.,25.),method='lambertw')
    module_stc=float(reference['p_mp'])
    modeled_nameplate=module_stc*ns*np_
    if not math.isfinite(modeled_nameplate) or modeled_nameplate<=0 or abs(modeled_nameplate-declared_nameplate)/declared_nameplate>.02:
        raise InputError('declared arrayPdc0W must match diode STC MPP times module/string counts within 2%; no hidden scaling')
    design=pvlib.pvsystem.singlediode(*parameters(e['designMaxEffectiveIrradianceWm2'],e['designMinCellTemperatureC']),method='lambertw')
    design_voc=float(design['v_oc'])*ns
    if not math.isfinite(design_voc) or design_voc<=0 or design_voc>e['maxDcV']+1e-7:
        raise InputError('specified cold-design string Voc exceeds maxDcV or has invalid diode parameters; study rejected')
    if not np.isfinite(effective).all() or not np.isfinite(cell).all() or (effective<0).any() or ((cell < -100)|(cell>150)).any():
        raise InputError('detailed electrical mode requires finite irradiance and cell temperature -100..150 degC')
    with np.errstate(over='ignore',invalid='ignore',divide='ignore'):
        params=parameters(effective,cell)
        arrays=[np.broadcast_to(np.asarray(p,dtype=float),(len(effective),)) for p in params]
        if not all(np.isfinite(p).all() for p in [arrays[0],arrays[1],arrays[2],arrays[4]]) or (arrays[0]<0).any() or (arrays[1]<=0).any() or (arrays[3]<=0).any() or (arrays[4]<=0).any():
            raise InputError('De Soto parameters outside supported numerical/physical domain')
        curve=pvlib.pvsystem.singlediode(*arrays,method='lambertw')
    dark=np.asarray(effective)==0
    voc=np.where(dark,0,np.asarray(curve['v_oc'])*ns)
    vmp=np.where(dark,0,np.asarray(curve['v_mp'])*ns)
    mpp=np.where(dark,0,np.asarray(curve['p_mp'])*ns*np_)
    if not all(np.isfinite(p).all() and (p>=0).all() for p in [voc,vmp,mpp]):
        raise InputError('nonfinite or negative single-diode result')
    if (voc>e['maxDcV']+1e-7).any():
        raise InputError('modeled sample string Voc exceeds maxDcV; no simulated voltage clipping can make this input safe')
    volts=np.zeros(len(effective));amps=np.zeros(len(effective));state=np.zeros(len(effective))
    for i in np.flatnonzero(~dark):
        lo,hi=e['mpptMinV'],min(e['mpptMaxV'],float(voc[i]))
        state[i]=4 # explicit no-feasible-operating-point shutdown
        if hi<=lo+1e-9:continue
        def current(v):
            answer=float(pvlib.pvsystem.i_from_v(v/ns,*(p[i] for p in arrays),method='lambertw'))*np_
            if not math.isfinite(answer) or answer < -1e-6:
                raise InputError('invalid current on the supported first-quadrant IV curve')
            return max(0.,answer) # only floating-point residuals at open circuit
        v=float(np.clip(vmp[i],lo,hi))
        current_limited=current(v)>e['maxInputCurrentA']+1e-9
        if current_limited:
            if current(hi)>e['maxInputCurrentA']:continue
            v=brentq(lambda voltage:current(voltage)-e['maxInputCurrentA'],v,hi,xtol=1e-9,rtol=1e-12)
        volts[i],amps[i]=v,current(v)
        state[i]=3 if current_limited else (1 if abs(v-vmp[i])<1e-6 else 2)
    operating=volts*amps
    gap=mpp-operating
    if (gap < -np.maximum(1e-5,mpp*1e-7)).any():
        raise InputError('constrained point exceeds unconstrained MPP beyond numerical tolerance')
    columns=dict(arrayVocV=voc,arrayVmpV=vmp,arrayMppW=mpp,operatingVoltageV=volts,operatingCurrentA=amps,dcOperatingState=state)
    checks=dict(moduleStcMppW=module_stc,modeledArrayStcW=modeled_nameplate,declaredArrayStcW=declared_nameplate,specifiedDesignStringVocV=design_voc,maximumSampleStringVocV=float(voc.max()),designEnvelopeExceededIntervals=float(((np.asarray(effective)>e['designMaxEffectiveIrradianceWm2'])|(np.asarray(cell)<e['designMinCellTemperatureC'])).sum()))
    return pd.Series(operating,index=effective.index),{key:pd.Series(value,index=effective.index) for key,value in columns.items()},checks,pd.Series(np.maximum(gap,0),index=effective.index)


def sandia_ac(inv, volts, dc):
    """Signed inverter output, plus explicit nonnegative self-consumption import."""
    import numpy as np
    import pandas as pd
    import pvlib
    active=dc>0
    if ((volts[active]<inv['modelMinDcV']-1e-7)|(volts[active]>inv['modelMaxDcV']+1e-7)).any() or (dc>inv['modelMaxDcPowerW']).any():
        raise InputError('Sandia operating point outside declared fitted domain; no extrapolation')
    net=pd.Series(-float(inv['Pnt']),index=dc.index)
    if active.any():net.loc[active]=pvlib.inverter.sandia(volts[active],dc[active],inv)
    if not np.isfinite(net).all() or (net>dc+np.maximum(1e-6,dc*1e-7)).any():
        raise InputError('Sandia nonfinite or AC output exceeds DC input; unsupported fit/operating point')
    imports=(-net).clip(lower=0)
    return net.clip(lower=0),dict(inverterNetAcW=net,inverterSelfConsumptionW=imports)


def beam_iam(aoi, system, rear=False):
    import pvlib
    if 'physicalIam' not in system:
        return pvlib.iam.ashrae(aoi,b=system['rowIrradiance']['rearIamB'] if rear else system['iamB'])
    p=system['physicalIam'];prefix='rear' if rear else 'front'
    return pvlib.iam.physical(aoi,n=p[prefix+'N'],K=p[prefix+'K'],L=p[prefix+'L'])


def spectral_irradiance(effective, zenith, altitude, p):
    import numpy as np
    import pandas as pd
    import pvlib
    if not np.isfinite(effective).all() or (effective<0).any():raise InputError('spectral input must be finite nonnegative irradiance')
    active=effective>0
    relative=pvlib.atmosphere.get_relative_airmass(zenith,model='kastenyoung1989')
    absolute=pvlib.atmosphere.get_absolute_airmass(relative,pressure=pvlib.atmosphere.alt2pres(altitude))
    am=absolute[active]
    if not np.isfinite(am).all() or (am<p['minAbsoluteAirmass']).any() or (am>p['maxAbsoluteAirmass']).any():
        raise InputError('spectral airmass undefined or outside declared fitted domain; no extrapolation')
    # Reject before pvlib's internal max(0, polynomial) can conceal an invalid fit.
    raw=sum(p['A'+str(i)]*am**i for i in range(5))
    if not np.isfinite(raw).all() or (raw<=0).any() or (raw>2).any():
        raise InputError('spectral polynomial must be finite in (0,2] at active points')
    factor=pd.Series(0.,index=effective.index)
    if active.any():factor.loc[active]=pvlib.spectrum.spectral_factor_sapm(am,p)
    return effective*factor,dict(spectralInputIrradianceWm2=effective,spectralFactor=factor,absoluteAirmass=absolute.where(active,0.),spectralActive=active.astype(float))


def ac_plant(system, inverter_net):
    """Generation retention, always-on LV auxiliary and energized transformer."""
    import numpy as np
    import pandas as pd
    fraction=pd.Series([r['availableFraction'] for r in system['acAvailability']['records']],index=inverter_net.index) if 'acAvailability' in system else pd.Series(1.,index=inverter_net.index)
    availability_loss=inverter_net.clip(lower=0)*(1-fraction)
    auxiliary=pd.Series(float(system.get('auxiliaryPowerW',0)),index=inverter_net.index)
    before=inverter_net-availability_loss-auxiliary
    after=before.copy()
    if 'transformer' in system:
        t=system['transformer'];rating=t['ratingVa'];a=t['loadLossFraction'];nll=t['noLoadLossFraction']
        discriminant=1+4*a*(before/rating-nll)
        if (discriminant<=0).any():raise InputError('transformer quadratic outside monotonic supported domain')
        after=2*(before-rating*nll)/(1+np.sqrt(discriminant))
        if (abs(after)>rating+1e-7).any():raise InputError('transformer output exceeds declared VA rating at unity power factor; no overload simulation')
    loss=before-after
    if not np.isfinite(after).all() or (loss < -1e-6).any():raise InputError('invalid transformer output/loss')
    imports=(-after).clip(lower=0)
    return after.clip(lower=0),dict(acPlantInputW=inverter_net,acAvailabilityFraction=fraction,availabilityLossW=availability_loss,auxiliaryConsumptionW=auxiliary,transformerLossW=loss.clip(lower=0),gridImportW=imports)


def horizon_visibility(azimuth, zenith, profile):
    import numpy as np
    import pandas as pd
    pts=profile['points']
    elevation=pd.Series(np.interp(azimuth,[p['azimuthDeg'] for p in pts],[p['elevationDeg'] for p in pts]),index=azimuth.index)
    return elevation,((90-zenith)>elevation).astype(float)


def run_study(req):
    times = validate(req)
    for requirement in Path(__file__).with_name('requirements.txt').read_text().splitlines():
        name, pinned = requirement.split('==')
        if version(name) != pinned:
            raise RuntimeError('study dependency version mismatch')
    import numpy as np
    import pandas as pd
    import pvlib
    if pvlib.__version__ != '0.13.1':
        raise RuntimeError('pvlib version mismatch; install the pinned study requirements')
    site, s, w = req['site'], req['system'], req['weather']
    dt_hours = w['intervalMinutes']/60
    end = pd.DatetimeIndex(times)
    mid = end - pd.Timedelta(minutes=w['intervalMinutes']/2)
    df = pd.DataFrame(w['records'], index=mid)
    position = pvlib.solarposition.get_solarposition(mid, site['latitude'], site['longitude'], altitude=site['altitudeM'],
        pressure=pvlib.atmosphere.alt2pres(site['altitudeM']), temperature=df.tempAirC, method='nrel_numpy', delta_t=67.0, atmos_refract=0.5667)
    if ((position.apparent_zenith >= 90) & (df.dniWm2 > 0)).any():
        raise InputError('positive DNI below the midpoint apparent horizon is unsupported; review timestamp and weather')
    tilt = pd.Series(s['surfaceTiltDeg'], index=mid, dtype=float)
    azimuth = pd.Series(s['surfaceAzimuthDeg'], index=mid, dtype=float)
    tracker_columns = {}
    models = dict(MODELS, mounting='fixed_tilt')
    limitations = list(LIMITATIONS)
    environment_columns={}
    albedo=pd.Series([r['albedo'] for r in s['albedoSchedule']['records']],index=mid) if 'albedoSchedule' in s else s['albedo']
    if 'albedoSchedule' in s:
        environment_columns['usedAlbedo']=albedo
        models['albedo']='explicit interval albedo; retained scalar inactive'
        limitations.append('Albedo schedule is caller-declared broadband ground reflectance, not a snow, melt, land-cover or spectral-reflection model. No temporal gap fill.')
    if 'tracking' in s:
        track = s['tracking']
        geometry = pvlib.tracking.singleaxis(position.apparent_zenith, position.azimuth,
            axis_tilt=track['axisTiltDeg'], axis_azimuth=track['axisAzimuthDeg'],
            max_angle=track['maxAngleDeg'], backtrack=track['backtrack'],
            gcr=track['gcr'], cross_axis_tilt=track['crossAxisTiltDeg'])
        # Only model geometry is parked; no missing weather is filled here.
        daylight = position.apparent_zenith < 90
        theta = geometry.tracker_theta.where(daylight, 0.0)
        orientation = pvlib.tracking.calc_surface_orientation(theta,
            axis_tilt=track['axisTiltDeg'], axis_azimuth=track['axisAzimuthDeg'])
        tilt, azimuth = orientation['surface_tilt'], orientation['surface_azimuth']
        tracker_columns = dict(trackerThetaDeg=theta, trackerActive=daylight.astype(float))
        models['mounting'] = 'singleaxis; pvlib slope-aware backtracking if requested; night theta=0 axis-neutral park'
        limitations.extend([
            'Tracker is ideal parallel-row geometry only; no diffuse row masking, electrical shading/mismatch, terrain/layout verification or motor energy.',
            'No wind/snow stow, tracking error, slew-rate or structural control simulation; SAPM coefficients must suit moving open-rack mounting.',
            'Fixed surfaceTiltDeg/surfaceAzimuthDeg are inactive retained reference inputs in tracker mode; axis geometry controls modeled orientation.',
            'Night (midpoint zenith >=90 deg) uses theta=0 axis-neutral park, not necessarily a horizontal module on a tilted axis.'
        ])
        if not track['backtrack']:
            limitations.append('True-tracking has NO row-shading deduction; GCR and crossAxisTiltDeg are retained but inactive when backtracking is disabled.')
    if s.get('skyDiffuseModel')=='perez':
        day=position.apparent_zenith<90
        if (df.loc[~day,['dniWm2','ghiWm2','dhiWm2']]>0).any().any():
            raise InputError('Perez requires zero irradiance below midpoint horizon; no undefined-airmass substitution')
        poa=pd.DataFrame(0.,index=mid,columns=['poa_global','poa_direct','poa_diffuse','poa_sky_diffuse','poa_ground_diffuse'])
        if day.any():
            poa.loc[day]=pvlib.irradiance.get_total_irradiance(tilt[day],azimuth[day],position.apparent_zenith[day],position.azimuth[day],df.dniWm2[day],df.ghiWm2[day],df.dhiWm2[day],dni_extra=pvlib.irradiance.get_extra_radiation(mid[day],method='spencer',solar_constant=1366.1),airmass=pvlib.atmosphere.get_relative_airmass(position.apparent_zenith[day],model='kastenyoung1989'),albedo=albedo[day] if 'albedoSchedule' in s else albedo,model='perez',model_perez='allsitescomposite1990')
        models['transposition']='perez allsitescomposite1990; relative airmass kastenyoung1989; zero-irradiance night only'
        limitations.append('Perez uses discontinuous sky-clearness bins, relative airmass and fixed published coefficients; no horizon/obstacle shading or row coupling.')
    else:
        poa = pvlib.irradiance.get_total_irradiance(tilt, azimuth, position.apparent_zenith,
            position.azimuth, df.dniWm2, df.ghiWm2, df.dhiWm2,
            dni_extra=pvlib.irradiance.get_extra_radiation(mid, method='spencer', solar_constant=1366.1), albedo=albedo, model='haydavies')
    if 'horizonProfile' in s:
        horizon,visible=horizon_visibility(position.azimuth,position.apparent_zenith,s['horizonProfile'])
        blocked=poa.poa_direct*(1-visible)
        poa['poa_direct']=poa.poa_direct*visible
        poa['poa_global']=poa.poa_direct+poa.poa_diffuse
        environment_columns.update(horizonElevationDeg=horizon,horizonBeamVisible=visible,horizonBlockedBeamWm2=blocked)
        models['horizon']='linear closed azimuth profile; beam-only post-transposition; apparent elevation strict greater-than'
        limitations=[x.replace('No horizon, near-obstacle shading','No near-obstacle shading').replace('no horizon/obstacle shading or row coupling','no diffuse horizon/obstacle shading or row coupling') for x in limitations]
        limitations.append('Beam-only horizon on isolated plane; diffuse including circumsolar, sky view and ground-reflected GHI unchanged. Not the full pvlib gallery pre-transposition DNI/GHI adjustment, near shading, solar-disk fraction or electrical mismatch.')
    aoi = pvlib.irradiance.aoi(tilt, azimuth, position.apparent_zenith, position.azimuth)
    iam = beam_iam(aoi,s)
    effective = poa.poa_direct*iam + poa.poa_diffuse
    thermal_poa = poa.poa_global
    row_columns = {}
    models['rowIrradiance'] = 'isolated plane; no row shading'
    models['temperatureIrradiance'] = 'front incident POA'
    if 'rowIrradiance' in s:
        rows = s['rowIrradiance']
        # Unit IAM and bifaciality expose incident energy; apply optical/electrical
        # modifiers explicitly once, keeping thermal input independent of efficiency.
        row_poa = pvlib.bifacial.infinite_sheds.get_irradiance(tilt, azimuth,
            position.apparent_zenith, position.azimuth, rows['gcr'], rows['heightM'], rows['pitchM'],
            df.ghiWm2, df.dhiWm2, df.dniWm2, albedo, model='haydavies',
            dni_extra=pvlib.irradiance.get_extra_radiation(mid,method='spencer',solar_constant=1366.1),
            iam_front=1.0, iam_back=1.0, bifaciality=1.0, shade_factor=0.0,
            transmission_factor=0.0,npoints=100,vectorize=False)
        rear_aoi = pvlib.irradiance.aoi(180-tilt,(azimuth+180)%360,position.apparent_zenith,position.azimuth)
        rear_iam = beam_iam(rear_aoi,s,rear=True)
        front_effective = row_poa.poa_front_direct*iam+row_poa.poa_front_diffuse
        rear_optical = row_poa.poa_back_direct*rear_iam+row_poa.poa_back_diffuse
        rear_effective = rear_optical*rows['bifaciality']*(1-rows['rearShadeLossPct']/100)*(1-rows['rearTransmissionLossPct']/100)
        effective = front_effective+rear_effective
        thermal_poa = row_poa.poa_front+(row_poa.poa_back if rows['temperatureIrradiance']=='front_plus_rear' else 0)
        # Existing POA columns remain incident FRONT only, never the weighted sum.
        poa = pd.DataFrame(dict(poa_direct=row_poa.poa_front_direct,poa_sky_diffuse=row_poa.poa_front_sky_diffuse,
            poa_ground_diffuse=row_poa.poa_front_ground_diffuse,poa_global=row_poa.poa_front),index=mid)
        row_columns = dict(frontEffectiveIrradianceWm2=front_effective,rearIncidentWm2=row_poa.poa_back,
            rearDirectWm2=row_poa.poa_back_direct,rearSkyDiffuseWm2=row_poa.poa_back_sky_diffuse,
            rearGroundDiffuseWm2=row_poa.poa_back_ground_diffuse,rearBeamIam=rear_iam,
            rearEffectiveIrradianceWm2=rear_effective,frontShadedFraction=row_poa.shaded_fraction_front,
            rearShadedFraction=row_poa.shaded_fraction_back,temperatureIrradianceWm2=thermal_poa)
        if any((values < -1e-8).any() for values in [*row_columns.values(),poa.poa_global]):
            raise InputError('negative row irradiance: unsupported weather/geometry combination')
        models['rowIrradiance'] = 'infinite_sheds haydavies; npoints=100; vectorize=False; beam IAM applied once per side'
        models['temperatureIrradiance'] = rows['temperatureIrradiance']+' incident POA proxy (not bifaciality weighted)'
        limitations = [item for item in limitations if 'no diffuse row masking' not in item and 'True-tracking has NO row-shading deduction' not in item]
        limitations.extend([
            'No tracker motor parasitic energy, controller availability or physical stow simulation.',
            'Infinite sheds assumes infinitely long, parallel, equally spaced rows on level terrain; front/rear optical row shading and diffuse masking only.',
            'SAPM thermal input is a declared front-only or front-plus-rear incident-POA proxy, not a calibrated bifacial thermal model.',
            'Rear irradiance is area averaged; no cell/string electrical mismatch, bypass diode, nonuniformity or finite-array edge simulation.',
            'Bifaciality, rear structural shade and rear transmission reductions affect electrical irradiance only; unity diffuse IAM/spectral assumptions remain.'
        ])
    if 'soilingSchedule' in s:
        records=s['soilingSchedule']['records']
        front_ratio=pd.Series([r['frontRatio'] for r in records],index=mid)
        rear_ratio=pd.Series([r['rearRatio'] for r in records],index=mid)
        clean=effective.copy()
        effective=front_effective*front_ratio+rear_effective*rear_ratio if 'rowIrradiance' in s else effective*front_ratio
        environment_columns.update(frontSoilingRatio=front_ratio,rearSoilingRatio=rear_ratio,soilingInputIrradianceWm2=clean,soilingLossWm2=clean-effective)
        models['soiling']='explicit front/rear soiling ratio; after optical IAM before spectral; thermal unchanged'
        limitations=[x.replace('snow, soiling, battery','snow, battery') for x in limitations]
        limitations.append('Soiling ratios are area-averaged uniform optical transmissions, not Kimber/HSU, snow, precipitation cleaning or bypass/mismatch. Rear ratio inactive without rows; thermal POA unchanged; clean row optical metrics remain before soiling/spectral.')
    if 'physicalIam' in s:
        models['beamIam']='physical Fresnel-Bouguer single glazing; no AR; explicit front/rear parameters'
        limitations.append('Physical IAM changes beam only; diffuse IAM remains unity. Legacy iamB/rearIamB inactive; rear physical parameters inactive without rows. No multi-layer/AR coating or angular diffuse integration.')
    spectral_columns={}
    if 'sapmSpectral' in s:
        effective,spectral_columns=spectral_irradiance(effective,position.apparent_zenith,site['altitudeM'],s['sapmSpectral'])
        limitations=[item.replace('Diffuse IAM and spectral factors are unity assumptions','Diffuse IAM remains a unity assumption').replace('unity diffuse IAM/spectral assumptions remain','unity diffuse IAM assumption remains') for item in limitations]
        models['spectral']='sapm A0..A4 polynomial; absolute airmass from kastenyoung1989 and altitude standard pressure'
        limitations.append('SAPM spectral modifier is applied once to optical effective irradiance, not thermal POA; same empirical factor for both sides. No wavelength-resolved spectrum, water vapor/aerosol correction or independently modeled rear spectrum. Nonactive factor/airmass=0 are explicit sentinels, not weather fill.')
    if 'faiman' in s:
        f=s['faiman']
        cell=pvlib.temperature.faiman(thermal_poa,df.tempAirC,df.windSpeedMs,u0=f['u0'],u1=f['u1'])
        models['temperature']='faiman; caller coefficients fitted to 10 m wind; SAPM coefficients inactive'
        limitations.append('Faiman is an empirical steady-state cell/module temperature proxy with caller-declared coefficients at 10 m wind; no wind-height conversion, thermal inertia or independent bifacial thermal validation.')
    else:
        cell = pvlib.temperature.sapm_cell(thermal_poa, df.tempAirC, df.windSpeedMs, irrad_ref=1000.0, **s['temperature'])
    if 'faiman' in s and (not np.isfinite(cell).all() or (cell < -100).any() or (cell > 150).any()):
        raise InputError('modeled cell temperature must be finite and within -100..150 degC')
    electrical_columns={};electrical_checks={};constraint_loss=None
    if 'electrical' in s:
        raw_dc,electrical_columns,electrical_checks,constraint_loss=electrical_dc(s['electrical'],effective,cell,s['arrayPdc0W'])
        models['dc']='desoto + singlediode lambertw; uniform identical modules in series/parallel; reference 1000 W/m2 and 25 degC'
        models['mppt']='ideal static first-quadrant voltage/current constrained operating point; brentq for current boundary'
        limitations.extend([
            'Single-diode inputs are module-level fitted parameters; no implicit fitting or CEC Adjust correction. EgRef/dEgdT must match their source.',
            'All modules/strings have identical irradiance, temperature and parameters; no cell/string mismatch, bypass diodes or multi-MPPT partitioning.',
            'MPPT is an ideal static constraint, not real controller efficiency, startup/hysteresis, dynamics, current protection or hardware certification.',
            'Voc checks cover the specified design condition and modeled samples only, not all climatic extremes or code-compliant string sizing.',
            'gammaPdcPerC is inactive in diode mode; arrayPdc0W is a consistency check only, not a second power scaling factor.',
            'Operating V/I and constrained power are before explicit additional DC loss; selected inverter model and its limitations apply.' if 'sandia' in s else 'Operating V/I and constrained power are before explicit additional DC loss; inverter efficiency remains aggregate PVWatts, not voltage dependent.'
        ])
    else:
        raw_dc = pvlib.pvsystem.pvwatts_dc(effective, cell, s['arrayPdc0W'], s['gammaPdcPerC'], temp_ref=25)
        if (raw_dc < 0).any():
            raise InputError('PVWatts produced negative DC outside supported temperature/coefficient conditions')
    dc = raw_dc * (1-s['additionalDcLossPct']/100)
    inverter_columns={}
    if 'sandia' in s:
        ac,inverter_columns=sandia_ac(s['sandia'],electrical_columns['operatingVoltageV'],dc)
        models['ac']='sandia voltage-dependent inverter; pvlib 0.13.1 startup p_dc<Pso; zero DC consumes Pnt'
        limitations.extend([
            'Sandia coefficients and fitted voltage/power domain are caller-declared; no automatic fitting, catalog selection or equipment verification.',
            'Sandia uses the ideal constrained DC operating point with zero additional DC loss; no cable drop, inverter temperature/aging, dynamic startup/hysteresis, reactive power or multiple MPPT buses.',
            'inverterPdc0W equals Pdco reference DC power, not a hard protection rating; legacy inverterEtaNom/inverterEtaRef are inactive.',
            'Positive inverter AC is generation; negative model AC is imported self-consumption. acW/acWh remain nonnegative export after cap; netGridWh subtracts imported self-consumption. No local load/storage.'
        ])
    else:
        ac = pvlib.inverter.pvwatts(dc, s['inverterPdc0W'], eta_inv_nom=s['inverterEtaNom'], eta_inv_ref=s['inverterEtaRef'])
    plant_columns={}
    plant_active=any(k in s for k in ('transformer','auxiliaryPowerW','acAvailability'))
    if plant_active:
        inverter_net=inverter_columns['inverterNetAcW'] if 'sandia' in s else ac
        ac,plant_columns=ac_plant(s,inverter_net)
        models['acAvailability']='explicit interval retained positive generation; parasitic imports stay energized' if 'acAvailability' in s else 'disabled; fraction one'
        models['auxiliary']='constant always-on LV auxiliary before transformer' if 'auxiliaryPowerW' in s else 'disabled; no auxiliary'
        models['transformer']='energized quadratic output-load-loss model; unity power factor; stable root' if 'transformer' in s else 'disabled; ideal connection'
        limitations.extend([
            'AC availability is a declared positive-generation derate only, not a grid outage or physical inverter disconnect; DC operating point is unchanged and inverter self-consumption remains.',
            'Auxiliary is an always-on LV demand, separate from inverter self-consumption; transformer remains energized at night and zero availability. No external site load, battery, reactive power, grid dynamics or transformer overload/thermal protection.',
            'With AC plant enabled, acWh is positive export after plant and export cap; netGridWh subtracts total gridImportWh, not inverterSelfConsumptionWh again. Transformer/availability/auxiliary losses are separate diagnostics.'
        ])
    if plant_active:
        limitations=[x.replace('netGridWh subtracts imported self-consumption','netGridWh subtracts total grid imports after AC plant').replace('No local load/storage.','No external site load/storage beyond declared plant auxiliary.').replace('assumes no local consumption/storage','assumes no external local consumption/storage beyond declared plant auxiliary') for x in limitations]
    export_columns={}
    if 'acExportLimitW' in s:
        before_export=ac.copy()
        ac=ac.clip(upper=s['acExportLimitW'])
        export_columns=dict(acBeforeExportLimitW=before_export,acExportLimitLossW=before_export-ac)
        models['acExport']='constant export cap after inverter; no local load or storage; no DC feedback'
        limitations.append('Static AC export cap acts after the optional AC plant; it does not limit imports. It assumes no external site load/storage beyond any declared LV auxiliary, and no controller dynamics, reactive power, grid voltage or time-varying dispatch; inverter clipping is already upstream and is not counted twice.')
    columns = dict(**environment_columns,**plant_columns,**spectral_columns,**inverter_columns,**export_columns,surfaceTiltDeg=tilt, surfaceAzimuthDeg=azimuth, **tracker_columns, **row_columns, **electrical_columns, solarZenithDeg=position.apparent_zenith, solarAzimuthDeg=position.azimuth, aoiDeg=aoi,
        beamIam=iam, poaDirectWm2=poa.poa_direct, poaSkyDiffuseWm2=poa.poa_sky_diffuse,
        poaGroundDiffuseWm2=poa.poa_ground_diffuse, poaGlobalWm2=poa.poa_global,
        effectiveIrradianceWm2=effective, cellTemperatureC=cell, dcBeforeAdditionalLossW=raw_dc, dcW=dc, acW=ac)
    if not all(np.isfinite(values).all() for values in columns.values()):
        raise InputError('nonfinite model output; unsupported input combination')
    energy = pd.DataFrame(dict(dcBeforeAdditionalLossWh=raw_dc*dt_hours, dcWh=dc*dt_hours, acWh=ac*dt_hours), index=mid)
    if 'horizonProfile' in s:energy['horizonBlockedBeamWhm2']=environment_columns['horizonBlockedBeamWm2']*dt_hours
    if 'soilingSchedule' in s:energy['soilingLossWhm2']=environment_columns['soilingLossWm2']*dt_hours
    if plant_active:
        for name in ('availabilityLoss','auxiliaryConsumption','transformerLoss','gridImport'):energy[name+'Wh']=plant_columns[name+'W']*dt_hours
        energy['netGridWh']=(ac-plant_columns['gridImportW'])*dt_hours
    if 'sandia' in s:
        energy['inverterSelfConsumptionWh']=inverter_columns['inverterSelfConsumptionW']*dt_hours
        if not plant_active:energy['netGridWh']=(ac-inverter_columns['inverterSelfConsumptionW'])*dt_hours
    if 'acExportLimitW' in s:
        energy['acBeforeExportLimitWh']=before_export*dt_hours
        energy['acExportLimitLossWh']=(before_export-ac)*dt_hours
    if 'electrical' in s:
        energy['availableMppWh']=electrical_columns['arrayMppW']*dt_hours
        energy['mpptConstraintLossWh']=constraint_loss*dt_hours
    if 'rowIrradiance' in s:
        energy['frontIncidentWhm2'] = poa.poa_global*dt_hours
        energy['rearIncidentWhm2'] = row_columns['rearIncidentWm2']*dt_hours
        energy['rearEffectiveWhm2'] = row_columns['rearEffectiveIrradianceWm2']*dt_hours
    monthly = energy.groupby(mid.strftime('%Y-%m')).sum()
    warnings = ['All provenance quality labels are caller declarations, not independently verified sources.']
    if electrical_checks.get('designEnvelopeExceededIntervals',0)>0:
        warnings.append('Modeled intervals exceed the declared electrical design irradiance/temperature envelope; specified design Voc is not a worst-case envelope guarantee.')
    closure = (df.ghiWm2-(df.dniWm2*np.maximum(0, np.cos(np.radians(position.apparent_zenith)))+df.dhiWm2)).abs()
    if (closure > 100).any():
        warnings.append('Irradiance component closure differs by >100 W/m2 at some interval midpoints; inputs retained without correction. Threshold is a diagnostic, not a validation criterion.')
    start = times[0]-timedelta(minutes=w['intervalMinutes'])
    annual = (start.month, start.day, start.hour, start.minute, start.second, start.microsecond)==(1,1,0,0,0,0) and times[-1]==datetime(start.year+1,1,1,tzinfo=timezone.utc)
    if not annual:
        warnings.append('Partial/non-calendar-year coverage: period totals only, not annualized.')
    request_bytes = json.dumps(req, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()
    dependencies = {name:version(name) for name in ('pvlib','numpy','pandas','scipy','h5py','requests','pytz','tzdata','python-dateutil','six','certifi','charset-normalizer','idna','urllib3')}
    def iso(t):
        return t.isoformat().replace('+00:00', 'Z')
    return dict(schemaVersion='pvlib-study-result-v1', status='completed', engine='pvlib-python-direct',
        manifest=dict(**(dict(electricalChecks=electrical_checks) if electrical_checks else {}),engineVersion=ENGINE_VERSION, models=models, validationStatus='not_field_validated',
            inputSha256=hashlib.sha256(request_bytes).hexdigest(), workerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            requirementsSha256=hashlib.sha256(Path(__file__).with_name('requirements.txt').read_bytes()).hexdigest(),
            python=platform.python_version(), platform=platform.platform(), dependencies=dependencies,
            period=dict(startUtc=iso(start),endUtc=iso(times[-1]),intervalMinutes=w['intervalMinutes'],intervalCount=len(times),
                        completeUtcCalendarYear=annual, monthlyAllocation='interval midpoint UTC month'),
            units=dict(**(dict(environmentIrradiance='W/m2; integrated Wh/m2; optical diagnostics, not DC energy losses',usedAlbedo='broadband fraction 0..1',soilingRatios='optical transmission fractions 0..1; rear inactive without rows',horizonBeamVisible='binary apparent solar elevation greater than interpolated horizon') if any(k in s for k in ('horizonProfile','soilingSchedule','albedoSchedule')) else {}),**(dict(acPlantInputW='signed W inverter net before plant stages',acAvailabilityFraction='retained fraction of positive generation only',gridImportWh='total Wh imported after energized AC plant; includes inverter self-consumption',netGridWh='signed Wh export after cap minus total gridImportWh') if plant_active else {}),**(dict(spectralFactor='dimensionless; zero when spectralActive=0',absoluteAirmass='dimensionless; zero sentinel when spectralActive=0',spectralActive='0 no optical effective irradiance; 1 applied within declared fitted airmass domain',spectralInputIrradianceWm2='W/m2 after optical IAM, before spectral multiplier') if 'sapmSpectral' in s else {}),**(dict(inverterNetAcW='signed W before export cap; positive generation, negative self-consumption import',inverterSelfConsumptionWh='nonnegative Wh imported for inverter self-consumption',netGridWh='signed Wh after export cap: exported acWh minus imported inverterSelfConsumptionWh') if 'sandia' in s and not plant_active else {}),irradiance='W/m2',power='W',energy='Wh; row irradiance integrals Wh/m2',temperature='degC',angles='degrees; azimuth clockwise from north',
                **(dict(voltage='V at uniform array DC bus',current='A at uniform array DC bus',dcOperatingState='0 dark; 1 MPP; 2 voltage boundary; 3 current boundary; 4 no feasible MPPT point') if 'electrical' in s else {}),
                **(dict(trackerActive='dimensionless daylight command flag (0/1), not equipment availability') if 'tracking' in s else {})),
            limitations=limitations, warnings=warnings),
        request=req, summary={key:float(energy[key].sum()) for key in energy},
        monthly=[dict(month=month,**{key:float(v) for key,v in row.items()}) for month,row in monthly.iterrows()],
        samples=[dict(timestamp=original['timestamp'], midpointUtc=iso(mid[i]), **{key:float(val.iloc[i]) for key,val in columns.items()}) for i,original in enumerate(w['records'])])


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise InputError('duplicate JSON key')
        result[key] = value
    return result


def main():
    try:
        raw = sys.stdin.buffer.read(MAX_BYTES+1)
        if len(raw)>MAX_BYTES:
            raise InputError('input exceeds 8 MiB')
        req = json.loads(raw, object_pairs_hook=no_duplicates, parse_constant=lambda value: (_ for _ in ()).throw(InputError('nonfinite JSON')))
        result = run_study(req)
        print(json.dumps(result, allow_nan=False, separators=(',', ':')))
    except (InputError, json.JSONDecodeError, UnicodeDecodeError) as error:
        print(json.dumps(dict(status='invalid_input',message=str(error))))
        return 2
    except (ImportError, RuntimeError) as error:
        print(json.dumps(dict(status='unavailable',message=str(error))))
        return 3
    except Exception:
        print(json.dumps(dict(status='failed',message='Study failed; no screening fallback was applied')))
        return 4
    return 0

if __name__ == '__main__':
    sys.exit(main())
