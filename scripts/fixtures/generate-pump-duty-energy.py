"""Independent 60-digit Decimal steady-duty SI energy accounting.
No production imports/execution/network. Direct Joule/day arithmetic and explicit
stage efficiency products; no equipment curve or field/annual applicability claim.
"""
from decimal import Decimal as D,getcontext
from pathlib import Path
import itertools,json,sys
getcontext().prec=60
root=Path(__file__).resolve().parents[2]
source=dict(title='Steady-duty hydraulic work identity and explicit efficiency-stage accounting',url='https://github.com/OpenWaterAnalytics/EPANET/blob/4d8d82ddc260fce216af9321fc3d9a4646ac6827/src/hydraul.c',version='EPANET2.2 getenergy reference context; independent Decimal SI identity v1',locator='getenergy: power proportional to flow*head*specific gravity divided by aggregate efficiency (US customary). Here explicit SI work=rho*g*V*H joules; joules/3600000=kWh. Declared pump/motor/drive stage efficiencies are test inputs, not source equipment data.')
cases=[]
for v,h,t,pump,motor,drive,available in itertools.product(['0','.5','120','300'],['0','50','130.25'],['.25','5','12'],['.6','1'],['.8','1'],['.95','1'],['0','10','100']):
 rho=D(1000);g=D('9.81');v,h,t,pump,motor,drive,available=map(D,[v,h,t,pump,motor,drive,available])
 inp=dict(modelPolicy='pump_steady_duty_energy_v1',powerBoundary='dc_bus_to_vfd',dailyWaterVolumeM3=float(v),totalDynamicHeadM=float(h),pumpingHoursPerDay=float(t),densityKgPerM3=float(rho),gravityMPerS2=float(g),pumpHydraulicEfficiency=float(pump),motorEfficiency=float(motor),driveEfficiency=float(drive),availableDcEnergyKwhPerDay=float(available))
 eh=rho*g*v*h/D(3600000);es=eh/pump;em=eh/(pump*motor);ed=eh/(pump*motor*drive);deficit=max(D(0),ed-available)
 metrics=dict(flowRateM3PerHour=float(v/t),hydraulicEnergyKwhPerDay=float(eh),hydraulicPowerKw=float(eh/t),pumpShaftPowerKw=float(es/t),motorElectricalPowerKw=float(em/t),driveDcInputPowerKw=float(ed/t),pumpShaftEnergyKwhPerDay=float(es),motorElectricalEnergyKwhPerDay=float(em),requiredDcEnergyKwhPerDay=float(ed),dailyDcEnergyDeficitKwh=float(deficit))
 expected=dict(status='available',input=inp,modelPolicy=inp['modelPolicy'],powerBoundary=inp['powerBoundary'],**metrics,dailyEnergyBalance='deficit' if deficit>0 else 'no_aggregate_deficit',equipmentReadiness='unassessed',chronologicalWaterDelivery='unassessed',waterDeliveryGuaranteed=False,financialAdoptionEligible=False)
 cases.append(dict(inputs=[inp],expected=expected))
# Invalid numerical-domain references exercise guards without fabricating zero results.
base=cases[-1]['inputs'][0]
for patch in [dict(dailyWaterVolumeM3=1,totalDynamicHeadM=5e-324),dict(dailyWaterVolumeM3=1e308,totalDynamicHeadM=1e308),dict(dailyWaterVolumeM3=5e-324,totalDynamicHeadM=5e-324),dict(dailyWaterVolumeM3=5e-324,pumpingHoursPerDay=24,totalDynamicHeadM=0),dict(driveEfficiency=5e-324)]:
 inp=dict(base,**patch)
 cases.append(dict(inputs=[inp],expected=dict(status='unavailable',reason='numerical_failure',waterDeliveryGuaranteed=False,financialAdoptionEligible=False)))
fixture=dict(schemaVersion=1,independentOfImplementation=True,productionExport='assessPumpDutyEnergy',referenceSource=source,independentCalculation=__doc__,tolerances=dict(absolute=1e-10,relative=1e-12),cases=cases)
p=root/'scripts/fixtures/physics/pump-duty-energy-decimal.json';text=json.dumps(fixture,indent=2,allow_nan=False)+'\n'
if '--check' in sys.argv:assert p.read_text()==text,'Independent pump duty reference differs'
else:p.write_text(text)
print(f'PASS independent Decimal pump duty: {len(cases)} cases')
