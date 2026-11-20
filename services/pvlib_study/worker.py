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
ENGINE_VERSION = '1.3.0'
MODELS = dict(solarPosition='nrel_numpy; delta_t=67 s; atmos_refract=0.5667 deg (fixed assumptions)', pressure='alt2pres standard atmosphere from altitude',
              transposition='haydavies', extraterrestrial='spencer; solar_constant=1366.1 W/m2', beamIam='ashrae',
              diffuseIam='unity assumption', temperature='sapm_cell', dc='pvwatts_dc',
              ac='pvwatts inverter (not SAM/PVWatts V8 equivalence)', spectral='unity assumption',
              energyIntegration='interval-average rectangular; solar geometry at interval midpoint')
LIMITATIONS = [
    'Not field validated, calibrated, bankable or a standards-conformity assessment.',
    'Fixed-tilt or single-axis aggregate array and one aggregate inverter; optional uniform-string diode and ideal static MPPT envelope, not certified electrical design.',
    'No horizon, near-obstacle shading, electrical mismatch, snow, soiling, battery, grid curtailment or financial simulation.',
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
    keys(system, [*bounds, 'temperature', *(['tracking'] if 'tracking' in system else []), *(['rowIrradiance'] if 'rowIrradiance' in system else []), *(['electrical'] if 'electrical' in system else [])], 'system')
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
    poa = pvlib.irradiance.get_total_irradiance(tilt, azimuth, position.apparent_zenith,
        position.azimuth, df.dniWm2, df.ghiWm2, df.dhiWm2,
        dni_extra=pvlib.irradiance.get_extra_radiation(mid, method='spencer', solar_constant=1366.1), albedo=s['albedo'], model='haydavies')
    aoi = pvlib.irradiance.aoi(tilt, azimuth, position.apparent_zenith, position.azimuth)
    iam = pvlib.iam.ashrae(aoi, b=s['iamB'])
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
            df.ghiWm2, df.dhiWm2, df.dniWm2, s['albedo'], model='haydavies',
            dni_extra=pvlib.irradiance.get_extra_radiation(mid,method='spencer',solar_constant=1366.1),
            iam_front=1.0, iam_back=1.0, bifaciality=1.0, shade_factor=0.0,
            transmission_factor=0.0,npoints=100,vectorize=False)
        rear_aoi = pvlib.irradiance.aoi(180-tilt,(azimuth+180)%360,position.apparent_zenith,position.azimuth)
        rear_iam = pvlib.iam.ashrae(rear_aoi,b=rows['rearIamB'])
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
    cell = pvlib.temperature.sapm_cell(thermal_poa, df.tempAirC, df.windSpeedMs, irrad_ref=1000.0, **s['temperature'])
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
            'Operating V/I and constrained power are before explicit additional DC loss; inverter efficiency remains aggregate PVWatts, not voltage dependent.'
        ])
    else:
        raw_dc = pvlib.pvsystem.pvwatts_dc(effective, cell, s['arrayPdc0W'], s['gammaPdcPerC'], temp_ref=25)
        if (raw_dc < 0).any():
            raise InputError('PVWatts produced negative DC outside supported temperature/coefficient conditions')
    dc = raw_dc * (1-s['additionalDcLossPct']/100)
    ac = pvlib.inverter.pvwatts(dc, s['inverterPdc0W'], eta_inv_nom=s['inverterEtaNom'], eta_inv_ref=s['inverterEtaRef'])
    columns = dict(surfaceTiltDeg=tilt, surfaceAzimuthDeg=azimuth, **tracker_columns, **row_columns, **electrical_columns, solarZenithDeg=position.apparent_zenith, solarAzimuthDeg=position.azimuth, aoiDeg=aoi,
        beamIam=iam, poaDirectWm2=poa.poa_direct, poaSkyDiffuseWm2=poa.poa_sky_diffuse,
        poaGroundDiffuseWm2=poa.poa_ground_diffuse, poaGlobalWm2=poa.poa_global,
        effectiveIrradianceWm2=effective, cellTemperatureC=cell, dcBeforeAdditionalLossW=raw_dc, dcW=dc, acW=ac)
    if not all(np.isfinite(values).all() for values in columns.values()):
        raise InputError('nonfinite model output; unsupported input combination')
    energy = pd.DataFrame(dict(dcBeforeAdditionalLossWh=raw_dc*dt_hours, dcWh=dc*dt_hours, acWh=ac*dt_hours), index=mid)
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
            units=dict(irradiance='W/m2',power='W',energy='Wh; row irradiance integrals Wh/m2',temperature='degC',angles='degrees; azimuth clockwise from north',
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
