"""Conditional module-back thermal inertia plus separate assumed snow/soil.

Areal thermal balance; optical cover is empirical, not snow thermodynamics.
No fitting, cell inference, annualization or production waterfall mutation.
"""
import math
from .electrical import keys, number
from .thermal import digest
from .transient import stamp
from . import snow_environment as snow
from . import soiling_environment as soil

REFERENCE='https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.faiman.html'


def source(x):
    if not isinstance(x,str) or not x.strip():raise ValueError('Nonblank source required')


def simulate_environment(plan, cancel=lambda:False):
    keys(plan,('schemaVersion','source','target','poaBasis','thermal','snow','soiling','initial','intervals','stepS'),('maxSteps',))
    if plan['schemaVersion']!='dynamic-environment-plan-v1' or plan['target']!='back_of_module' or plan['poaBasis']!='unshaded_front':
        raise ValueError('Version, back_of_module target and unshaded_front POA required')
    source(plan['source'])
    thermal=plan['thermal']
    names=('source','capacityJm2K','absorptance','h0Wm2K','hWindWm2KPerMps','windHeightM','coefficientWindHeightM','domain')
    keys(thermal,names);source(thermal['source'])
    capacity=number(thermal['capacityJm2K'],1,1e6,'capacityJm2K')
    absorption=number(thermal['absorptance'],0,1,'absorptance')
    h0=number(thermal['h0Wm2K'],.01,500,'h0Wm2K')
    hw=number(thermal['hWindWm2KPerMps'],0,100,'hWindWm2KPerMps')
    height=number(thermal['windHeightM'],.1,200,'windHeightM')
    coeffheight=number(thermal['coefficientWindHeightM'],.1,200,'coefficientWindHeightM')
    if height!=coeffheight:raise ValueError('Wind height must match coefficient height; no conversion')
    domain=thermal['domain'];keys(domain,('source','airMinC','airMaxC','windMaxMps','poaMaxWm2','backMinC','backMaxC'))
    source(domain['source'])
    amin=number(domain['airMinC'],-80,80,'airMinC');amax=number(domain['airMaxC'],-80,80,'airMaxC')
    bmin=number(domain['backMinC'],-100,200,'backMinC');bmax=number(domain['backMaxC'],-100,200,'backMaxC')
    if amin>=amax or bmin>=bmax:raise ValueError('Invalid declared thermal domain')
    wmax=number(domain['windMaxMps'],0,100,'windMaxMps');gmax=number(domain['poaMaxWm2'],1,2000,'poaMaxWm2')
    sp=plan['snow'];keys(sp,('source','coverageSweMm','meltMmPerHourPerC','coveredTransmission'));source(sp['source'])
    full=number(sp['coverageSweMm'],.001,1000,'coverageSweMm')
    melt=number(sp['meltMmPerHourPerC'],0,100,'meltMmPerHourPerC')
    covered=number(sp['coveredTransmission'],0,1,'coveredTransmission')
    dp=plan['soiling'];keys(dp,('source','depositionTauPerHour','rainWashPerMm'));source(dp['source'])
    dep=number(dp['depositionTauPerHour'],0,10,'depositionTauPerHour')
    wash=number(dp['rainWashPerMm'],0,100,'rainWashPerMm')
    initial=plan['initial'];keys(initial,('moduleBackC','snowSweMm','soilOpticalDepth'))
    temp=number(initial['moduleBackC'],bmin,bmax,'moduleBackC')
    swe=number(initial['snowSweMm'],0,1000,'snowSweMm');tau=number(initial['soilOpticalDepth'],0,100,'soilOpticalDepth')
    step=number(plan['stepS'],.001,60,'stepS')
    if step>capacity/(h0+hw*wmax)/10:raise ValueError('stepS exceeds minimum thermal time constant / 10')
    budget=plan.get('maxSteps',200000)
    if type(budget) is not int or not 1<=budget<=1000000:raise ValueError('Invalid maxSteps')
    rows=plan['intervals']
    if not isinstance(rows,list) or not 1<=len(rows)<=10000:raise ValueError('Require 1..10000 intervals')
    prepared=[];end=None;steps=0
    for row in rows:
        keys(row,('start','durationS','poaWm2','extractedElectricalWm2','airC','windMps','rainMmPerHour','snowfallSweMmPerHour',
                  'soilCleaningFraction','snowRemovalFraction'),('observedEndModuleBackC',))
        start=stamp(row['start']);dt=number(row['durationS'],.001,3600,'durationS')
        if end is not None and abs(start.timestamp()-end)>1e-6:raise ValueError('Gap/overlap in environmental series')
        end=start.timestamp()+dt
        limits={'poaWm2':(0,gmax),'extractedElectricalWm2':(0,gmax),'airC':(amin,amax),'windMps':(0,wmax),
                'rainMmPerHour':(0,1000),'snowfallSweMmPerHour':(0,1000),'soilCleaningFraction':(0,1),'snowRemovalFraction':(0,1)}
        data={k:number(row[k],*bound,k) for k,bound in limits.items()}
        observed=number(row['observedEndModuleBackC'],bmin,bmax,'observedEndModuleBackC') if 'observedEndModuleBackC' in row else None
        n=math.ceil(dt/step);steps+=n;prepared.append((start,dt,n,data,observed))
    if steps>budget:raise RuntimeError('Environment step budget exceeded; no fallback')
    trace=[];errors=[];total_incident=0.;total_absorbed=0.;total_extracted=0.;total_heat=0.
    initial_temp=temp
    for start,dt,n,d,observed in prepared:
        if cancel():raise RuntimeError('Environment simulation cancelled; no partial result')
        temp0=temp;swe0=swe;tau0=tau
        removed_snow=swe*d['snowRemovalFraction'];swe-=removed_snow
        cleaned=tau*d['soilCleaningFraction'];tau-=cleaned
        added=melted=deposited=washed=incident=absorbed=extracted=heat=0.
        h=h0+hw*d['windMps'];rate=h/capacity;ds=dt/n
        for _ in range(n):
            if cancel():raise RuntimeError('Environment simulation cancelled; no partial result')
            ss=snow.advance(swe,d['snowfallSweMmPerHour'],d['airC'],melt,ds)
            sm=snow.advance(swe,d['snowfallSweMmPerHour'],d['airC'],melt,ds/2)
            dd=soil.advance(tau,dep,wash,d['rainMmPerHour'],ds)
            dm=soil.advance(tau,dep,wash,d['rainMmPerHour'],ds/2)
            snowtrans=snow.transmission(sm['sweMm'],full,covered)
            soiltrans=soil.transmission(dm['opticalDepth'])
            effective=d['poaWm2']*snowtrans*soiltrans
            # Conservative extraction gate throughout this substep, not only at midpoint.
            minimum_trans=snow.transmission(max(swe,ss['sweMm']),full,covered)*soil.transmission(max(tau,dd['opticalDepth']))
            if d['extractedElectricalWm2']>absorption*d['poaWm2']*minimum_trans+1e-10:
                raise ValueError('Electrical extraction exceeds conservatively available absorbed power')
            q=absorption*effective-d['extractedElectricalWm2']
            equilibrium=d['airC']+q/h
            gain=-math.expm1(-rate*ds)
            endtemp=temp+(equilibrium-temp)*gain
            # Exact integral of h*(T-Ta) for this midpoint-held forcing.
            heat_step=q*ds-capacity*(equilibrium-temp)*gain
            incident+=effective*ds;absorbed+=absorption*effective*ds
            extracted+=d['extractedElectricalWm2']*ds;heat+=heat_step
            temp=endtemp;swe=ss['sweMm'];tau=dd['opticalDepth']
            added+=ss['addedMm'];melted+=ss['meltedMm'];deposited+=dd['depositedTau'];washed+=dd['washedTau']
            if not bmin<=temp<=bmax or swe>1000 or tau>100:
                raise RuntimeError('Environmental state outside declared domain; no extrapolation')
        error=None
        if observed is not None:error=temp-observed;errors.append(error)
        total_incident+=incident;total_absorbed+=absorbed;total_extracted+=extracted;total_heat+=heat
        trace.append(dict(startUTC=start.isoformat(),durationS=dt,steps=n,moduleBackC=temp,snowSweMm=swe,soilOpticalDepth=tau,
            endSnowTransmission=snow.transmission(swe,full,covered),endSoilTransmission=soil.transmission(tau),
            effectiveIncidentWhm2=incident/3600,absorbedWhm2=absorbed/3600,extractedElectricalWhm2=extracted/3600,
            heatToAmbientWhm2=heat/3600,storedHeatChangeJm2=capacity*(temp-temp0),
            thermalResidualJm2=capacity*(temp-temp0)-absorbed+extracted+heat,
            snowAddedMm=added,snowMeltedMm=melted,snowRemovedMm=removed_snow,
            snowBalanceResidualMm=swe-swe0-added+melted+removed_snow,
            soilDepositedTau=deposited,soilWashedTau=washed,soilCleanedTau=cleaned,
            soilBalanceResidualTau=tau-tau0-deposited+washed+cleaned,
            observedEndModuleBackC=observed,moduleBackErrorC=error))
    return dict(schemaVersion='dynamic-environment-result-v1',algorithmVersion='1.0.0',reference=REFERENCE,
        plan=plan,planSha256=digest(plan),validationStatus='conditional_assumptions',projectApproval='blocked',target='back_of_module',steps=steps,
        effectiveIncidentWhm2=total_incident/3600,absorbedWhm2=total_absorbed/3600,
        extractedElectricalWhm2=total_extracted/3600,heatToAmbientWhm2=total_heat/3600,
        storedHeatChangeJm2=capacity*(temp-initial_temp),thermalResidualJm2=capacity*(temp-initial_temp)-total_absorbed+total_extracted+total_heat,
        trace=trace,comparison=dict(pairs=len(errors),rmseC=math.sqrt(sum(e*e for e in errors)/len(errors)) if errors else None,
                                  mbeC=sum(errors)/len(errors) if errors else None),fallback='none_fail_closed',
        accounting='Snow and soil transmission multiply unshaded POA once; not production PV yield, auxiliary or structural snow',
        limitations=['assumed_single_module_back_node_not_cell_temperature','caller_declared_coefficients_domain_and_wind_height_not_authenticated',
            'midpoint_optical_forcing_requires_step_refinement','empirical_snow_cover_no_latent_heat_or_insulation',
            'assumed_soil_optical_depth_not_dust_mass','no_Marion_Kimber_or_structural_load_claim',
            'ZOH_inputs_no_gapfill_or_annualization','no_field_validation_or_production_waterfall'])
