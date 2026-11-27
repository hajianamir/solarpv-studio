"""Offline primary-engine experiments. Not a production model or field validation.
Requires the pinned study environment and acquire-phase3-research.py cache.
"""
import hashlib
import importlib.util
import itertools
import json
from pathlib import Path
import sys
import numpy as np
import pandas as pd
import pvlib
from scipy import stats
import scipy

assert np.__version__ == '2.2.6'
assert pd.__version__ == '2.3.3'
assert scipy.__version__ == '1.15.3'

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'scripts/fixtures/physics/phase3-research-reference.json'
MANIFEST = ROOT / 'docs/audit/dual-independent-audit-review/phase3-research-sources.json'
assert pvlib.__version__ == '0.13.1'
manifest = json.loads(MANIFEST.read_text())
for s in manifest['sources']:
    assert hashlib.sha256((ROOT / s['cachePath']).read_bytes()).hexdigest() == s['sha256']

def source(suffix):
    matches = [s for s in manifest['sources'] if s['path'].endswith(suffix)]
    assert len(matches) == 1, suffix
    return ROOT / matches[0]['cachePath']

# Verify executed pvlib Python source, not only its installed version string.
for s in manifest['sources']:
    if s['repository'] == 'pvlib/pvlib-python' and s['path'].startswith('pvlib/') and s['path'].endswith('.py'):
        installed = Path(pvlib.__file__).parent / s['path'].removeprefix('pvlib/')
        assert hashlib.sha256(installed.read_bytes()).hexdigest() == s['sha256'], str(installed)

# Deny outbound operations during all scientific computations.
def offline(event, args):
    if event in ('socket.connect', 'socket.connect_ex', 'socket.getaddrinfo', 'subprocess.Popen'):
        raise RuntimeError('OFFLINE_RESEARCH_NETWORK_OR_SUBPROCESS_DENIED')
sys.addaudithook(offline)

thermal = []
for g, wind, mounting in itertools.product([0, 10, 200, 800, 1200], [0, 1, 5, 10],
        ['open_rack_glass_polymer', 'insulated_back_glass_polymer', 'close_mount_glass_glass']):
    params = pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS['sapm'][mounting]
    thermal.append({'gWm2': g, 'windMs': wind, 'ambientC': 25, 'mounting': mounting, 'sapmParameters': params,
        'sapmCellC': float(pvlib.temperature.sapm_cell(g, 25, wind, **params)),
        'faimanOpenRackC': float(pvlib.temperature.faiman(g, 25, wind, u0=25, u1=6.84))})

iam = [{'aoiDeg': a, 'ar': ar, 'iam': float(pvlib.iam.martin_ruiz(a, a_r=ar))}
       for a, ar in itertools.product([0, 15, 45, 60, 80, 89, 90, 100], [.16, .2])]

bifacial = []
for gcr, tilt, albedo, regime in itertools.product([.2, .4, .6, .8], [10, 30, 60], [.2, .6], ['clear', 'diffuse', 'rear_beam', 'night']):
    width, clearance = 2., 1.
    zenith, azimuth, dni, dhi = {'clear': (40,180,800,100), 'diffuse': (40,180,0,400),
        'rear_beam': (80,0,700,80), 'night': (100,180,0,0)}[regime]
    ghi = dni * max(0, np.cos(np.radians(zenith))) + dhi
    height = clearance + width * np.sin(np.radians(tilt))/2
    r = pvlib.bifacial.infinite_sheds.get_irradiance(tilt,180,zenith,azimuth,gcr,height,width/gcr,
        ghi,dhi,dni,albedo,bifaciality=.8,shade_factor=0,transmission_factor=0,npoints=200)
    front, rear = float(np.asarray(r['poa_front']).item()), float(np.asarray(r['poa_back']).item())
    bifacial.append({'gcr':gcr,'tiltDeg':tilt,'albedo':albedo,'regime':regime,
        'collectorWidthM':width,'groundClearanceM':clearance,'centerHeightM':float(height),
        'zenithDeg':zenith,'azimuthDeg':azimuth,'ghiWm2':float(ghi),'dniWm2':dni,'dhiWm2':dhi,
        'frontPoaWm2':front,'rearPoaWm2':rear,'effectiveRearWm2':.8*rear,
        'gainPct':100*.8*rear/front if front>0 else None})

module_name = 'Canadian_Solar_Inc__CS5P_220M'
inverter_name = 'ABB__MICRO_0_25_I_OUTD_US_208__208V_'
modules = pvlib.pvsystem.retrieve_sam(path=str(source('sam-library-cec-modules-2019-03-05.csv')))
inverters = pvlib.pvsystem.retrieve_sam(path=str(source('sam-library-cec-inverters-2019-03-05.csv')))
module = modules[module_name]
inverter = inverters[inverter_name]
annual = []
for filename in ['USA_AZ_Phoenix-Sky.Harbor.Intl.AP.722780_TMY3.epw',
                 'USA_NJ_Newark.Intl.AP.725020_TMY3.epw', 'NLD_Amsterdam062400_IWEC.epw']:
    data, meta = pvlib.iotools.read_epw(source(filename), coerce_year=2001)
    # EPW hourly radiation is preceding-hour energy Wh/m2. Midpoint convention, one-hour steps.
    data.index = data.index + pd.Timedelta(minutes=30)
    assert len(data) == 8760 and data.index.is_unique
    assert data[['ghi','dni','dhi','temp_air','wind_speed']].notna().all().all()
    loc = pvlib.location.Location(meta['latitude'],meta['longitude'],tz=float(meta['TZ']),altitude=meta['altitude'])
    solar = loc.get_solarposition(data.index)
    for geometry in ['fixed','tracker']:
        if geometry == 'fixed':
            tilt, azi = abs(meta['latitude']), 180 if meta['latitude']>=0 else 0
        else:
            track = pvlib.tracking.singleaxis(solar.apparent_zenith,solar.azimuth,axis_tilt=0,axis_azimuth=180,
                max_angle=60,backtrack=True,gcr=.4)
            tilt, azi = track.surface_tilt.fillna(0), track.surface_azimuth.fillna(180)
        poa = pvlib.irradiance.get_total_irradiance(tilt,azi,solar.apparent_zenith,solar.azimuth,
            data.dni,data.ghi,data.dhi,albedo=.2,model='isotropic')
        g = poa.poa_global.clip(lower=0).fillna(0)
        temp = pvlib.temperature.sapm_cell(g,data.temp_air,data.wind_speed,
            **pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS['sapm']['open_rack_glass_polymer'])
        dc_per_wp = pvlib.pvsystem.pvwatts_dc(g,temp,1,float(module.gamma_r)/100).clip(lower=0)
        aoi = pvlib.irradiance.aoi(tilt,azi,solar.apparent_zenith,solar.azimuth)
        mr = pvlib.iam.martin_ruiz(aoi,a_r=.16).fillna(0)
        beam = poa.poa_direct.clip(lower=0).fillna(0)
        weighted_beam_loss = float((beam*(1-mr)).sum()/g.sum()*100)
        for ilr in [1,1.2,1.5,2,2.4]:
            pdc = dc_per_wp * float(inverter.Paco) * ilr
            # Controlled inverter-voltage reference, NOT string electrical feasibility.
            ac = pvlib.inverter.sandia(float(inverter.Vdco),pdc,inverter)
            raw = pvlib.inverter._sandia_eff(float(inverter.Vdco),pdc,inverter)
            clipping = np.maximum(raw-float(inverter.Paco),0)
            annual.append({'weather':filename,'latitude':meta['latitude'],'longitude':meta['longitude'],
                'geometry':geometry,'ilr':ilr,'hours':len(data),'ghiKwhM2':float(data.ghi.sum()/1000),
                'poaKwhM2':float(g.sum()/1000),'dcKwh':float(pdc.sum()/1000),'netAcKwh':float(ac.sum()/1000),
                'positiveAcKwh':float(ac.clip(lower=0).sum()/1000),
                'nightTareKwh':float(-ac.clip(upper=0).sum()/1000),
                'clippingKwh':float(clipping.sum()/1000),
                'beamIamLossPctOfTotalPoa':weighted_beam_loss})

spec = importlib.util.spec_from_file_location('pinned_numpy_financial',source('_financial.py'))
financial = importlib.util.module_from_spec(spec); spec.loader.exec_module(financial)
finance = []
for flows in [[-100,60,60],[-100,230,-132],[100,10,10],[-100,0,0],[-100,0,121],[-100.12345,33.33333,88.88888]]:
    finance.append({'cashflows':flows,'npvAt10Pct':float(financial.npv(.1,flows)),
                    'irrSelectedByNumpyFinancial':float(financial.irr(flows)) if np.isfinite(financial.irr(flows)) else None})

uq = [{'degreesFreedom':df,'probability':p,'tQuantile':float(stats.t.ppf(p,df)),
       'wrongNormalTransform':float(stats.norm.cdf(stats.t.ppf(p,df))),
       'correctTTransform':float(stats.t.cdf(stats.t.ppf(p,df),df))}
      for df,p in itertools.product([3,5,8,30],[.01,.1,.5,.9,.99])]

# Fitting constraints and coefficient residuals are distinct from reference translation.
from pvlib.ivtools.sdm.desoto import fit_desoto
fit_args = (float(module.V_mp_ref),float(module.I_mp_ref),float(module.V_oc_ref),
    float(module.I_sc_ref),float(module.alpha_sc),float(module.beta_oc),int(module.N_s))
try:
    fit_desoto(*fit_args)
    default_fit_status = 'converged'
except RuntimeError as error:
    default_fit_status = str(error)
# Explicit sourced starting parameters, not a hidden retry or changed observations.
fit_initial = dict(IL_0=float(module.I_L_ref),Io_0=float(module.I_o_ref),Rs_0=float(module.R_s),
                   Rsh_0=float(module.R_sh_ref),a_0=float(module.a_ref))
fitted, fit_result = fit_desoto(*fit_args,init_guess=fit_initial)
fit_residual = [float(x) for x in fit_result.fun]
fit_temperatures = []
for tc in [24.99,25,25.01,27]:
    parameters = pvlib.pvsystem.calcparams_desoto(1000,tc,**fitted)
    point = pvlib.pvsystem.singlediode(*parameters,method='lambertw')
    fit_temperatures.append({'temperatureC':tc,**{k:float(point[k]) for k in ['v_oc','i_sc','v_mp','i_mp','p_mp']}})
fit = {'module':module_name,'defaultInitialGuessOutcome':default_fit_status,'explicitCecInitialGuess':fit_initial,'solverSuccess':bool(fit_result.success),'solverMessage':str(fit_result.message),
    'parameters':{k:float(v) for k,v in fitted.items()},'fiveEquationResidualsA':fit_residual,
    'maxAbsoluteResidualA':max(abs(x) for x in fit_residual),'temperaturePoints':fit_temperatures,
    'cecTableBetaVocVK':float(module.beta_oc),'cecTableGammaPmpPctK':float(module.gamma_r),
    'localBetaVocVK':(fit_temperatures[2]['v_oc']-fit_temperatures[0]['v_oc'])/.02,
    'localGammaPmpPctK':100*(fit_temperatures[2]['p_mp']-fit_temperatures[0]['p_mp'])/.02/fit_temperatures[1]['p_mp'],
    'qualification':'CEC legacy table inputs, not manufacturer attestation. Five-equation De Soto fit constrains finite +2K Voc; gamma_Pmp is not fitted. Numerical residuals do not prove physical applicability.'}

pump = []
for volume, psh, diameter_mm in itertools.product([10,100,300],[2,5,8],[40,63,110]):
    hours = .9*psh  # Declared legacy scheduling policy, not derived from PSH physics.
    q = volume/hours/3600
    d = diameter_mm/1000
    # Independent US customary EPANET coefficient converted to SI; its D exponent is 4.871.
    friction_epanet = .3048*4.727*(100/.3048)*(q/.028316846592)**1.852/(140**1.852*(d/.3048)**4.871)
    friction_legacy_exact = 10.67*100*q**1.852/(140**1.852*d**4.87)
    head = 30 + 2 + friction_legacy_exact
    hydraulic_w = 1000*9.81*q*head
    energy_kwh = 1000*9.81*volume*head/3.6e6
    pump.append({'dailyVolumeM3':volume,'psh':psh,'diameterMm':diameter_mm,'pipeLengthM':100,
        'staticHeadM':30,'pressureHeadM':2,'hoursPolicy':hours,'flowM3H':q*3600,
        'unroundedLegacyFrictionM':friction_legacy_exact,'convertedEpanetFrictionM':friction_epanet,
        'unroundedHeadM':head,'hydraulicW':hydraulic_w,'hydraulicKwhDay':energy_kwh,
        'shaftWAt60PctEfficiency':hydraulic_w/.6,
        'qualification':'Steady duty identity only. C=140 and 0.9*PSH are assumed screening inputs, not pipe/motor/VFD/solar-startup validation.'})

result = {'schemaVersion':'phase3-offline-research-v1','pvlibVersion':pvlib.__version__,
    'sourceManifestSha256':hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),
    'runtime':{'numpy':np.__version__,'pandas':pd.__version__,'scipy':scipy.__version__},
    'qualification':'Executed independent reference components, not a production replacement, whole-project accuracy, field validation, manufacturer attestation or conformity. No automatic adoption.',
    'thermal':thermal,'iam':iam,'bifacial':bifacial,'annual':annual,
    'annualPolicy':{'module':module_name,'inverter':inverter_name,'dc':'PVWatts, sourced CEC gamma_r; not a CEC diode simulation',
        'ac':'Sandia CEC inverter at constant Vdco, preserves nighttime tare',
        'lossBoundary':'No soiling, wiring, availability, spectral or diffuse IAM losses; beam IAM reported separately, NOT applied to energy',
        'weather':'Repository EPW reference-year data, not live forecasts or site measurements; +30min midpoint shift from pvlib EPW hour-start index',
        'limitations':'Northern hemisphere only. 10m weather wind used as supplied, no module-height correction. Not string feasibility or customer site prediction.'},
    'finance':finance,'studentTCdfWitness':uq,'cecTableFit':fit,'pumpDuty':pump}
text = json.dumps(result,indent=2,allow_nan=False)+'\n'
if '--check' in sys.argv:
    assert OUT.read_text() == text, 'Reference bytes changed'
    print('PASS offline reference reproduction')
else:
    OUT.write_text(text)
    print('Generated offline references:',len(thermal),'thermal,',len(iam),'IAM,',len(bifacial),'bifacial,',len(annual),'annual,',len(finance),'financial,',len(uq),'CDF cases')
