"""Finite triangle optics and ASSUMED linear-IV/bypass network research.

Not a validated cell model, annual energy model, or replacement for infinite
sheds. ENU metres; explicit occluders only; isotropic upper sky only.
"""
import math
import numpy as np
from .electrical import keys, number
from .thermal import digest

REFERENCE = 'https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm'


def integer(x, lo, hi, name):
    if type(x) is not int or not lo <= x <= hi:
        raise ValueError('Invalid '+name)
    return x


def vector(x):
    if not isinstance(x,list) or len(x)!=3:
        raise ValueError('ENU three-vector required')
    return np.array([number(v,-100000,100000,'coordinate') for v in x])


def visible(points, direction, triangles, cancel=lambda: False):
    """Double-sided Moller–Trumbore; returns 0/1 visibility per origin."""
    clear=np.ones(len(points),dtype=bool)
    for tri in triangles:
        if cancel():raise RuntimeError('Shading cancelled; no partial result')
        a,b,c=tri; e1=b-a; e2=c-a
        p=np.cross(direction,e2);det=float(np.dot(e1,p))
        # Relative angular test, independent of mesh area units.
        if abs(det)<=1e-12*np.linalg.norm(e1)*np.linalg.norm(e2):continue
        rel=points-a;u=rel@p/det
        q=np.cross(rel,e1);v=q@direction/det;t=q@e2/det
        hit=(u>=-1e-12)&(v>=-1e-12)&(u+v<=1+1e-12)&(t>1e-8)
        clear &= ~hit
    return clear


def string_curve(specs, irradiance, drop, reference):
    """Return ascending-voltage (V,I) knots of a series string, I>=0,V>=0.

    Dark substring is bypassed at constant -drop, including I=0 in this assumed
    model. Strings have ideal blocking diodes (no reverse string current).
    """
    units=[(s['iscRefA']*g/reference, s['vocV']) for s,g in zip(specs,irradiance)]
    def voltage(current):
        return sum(max(-drop,voc*(1-current/isc)) if isc>0 else -drop for isc,voc in units)
    currents=sorted(set([0.]+[isc*(1+drop/voc) for isc,voc in units if isc>0]))
    first=voltage(0)
    if first<=0:return np.array([0.]),np.array([0.])
    points=[(first,0.)]
    for cur in currents[1:]:
        v=voltage(cur)
        if v<=0:
            oldv,oldi=points[-1]
            points.append((0.,oldi+(cur-oldi)*oldv/(oldv-v)))
            break
        points.append((v,cur))
    else:
        raise RuntimeError('Incomplete string IV boundary')
    points.reverse()
    return np.array([p[0] for p in points]),np.array([p[1] for p in points])


def network_mpp(patches, strings, irradiance, drop, reference):
    curves=[string_curve([patches[k] for k in ids],[irradiance[k] for k in ids],drop,reference) for ids in strings]
    knots=sorted(set(float(v) for vv,_ in curves for v in vv))
    def current(v):return sum(float(np.interp(v,vv,ii,right=0)) for vv,ii in curves)
    bestp=0.;bestv=0.;besti=0.
    candidates=list(knots)
    for left,right in zip(knots,knots[1:]):
        il,ir=current(left),current(right)
        slope=(ir-il)/(right-left)
        if slope<0:
            intercept=il-slope*left
            stationary=-intercept/(2*slope)
            if left<stationary<right:candidates.append(stationary)
    for v in candidates:
        i=current(v);p=v*i
        if p>bestp:bestp,bestv,besti=p,v,i
    independent=sum(p['vocV']*p['iscRefA']*irradiance[k]/reference/4 for k,p in patches.items())
    return dict(mppW=bestp,mppV=bestv,mppA=besti,independentSubstringMppW=independent,
                mismatchW=max(0.,independent-bestp))


def review_shading(plan, cancel=lambda: False):
    keys(plan,('schemaVersion','source','datum','patches','triangles','sun','quadrature','electrical'))
    if plan['schemaVersion']!='finite-shading-plan-v1':raise ValueError('Unsupported shading plan')
    for field in ('source','datum'):
        if not isinstance(plan[field],str) or not plan[field].strip():raise ValueError(field+' required')
    q=plan['quadrature'];keys(q,('surfaceGrid','skyMu','skyAzimuth','maxPairTests'))
    grid=integer(q['surfaceGrid'],1,12,'surfaceGrid')
    nm=integer(q['skyMu'],1,8,'skyMu');na=integer(q['skyAzimuth'],4,32,'skyAzimuth')
    budget=integer(q['maxPairTests'],1,2000000,'maxPairTests')
    patches=plan['patches'];rawtri=plan['triangles']
    if not isinstance(patches,list) or not 1<=len(patches)<=24:raise ValueError('Require 1..24 patches')
    if not isinstance(rawtri,list) or len(rawtri)>128:raise ValueError('At most 128 triangles')
    work=len(patches)*grid*grid*(1+nm*na)*len(rawtri)
    if work>budget:raise RuntimeError('Ray/triangle budget exceeded; no fallback')
    triangles=[]
    for tri in rawtri:
        if not isinstance(tri,list) or len(tri)!=3:raise ValueError('Triangle needs 3 vertices')
        t=np.array([vector(v) for v in tri])
        if np.linalg.norm(np.cross(t[1]-t[0],t[2]-t[0]))<1e-10:raise ValueError('Degenerate triangle')
        triangles.append(t)
    sun=plan['sun'];keys(sun,('zenithDeg','azimuthDeg','dniWm2','dhiWm2'))
    zen=math.radians(number(sun['zenithDeg'],0,180,'zenithDeg'))
    az=math.radians(number(sun['azimuthDeg'],0,359.999999,'azimuthDeg'))
    dni=number(sun['dniWm2'],0,1500,'dniWm2');dhi=number(sun['dhiWm2'],0,1500,'dhiWm2')
    if zen>=math.pi/2 and dni>0:raise ValueError('DNI must be zero when sun is below horizon')
    direction=np.array([math.sin(zen)*math.sin(az),math.sin(zen)*math.cos(az),math.cos(zen)])
    sky=[]
    for m in range(nm):
        mu=(m+.5)/nm;r=math.sqrt(1-mu*mu)
        for a in range(na):
            phi=2*math.pi*(a+.5)/na
            sky.append(np.array([r*math.sin(phi),r*math.cos(phi),mu]))
    models={};results=[];unshaded={};shaded={};incident0=0.;incident1=0.
    for p in patches:
        if cancel():raise RuntimeError('Shading cancelled; no partial result')
        keys(p,('id','origin','u','v','iscRefA','vocV'))
        ident=p['id']
        if not isinstance(ident,str) or not ident.strip() or ident in models:raise ValueError('Unique patch ids required')
        number(p['iscRefA'],.001,100,'iscRefA');number(p['vocV'],.001,1000,'vocV')
        origin=vector(p['origin']);u=vector(p['u']);v=vector(p['v']);normal=np.cross(u,v);area=float(np.linalg.norm(normal))
        if area<1e-8 or abs(float(np.dot(u,v)))>1e-8*np.linalg.norm(u)*np.linalg.norm(v):
            raise ValueError('Nondegenerate orthogonal rectangular patch required')
        normal/=area
        points=np.array([origin+u*(i+.5)/grid+v*(j+.5)/grid for i in range(grid) for j in range(grid)])
        beam=dni*max(0.,float(normal@direction))
        direct_fraction=float(visible(points,direction,triangles,cancel).mean()) if beam else 1.
        diffuse0=0.;diffuse1=0.
        for d in sky:
            if cancel():raise RuntimeError('Shading cancelled; no partial result')
            weight=max(0.,float(normal@d))*2/(nm*na)  # dOmega/pi
            diffuse0+=dhi*weight
            if weight and dhi:
                diffuse1+=dhi*weight*float(visible(points,d,triangles,cancel).mean())
        before=beam+diffuse0;after=beam*direct_fraction+diffuse1
        unshaded[ident]=before;shaded[ident]=after;models[ident]=p
        incident0+=area*before;incident1+=area*after
        results.append(dict(id=ident,areaM2=area,normalENU=normal.tolist(),directVisibleFraction=direct_fraction,
                            directUnshadedWm2=beam,directShadedWm2=beam*direct_fraction,
                            diffuseUnshadedWm2=diffuse0,diffuseShadedWm2=diffuse1,
                            unshadedWm2=before,shadedWm2=after))
    electrical=plan['electrical'];keys(electrical,('source','strings','bypassDropV','referenceWm2'))
    if not isinstance(electrical['source'],str) or not electrical['source'].strip():raise ValueError('Circuit source required')
    strings=electrical['strings']
    if not isinstance(strings,list) or not 1<=len(strings)<=24 or any(not isinstance(s,list) or not s for s in strings):raise ValueError('Nonempty series strings required')
    ids=[k for s in strings for k in s]
    if any(not isinstance(k,str) for k in ids) or len(ids)!=len(set(ids)) or set(ids)!=set(models):
        raise ValueError('Each patch must appear exactly once in explicit string wiring')
    drop=number(electrical['bypassDropV'],0,5,'bypassDropV')
    ref=number(electrical['referenceWm2'],1,2000,'referenceWm2')
    raw=network_mpp(models,strings,unshaded,drop,ref)
    final=network_mpp(models,strings,shaded,drop,ref)
    return dict(schemaVersion='finite-shading-result-v1',algorithmVersion='1.0.0',reference=REFERENCE,
                plan=plan,planSha256=digest(plan),validationStatus='conditional_assumptions',projectApproval='blocked',
                estimatedRayTrianglePairs=work,patches=results,
                optical=dict(unshadedIncidentW=incident0,shadedIncidentW=incident1,blockedIncidentW=incident0-incident1),
                electrical=dict(model='assumed_linear_IV_constant_Voc_ideal_bypass_and_string_blocking',
                    unshaded=raw,shaded=final,networkReductionW=raw['mppW']-final['mppW'],
                    independentSubstringReductionW=raw['independentSubstringMppW']-final['independentSubstringMppW'],
                    additionalMismatchW=final['mismatchW']-raw['mismatchW']),
                accounting='Optical incident watts are not electrical watts; no losses added to existing waterfall',
                limitations=['finite_opaque_triangles_explicit_only_receivers_not_automatic_occluders',
                    'midpoint_surface_and_sky_quadrature_aliasing_requires_refinement','isotropic_upper_sky_only',
                    'no_ground_reflections_rear_or_anisotropic_diffuse','uniform_irradiance_within_each_electrical_substring',
                    'assumed_linear_IV_not_physical_cell_or_diode_model','no_temperature_reverse_breakdown_or_resistive_losses',
                    'no_field_validation_or_production_yield_integration'])
