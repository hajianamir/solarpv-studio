import React,{useEffect,useMemo,useState} from 'react';
import type {StudyResult} from '../studies/studyContract';
import {measurementPeriods,measurementPeriodSummaryCsv,measurementResidualCsv,type MeasurementRange} from '../studies/measurementPeriods';
function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function MeasurementPeriodExplorer({result}:{result:StudyResult}){
 const [start,setStart]=useState(''),[end,setEnd]=useState(''),[range,setRange]=useState<MeasurementRange|undefined>(),[id,setId]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setStart('');setEnd('');setRange(undefined);setId('');setError('');},[result]);
 const analysis=useMemo(()=>measurementPeriods(result,range),[result,range]);
 const dataset=analysis.datasets.find(d=>d.id===id)??analysis.datasets[0];
 if(!dataset)return null;
 const exported={...analysis,datasets:[dataset]};
 const pairs=dataset.rows.filter(row=>row.residual!==null);
 const times=pairs.map(row=>Date.parse(row.timestamp)-dataset.intervalMinutes*30000);
 const low=times[0]??0,high=times.at(-1)??low;
 const amplitude=pairs.reduce((max,row)=>Math.max(max,Math.abs(row.residual!)),0)||1;
 return <section data-testid="measurement-period-explorer"><h4>43. Daily/monthly residual analysis / تحلیل روزانه و ماهانه</h4>
 <p>UTC interval midpoint; range [start, end), explicit Z or offset. Empty bounds = all data. No fill or calibration. Statistics include valid zero/night pairs; missing/excluded/unavailable are not zero. Chart shows every valid pair as an unconnected point.</p>
 <label>Observation dataset<select aria-label="Period observation dataset" value={dataset.id} onChange={e=>setId(e.target.value)}>{analysis.datasets.map(d=><option key={d.id} value={d.id}>{d.id} — {d.unit}</option>)}</select></label>
 <label>Start UTC or offset<input aria-label="Measurement period start" value={start} onChange={e=>setStart(e.target.value)} placeholder="2017-04-01T00:00:00Z"/></label>
 <label>End UTC or offset (exclusive)<input aria-label="Measurement period end" value={end} onChange={e=>setEnd(e.target.value)} placeholder="2017-04-02T00:00:00Z"/></label>
 <button type="button" data-testid="apply-measurement-period" onClick={()=>{try{if(!start&&!end){setRange(undefined);}else{const next={startUtc:start,endUtc:end};measurementPeriods(result,next);setRange(next);}setError('');}catch(e){setError(String(e));}}}>Apply range / اعمال بازه</button>
 <button type="button" data-testid="reset-measurement-period" onClick={()=>{setStart('');setEnd('');setRange(undefined);setError('');}}>Full period / کل دوره</button>
 {error&&<p role="alert">{error} Previous applied selection remains active.</p>}
 <p data-testid="measurement-period-selection">Applied midpoint UTC range: {analysis.selection?`${analysis.selection.startUtc} ≤ midpoint < ${analysis.selection.endUtc}`:'all data'}; {dataset.id}; residual = model − observation ({dataset.unit}). Not field validated.</p>
 <pre data-testid="measurement-period-total" dir="ltr" className="overflow-auto">{JSON.stringify(dataset.total,null,2)}</pre>
 {pairs.length?<figure><svg data-testid="measurement-residual-chart" role="img" aria-label={`Residual scatter for ${dataset.id}, ${pairs.length} valid pairs, ${dataset.unit}, UTC midpoints`} viewBox="0 0 800 240" className="w-full" style={{maxHeight:300}}><title>Model minus observation, {dataset.unit}; UTC midpoint</title><line x1="50" x2="780" y1="110" y2="110" stroke="gray"/><text x="0" y="18" fill="currentColor">+{amplitude.toPrecision(4)}</text><text x="0" y="215" fill="currentColor">−{amplitude.toPrecision(4)}</text><text x="50" y="238" fill="currentColor">{new Date(low).toISOString()}</text><text x="780" y="238" textAnchor="end" fill="currentColor">{new Date(high).toISOString()}</text>{pairs.map((row,i)=><circle key={row.intervalEndUtc} cx={high===low?415:50+730*(times[i]-low)/(high-low)} cy={110-95*row.residual!/amplitude} r="3" fill="#38bdf8"><title>{new Date(times[i]).toISOString()}: {row.residual} {dataset.unit}</title></circle>)}</svg><figcaption>{pairs.length} pairs; symmetric vertical scale ±{amplitude.toPrecision(4)} {dataset.unit}; points only, gaps not connected. Full values and flags in residual CSV/JSON.</figcaption></figure>:<p data-testid="measurement-period-no-pairs">No valid pairs in selection; error metrics are unavailable, not zero.</p>}
 <table data-testid="measurement-period-table"><caption>UTC midpoint buckets; sparse coverage, no synthetic empty dates. Metrics in {dataset.unit}.</caption><thead><tr>{['Group','UTC period','Pairs / model intervals','MBE','MAE','RMSE'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{(['daily','monthly'] as const).flatMap(group=>dataset[group].map(b=><tr key={group+b.period}><td>{group}</td><td>{b.period}</td><td>{b.coverage.statusCounts.paired} / {b.coverage.modelIntervals}</td><td>{b.metrics?.mbe??'unavailable'}</td><td>{b.metrics?.mae??'unavailable'}</td><td>{b.metrics?.rmse??'unavailable'}</td></tr>))}</tbody></table>
 <button type="button" data-testid="download-measurement-period-json" onClick={()=>download('measurement-period-analysis.json',JSON.stringify(exported,null,2),'application/json')}>Selection JSON</button>
 <button type="button" data-testid="download-measurement-period-summary-csv" onClick={()=>download('measurement-period-summary.csv',measurementPeriodSummaryCsv(exported),'text/csv;charset=utf-8')}>Daily/monthly summary CSV</button>
 <button type="button" data-testid="download-measurement-period-residual-csv" onClick={()=>download('measurement-period-residuals.csv',measurementResidualCsv(exported),'text/csv;charset=utf-8')}>Residual rows CSV</button>
 </section>;
}
