import {z} from 'zod';
import raw from './manifest.json';
const paths=z.array(z.string().regex(/^(src|services|scripts)\/[\w./-]+$/).refine(p=>!p.includes('..')));
export const CapabilityManifestSchema=z.object({schemaVersion:z.literal('capability-manifest-v1'),capabilities:z.array(z.object({id:z.string().regex(/^[NR]\d{2}$/),title:z.string().min(1),classification:z.enum(['research','operational']),maturity:z.enum(['partial','planned']),limitations:z.string().min(1),executors:paths,ui:paths,tests:paths,evidenceLevel:z.literal('not_field_validated'),evidenceScope:z.string().min(1)}).strict()).length(33),externalBlockers:z.array(z.string().min(1)).min(1)}).strict().superRefine((m,c)=>{
 const expected=[...Array.from({length:18},(_,i)=>`N${String(i+1).padStart(2,'0')}`),...Array.from({length:15},(_,i)=>`R${String(i+1).padStart(2,'0')}`)];
 if(new Set(m.capabilities.map(r=>r.id)).size!==33||expected.some(id=>!m.capabilities.some(r=>r.id===id)))c.addIssue({code:'custom',message:'Exact audited capability coverage required'});
 for(const r of m.capabilities){if(r.classification!==(r.id.startsWith('R')?'research':'operational')||(r.maturity==='planned'&&r.executors.length)||(r.maturity==='partial'&&!r.executors.length))c.addIssue({code:'custom',message:`Inconsistent capability ${r.id}`});}
});
export function capabilityManifest(enabled:boolean){return enabled?CapabilityManifestSchema.parse(raw):null;}
