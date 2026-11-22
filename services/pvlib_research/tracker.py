"""Conditional planar tracker motion; no production geometry or yield mutation.

pvlib 0.13.1 slope-aware singleaxis supplies ideal target, not actuator motion.
Physical theta = encoder + offset. ENU normal angles use pvlib convention.
"""
import math
from importlib.metadata import version
import pvlib
from .electrical import keys, number
from .transient import stamp
from .thermal import digest


REFERENCE = 'https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.tracking.singleaxis.html'


def text(value, name):
    if not isinstance(value,str) or not value.strip():
        raise ValueError(name+' required')
    return value


def simulate_tracker(plan, cancel=lambda: False):
    keys(plan, ('schemaVersion','source','terrain','layout','actuator','wind','initial','intervals'))
    if plan['schemaVersion'] != 'tracker-motion-plan-v1':
        raise ValueError('Unsupported tracker schema')
    text(plan['source'],'source')
    terrain=plan['terrain'];keys(terrain,('datum','source','slopeTiltDeg','slopeAzimuthDeg'))
    text(terrain['datum'],'datum');text(terrain['source'],'terrain.source')
    slope=number(terrain['slopeTiltDeg'],0,30,'slopeTiltDeg')
    slopeaz=number(terrain['slopeAzimuthDeg'],0,359.999999,'slopeAzimuthDeg')
    layout=plan['layout'];keys(layout,('axisAzimuthDeg','widthM','pitchM','backtrack'))
    axisaz=number(layout['axisAzimuthDeg'],0,359.999999,'axisAzimuthDeg')
    width=number(layout['widthM'],.01,100,'widthM');pitch=number(layout['pitchM'],.01,1000,'pitchM')
    if width>=pitch or type(layout['backtrack']) is not bool:
        raise ValueError('Require width < pitch and boolean backtrack')
    at=float(pvlib.tracking.calc_axis_tilt(slopeaz,slope,axisaz))
    cat=float(pvlib.tracking.calc_cross_axis_tilt(slopeaz,slope,axisaz,at))
    a=plan['actuator']
    fields=('source','minPhysicalDeg','maxPhysicalDeg','encoderOffsetDeg','slewDegPerS',
            'windStowDeg','nightStowDeg','movingW','idleW','count')
    keys(a,fields);text(a['source'],'actuator.source')
    lo=number(a['minPhysicalDeg'],-90,0,'minPhysicalDeg')
    hi=number(a['maxPhysicalDeg'],0,90,'maxPhysicalDeg')
    if lo>=hi:raise ValueError('Empty mechanical angle range')
    offset=number(a['encoderOffsetDeg'],-30,30,'encoderOffsetDeg')
    speed=number(a['slewDegPerS'],.0001,30,'slewDegPerS')
    stow=number(a['windStowDeg'],lo,hi,'windStowDeg')
    night=number(a['nightStowDeg'],lo,hi,'nightStowDeg')
    moving=number(a['movingW'],0,1e6,'movingW');idle=number(a['idleW'],0,1e6,'idleW')
    count=a['count']
    if type(count) is not int or not 1<=count<=100000:
        raise ValueError('Invalid actuator count')
    w=plan['wind'];keys(w,('source','heightM','triggerMps','releaseMps'))
    text(w['source'],'wind.source');number(w['heightM'],.1,200,'heightM')
    trigger=number(w['triggerMps'],.01,100,'triggerMps')
    release=number(w['releaseMps'],0,100,'releaseMps')
    if release>=trigger:raise ValueError('releaseMps must be below triggerMps')
    initial=plan['initial'];keys(initial,('encoderDeg','windLatched'))
    theta=number(initial['encoderDeg'],lo-offset,hi-offset,'encoderDeg')+offset
    latched=initial['windLatched']
    if type(latched) is not bool:raise ValueError('windLatched must be boolean')
    rows=plan['intervals']
    if not isinstance(rows,list) or not 1<=len(rows)<=10000:
        raise ValueError('Require 1..10000 intervals')
    prepared=[];end=None
    for row in rows:
        keys(row,('start','durationS','solarZenithDeg','solarAzimuthDeg','windMps'),('observedEndEncoderDeg',))
        start=stamp(row['start']);duration=number(row['durationS'],.001,60,'durationS')
        if end is not None and abs(start.timestamp()-end)>1e-6:
            raise ValueError('Gap/overlap in tracker telemetry')
        end=start.timestamp()+duration
        zen=number(row['solarZenithDeg'],0,180,'solarZenithDeg')
        az=number(row['solarAzimuthDeg'],0,359.999999,'solarAzimuthDeg')
        wind=number(row['windMps'],0,150,'windMps')
        observed=None
        if 'observedEndEncoderDeg' in row:
            observed=number(row['observedEndEncoderDeg'],-180,180,'observedEndEncoderDeg')
        prepared.append((start,duration,zen,az,wind,observed))
    trace=[];energy=0.;travel=0.;errors=[]
    for start,duration,zen,az,wind,observed in prepared:
        if cancel():raise RuntimeError('Tracker simulation cancelled; no fallback')
        if wind>=trigger:latched=True
        elif wind<=release:latched=False
        ideal=None
        if latched:target=stow;mode='wind_stow'
        elif zen>=90:target=night;mode='night_stow'
        else:
            ideal=float(pvlib.tracking.singleaxis(zen,az,axis_tilt=at,axis_azimuth=axisaz,
                        max_angle=(lo,hi),backtrack=layout['backtrack'],gcr=width/pitch,
                        cross_axis_tilt=cat)['tracker_theta'][0])
            if not math.isfinite(ideal):raise RuntimeError('Nonfinite tracker target; no fallback')
            target=ideal;mode='tracking'
        before=theta
        delta=max(-speed*duration,min(speed*duration,target-theta))
        theta+=delta
        moving_s=abs(delta)/speed
        wh=count*(moving*moving_s+idle*(duration-moving_s))/3600
        energy+=wh;travel+=abs(delta)
        orient=pvlib.tracking.calc_surface_orientation(theta,axis_tilt=at,axis_azimuth=axisaz)
        tilt=float(orient['surface_tilt']);surfaceaz=float(orient['surface_azimuth'])
        normal=[math.sin(math.radians(tilt))*math.sin(math.radians(surfaceaz)),
                math.sin(math.radians(tilt))*math.cos(math.radians(surfaceaz)),math.cos(math.radians(tilt))]
        error=None
        if observed is not None:
            error=theta-offset-observed;errors.append(error)
        trace.append(dict(startUTC=start.isoformat(),durationS=duration,solarZenithDeg=zen,solarAzimuthDeg=az,
                          windMps=wind,mode=mode,windLatched=latched,
                          idealTrackingDeg=ideal,targetPhysicalDeg=target,startPhysicalDeg=before,
                          endPhysicalDeg=theta,endEncoderDeg=theta-offset,movingS=moving_s,
                          targetReached=abs(theta-target)<1e-9,motorEnergyWh=wh,
                          endSurfaceTiltDeg=tilt,endSurfaceAzimuthDeg=surfaceaz,endNormalENU=normal,
                          observedEndEncoderDeg=observed,encoderErrorDeg=error))
    return dict(schemaVersion='tracker-motion-result-v1',algorithmVersion='1.0.0',pvlibVersion=version('pvlib'),
                plan=plan,planSha256=digest(plan),
                reference=REFERENCE,source=plan['source'],terrain=terrain,layout=layout,actuator=a,wind=w,initial=initial,
                axisTiltDeg=at,crossAxisTiltDeg=cat,validationStatus='conditional_assumptions',projectApproval='blocked',
                trace=trace,motorEnergyWh=energy,travelDegPerActuator=travel,
                movementComparison=dict(pairs=len(errors),rmseDeg=math.sqrt(sum(x*x for x in errors)/len(errors)) if errors else None,
                                        mbeDeg=sum(errors)/len(errors) if errors else None),
                accounting='Standalone actuator consumption; not subtracted from energy or existing auxiliary',
                limitations=['planar_parallel_identical_rows_only','no_survey_authentication_or_3D_terrain',
                             'ZOH_sun_and_wind_no_gust_interpolation','constant_slew_no_acceleration_or_torque',
                             'wind_stow_transit_not_safety_certified','backtracking_target_not_actual_no_shade_guarantee',
                             'no_field_validation_or_yield_integration'])
