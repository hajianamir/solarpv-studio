import React,{useEffect,useRef,useState} from 'react';
import type {FinancialUqRunInput,FinancialUqResult} from '../engine/core/uncertaintyPropagation';
import {currentUqSource,makeFinancialUqArchive,readFinancialUqArchive,uqDeterministicResultHash,MAX_UQ_ARCHIVE_BYTES,type FinancialUqArchive} from '../studies/financialUqArchive';
import {startFinancialUq} from '../studies/financialUqRunner';
import {downloadBlob} from '../browser/download';

/** Replay is isolated verification only: no finance/project/adoption setters. */
export function FinancialUqArchivePanel({input,result,panelContext,lang}:{input:FinancialUqRunInput;result:FinancialUqResult;panelContext:string;lang:'fa'|'en'}) {
 const [consent,setConsent]=useState(false),[archive,setArchive]=useState<FinancialUqArchive|null>(null),[status,setStatus]=useState('idle');
 const job=useRef<ReturnType<typeof startFinancialUq>|null>(null),epoch=useRef({value:0});
 useEffect(()=>{const e=epoch.current;return()=>{e.value++;job.current?.cancel();};},[]);
 const code=currentUqSource();
 function exportArchive(){try{const a=makeFinancialUqArchive(input,result,panelContext);downloadBlob(new Blob([JSON.stringify(a,null,2)],{type:'application/json'}),'financial-uq-archive.json');setStatus('exported');}catch{setStatus('invalid');}}
 async function importArchive(file?:File){const n=++epoch.current.value;job.current?.cancel();setArchive(null);setStatus('loading');try{
  if(!file||file.size>MAX_UQ_ARCHIVE_BYTES)throw new Error('size');const a=readFinancialUqArchive(await file.text());if(n!==epoch.current.value)return;setArchive(a);setStatus(a.source.bundleSha256===code?.bundleSha256?'integrity_verified':'code_mismatch');
 }catch{if(n===epoch.current.value)setStatus('invalid');}}
 async function replay(){if(!archive||archive.source.bundleSha256!==code?.bundleSha256)return;const n=++epoch.current.value;setStatus('running');try{
  job.current=startFinancialUq(archive.request);const value=await job.current.promise;if(n===epoch.current.value)setStatus(uqDeterministicResultHash(value)===archive.deterministicResultSha256?'reproduced':'result_mismatch');
 }catch{if(n===epoch.current.value)setStatus('failed');}}
 return <section className="studio-card text-xs space-y-2" data-testid="uq-archive-panel">
  <h4>{lang==='fa'?'آرشیو بازتولید مستقل UQ':'Independent UQ reproducibility archive'}</h4>
  <p>{lang==='fa'?'آرشیو شامل قیمت‌ها و ورودی مالی است؛ محرمانه نگه دارید. hash امضای اصالت یا تأیید میدانی نیست. بازاجرا فقط مقایسه است و مالی/انرژی را تغییر نمی‌دهد.':'Archive includes confidential pricing and financial inputs. Hashes are not authorship signatures or field validation. Replay only compares; it never adopts energy or changes finance.'}</p>
  <label><input type="checkbox" data-testid="uq-archive-consent" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{lang==='fa'?' خروجی محلی شامل قیمت‌ها باشد':' Include pricing in local export'}</label>
  <button type="button" data-testid="uq-archive-export" disabled={!consent||!code} onClick={exportArchive}>{lang==='fa'?'دانلود آرشیو UQ':'Download UQ archive'}</button>
  <label>{lang==='fa'?'ورود آرشیو برای بررسی':'Import archive for verification'}<input type="file" accept="application/json,.json" data-testid="uq-archive-import" onChange={e=>{void importArchive(e.target.files?.[0]);e.target.value='';}}/></label>
  <button type="button" data-testid="uq-archive-replay" disabled={!archive||archive.source.bundleSha256!==code?.bundleSha256||status==='running'} onClick={replay}>{lang==='fa'?'بازاجرا و مقایسه، بدون پذیرش':'Replay and compare, no adoption'}</button>
  {status==='running'&&<button type="button" onClick={()=>{epoch.current.value++;job.current?.cancel();setStatus('cancelled');}}>{lang==='fa'?'لغو مقایسه':'Cancel replay'}</button>}
  <p role="status" data-testid="uq-archive-status">{status}</p>
  {!code&&<p>{lang==='fa'?'هویت source در این build در دسترس نیست؛ export مسدود است.':'Source identity unavailable in this build; export blocked.'}</p>}
 </section>;
}
