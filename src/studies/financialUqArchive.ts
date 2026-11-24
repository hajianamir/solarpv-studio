import { z } from 'zod';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import type { FinancialUqRunInput, FinancialUqResult } from '../engine/core/uncertaintyPropagation';
import { assertFinancialUqResult } from './financialUqResultValidation';
import { explicitEnergyQuantiles } from './uqQuantileContract';
import { financialMetricQuantiles } from './financialMetricQuantiles';
import { parseStudyJson } from './strictStudyJson';

export const MAX_UQ_ARCHIVE_BYTES = 512 * 1024;
export function uqCanonical(value: unknown): string {
  if(value===null || typeof value==='boolean' || typeof value==='string') return JSON.stringify(value);
  if(typeof value==='number' && Number.isFinite(value)) return JSON.stringify(value);
  if(Array.isArray(value)) return '['+value.map(uqCanonical).join(',')+']';
  if(value && typeof value==='object' && Object.getPrototypeOf(value)===Object.prototype) {
    return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+uqCanonical(v)).join(',')+'}';
  }
  throw new Error('UQ_NON_JSON_VALUE');
}
export const uqHash=(value:unknown)=>bytesToHex(sha256(new TextEncoder().encode(uqCanonical(value))));
const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const UqSourceSchema=z.object({bundleSha256:digest,files:z.record(z.string().regex(/^(?:src\/[\w./-]+|package(?:-lock)?\.json|vite\.config\.ts|tsconfig(?:\.node)?\.json)$/).refine(s=>!s.includes('..')),digest)}).strict();
export type UqSource = z.infer<typeof UqSourceSchema>;
declare const __SOLARPV_UQ_SOURCE__: UqSource | null;
export function currentUqSource():UqSource|null {
  return typeof __SOLARPV_UQ_SOURCE__==='undefined'?null:__SOLARPV_UQ_SOURCE__;
}
const finite=z.number().finite();
const requestSchema=z.object({
 plantCapacityKwp:finite.positive(),batteryCapacityKwh:finite.nonnegative().optional(),inverterCapacityKw:finite.positive(),baseAnnualYieldKwh:finite.positive(),
 basePricing:z.object({moduleUsdPerWp:finite,inverterUsdPerKw:finite,batteryUsdPerKwh:finite,structureUsdPerWp:finite,cablingBopUsdPerWp:finite,substationUsdPerMva:finite,epcLaborUsdPerKw:finite,gridTariffTomanPerKwh:finite,usdToTomanRate:finite,annualOpexPctOfCapex:finite,discountRatePct:finite,tariffEscalationPct:finite,dieselAnnualServiceOpexUsd:finite,hvConnectionUsdPerKva:finite,ppaTariffTomanPerKwh:finite,landLeaseUsdPerKwpYear:finite,gridOperatorFeeUsdPerKwpYear:finite}).catchall(z.union([finite,z.string().max(500),z.boolean(),z.null()])),
 systemMode:z.enum(['powerplant','ongrid','offgrid']),sampleSize:finite.int().min(20).max(2000),seed:finite.int().min(0).max(4294967295),
 copulaFamily:z.enum(['gaussian_copula','students_t_copula']),spearmanRhoGhiSoiling:finite.min(-1).max(1),
 isBifacial:z.boolean().optional(),bifacialityFactor:finite.min(0).max(1).optional(),groundCoverRatio:finite.min(0).max(1).optional(),
}).strict();
function normalizedRequest(input:FinancialUqRunInput) {
 const normalized={...input,systemMode:input.systemMode??'powerplant',sampleSize:input.sampleSize??100,seed:input.seed??42,copulaFamily:input.copulaFamily??'gaussian_copula',spearmanRhoGhiSoiling:input.spearmanRhoGhiSoiling??-.25};
 return requestSchema.parse(normalized) as FinancialUqRunInput & {sampleSize:number};
}
function canonicalMetrics(r:FinancialUqResult) {
 return {
   energy:explicitEnergyQuantiles({enabled:true,source:'legacy_financial_cdf_v1',provenance:r.traceId,energy:r.annualGenerationMwh}),
   lcoe:financialMetricQuantiles('lcoe',r.lcoeUsdPerMwh,r.traceId),npv:financialMetricQuantiles('npv',r.npvUsd,r.traceId),
 };
}
export function uqDeterministicResultHash(result:FinancialUqResult) {
 const {traceId,...deterministic}=result;void traceId;return uqHash(deterministic);
}
export function makeFinancialUqArchive(input:FinancialUqRunInput,result:FinancialUqResult,panelContext:string,source:UqSource|null=currentUqSource()) {
 if(!source) throw new Error('UQ_SOURCE_IDENTITY_UNAVAILABLE');
 const code=UqSourceSchema.parse(source);
 if(!Object.keys(code.files).length || code.bundleSha256!==uqHash(code.files))throw new Error('UQ_SOURCE_IDENTITY_INVALID');
 const request=normalizedRequest(input);assertFinancialUqResult(result,request.sampleSize);
 const payload={schemaVersion:'financial-uq-archive-v1' as const,source:code,request,legacyResult:result,canonicalQuantiles:canonicalMetrics(result),
   runtime:{engine:typeof navigator==='undefined'?'non-browser JavaScript (not attested)':navigator.userAgent,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone},
   panelContextSha256:uqHash(panelContext),requestSha256:uqHash(request),resultSha256:uqHash(result),deterministicResultSha256:uqDeterministicResultHash(result),
   policy:'Local exploratory financial UQ snapshot. Contains pricing; treat as confidential. Hashes detect corruption, not authorship. Context hash is the financial panel snapshot, not the entire project. No research energy adoption or financial mutation.'};
 const archive={...payload,archiveSha256:uqHash(payload)};
 if(new TextEncoder().encode(JSON.stringify(archive)).length>MAX_UQ_ARCHIVE_BYTES)throw new Error('UQ_ARCHIVE_TOO_LARGE');
 return archive;
}
export type FinancialUqArchive=ReturnType<typeof makeFinancialUqArchive>;
const archiveSchema=z.object({schemaVersion:z.literal('financial-uq-archive-v1'),source:UqSourceSchema,request:requestSchema,legacyResult:z.unknown(),canonicalQuantiles:z.unknown(),runtime:z.object({engine:z.string().min(1).max(1000),timezone:z.string().min(1).max(100)}).strict(),panelContextSha256:digest,requestSha256:digest,resultSha256:digest,deterministicResultSha256:digest,policy:z.string().max(2000),archiveSha256:digest}).strict();
export function readFinancialUqArchive(text:string):FinancialUqArchive {
 const a=archiveSchema.parse(parseStudyJson(text,MAX_UQ_ARCHIVE_BYTES,'Financial UQ archive'));
 const {archiveSha256,...payload}=a;
 assertFinancialUqResult(a.legacyResult,a.request.sampleSize);
 if(archiveSha256!==uqHash(payload)||a.source.bundleSha256!==uqHash(a.source.files)||!Object.keys(a.source.files).length
  ||a.requestSha256!==uqHash(a.request)||a.resultSha256!==uqHash(a.legacyResult)||a.deterministicResultSha256!==uqDeterministicResultHash(a.legacyResult)
  ||uqHash(a.canonicalQuantiles)!==uqHash(canonicalMetrics(a.legacyResult)))throw new Error('UQ_ARCHIVE_INTEGRITY_FAILED');
 return a as FinancialUqArchive;
}
