import {z} from 'zod';
import {validateResult} from './studyWorkflow';
import {runStudyValidation,studyValidationHtml} from './studyValidation';
import {canonicalBundleJson} from './studyExchange';
import {weatherSha256} from './declaredWeatherAdapter';
import {studyTimestamp} from './studyTime';
export const MAX_PROTOCOL_BYTES=256*1024;
const digest=(value:unknown)=>weatherSha256(canonicalBundleJson(value));
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const text=z.string().min(1).max(500).refine(s=>!!s.trim(),'Nonblank protocol metadata required');
export const ProtocolMetadataSchema=z.object({protocolId:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),reviewer:text,revision:z.number().int().min(1).max(100000),createdAt:studyTimestamp,changeReason:text,previousPackageSha256:hash.optional()}).strict().superRefine((m,ctx)=>{if((m.revision===1)!==(m.previousPackageSha256===undefined))ctx.addIssue({code:'custom',message:'Revision 1 has no predecessor; later revisions require previousPackageSha256 (an unverified history link)'});});
export type ProtocolMetadata=z.infer<typeof ProtocolMetadataSchema>;
const packageSchema=z.object({schemaVersion:z.literal('study-protocol-package-v1'),checksumFormat:z.literal('sorted-key-json-sha256-v1'),validationStatus:z.literal('not_field_validated'),metadata:ProtocolMetadataSchema,resultSha256:hash,reportSha256:hash,report:z.unknown(),packageSha256:hash}).strict();
const bounded=(value:unknown)=>{if(new TextEncoder().encode(JSON.stringify(value)).length>MAX_PROTOCOL_BYTES)throw new Error('Protocol package exceeds 256 KiB');};
export function makeStudyProtocol(rawResult:unknown,rawPlan:unknown,metadata:unknown){
 const result=validateResult(rawResult),report=runStudyValidation(result,rawPlan);
 const payload={schemaVersion:'study-protocol-package-v1' as const,checksumFormat:'sorted-key-json-sha256-v1' as const,validationStatus:'not_field_validated' as const,metadata:ProtocolMetadataSchema.parse(metadata),resultSha256:digest(result),reportSha256:digest(report),report};
 const pkg={...payload,packageSha256:digest(payload)};bounded(pkg);return pkg;
}
/** No saved report is trusted: verify the exact result, then recompute and compare the full report. */
export function validateStudyProtocol(rawResult:unknown,rawPackage:unknown){
 bounded(rawPackage);const pkg=packageSchema.parse(rawPackage),{packageSha256,...payload}=pkg;
 if(digest(payload)!==packageSha256||digest(pkg.report)!==pkg.reportSha256)throw new Error('Protocol package/report checksum mismatch');
 const result=validateResult(rawResult);
 if(digest(result)!==pkg.resultSha256)throw new Error('Protocol belongs to a different exact study result; reruns may differ even with identical inputs');
 const saved=z.object({plan:z.unknown()}).passthrough().parse(pkg.report);
 const recomputed=makeStudyProtocol(result,saved.plan,pkg.metadata);
 if(canonicalBundleJson(recomputed)!==canonicalBundleJson(pkg))throw new Error('Protocol report differs from recomputed analysis');
 return recomputed;
}
export function readStudyProtocol(rawResult:unknown,text:string){if(new TextEncoder().encode(text).length>MAX_PROTOCOL_BYTES)throw new Error('Protocol file exceeds 256 KiB');return validateStudyProtocol(rawResult,JSON.parse(text));}
export function studyProtocolHtml(pkg:ReturnType<typeof makeStudyProtocol>){
 // Generation accepts only packages produced/verified by the functions above; exports are not signed.
 const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 return studyValidationHtml(pkg.report).replace('</html>',`<h2>Protocol traceability — caller declarations only</h2><p>No authenticated reviewer, trusted timestamp, digital signature, independent preregistration or verified append-only history. Keep the exact study JSON and protocol JSON together.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(JSON.stringify({...pkg,report:'See recomputed report above and companion protocol JSON'},null,2))}</pre></html>`);
}
