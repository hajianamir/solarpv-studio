"""Independent numpy annual-profile reconstruction and pvlib DC integration.

This verifies execution of a DECLARED synthetic policy, not climate accuracy.
NASA/JPL Space Place 'What Causes the Seasons?' (updated 2025-07-29) supports
opposite seasonal timing, NOT the day-200 peak, amplitude, equator policy or
mount offsets. Those remain explicitly local screening assumptions.
NOCT Eq1: DOI10.3390/app10030914. PVWatts DC: pvlib0.13.1.
No TypeScript imports, production outputs or network access.
"""
from pathlib import Path
import json
import numpy as np
import pvlib
assert pvlib.__version__ == '0.13.1'
OUT=Path('scripts/fixtures/physics')
REF=dict(title='pvlib PVWatts DC; NASA opposite hemisphere seasons; declared synthetic policy',url='https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.pvwatts_dc.html',version='pvlib 0.13.1; local hemisphere_cosine_equator_flat_v1',locator='PVWatts DC temperature equation; NASA https://spaceplace.nasa.gov/seasons/en/ opposite timing only. Synthetic phase/amplitudes/normalization/mount offsets are policies, NOT independent weather validation.')
NOTE='Temperature-weighted hourly Pmp correction using the module temperature coefficient and NOCT. Ambient seasonal/diurnal profiles are synthetic: the northern day-200 annual cosine is reversed in the south and absent at the equator. Zero irradiation reports a neutral zero-loss budget, not an evaluated thermal yield. The ±temperature band is a sensitivity to an explicit ±5°C bias (or configured amount), not a probability interval or bound on total forecast error.'
def factor(x,bias,mean,legacy_northern_only=False):
    if x['peakSunHours']==0:return 1.0
    # Vectorized independent implementation of the declared screening distribution.
    d=np.repeat(np.arange(365,dtype=float),24)
    h=np.tile(np.arange(24,dtype=float),365)
    phi=np.deg2rad(np.clip(x['latitudeDeg'],-89.9,89.9))
    delta=np.deg2rad(23.44*np.sin(2*np.pi*(284+d)/365))
    hourangle=np.deg2rad((h+.5-12)*15)
    noon=np.sin(phi)*np.sin(delta)+np.cos(phi)*np.cos(delta)
    elevation=np.sin(phi)*np.sin(delta)+np.cos(phi)*np.cos(delta)*np.cos(hourangle)
    weights=np.maximum(0,elevation)*np.maximum(.15,.75+.25*noon)
    irradiance=weights/weights.sum()*(x['peakSunHours']*365000)
    span=x['ambientTempMaxC']-x['ambientTempMinC']
    seasonal=(1 if legacy_northern_only else np.sign(x['latitudeDeg']))*np.cos(2*np.pi*(d-200)/365)
    ambient=np.clip(mean+np.clip(span*.22,4,12)*seasonal+np.clip(span*.10,2,6)*np.cos(2*np.pi*(h-15)/24)+bias,x['ambientTempMinC'],x['ambientTempMaxC'])
    mount={'ground_mount':0,'industrial_shed':14,'rooftop_flat_concrete':6.5}[x.get('installationEnvironment','ground_mount')]
    cell=ambient+mount+(x['noctC']-20)*irradiance/800
    watts=np.maximum(0,pvlib.pvsystem.pvwatts_dc(irradiance,cell,1000,x['tempCoeffPmpPct']/100))
    return float(watts.sum()/irradiance.sum())
def result(x):
    mean=x.get('ambientTempMeanC',(x['ambientTempMinC']+x['ambientTempMaxC'])/2)
    allowance=x.get('ambientBiasSensitivityC',5)
    loss=[100*(1-factor(x,b,mean)) for b in [0,-allowance,allowance]]
    return dict(hourlySamples=8760,seasonalTemperaturePolicy='hemisphere_cosine_equator_flat_v1',energyAvailability='positive_reference_irradiation' if x['peakSunHours']>0 else 'zero_reference_irradiation',annualThermalDeratePct=loss[0],temperatureSensitivityRangePct=dict(low=min(loss[1:]),high=max(loss[1:])),temperatureSensitivityAllowanceC=allowance,ambientMeanUsedC=mean,ambientMeanSource='supplied_annual_mean' if 'ambientTempMeanC'in x else 'derived_from_design_extremes',irradianceAnnualKwhM2=x['peakSunHours']*365,weatherProfileSource='Synthetic clear-sky-shaped 8760 profile normalized to annual PSH; no hourly provider weather was supplied',isMeasuredHourlyWeather=False,methodologyNote=NOTE)
cases=[]
for lat in [-90,-35,0,35,90]:
 for env,noct in [('ground_mount',40),('industrial_shed',42),('rooftop_flat_concrete',45)]:
  for gamma in [-.3,.3]:
   x=dict(latitudeDeg=lat,peakSunHours=5,ambientTempMinC=-20,ambientTempMaxC=40,ambientTempMeanC=10,noctC=noct,tempCoeffPmpPct=gamma,installationEnvironment=env)
   cases.append(dict(inputs=[x],expected=result(x)))
for psh in [0,2]:
 x=dict(latitudeDeg=-35,peakSunHours=psh,ambientTempMinC=-30,ambientTempMaxC=0,noctC=45,tempCoeffPmpPct=-.3)
 cases.append(dict(inputs=[x],expected=result(x)))
f=dict(schemaVersion=1,independentOfImplementation=True,productionExport='simulateAnnualHourlyThermalDerate',referenceSource=REF,independentCalculation=__doc__,tolerances=dict(absolute=1e-9,relative=1e-11),cases=cases)
f['previousNorthernOnlyPolicySouthDeratePct']=100*(1-factor(cases[6]['inputs'][0],0,10,True))
(OUT/'hemisphere-thermal-pvlib.json').write_text(json.dumps(f,indent=2)+'\n')
# Exact-node gate uses one executed witness per changed expression; matrix is tested separately.
manifest_path=Path('scripts/physics-reference-evidence.json')
m=json.loads(manifest_path.read_text())
records=[('src/engine/core/hourlyThermalEngine.ts#annualEnergyFactor#4cb7b1cdfd09','annualEnergyFactor',cases[-2]['inputs']+[0,-15],1.0),('src/engine/core/hourlyThermalEngine.ts#annualEnergyFactor#6e4ee0c39b90','annualEnergyFactor',cases[6]['inputs']+[0,10],factor(cases[6]['inputs'][0],0,10)),('src/engine/core/hourlyThermalEngine.ts#simulateAnnualHourlyThermalDerate#24a3be6d72b0','simulateAnnualHourlyThermalDerate',cases[6]['inputs'],cases[6]['expected']),('src/engine/core/signedThermalStage.ts#signedThermalLossFromStage#c10657972417','signedThermalLossFromStage',[],0),('src/engine/core/signedThermalStage.ts#signedThermalLossFromStage#3c3cc1db543b','signedThermalLossFromStage',[10],-10)]
for fid,owner,inputs,expected in records:
 file='scripts/fixtures/physics/hemisphere-reference-'+fid.split('#')[-1]+'.json'
 fixture=dict(f,formulaId=fid,productionExport=owner,inputs=inputs,expected=expected,cases=[])
 if owner=='signedThermalLossFromStage':fixture['independentCalculation']='Inverse of PVWatts signed power change: a +10 percent stage power gain corresponds to -10 percent loss. Only sign convention is tested, not full annual-weather applicability.'
 Path(file).write_text(json.dumps(fixture,indent=2)+'\n')
 record=dict(formulaId=fid,fixtureFile=file,productionExport=owner,referenceTitle=REF['title'],referenceUrl=REF['url'],referenceVersion=REF['version'],referenceLocator=REF['locator'])
 m['fixtures']=[r for r in m['fixtures'] if r['formulaId']!=fid]+[record]
manifest_path.write_text(json.dumps(m,indent=2)+'\n')
