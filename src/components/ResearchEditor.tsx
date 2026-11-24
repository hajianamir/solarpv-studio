import batteryProtocolExample from '../../docs/examples/science-b/protocol.synthetic.json';
import calibrationExample from '../../docs/examples/references/calibration.json';
import coupledExample from '../../docs/examples/science-c/coupled.request.json';
import inventoryExample from '../../docs/examples/references/inventory.json';
import incoherentExample from '../../docs/examples/references/incoherent.json';
import stefanExample from '../../docs/examples/stefan/request.json';
import localBillExample from '../../docs/examples/applied/local.json';
import pvLcoeExample from '../../docs/examples/applied/pv.json';
import {appliedOperations} from '../studies/appliedResearch';
import siliconReference from '../../docs/examples/references/silicon.json';
import pvdegReference from '../../docs/examples/references/pvdeg.json';
import pviceReference from '../../docs/examples/references/pvice.json';
import opticsReference from '../../docs/examples/references/optics.json';
import {referenceOperations} from '../studies/referenceModels';
import gridCExample from '../../docs/examples/science-c/grid.request.json';
import agriCExample from '../../docs/examples/science-c/agri.request.json';
import fpvCExample from '../../docs/examples/science-c/fpv.request.json';
import pemCExample from '../../docs/examples/science-c/pem.request.json';
import pcmCExample from '../../docs/examples/science-c/pcm.request.json';
import {scienceCOperations} from '../studies/scienceC';
import degradationExample from '../../docs/examples/science-d/degradation.synthetic.json';
import circularExample from '../../docs/examples/science-d/circular.synthetic.json';
import billsExample from '../../docs/examples/science-d/bills.synthetic.json';
import scenarioExample from '../../docs/examples/science-d/scenario.synthetic.json';
import {scienceDOperations} from '../studies/scienceD';
import oetExample from '../../docs/examples/science-b/oet.synthetic.json';
import pybammExample from '../../docs/examples/science-b/battery.synthetic.json';
import tandemExample from '../../docs/examples/science-b/tandem.synthetic.json';
import {scienceBOperations} from '../studies/scienceB';
import survivalExample from '../../docs/examples/portfolio/survival.synthetic.json';
import convergenceExample from '../../docs/examples/portfolio/convergence.synthetic.json';
import designExample from '../../docs/examples/portfolio/design.synthetic.json';
import holdoutExample from '../../docs/examples/portfolio/holdout.synthetic.json';
import uqExample from '../../docs/examples/portfolio/uq.synthetic.json';
import hybridExample from '../../docs/examples/portfolio/hybrid.synthetic.json';
import twinExample from '../../docs/examples/portfolio/twin.synthetic.json';
import {ResearchTabs} from './ResearchWorkspace';
import dcExample from '../../docs/examples/physical-models/dc_coupled.json';
import spmExample from '../../docs/examples/physical-models/electrochemical_spm.json';
import controlExample from '../../docs/examples/physical-models/dq_protection_control.json';
import React,{useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {downloadBlob} from '../browser/download';
import integratedExample from '../../docs/examples/research/integrated-synthetic-plan.json';
import {ResearchRequestSchema,validateResearchResponse} from '../studies/researchApi';
import {parseStudyJson} from '../studies/strictStudyJson';
import {thermalExample,circuitExample} from '../studies/researchExamples';
const researchTopics=[{"id": "physical", "fa": "فیزیک و مدار", "en": "Physics & circuits"}, {"id": "portfolio", "fa": "عدم\u200cقطعیت و سایزینگ", "en": "Uncertainty & sizing"}, {"id": "science-b", "fa": "اپتیک و باتری", "en": "Optics & battery"}, {"id": "science-d", "fa": "تخریب، مواد و قبض", "en": "Degradation, materials & bills"}, {"id": "science-c", "fa": "شبکه، آب و هیدروژن", "en": "Grid, water & hydrogen"}, {"id": "references", "fa": "مراجع نسخه\u200cثابت", "en": "Pinned references"}, {"id": "applied", "fa": "سناریوی PV و قبض محلی", "en": "PV scenarios & local bills"}, {"id": "spatial", "fa": "ذوب فضایی PCM", "en": "Spatial PCM"}, {"id": "incoherent", "fa": "اپتیک ناهمدوس", "en": "Incoherent optics"}, {"id": "inventory", "fa": "موجودی مواد", "en": "Material inventory"}, {"id": "coupling", "fa": "اتصال PV-T به PEM", "en": "PV-T / PEM coupling"}, {"id": "battery", "fa": "پروتکل باتری", "en": "Battery protocols"}, {"id": "calibration", "fa": "کالیبراسیون بازه", "en": "Interval calibration"}];
const topicDefaults:Record<string,unknown>={physical:thermalExample,portfolio:uqExample,'science-b':oetExample,'science-c':gridCExample,'science-d':degradationExample,references:pvdegReference,applied:localBillExample,spatial:stefanExample,incoherent:incoherentExample,inventory:inventoryExample,coupling:coupledExample,battery:batteryProtocolExample,calibration:calibrationExample};
const archive=z.object({schemaVersion:z.literal('research-editor-archive-v1'),request:z.unknown(),response:z.unknown().nullable()}).strict();
export function ResearchEditor({latitude,longitude,lang}:{latitude:number;longitude:number;lang:'fa'|'en'}){
 const [text,setText]=useState(JSON.stringify(thermalExample,null,2)),[result,setResult]=useState<unknown>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[enabled,setEnabled]=useState(false),[token,setToken]=useState(''),[portfolioEnabled,setPortfolioEnabled]=useState(false),[scienceBEnabled,setScienceBEnabled]=useState(false),[scienceDEnabled,setScienceDEnabled]=useState(false),[scienceCEnabled,setScienceCEnabled]=useState(false),[referencesEnabled,setReferencesEnabled]=useState(false),[appliedEnabled,setAppliedEnabled]=useState(false),[spatialEnabled,setSpatialEnabled]=useState(false),[incoherentEnabled,setIncoherentEnabled]=useState(false),[inventoryEnabled,setInventoryEnabled]=useState(false),[coupledEnabled,setCoupledEnabled]=useState(false),[calibrationEnabled,setCalibrationEnabled]=useState(false),[batteryProtocolEnabled,setBatteryProtocolEnabled]=useState(false);
 const [topic,setTopic]=useState('physical');
 const revision=useRef(0),abort=useRef<AbortController|null>(null);const en=lang==='en';
 const invalidate=()=>{revision.current++;abort.current?.abort();setBusy(false);setResult(null);setError('');};
 useEffect(()=>{invalidate();},[latitude,longitude]);
 useEffect(()=>{const c=new AbortController();fetch('/api/v1/research/capabilities',{signal:c.signal,cache:'no-store'}).then(r=>r.json()).then(c=>{setEnabled(c.enabled===true);setPortfolioEnabled(c.portfolioAnalyticsEnabled===true);setScienceBEnabled(c.scienceBEnabled===true);setScienceDEnabled(c.scienceDEnabled===true);setScienceCEnabled(c.scienceCEnabled===true);setReferencesEnabled(c.referenceModelsEnabled===true);setAppliedEnabled(c.appliedResearchEnabled===true);setSpatialEnabled(c.spatialResearchEnabled===true);setIncoherentEnabled(c.incoherentOpticsEnabled===true);setInventoryEnabled(c.materialInventoryEnabled===true);setCoupledEnabled(c.pvtPemCouplingEnabled===true);setCalibrationEnabled(c.intervalCalibrationEnabled===true);setBatteryProtocolEnabled(c.batteryProtocolEnabled===true);}).catch(()=>{});return()=>{c.abort();abort.current?.abort();};},[]);
 let preview='';let valid=false;let portfolio=false;let scienceB=false;let scienceD=false;let scienceC=false;let references=false;let applied=false;let spatial=false;let incoherent=false;let inventory=false;let coupled=false;let calibration=false;let batteryProtocol=false;
 try{const r=ResearchRequestSchema.parse(parseStudyJson(text,8*1024*1024));valid=true;batteryProtocol=r.operation==='battery_protocol';calibration=r.operation==='interval_calibration';coupled=r.operation==='pvt_pem_coupled';inventory=r.operation==='pvice_inventory';incoherent=r.operation==='incoherent_optics';spatial=r.operation==='stefan_spatial';applied=(appliedOperations as readonly string[]).includes(r.operation);references=(referenceOperations as readonly string[]).includes(r.operation);scienceC=(scienceCOperations as readonly string[]).includes(r.operation);scienceD=(scienceDOperations as readonly string[]).includes(r.operation);scienceB=(scienceBOperations as readonly string[]).includes(r.operation);portfolio=['project_uq','hybrid_sizing','batch_twin','uq_convergence','hybrid_design','twin_site_holdout','cohort_survival'].includes(r.operation);preview=`${r.operation} · ${r.plan.schemaVersion} · not_field_validated`;}catch(e){preview=e instanceof Error?e.message:'Invalid input';}
 const edit=(value:string)=>{invalidate();setText(value);};
 const run=async()=>{invalidate();const version=revision.current,c=new AbortController();abort.current=c;setBusy(true);
  try{const request=ResearchRequestSchema.parse(parseStudyJson(text,8*1024*1024));const response=await fetch('/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(request),signal:c.signal,cache:'no-store'});
   if(!response.ok)throw new Error(`Research HTTP ${response.status}: ${(await response.text()).slice(0,500)}`);
   const data=validateResearchResponse(await response.json(),request);if(version===revision.current)setResult(data);
  }catch(e){if(version===revision.current)setError(e instanceof Error?e.message:'Research failed');}finally{if(version===revision.current)setBusy(false);}
 };
 const download=(name:string,data:unknown)=>downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),name);
 const load=async(file:File)=>{invalidate();const version=revision.current;try{if(file.size>40*1024*1024)throw new Error('Archive too large');const data=parseStudyJson(await file.text(),40*1024*1024);const a=archive.safeParse(data);const request=ResearchRequestSchema.parse(a.success?a.data.request:data);if(a.success&&a.data.response!==null)validateResearchResponse(a.data.response,request);if(version===revision.current)setText(JSON.stringify(request,null,2));/* restored results are never treated as a fresh execution */}catch(e){if(version===revision.current)setError(String(e));}};
 return <section data-testid="research-editor" className="rounded-xl border border-industrial-border p-4 space-y-4 [&_input]:text-theme-strong" dir={en?'ltr':'rtl'}>
  <h3 className="text-lg font-bold text-theme-strong">{en?'Model plan & execution':'طرح و اجرای مدل پژوهشی'}</h3><p>{en?'Separate research only; no production/finance attachment. Explicit operating parameters required.':'صرفاً پژوهشی؛ جدا از تولید و مالی. پارامترهای عملیاتی با منبع صریح الزامی است.'} not_field_validated — {enabled?'API enabled':'API disabled / unavailable'}</p>
  <ResearchTabs tabs={researchTopics} active={topic} onChange={id=>{edit(JSON.stringify(topicDefaults[id],null,2));setTopic(id);}} lang={lang} prefix="research-topic"/>
  <div id="research-topic-panel" role="tabpanel" aria-labelledby={`research-topic-${topic}`}>
  <div hidden={topic!=='physical'} data-research-topic="physical" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <button onClick={()=>edit(JSON.stringify(thermalExample,null,2))}>Two-node synthetic example</button>{' '}<button onClick={()=>edit(JSON.stringify(circuitExample,null,2))}>Diode synthetic example</button>{' '}<button onClick={()=>edit(JSON.stringify({operation:'integrated',plan:integratedExample},null,2))}>Integrated synthetic example</button>
  <div>{[['DC-coupled synthetic example',dcExample],['SPM Chen2020 synthetic protocol',spmExample],['dq control / protection synthetic example',controlExample]].map(([label,example])=><button key={String(label)} onClick={()=>edit(JSON.stringify(example,null,2))}>{String(label)}</button>)}</div>
  <p>{en?'Physical models require equipment-specific parameters. SPM is isothermal, dq is balanced averaged, and simulation is not hardware safety approval. No automatic financial adoption.':'مدل‌های فیزیکی به پارامتر ویژهٔ تجهیزات نیاز دارند. SPM ایزوترمال و dq متعادلِ میانگین‌گیری‌شده است؛ شبیه‌سازی تأیید ایمنی سخت‌افزار نیست و خودکار وارد مالی نمی‌شود.'}</p>
  </div>
  <div hidden={topic!=='portfolio'} data-research-topic="portfolio" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'A1–A3: literature/synthetic research screening; not site calibration, bankability, RUL or automatic finance. LP candidate screening and finite-horizon MILP bounds are distinct; site/time holdout is not field qualification.':'A1–A3: بررسی پژوهشی با مرجع منتشرشده/فرضی؛ نه کالیبراسیون سایت، بانک‌پذیری، RUL یا ورود خودکار به مالی. بررسی گزینه‌ای LP از کران MILP افق محدود جداست؛ آزمون سایت/زمان تأیید میدانی نیست.'}</p>
  <div>{[['UQ literature comparison example',uqExample],['Hybrid LP sizing example',hybridExample],['Batch twin synthetic example',twinExample],['Multi-budget convergence',convergenceExample],['Global capacity MILP',designExample],['Site/time holdout',holdoutExample],['Censored cohort survival',survivalExample]].map(([label,example])=><button key={String(label)} onClick={()=>edit(JSON.stringify(example,null,2))}>{String(label)}</button>)} {portfolioEnabled?'Portfolio API enabled':'Portfolio API disabled'}</div>
  </div>
  <div hidden={topic!=='science-b'} data-research-topic="science-b" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'B1–B3 bounded research only: horizontal steady OET, published-parameter cell, ideal spectral tandem. No field, lifetime or safety qualification.':'B1–B3 پژوهشی محدود: OET پایای افقی، سلول با پارامتر منتشرشده و تاندم طیفی ایده‌آل؛ نه تأیید میدانی، عمر یا ایمنی.'}</p>
  <div>{[['B1 coupled OET example',oetExample],['B2 PyBaMM thermal example',pybammExample],['B3 spectral tandem example',tandemExample]].map(([label,example])=><button key={String(label)} onClick={()=>edit(JSON.stringify(example,null,2))}>{String(label)}</button>)} {scienceBEnabled?'Science B API enabled':'Science B API disabled'}</div>
  </div>
  <div hidden={topic!=='science-d'} data-research-topic="science-d" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'D1–D3 limited research: declared degradation, cohort/LCA ledger, synthetic bill profiles and offline typed proposals. No operational RUL, certified LCA, measured load or LLM. No automatic finance/energy adoption.':'D1–D3 پژوهشی محدود: تخریب اظهاری، دفتر مواد/LCA، پروفیل فرضی قبض و پیشنهاد typed آفلاین؛ نه RUL عملیاتی، LCA تأییدشده، بار اندازه‌گیری‌شده یا LLM. بدون ورود خودکار به مالی/انرژی.'}</p>
  <div>{[['D1 degradation example',degradationExample],['D2 circular LCA example',circularExample],['D3 bill ensemble example',billsExample],['D3 offline proposal example',scenarioExample]].map(([label,example])=><button key={String(label)} onClick={()=>edit(JSON.stringify(example,null,2))}>{String(label)}</button>)} {scienceDEnabled?'Science D API enabled':'Science D API disabled'}</div>
  </div>
  <div hidden={topic!=='science-c'} data-research-topic="science-c" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'C1–C3 bounded research: declared grid screen, crop/water, reservoir, PEM and lumped PCM. Not utility certification, field qualification, spatial Stefan or automatic finance/energy adoption.':'C1–C3 پژوهشی محدود: غربال اظهاری شبکه، آب/محصول، مخزن، PEM و PCM یکپارچه؛ نه گواه شبکه، تأیید میدانی، حل فضایی Stefan یا ورود خودکار به مالی/انرژی.'}</p>
  <div>{[['C1 grid support example',gridCExample],['C2 agri water example',agriCExample],['C2 FPV balance example',fpvCExample],['C3 PEM dispatch example',pemCExample],['C3 PV-T PCM example',pcmCExample]].map(([label,example])=><button key={String(label)} onClick={()=>edit(JSON.stringify(example,null,2))}>{String(label)}</button>)} {scienceCEnabled?'Science C API enabled':'Science C API disabled'}</div>
  </div>
  <div hidden={topic!=='references'} data-research-topic="references" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'Pinned reference adapters: actual PVDeg/PV ICE/tmm; upstream test and modeled-baseline replay only, not field RUL, certified LCA or measured technology qualification. Separate optional offline Python runtime required.':'adapterهای مرجع نسخه‌ثابت: اجرای واقعی PVDeg/PV ICE/tmm؛ بازپخش آزمون upstream و baseline مدل‌شده، نه RUL میدانی، LCA تأییدشده یا اعتبارسنجی فناوری واقعی. محیط Python آفلاین مجزا لازم است.'}</p>
  <div>{[['PVDeg reference example',pvdegReference],['PV ICE reference example',pviceReference],['Coherent optics reference example',opticsReference],['Silicon literature constants example',siliconReference]].map(([label,example])=><button key={String(label)} onClick={()=>edit(JSON.stringify(example,null,2))}>{String(label)}</button>)} {referencesEnabled?'Reference API enabled':'Reference API disabled'}</div>
  </div>
  <div hidden={topic!=='applied'} data-research-topic="applied" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'Applied research: local Gregorian bills with pinned IANA/DST; nonlinear PVWatts/LCOE scenario screening. Shapes and costs are assumptions, not measured load, calibrated project UQ or financial adoption.':'پژوهش کاربردی: قبض Gregorian محلی با IANA/DST نسخه‌ثابت؛ بررسی سناریویی غیرخطی PVWatts/LCOE. شکل بار و هزینه‌ها فرض‌اند؛ نه بار اندازه‌گیری‌شده، UQ کالیبرهٔ پروژه یا پذیرش مالی.'}</p>
  <div>{[['Local bill DST example',localBillExample],['PV LCOE scenario example',pvLcoeExample]].map(([label,example])=><button key={String(label)} onClick={()=>edit(JSON.stringify(example,null,2))}>{String(label)}</button>)} {appliedEnabled?'Applied API enabled':'Applied API disabled'}</div>
  </div>
  <div hidden={topic!=='spatial'} data-research-topic="spatial" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'Spatial PCM: 1D conduction-only isothermal Stefan melting, finite insulated domain. Analytical verification is not material qualification or PV-T/PEM coupling.':'PCM فضایی: ذوب Stefan هم‌دما با رسانش یک‌بعدی و مرز انتهایی عایق. آزمون تحلیلی نه تأیید ماده است و نه اتصال PV-T/PEM.'}</p>
  <div><button onClick={()=>edit(JSON.stringify(stefanExample,null,2))}>Spatial Stefan example</button> {spatialEnabled?'Spatial API enabled':'Spatial API disabled'}</div>
  </div>
  <div hidden={topic!=='incoherent'} data-research-topic="incoherent" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'Incoherent optics: normal incidence, all thick layers phase-averaged; not roughness, mixed coherent stacks, technology EQE or electrical yield.':'اپتیک ناهمدوس: تابش عمودی و همهٔ لایه‌های ضخیم با میانگین‌گیری فاز؛ نه زبری، پشتهٔ مختلط، EQE فناوری یا بازده الکتریکی.'}</p>
  <div><button onClick={()=>edit(JSON.stringify(incoherentExample,null,2))}>Incoherent optics example</button> {incoherentEnabled?'Incoherent API enabled':'Incoherent API disabled'}</div>
  </div>
  <div hidden={topic!=='inventory'} data-research-topic="inventory" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'Material inventory: selected frozen c-Si baseline flows and caller-declared kg comparisons; not verified site BOM, whole-module LCA, carbon credits or costs.':'موجودی مواد: جریان مواد منتخب سناریوی ثابت c-Si و مقایسهٔ اظهارشده بر حسب kg؛ نه BOM تأییدشدهٔ سایت، LCA کل ماژول، اعتبار کربن یا هزینه.'}</p>
  <div><button onClick={()=>edit(JSON.stringify(inventoryExample,null,2))}>Material inventory example</button> {inventoryEnabled?'Material inventory API enabled':'Material inventory API disabled'}</div>
  </div>
  <div hidden={topic!=='coupling'} data-research-topic="coupling" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'PV-T/PCM to PEM: one-way interval-average electrical feed only. No thermal feedback, preheating credit, instantaneous power guarantee or device qualification.':'اتصال PV-T/PCM به PEM: فقط ورودی الکتریکی یک‌طرفه با توان میانگین بازه؛ بدون بازخورد حرارتی، اعتبار پیش‌گرمایش، تضمین توان لحظه‌ای یا تأیید تجهیز.'}</p>
  <div><button onClick={()=>edit(JSON.stringify(coupledExample,null,2))}>PV-T PEM coupled example</button> {coupledEnabled?'Coupled API enabled':'Coupled API disabled'}</div>
  </div>
  <div hidden={topic!=='battery'} data-research-topic="battery" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'Battery current protocol: published-parameter single cell; not measured-cell validation, runaway, pack safety or lifetime.':'پروتکل جریان باتری: سلول منفرد با پارامتر منتشرشده؛ نه اعتبارسنجی سلول واقعی، runaway، ایمنی پک یا عمر.'}</p>
  <div><button onClick={()=>edit(JSON.stringify(batteryProtocolExample,null,2))}>Battery protocol example</button> {batteryProtocolEnabled?'Battery protocol API enabled':'Battery protocol API disabled'}</div>
  </div>
  <div hidden={topic!=='calibration'} data-research-topic="calibration" className="space-y-4 [&_p]:text-sm [&_p]:text-theme-muted [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:bg-industrial-bg [&_button]:px-3 [&_button]:py-2 [&_button]:m-1 [&_button]:text-sm">
  <p>{en?'Prediction interval calibration: descriptive disjoint-site temporal holdout only. Exchangeability and model freezing are unverified; nominal coverage is not a project guarantee or energy P90.':'کالیبراسیون بازهٔ پیش‌بینی: فقط گزارش holdout جدا از نظر سایت/زمان؛ exchangeability و frozen بودن مدل تأیید نشده‌اند. پوشش اسمی نه تضمین پروژه است و نه P90 انرژی.'}</p>
  <div><button onClick={()=>edit(JSON.stringify(calibrationExample,null,2))}>Interval calibration example</button> {calibrationEnabled?'Calibration API enabled':'Calibration API disabled'}</div>
  </div>
  </div>
  <label>Import plan / archive <input aria-label="Import research" type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)void load(f);e.target.value='';}}/></label>
  <textarea aria-label="Research JSON" dir="ltr" className="w-full font-mono text-xs border border-industrial-border bg-industrial-bg text-theme-strong rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-violet-400" rows={16} value={text} onChange={e=>edit(e.target.value)}/>
  <pre className="text-xs whitespace-pre-wrap rounded-lg border border-industrial-border p-3 text-theme-muted" data-testid="research-preview">{preview}</pre>
  <label>Bearer token (memory only, optional with authenticated gateway) <input type="password" autoComplete="off" className="studio-input block w-full mt-2" value={token} onChange={e=>{invalidate();setToken(e.target.value);}}/></label>
  <div className="flex flex-wrap gap-2 [&_button]:rounded-lg [&_button]:border [&_button]:border-industrial-border [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:bg-industrial-bg [&_button]:disabled:opacity-40"><button disabled={!valid||busy||!enabled||(portfolio&&!portfolioEnabled)||(scienceB&&!scienceBEnabled)||(scienceD&&!scienceDEnabled)||(scienceC&&!scienceCEnabled)||(references&&!referencesEnabled)||(applied&&!appliedEnabled)||(spatial&&!spatialEnabled)||(incoherent&&!incoherentEnabled)||(inventory&&!inventoryEnabled)||(coupled&&!coupledEnabled)||(calibration&&!calibrationEnabled)||(batteryProtocol&&!batteryProtocolEnabled)} onClick={()=>void run()}>Run research</button>{' '}<button disabled={!busy} onClick={invalidate}>Cancel research</button>{' '}<button disabled={!valid} onClick={()=>download('research-archive.json',{schemaVersion:'research-editor-archive-v1',request:ResearchRequestSchema.parse(parseStudyJson(text,8*1024*1024)),response:result})}>Download research archive</button>{' '}<button disabled={!result} onClick={()=>download('research-result.json',result)}>Download research result</button></div>
  {error&&<p role="alert">{error}</p>}{result!==null&&<pre data-testid="research-result" dir="ltr" className="text-xs overflow-auto max-h-80">{JSON.stringify(result,null,2)}</pre>}
 </section>;
}
