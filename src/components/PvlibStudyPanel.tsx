import {StudyExplorer} from './StudyExplorer';
import {StudyInsights} from './StudyInsights';
import {monthlyStudyCsv,studyInsights} from '../studies/studyInsights';
import {StudyBuilder} from './StudyBuilder';
import {StudyLibrary} from './StudyLibrary';
import {validateResult,stable} from '../studies/studyWorkflow';
import React,{useEffect,useRef,useState} from 'react';
import {StudyRequestSchema,type StudyRequest,type StudyResult} from '../studies/studyContract';

function download(name:string,content:string,type:string){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
/** An independent study result; never written to the screening waterfall, sizing or finance. */
export function PvlibStudyPanel({latitude,longitude,lang}:{latitude:number;longitude:number;lang:'fa'|'en'}){
  const en=lang==='en';
  const [capability,setCapability]=useState<'checking'|'disabled'|'enabled'|'unavailable'>('checking');
  const [request,setRequest]=useState<StudyRequest|null>(null);
  const [result,setResult]=useState<StudyResult|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [restored,setRestored]=useState(false);
  const controller=useRef<AbortController|null>(null);
  const revision=useRef(0);
  useEffect(()=>{
    const invalidate=()=>{revision.current++;controller.current?.abort();};
    invalidate();setRequest(null);setResult(null);setError('');setBusy(false);setDirty(false);setRestored(false);
    return ()=>invalidate();
  },[latitude,longitude]);
  useEffect(()=>{
    const abort=new AbortController();
    fetch('/api/v1/studies/capabilities',{signal:abort.signal,cache:'no-store'}).then(async response=>{
      if(!response.ok)throw new Error('Unavailable');
      const info=await response.json();
      if(info.engine!=='pvlib-python-direct'||typeof info.enabled!=='boolean')throw new Error('Invalid capabilities');
      setCapability(info.enabled?'enabled':'disabled');
    }).catch(()=>{if(!abort.signal.aborted)setCapability('unavailable');});
    return ()=>abort.abort();
  },[]);
  async function run(){
    if(!request||busy||dirty)return;
    const version=++revision.current;
    const abort=new AbortController();controller.current=abort;
    setBusy(true);setError('');setResult(null);setRestored(false);
    const timeout=setTimeout(()=>abort.abort(),55000);
    try{
      const response=await fetch('/api/v1/studies/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:abort.signal,cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(`${data.code??response.status}: ${data.message??'Study rejected'}`);
      if(data.engine!=='pvlib-python-direct'||data.status!=='completed'||data.schemaVersion!=='pvlib-study-result-v1'||data.manifest?.dependencies?.pvlib!=='0.13.1'||!Array.isArray(data.samples)||data.samples.length!==request.weather.records.length||!Number.isFinite(data.summary?.acWh))throw new Error('Unexpected study response');
      const checked=validateResult(data);if(stable(checked.request)!==stable(request))throw new Error('Result inputs differ from active request');
      if(version===revision.current)setResult(checked);
    }catch(cause){if(version===revision.current)setError(abort.signal.aborted?(en?'Cancelled or timed out; no screening fallback applied.':'لغو یا پایان مهلت؛ fallback غربالگری اعمال نشد.'):(cause instanceof Error?cause.message:String(cause)));}
    finally{clearTimeout(timeout);if(version===revision.current)setBusy(false);}
  }
  return <section className="studio-card space-y-3" data-testid="pvlib-study-panel" aria-label="Direct pvlib study">
    <h2 className="font-bold text-sky-300">{en?'Independent direct pvlib-python study':'مطالعهٔ مستقل با اجرای مستقیم pvlib-python'}</h2>
    <p className="text-xs text-slate-300">{en?'Current offline project calculations remain screening estimates. This separate fixed-tilt or single-axis study, with optional row/bifacial optics uses your interval weather and explicit equipment parameters; it never overwrites screening energy or finance.':'محاسبات آفلاین فعلی پروژه برآورد screening باقی می‌مانند. این مطالعهٔ جداگانهٔ fixed-tilt یا single-axis با تابش ردیفی/دوطرفه اختیاری با دادهٔ بازه‌ای و پارامترهای صریح شما اجرا می‌شود و انرژی یا اقتصاد screening را بازنویسی نمی‌کند.'}</p>
    <p className="text-xs" role="status">{en?'Service':'سرویس'}: {capability} — {en?'pvlib 0.13.1; enabled does not confirm installed dependencies. No automatic fallback.':'pvlib 0.13.1؛ enabled تضمین نصب وابستگی‌ها نیست. fallback خودکار ندارد.'}</p>
    <p className="text-xs text-slate-400">{en?'Import a pvlib-study-v1 JSON (max 8 MiB), with coordinates matching the active site. GHI/DNI/DHI, air temperature, 10 m wind, explicit offsets and interval-end averages are required. Model/schema/setup documentation: docs/PVLIB-DIRECT-STUDIES.md.':'JSON با قرارداد pvlib-study-v1 و حداکثر ۸ MiB و مختصات سایت فعال وارد کنید. GHI/DNI/DHI، دما، باد ۱۰ متر، offset صریح و میانگین پایان بازه لازم است. راهنمای مدل، قرارداد و نصب: docs/PVLIB-DIRECT-STUDIES.md.'}</p>
    <label className="block text-sm">{en?'Study JSON':'فایل JSON مطالعه'}<input aria-label="Import direct pvlib study JSON" type="file" accept=".json,application/json" disabled={busy} onChange={async event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;
      const version=++revision.current;
      try{
        if(file.size>8*1024*1024)throw new Error('Study JSON exceeds 8 MiB');
        const candidate=StudyRequestSchema.parse(JSON.parse(await file.text()));
        if(candidate.site.latitude!==latitude||candidate.site.longitude!==longitude)throw new Error('Study coordinates differ from active site');
        if(version!==revision.current)return;
        setRequest(candidate);setResult(null);setError('');setDirty(false);setRestored(false);
      }catch(cause){if(version===revision.current)setError(cause instanceof Error?cause.message:String(cause));}
    }}/></label>
    <StudyBuilder request={request} latitude={latitude} longitude={longitude} en={en} busy={busy} onDirty={()=>{revision.current++;setDirty(true);setResult(null);setRestored(false);}} onApply={candidate=>{revision.current++;setRequest(candidate);setDirty(false);setResult(null);setError('');setRestored(false);}}/>
    {dirty&&<p role="status" className="text-xs text-amber-300">{en?'Inputs changed. Validate and apply before running or saving.':'ورودی‌ها تغییر کرده‌اند؛ پیش از اجرا یا ذخیره بررسی و اعمال کنید.'}</p>}
    {request&&!result&&!dirty&&<StudyInsights request={request} en={en}/>}
    {request&&<p className="text-xs" data-testid="study-input-label">{request.label} — {request.system.tracking?'single-axis tracker':'fixed tilt'} — {request.weather.records.length} {en?'intervals':'بازه'}; {request.system.arrayPdc0W} W DC; {request.system.surfaceTiltDeg}° / {request.system.surfaceAzimuthDeg}°; {request.weather.quality}</p>}
    <div className="flex gap-3 text-sm">
      <button type="button" data-testid="run-pvlib-study" disabled={!request||dirty||busy||capability!=='enabled'} onClick={()=>void run()}>{busy?(en?'Running Python…':'در حال اجرای Python…'):(en?'Run independent study':'اجرای مطالعهٔ مستقل')}</button>
      {busy&&<button type="button" onClick={()=>controller.current?.abort()}>{en?'Cancel':'لغو'}</button>}
    </div>
    {error&&<p role="alert" className="text-xs text-red-300 whitespace-pre-wrap break-all">{error}</p>}
    {result&&<div data-testid="pvlib-study-result" className="text-xs space-y-3">
      {restored&&<p className="text-amber-300">{en?'Restored local/imported result — not a new execution; authenticity not certified.':'نتیجهٔ محلی/واردشدهٔ بازیابی‌شده — اجرای جدید نیست؛ اصالت تأیید نشده است.'}</p>}
      <StudyExplorer key={`${revision.current}:${result.manifest.inputSha256}:${result.execution?.runId??'restored'}`} result={result} en={en}/>
      <StudyInsights request={result.request} result={result} en={en}/>
      <h3>{en?'Completed — not field validated':'اجرا شد — بدون اعتبارسنجی میدانی'}</h3>
      <p>{result.manifest.period.startUtc} → {result.manifest.period.endUtc} ({result.manifest.period.completeUtcCalendarYear?'complete UTC year':'period only; not annualized'})</p>
      <p data-testid="study-geometry-mode">{result.request.system.tracking?(en?'Single-axis tracker — ideal geometry, not a shading/stow/structural model':'ردیاب تک‌محوره — هندسهٔ ایده‌آل، نه مدل سایه/کنترل/سازه'):(en?'Fixed-tilt array':'آرایهٔ سطح ثابت')}</p>
      <p>{en?'Period DC / AC energy':'انرژی DC / AC همین دوره'}: {(result.summary.dcWh/1000).toFixed(3)} / {(result.summary.acWh/1000).toFixed(3)} kWh</p>
      {result.request.system.rowIrradiance&&<div data-testid="row-irradiance-result" className="space-y-2"><p>{en?'Infinite sheds row optics; irradiance shading, not electrical mismatch.':'تابش ردیفی infinite sheds؛ سایهٔ تابشی، نه mismatch الکتریکی.'}</p><p>{en?'Period incident front / rear / weighted effective rear':'تابش تجمعی دوره، جلو / عقب / سهم مؤثر وزن‌دار عقب'}: {result.summary.frontIncidentWhm2?.toFixed(3)} / {result.summary.rearIncidentWhm2?.toFixed(3)} / {result.summary.rearEffectiveWhm2?.toFixed(3)} Wh/m²</p><p>SAPM proxy: {result.request.system.rowIrradiance.temperatureIrradiance}</p><details><summary>{en?'Row irradiance components (first 24; full CSV)':'اجزای تابش ردیفی (۲۴ بازه نخست؛ CSV کامل)'}</summary><div className="overflow-auto"><table><thead><tr><th>UTC midpoint</th><th>Front W/m²</th><th>Rear W/m²</th><th>Effective rear W/m²</th><th>Front shade fraction</th></tr></thead><tbody>{result.samples.slice(0,24).map((r,i)=><tr key={i}><td>{r.midpointUtc}</td><td>{Number(r.poaGlobalWm2).toFixed(3)}</td><td>{Number(r.rearIncidentWm2).toFixed(3)}</td><td>{Number(r.rearEffectiveIrradianceWm2).toFixed(3)}</td><td>{Number(r.frontShadedFraction).toFixed(4)}</td></tr>)}</tbody></table></div></details></div>}
      {result.request.system.sandia&&<div data-testid="sandia-result"><h4>Sandia — {en?'voltage-dependent inverter':'اینورتر وابسته به ولتاژ'}</h4><p>{en?'Imported inverter self-consumption / net grid (export minus import)':'واردات مصرف داخلی اینورتر / خالص شبکه (صادرات منهای واردات)'}: {result.summary.inverterSelfConsumptionWh?.toFixed(3)} / {result.summary.netGridWh?.toFixed(3)} Wh</p><p>{en?'No external site load/storage; fitted domain and ideal DC point only.':'بدون بار خارجی سایت/ذخیره؛ فقط دامنه برازش اعلامی و نقطه DC ایده‌آل.'}</p></div>}
      {(result.request.system.skyDiffuseModel==='perez'||result.request.system.physicalIam||result.request.system.sapmSpectral)&&<div data-testid="optical-models-result"><p>{result.manifest.models.transposition} · {result.manifest.models.beamIam} · {result.manifest.models.spectral}</p><p>{en?'Diffuse IAM remains unity; spectral modifier does not change thermal POA.':'IAM پخشیده یک باقی است؛ اصلاح طیفی تابش حرارتی را تغییر نمی‌دهد.'}</p></div>}
      {(result.request.system.transformer||result.request.system.auxiliaryPowerW!==undefined||result.request.system.acAvailability)&&<div data-testid="ac-plant-result"><h4>{en?'AC plant: import/export and losses':'نیروگاه AC: واردات/صادرات و تلفات'}</h4><p>{en?'Availability / auxiliary / transformer loss':'کاهش دسترس‌پذیری / مصرف کمکی / تلفات ترانس'}: {result.summary.availabilityLossWh?.toFixed(3)} / {result.summary.auxiliaryConsumptionWh?.toFixed(3)} / {result.summary.transformerLossWh?.toFixed(3)} Wh</p><p>{en?'Total grid import / net grid':'کل واردات شبکه / خالص شبکه'}: {result.summary.gridImportWh?.toFixed(3)} / {result.summary.netGridWh?.toFixed(3)} Wh</p></div>}
      {(result.request.system.horizonProfile||result.request.system.soilingSchedule||result.request.system.albedoSchedule)&&<div data-testid="environment-result"><h4>{en?'Horizon / soiling / albedo':'افق / آلودگی سطح / آلبدو'}</h4><p>{en?'Blocked beam / optical soiling loss (not DC energy loss)':'تابش مستقیم مسدود / کاهش اپتیکی آلودگی (نه انرژی DC)'}: {result.summary.horizonBlockedBeamWhm2?.toFixed(3)??'—'} / {result.summary.soilingLossWhm2?.toFixed(3)??'—'} Wh/m²</p><p>{result.manifest.models.horizon} · {result.manifest.models.soiling} · {result.manifest.models.albedo}</p></div>}
      <p data-testid="thermal-result">{en?'Thermal model':'مدل حرارتی'}: {result.manifest.models.temperature}</p>
      {result.request.system.acExportLimitW!==undefined&&<p data-testid="export-limit-result">{en?'AC export cap / before cap / cap loss':'سقف صادرات AC / انرژی پیش از سقف / کاهش صادرات'}: {result.request.system.acExportLimitW} W / {result.summary.acBeforeExportLimitWh?.toFixed(3)} Wh / {result.summary.acExportLimitLossWh?.toFixed(3)} Wh</p>}
      {result.request.system.electrical&&<div data-testid="electrical-result" className="space-y-2"><h4>{en?'De Soto single diode — ideal static constrained MPPT':'مدل تک‌دیودی De Soto — MPPT ایستای ایده‌آل'}</h4><p>{en?'Available MPP / MPPT-envelope loss':'MPP نامحدود / کاهش ناشی از قیود MPPT'}: {result.summary.availableMppWh?.toFixed(3)} / {result.summary.mpptConstraintLossWh?.toFixed(3)} Wh</p><p>{en?'Operating V/I are before additional DC loss. Voc checks are not a certified string design.':'V/I نقطه کار پیش از تلفات DC اضافی‌اند. بررسی Voc تأیید طراحی ایمن رشته نیست.'}</p><details><summary>{en?'Electrical checks and first 24 operating points (full CSV)':'بررسی‌های الکتریکی و ۲۴ نقطه نخست (CSV کامل)'}</summary><pre dir="ltr" className="whitespace-pre-wrap">{JSON.stringify(result.manifest.electricalChecks,null,2)}</pre><p>State: 0 dark; 1 MPP; 2 voltage boundary; 3 current boundary; 4 no feasible MPPT point</p><div className="overflow-auto"><table><thead><tr><th>UTC midpoint</th><th>Voc V</th><th>Vmp V</th><th>Vop V</th><th>Iop A</th><th>State</th></tr></thead><tbody>{result.samples.slice(0,24).map((r,i)=><tr key={i}><td>{r.midpointUtc}</td><td>{Number(r.arrayVocV).toFixed(3)}</td><td>{Number(r.arrayVmpV).toFixed(3)}</td><td>{Number(r.operatingVoltageV).toFixed(3)}</td><td>{Number(r.operatingCurrentA).toFixed(3)}</td><td>{Number(r.dcOperatingState)}</td></tr>)}</tbody></table></div></details></div>}
      <p className="break-all">Run: {result.execution?.runId} · Input SHA256: {result.manifest.inputSha256}</p>
      <ul className="list-disc ps-5">{[...result.manifest.warnings,...result.manifest.limitations].map((warning,i)=><li key={i}>{warning}</li>)}</ul>
      <table className="w-full text-start"><thead><tr><th>UTC month</th><th>DC Wh</th><th>AC Wh</th>{result.request.system.horizonProfile&&<th>Blocked beam Wh/m²</th>}{result.request.system.soilingSchedule&&<th>Soiling loss Wh/m²</th>}{result.request.system.sandia&&<><th>Inverter self-consumption Wh</th></>}{result.summary.gridImportWh!==undefined&&<><th>Total import Wh</th><th>Transformer loss Wh</th><th>Auxiliary Wh</th><th>Availability loss Wh</th></>}{result.summary.netGridWh!==undefined&&<th>Net grid Wh</th>}</tr></thead><tbody>{result.monthly.map(month=><tr key={month.month}><td>{month.month}</td><td>{month.dcWh.toFixed(2)}</td><td>{month.acWh.toFixed(2)}</td>{result.request.system.horizonProfile&&<td>{month.horizonBlockedBeamWhm2?.toFixed(2)}</td>}{result.request.system.soilingSchedule&&<td>{month.soilingLossWhm2?.toFixed(2)}</td>}{result.request.system.sandia&&<><td>{month.inverterSelfConsumptionWh?.toFixed(2)}</td></>}{month.gridImportWh!==undefined&&<><td>{month.gridImportWh.toFixed(2)}</td><td>{month.transformerLossWh?.toFixed(2)}</td><td>{month.auxiliaryConsumptionWh?.toFixed(2)}</td><td>{month.availabilityLossWh?.toFixed(2)}</td></>}{month.netGridWh!==undefined&&<td>{month.netGridWh.toFixed(2)}</td>}</tr>)}</tbody></table>
      {result.request.system.tracking&&<details data-testid="tracker-geometry"><summary>{en?'Tracker midpoint geometry (first 24 intervals; full series in CSV)':'هندسهٔ میانه بازه ردیاب (۲۴ بازه نخست؛ سری کامل در CSV)'}</summary><div className="overflow-auto"><table><thead><tr><th>UTC midpoint</th><th>θ °</th><th>Tilt °</th><th>Azimuth °</th><th>Active</th></tr></thead><tbody>{result.samples.slice(0,24).map((row,i)=><tr key={i}><td>{row.midpointUtc}</td><td>{Number(row.trackerThetaDeg).toFixed(3)}</td><td>{Number(row.surfaceTiltDeg).toFixed(3)}</td><td>{Number(row.surfaceAzimuthDeg).toFixed(3)}</td><td>{Number(row.trackerActive)}</td></tr>)}</tbody></table></div></details>}
      <div className="flex gap-4">
        <button type="button" data-testid="download-study-json" onClick={()=>download(`pvlib-study-${result.execution?.runId??'result'}.json`,JSON.stringify(result,null,2),'application/json')}>{en?'Download reproducible study report (JSON)':'دانلود گزارش بازتولیدپذیر مطالعه (JSON)'}</button>
        <button type="button" data-testid="download-study-csv" onClick={()=>{
          const columns=Object.keys(result.samples[0]);
          const csv=[columns,...result.samples.map(sample=>columns.map(column=>String(sample[column])))].map(row=>row.map(value=>`"${value.replace(/"/g,'""')}"`).join(',')).join('\r\n');
          download('pvlib-study-samples.csv',csv,'text/csv;charset=utf-8');
        }}>CSV</button>
        <button type="button" data-testid="download-study-monthly-csv" onClick={()=>download('pvlib-study-monthly.csv',monthlyStudyCsv(result),'text/csv;charset=utf-8')}>{en?'Monthly CSV (UTC)':'CSV ماهانه UTC'}</button>
      </div>
      <details><summary>{en?'Models, versions, units and execution manifest':'مدل‌ها، نسخه‌ها، واحدها و شناسنامهٔ اجرا'}</summary><pre dir="ltr" className="whitespace-pre-wrap break-all">{JSON.stringify(result.manifest,null,2)}</pre></details>
    </div>}
    {request&&!dirty&&<button type="button" data-testid="download-study-insights" onClick={()=>download('pvlib-study-insights.json',JSON.stringify(studyInsights(request,result??undefined),null,2),'application/json')}>{en?'Download data diagnostics & source ledger (JSON)':'دانلود بررسی داده و دفتر منابع (JSON)'}</button>}
    <StudyLibrary key={`${latitude}:${longitude}`} request={request} result={result} dirty={dirty} busy={busy} latitude={latitude} longitude={longitude} en={en} onRestore={snapshot=>{revision.current++;controller.current?.abort();setRequest(snapshot.request);setResult(snapshot.result);setDirty(false);setRestored(Boolean(snapshot.result));setError('');setBusy(false);}}/>
  </section>;
}
