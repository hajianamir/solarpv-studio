"""Bounded C1–C3 research. No certificates, annual yield or finance adoption."""
import math
import re
from scipy.optimize import brentq
from .portfolio import bounded,numeric_fields,integer,stamps,result
from .electrical import keys

F=96485.33212
H2_MOLAR_KG=.00201588
O2_MOLAR_KG=.0319988
WATER_MOLAR_KG=H2_MOLAR_KG+O2_MOLAR_KG/2


def header(p,version,fields):
    bounded(p,('schemaVersion','source','contextSha256',*fields))
    if p['schemaVersion']!=version or not isinstance(p['contextSha256'],str) or not re.fullmatch('[a-f0-9]{64}',p['contextSha256']):raise ValueError('Version/context')


def rows(p,rules,extra=(),hours=None,maximum=2000):
    if not isinstance(p['records'],list) or not 1<=len(p['records'])<=maximum:raise ValueError('Record budget')
    for r in p['records']:
        keys(r,('timestamp',*rules,*extra));numeric_fields(r,rules)
    stamps(p['records'],hours if hours is not None else p['intervalS']/3600)


def output(p,op,data,scope):
    return result(p,op,dict(**data,scope=scope),'insufficient_evidence')


def grid_support(p):
    header(p,'grid-support-v1',('intervalS','ratingKva','maximumCurrentPu','responseS','nominalHz','droopKwPerHz','voltVar','rulepack','records'))
    numeric_fields(p,dict(intervalS=(.001,60),ratingKva=(.001,1e6),maximumCurrentPu=(.1,2),responseS=(.001,1000),nominalHz=(45,65),droopKwPerHz=(0,1e6)))
    curve=p['voltVar']
    if not isinstance(curve,list) or not 2<=len(curve)<=20:raise ValueError('Volt-Var table')
    previous=-1
    for point in curve:
        keys(point,('voltagePu','qPu'));numeric_fields(point,dict(voltagePu=(0,2),qPu=(-1,1)))
        if point['voltagePu']<=previous:raise ValueError('Increasing Volt-Var knots')
        previous=point['voltagePu']
    rows(p,dict(voltagePu=(0,2),frequencyHz=(0,100),availableKw=(0,1e6)),('connected',))
    if any(r['connected'] is not None and type(r['connected']) is not bool for r in p['records']):raise ValueError('Observed connection boolean/null')
    rule=p['rulepack'];applicable=False
    if rule is not None:
        keys(rule,('id','version','source','documentSha256','contextSha256','voltageMinPu','voltageMaxPu','frequencyMinHz','frequencyMaxHz','tripDeadlineS'))
        for k in ('id','version','source'):
            if not isinstance(rule[k],str) or not 1<=len(rule[k].strip())<=1000:raise ValueError('Rule provenance')
        for k in ('documentSha256','contextSha256'):
            if not isinstance(rule[k],str) or not re.fullmatch('[a-f0-9]{64}',rule[k]):raise ValueError('Rule hash')
        numeric_fields(rule,dict(voltageMinPu=(0,2),voltageMaxPu=(0,2),frequencyMinHz=(0,100),frequencyMaxHz=(0,100),tripDeadlineS=(.001,3600)))
        if rule['voltageMinPu']>=rule['voltageMaxPu'] or rule['frequencyMinHz']>=rule['frequencyMaxHz']:raise ValueError('Rule bands')
        applicable=rule['contextSha256']==p['contextSha256']
    def interp(x):
        if x<=curve[0]['voltagePu']:return curve[0]['qPu']
        for a,b in zip(curve,curve[1:]):
            if x<=b['voltagePu']:return a['qPu']+(b['qPu']-a['qPu'])*(x-a['voltagePu'])/(b['voltagePu']-a['voltagePu'])
        return curve[-1]['qPu']
    active=reactive=outside=0.;eligible=violations=unknown=0;trace=[];gain=-math.expm1(-p['intervalS']/p['responseS'])
    for r in p['records']:
        limit=p['ratingKva']*min(1,r['voltagePu']*p['maximumCurrentPu'])
        qt=max(-limit,min(limit,p['ratingKva']*interp(r['voltagePu'])))
        pt=min(max(0,r['availableKw']-p['droopKwPerHz']*max(0,r['frequencyHz']-p['nominalHz'])),math.sqrt(max(0,limit**2-qt**2)))
        active+=gain*(pt-active);reactive+=gain*(qt-reactive)
        magnitude=math.hypot(active,reactive)
        if magnitude>limit:active*=limit/magnitude;reactive*=limit/magnitude
        if r['connected'] is False:active=reactive=0.
        state='not_evaluated'
        if applicable:
            out=not (rule['voltageMinPu']<=r['voltagePu']<=rule['voltageMaxPu'] and rule['frequencyMinHz']<=r['frequencyHz']<=rule['frequencyMaxHz'])
            outside=outside+p['intervalS'] if out else 0.
            if out and outside+1e-12>=rule['tripDeadlineS']:
                eligible+=1
                if r['connected'] is None:unknown+=1;state='insufficient_evidence'
                elif r['connected']:violations+=1;state='fail'
                else:state='pass'
        trace.append(dict(timestamp=r['timestamp'],pKw=active,qKvar=reactive,targetPKw=pt,targetQKvar=qt,limitKva=limit,outsideDurationS=outside,tripScreen=state))
    status='fail' if violations else 'pass' if applicable and eligible and not unknown else 'insufficient_evidence'
    return output(p,'grid_support',dict(trace=trace,tripDeadlineScreen=status,eligibleSamples=eligible,violations=violations,unknownSamples=unknown,antiIslanding='insufficient_evidence',certificate=False,rulepackSha256=None if rule is None else rule['documentSha256']), 'Command-level Volt-Var/frequency-watt first-order response and generic declared outside-band trip deadline only. Not GFM/EMT, mandatory ride-through, utility approval or anti-islanding test.')


def agri_water(p):
    header(p,'agri-water-v1',('totalAvailableWaterMm','initialWaterMm','readilyAvailableFraction','cropCoefficient','runoffFraction','lightTransmission','shadedEtMultiplier','interceptedParFraction','lightUseEfficiencyGPerMj','harvestIndex','parMolPerMj','referencePvKwh','records'))
    numeric_fields(p,dict(totalAvailableWaterMm=(1,1000),initialWaterMm=(0,1000),readilyAvailableFraction=(.01,.99),cropCoefficient=(0,2),runoffFraction=(0,1),lightTransmission=(0,1),shadedEtMultiplier=(0,1.5),interceptedParFraction=(0,1),lightUseEfficiencyGPerMj=(0,10),harvestIndex=(0,1),parMolPerMj=(1,10),referencePvKwh=(0,1e12)))
    if p['initialWaterMm']>p['totalAvailableWaterMm']:raise ValueError('Initial water exceeds TAW')
    rows(p,dict(parMjM2=(0,30),referenceEtMm=(0,30),rainMm=(0,1000),irrigationMm=(0,1000),pvKwh=(0,1e9)),hours=24,maximum=366)
    scenarios=[]
    for trans,et_multiplier in ((1.,1.),(p['lightTransmission'],p['shadedEtMultiplier'])):
        water=p['initialWaterMm'];biomass=0.;trace=[]
        for r in p['records']:
            start=water;runoff=r['rainMm']*p['runoffFraction'];incoming=r['rainMm']-runoff+r['irrigationMm'];drain=max(0,water+incoming-p['totalAvailableWaterMm']);wet=min(p['totalAvailableWaterMm'],water+incoming)
            stress=min(1,wet/((1-p['readilyAvailableFraction'])*p['totalAvailableWaterMm']))
            potential=r['referenceEtMm']*p['cropCoefficient']*et_multiplier;et=min(wet,potential*stress);water=wet-et
            growth=r['parMjM2']*trans*p['interceptedParFraction']*p['lightUseEfficiencyGPerMj']*stress;biomass+=growth
            trace.append(dict(timestamp=r['timestamp'],dliMolM2=r['parMjM2']*trans*p['parMolPerMj'],startWaterMm=start,incomingMm=incoming,runoffMm=runoff,drainageMm=drain,stress=stress,etMm=et,endWaterMm=water,biomassGainGM2=growth,waterResidualMm=water-start-incoming+drain+et))
        scenarios.append(dict(trace=trace,biomassGM2=biomass,yieldKgHa=biomass*10*p['harvestIndex']))
    reference,shaded=scenarios;pv=sum(r['pvKwh'] for r in p['records']);ler=shaded['yieldKgHa']/reference['yieldKgHa']+pv/p['referencePvKwh'] if reference['yieldKgHa']>0 and p['referencePvKwh']>0 else None
    return output(p,'agri_water',dict(reference=reference,shaded=shaded,pvKwh=pv,landEquivalentRatio=ler), 'Paired same-ground-boundary empirical daily light-use-efficiency/root-zone bucket; explicit caller ET/PAR/crop coefficients. Not full FAO56 dual-coefficient, microclimate, phenology or field crop prediction. LER uses caller-matched period/land baselines, not verified field controls.')


def fpv_balance(p):
    header(p,'fpv-balance-v1',('intervalS','stepS','areaM2','depthM','initialTemperatureC','coverageFraction','coveredEvaporationRatio','waterAbsorptance','convectionWm2K','temperatureToleranceC','records'))
    numeric_fields(p,dict(intervalS=(60,3600),stepS=(1,3600),areaM2=(1,1e7),depthM=(.1,100),initialTemperatureC=(0,60),coverageFraction=(0,1),coveredEvaporationRatio=(0,1),waterAbsorptance=(0,1),convectionWm2K=(0,100),temperatureToleranceC=(1e-6,2)))
    rows(p,dict(solarWm2=(0,1500),airC=(-20,60),potentialEvapMmDay=(0,30),rainMm=(0,100),inflowM3=(0,1e6),outflowM3=(0,1e6)),maximum=168)
    if p['stepS']>p['intervalS'] or len(p['records'])*math.ceil(p['intervalS']/(p['stepS']/2))>100000:raise ValueError('FPV step budget')
    volume0=p['areaM2']*p['depthM'];capacity=volume0*4.186e6
    def solve(coverage,step):
        temperature=p['initialTemperatureC'];volume=volume0;trace=[]
        for r in p['records']:
            initial=temperature;start_volume=volume;n=math.ceil(p['intervalS']/step);dt=p['intervalS']/n
            evaporation=r['potentialEvapMmDay']/1000*p['areaM2']*p['intervalS']/86400*(1-coverage*(1-p['coveredEvaporationRatio']))
            volume+=r['rainMm']/1000*p['areaM2']+r['inflowM3']-r['outflowM3']-evaporation
            if volume<=0 or abs(volume-volume0)>.05*volume0:raise ValueError('FPV constant-capacity volume domain exceeded (5%)')
            solar=r['solarWm2']*p['areaM2']*p['waterAbsorptance']*(1-coverage);latent=evaporation*1000*2.45e6/p['intervalS'];ua=p['convectionWm2K']*p['areaM2'];conv=0.
            for _ in range(n):
                temperature=(capacity*temperature/dt+solar-latent+ua*r['airC'])/(capacity/dt+ua);conv+=ua*(temperature-r['airC'])*dt
            storage=capacity*(temperature-initial);trace.append(dict(timestamp=r['timestamp'],temperatureC=temperature,volumeM3=volume,evaporationM3=evaporation,solarJ=solar*p['intervalS'],latentJ=latent*p['intervalS'],convectionJ=conv,storageJ=storage,energyResidualJ=storage-solar*p['intervalS']+latent*p['intervalS']+conv,waterResidualM3=volume-start_volume-r['rainMm']/1000*p['areaM2']-r['inflowM3']+r['outflowM3']+evaporation))
        return dict(trace=trace,totalEvaporationM3=sum(x['evaporationM3'] for x in trace))
    reference=solve(0,p['stepS']/2);coarse=solve(p['coverageFraction'],p['stepS']);covered=solve(p['coverageFraction'],p['stepS']/2)
    delta=max(abs(a['temperatureC']-b['temperatureC']) for a,b in zip(coarse['trace'],covered['trace']))
    if any(not 0<=x['temperatureC']<=60 for s in (reference,coarse,covered) for x in s['trace']):raise ValueError('FPV water outside thermal domain')
    return output(p,'fpv_balance',dict(reference=reference,coarse=coarse,covered=covered,evaporationDifferenceM3=reference['totalEvaporationM3']-covered['totalEvaporationM3'],temperatureDeltaC=delta,numericalGate='passed' if delta<=p['temperatureToleranceC'] else 'failed_refinement'), 'Fixed heat-capacity well-mixed reservoir within 5% volume change; supplied evaporation potential. Bulk water flows assumed at reservoir temperature (no advective heat). No stratification, module cooling/yield gain or site evaporation qualification.')


def pem_dispatch(p):
    header(p,'pem-dispatch-v1',('intervalS','cells','reversibleV','activationV','exchangeCurrentA','resistanceOhm','maximumCurrentA','minimumCurrentA','rampAPerS','faradaicEfficiency','hydrogenHhvJMol','auxiliaryW','startupS','startupW','records'))
    numeric_fields(p,dict(intervalS=(.1,3600),reversibleV=(1,2),activationV=(0,.5),exchangeCurrentA=(.001,1000),resistanceOhm=(0,1),maximumCurrentA=(.001,10000),minimumCurrentA=(0,10000),rampAPerS=(.0001,1e5),faradaicEfficiency=(.5,1),hydrogenHhvJMol=(200000,300000),auxiliaryW=(0,1e6),startupS=(0,86400),startupW=(0,1e6)))
    integer(p['cells'],1,10000)
    if p['minimumCurrentA']>p['maximumCurrentA']:raise ValueError('PEM part-load order')
    rows(p,dict(availableW=(0,1e9)),maximum=2000)
    def voltage(i):return p['reversibleV']+p['activationV']*math.asinh(i/(2*p['exchangeCurrentA']))+p['resistanceOhm']*i
    def demand(i):return p['cells']*i*voltage(i)+p['auxiliaryW']
    current=warm=0.;trace=[];dt=p['intervalS']
    for r in p['records']:
        available=r['availableW'];startup_energy=0.;state='off';previous=current;emergency=False
        if warm<p['startupS']:
            if available>=p['startupW']:
                used=min(dt,p['startupS']-warm);startup_energy=p['startupW']*used;warm+=used;state='starting'
            else:warm=0.
            # Startup consumes this entire scheduling interval; no fractional production.
            current=0.
        else:
            if available>=demand(p['minimumCurrentA']):
                high=p['maximumCurrentA'];target=high if demand(high)<=available else brentq(lambda i:demand(i)-available,0,high,xtol=1e-10)
                current=min(target,previous+p['rampAPerS']*dt)
                lower=max(0,previous-p['rampAPerS']*dt)
                if current+1e-8<lower:emergency=True
                if current<p['minimumCurrentA']-1e-9:current=0.;state='below_part_load'
                else:state='running'
            else:current=0.;emergency=previous>0;warm=0.
        stack=p['cells']*current*voltage(current);aux=p['auxiliaryW'] if current>0 else 0.;consumed=(stack+aux)*dt+startup_energy
        if consumed>available*dt+1e-5:raise ValueError('PEM available energy ledger')
        mol=p['cells']*current*dt*p['faradaicEfficiency']/(2*F);chemical=mol*p['hydrogenHhvJMol'];heat=stack*dt-chemical
        trace.append(dict(timestamp=r['timestamp'],state=state,currentA=current,cellVoltageV=voltage(current),stackJ=stack*dt,auxiliaryJ=aux*dt,startupJ=startup_energy,curtailedJ=max(0,available*dt-consumed),hydrogenKg=mol*H2_MOLAR_KG,oxygenKg=mol*O2_MOLAR_KG/2,waterConsumedKg=mol*WATER_MOLAR_KG,chemicalHhvJ=chemical,heatJ=heat,emergencyRampDown=emergency,energyResidualJ=available*dt-consumed-max(0,available*dt-consumed)))
    return output(p,'pem_dispatch',dict(trace=trace,hydrogenKg=sum(x['hydrogenKg'] for x in trace),consumedElectricJ=sum(x['stackJ']+x['auxiliaryJ']+x['startupJ'] for x in trace)), 'Isothermal caller-parameter polarization/Faraday model, interval-constant current and sampled ramp constraint. Startup reserves full intervals, emergency power-loss ramp-down overrides normal ramp. Heat may be negative (external requirement). No compressor, pressure storage, thermal transient, direct PV-T coupling or safety qualification.')


def pvt_pcm(p):
    header(p,'pvt-pcm-v1',('intervalS','stepS','massKgM2','heatCapacityJkgK','latentJkg','meltC','initialC','initialMeltFraction','absorptance','efficiencyRef','gammaPerK','ambientLossWm2K','fluidUaWm2K','temperatureToleranceC','records'))
    numeric_fields(p,dict(intervalS=(1,3600),stepS=(.1,600),massKgM2=(.01,1000),heatCapacityJkgK=(100,10000),latentJkg=(1000,1e6),meltC=(0,100),initialC=(-10,120),initialMeltFraction=(0,1),absorptance=(0,1),efficiencyRef=(0,.5),gammaPerK=(-.01,0),ambientLossWm2K=(0,100),fluidUaWm2K=(0,1000),temperatureToleranceC=(1e-6,2)))
    if p['initialC']!=p['meltC'] and p['initialMeltFraction']!=0:raise ValueError('Melt fraction only explicit at phase temperature')
    rows(p,dict(solarWm2=(0,1500),airC=(-20,80),inletC=(-10,120),flowHeatCapacityWm2K=(0,10000)),maximum=168)
    if p['stepS']>p['intervalS'] or len(p['records'])*math.ceil(p['intervalS']/(p['stepS']/2))>100000:raise ValueError('PCM step budget')
    capacity=p['massKgM2']*p['heatCapacityJkgK'];latent=p['massKgM2']*p['latentJkg']
    def temperature(e):return p['meltC']+e/capacity if e<0 else p['meltC'] if e<=latent else p['meltC']+(e-latent)/capacity
    initial=capacity*(p['initialC']-p['meltC'])+(latent*p['initialMeltFraction'] if p['initialC']==p['meltC'] else latent if p['initialC']>p['meltC'] else 0)
    def solve(step):
        energy=initial;trace=[]
        for r in p['records']:
            start=energy;n=math.ceil(p['intervalS']/step);dt=p['intervalS']/n;electric=fluid=ambient=0.;absorbed=r['solarWm2']*p['absorptance']
            flow=r['flowHeatCapacityWm2K'];conductance=flow*(-math.expm1(-p['fluidUaWm2K']/flow)) if flow>0 else 0.
            slope=conductance+p['ambientLossWm2K']+r['solarWm2']*p['efficiencyRef']*p['gammaPerK']
            if 1+dt*slope/capacity<=0:raise ValueError('PCM nonmonotone implicit step')
            def flux(e):
                t=temperature(e);eff=p['efficiencyRef']*(1+p['gammaPerK']*(t-25))
                if not -1e-12<=eff<=p['absorptance']+1e-12:raise ValueError('PV efficiency exceeds absorption or below zero')
                return r['solarWm2']*eff,conductance*(t-r['inletC']),p['ambientLossWm2K']*(t-r['airC'])
            for _ in range(n):
                old=energy
                def equation(e):return e-old-dt*(absorbed-sum(flux(e)))
                lower=-20.;upper=150.
                if p['efficiencyRef']>0 and p['gammaPerK']<0:
                    lower=max(lower,25+(p['absorptance']/p['efficiencyRef']-1)/p['gammaPerK']);upper=min(upper,25-1/p['gammaPerK'])
                def enthalpy(t):return capacity*(t-p['meltC'])+(latent if t>p['meltC'] else 0.)
                low=enthalpy(lower);high=enthalpy(upper)
                if equation(low)>0 or equation(high)<0:raise ValueError('PCM energy outside declared thermal range')
                energy=brentq(equation,low,high,xtol=1e-7);a,b,c=flux(energy);electric+=a*dt;fluid+=b*dt;ambient+=c*dt
            storage=energy-start
            trace.append(dict(timestamp=r['timestamp'],temperatureC=temperature(energy),meltFraction=max(0,min(1,energy/latent)),enthalpyJm2=energy,electricalJm2=electric,fluidJm2=fluid,ambientJm2=ambient,absorbedJm2=absorbed*p['intervalS'],storageJm2=storage,residualJm2=storage-absorbed*p['intervalS']+electric+fluid+ambient))
        return dict(trace=trace)
    coarse=solve(p['stepS']);fine=solve(p['stepS']/2);delta=max(abs(a['temperatureC']-b['temperatureC']) for a,b in zip(coarse['trace'],fine['trace']))
    enthalpy_delta=max(abs(a['enthalpyJm2']-b['enthalpyJm2']) for a,b in zip(coarse['trace'],fine['trace']))
    return output(p,'pvt_pcm',dict(coarse=coarse,fine=fine,temperatureDeltaC=delta,enthalpyDeltaJm2=enthalpy_delta,enthalpyEquivalentDeltaC=enthalpy_delta/capacity,numericalGate='passed' if max(delta,enthalpy_delta/capacity)<=p['temperatureToleranceC'] else 'failed_refinement'), 'Areal lumped isothermal-phase PCM enthalpy plus temperature-dependent ideal PV and effective fluid heat exchange, implicit Euler. Not spatial Stefan PDE, validated collector/crop equipment or coupled PEM safety model.')
