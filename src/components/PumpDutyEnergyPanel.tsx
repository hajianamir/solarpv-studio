import React,{useState} from 'react';
import {assessPumpDutyEnergy} from '../engine/core/pumpDutyEnergy';

const fields=[
  ['dailyWaterVolumeM3','Daily water volume (m³/day)','حجم آب روزانه (m³/day)'],
  ['totalDynamicHeadM','Declared constant TDH (m)','هد دینامیکی ثابت اعلام‌شده (m)'],
  ['pumpingHoursPerDay','Declared pumping hours (h/day, >0 to 24)','ساعات کار اعلام‌شده (h/day، بیشتر از صفر تا ۲۴)'],
  ['densityKgPerM3','Declared fluid density (kg/m³)','چگالی سیال اعلام‌شده (kg/m³)'],
  ['gravityMPerS2','Declared gravity (m/s²)','شتاب گرانش اعلام‌شده (m/s²)'],
  ['pumpHydraulicEfficiency','Pump hydraulic efficiency (fraction >0 to 1)','راندمان هیدرولیکی پمپ (کسر بیشتر از صفر تا ۱)'],
  ['motorEfficiency','Motor efficiency (fraction >0 to 1)','راندمان موتور (کسر بیشتر از صفر تا ۱)'],
  ['driveEfficiency','Drive efficiency (fraction >0 to 1)','راندمان درایو (کسر بیشتر از صفر تا ۱)'],
  ['availableDcEnergyKwhPerDay','Available DC-bus energy at VFD input (kWh/day)','انرژی موجود باس DC در ورودی درایو (kWh/day)'],
] as const;

export function PumpDutyEnergyPanel({lang='fa'}:{lang?:'en'|'fa'}) {
  const isFa=lang==='fa';
  const [enabled,setEnabled]=useState(false);
  const [values,setValues]=useState<Record<string,string>>({});
  // An empty value is invalid, not Number('')=0. No legacy/PSH/rating is inherited.
  const input=Object.fromEntries(fields.map(([key])=>[key,values[key]?.trim()?Number(values[key]):NaN]));
  const result=enabled?assessPumpDutyEnergy({modelPolicy:'pump_steady_duty_energy_v1',powerBoundary:'dc_bus_to_vfd',...input}):null;
  return <section className="studio-card space-y-3" data-testid="pump-duty-panel">
    <label htmlFor="pump-duty-enable" className="flex gap-2 items-center font-bold text-sm">
      <input id="pump-duty-enable" type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>
      {isFa?'مقایسه اختیاری تراز انرژی کارکرد ثابت':'Opt-in explicit steady-duty energy balance'}
    </label>
    <p className="text-xs" data-testid="pump-duty-disclosure">{isFa
      ?'فقط تراز انرژی با هد و راندمان ثابت؛ ساعات کار از PSH استنتاج نمی‌شود. هیچ مقداری از مدل قدیمی کپی نمی‌شود. نبود کسری روزانه، راه‌اندازی، انتخاب تجهیزات یا آبدهی را تضمین نمی‌کند؛ منحنی پمپ، موتور، محدودیت درایو و توالی زمانی ارزیابی نشده‌اند. ورودی‌ها فقط موقت‌اند و در پروژه ذخیره نمی‌شوند؛ به انرژی سالانه یا مالی منتقل نمی‌شوند.'
      :'Constant-head/efficiency energy balance only; runtime is not inferred from PSH. No legacy values are copied. No daily deficit does not guarantee startup, equipment selection or water delivery: pump/motor curves, drive limits and chronology are unassessed. Inputs are temporary, not saved in projects; no annual-energy or financial transfer.'}</p>
    {enabled&&<>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map(([key,en,fa])=><label key={key} htmlFor={`pump-duty-${key}`} className="text-xs">{isFa?fa:en}
          <input id={`pump-duty-${key}`} type="number" step="any" value={values[key]??''} onChange={e=>setValues(previous=>({...previous,[key]:e.target.value}))} className="studio-input"/>
        </label>)}
      </div>
      {result?.status==='unavailable'&&<p role="status" data-testid="pump-duty-unavailable" data-reason={result.reason}>{isFa?'تراز در دسترس نیست؛ ورودی کامل و معتبر و دامنه عددی لازم است.':'Balance unavailable: complete valid inputs and a supported numerical range are required.'}</p>}
      {result?.status==='available'&&<div data-testid="pump-duty-result" data-policy={result.modelPolicy} data-energy-balance={result.dailyEnergyBalance} data-guaranteed={String(result.waterDeliveryGuaranteed)} className="space-y-1 text-xs">
        <p>{isFa?'دبی کارکرد: ':'Duty flow: '}<span data-testid="pump-duty-flow" data-raw={result.flowRateM3PerHour}>{result.flowRateM3PerHour.toFixed(4)}</span> m³/h</p>
        <p>{isFa?'هیدرولیکی / محور / ورودی الکتریکی موتور / ورودی DC درایو (kW):':'Hydraulic / shaft / motor electrical / drive DC input (kW):'}</p>
        <div className="flex gap-3 flex-wrap">{(['hydraulicPowerKw','pumpShaftPowerKw','motorElectricalPowerKw','driveDcInputPowerKw'] as const).map(key=><span key={key} data-testid={`pump-duty-${key}`} data-raw={result[key]}>{result[key].toFixed(4)}</span>)}</div>
        <p>{isFa?'انرژی DC موردنیاز: ':'Required DC energy: '}<span data-testid="pump-duty-required-energy" data-raw={result.requiredDcEnergyKwhPerDay}>{result.requiredDcEnergyKwhPerDay.toFixed(4)}</span> kWh/day</p>
        <p>{isFa?'کسری انرژی DC روزانه: ':'Daily DC energy deficit: '}<span data-testid="pump-duty-deficit" data-raw={result.dailyDcEnergyDeficitKwh}>{result.dailyDcEnergyDeficitKwh.toFixed(4)}</span> kWh/day</p>
        <p data-testid="pump-duty-qualification">{result.dailyEnergyBalance==='deficit'
          ?(isFa?'انرژی کل روزانه برای این کارکرد کافی نیست؛ آبدهی ارزیابی نشده است.':'Aggregate daily energy is insufficient for this duty; water delivery remains unassessed.')
          :(isFa?'کسری تجمیعی دیده نمی‌شود؛ امکان‌پذیری زمانی و آبدهی همچنان ارزیابی نشده است.':'No aggregate deficit; chronological feasibility and water delivery remain unassessed.')}</p>
      </div>}
    </>}
  </section>;
}
