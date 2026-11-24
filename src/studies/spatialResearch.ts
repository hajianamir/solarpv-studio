import {z} from 'zod';
import {stable} from './studyComparisonGate';
const f=(a:number,b:number)=>z.number().finite().min(a).max(b),finite=z.number().finite(),hash=z.string().regex(/^[a-f0-9]{64}$/);
export const spatialOperations=['stefan_spatial'] as const;
export const StefanPlanSchema=z.object({schemaVersion:z.literal('stefan-spatial-v1'),source:z.string().trim().min(10).max(1000),contextSha256:hash,lengthM:f(.001,10),cells:f(8,512).int(),durationS:f(0,1e7),fourier:f(.01,.3),conductivityWmK:f(.001,1000),densityKgm3:f(1,30000),heatCapacityJkgK:f(1,1e5),latentHeatJkg:f(1,1e7),meltingK:f(1,3000),wallK:f(1,4000)}).strict().superRefine((p,c)=>{const dx=p.lengthM/p.cells,n=Math.ceil(p.durationS/(p.fourier*p.densityKgm3*p.heatCapacityJkgK*dx*dx/p.conductivityWmK));if(p.wallK<=p.meltingK||n>200000||n*p.cells>20000000)c.addIssue({code:'custom',message:'Melting domain or spatial/time work budget'});});
export const SpatialRequestSchema=z.discriminatedUnion('operation',[z.object({operation:z.literal('stefan_spatial'),plan:StefanPlanSchema}).strict()]);
export type SpatialRequest=z.infer<typeof SpatialRequestSchema>;
const near=(a:number,b:number)=>{if(Math.abs(a-b)>1e-9*Math.max(1,Math.abs(b)))throw new Error('Spatial constitutive/ledger witness');};
/** O(cells) witnesses, never a transient PDE solve on the UI thread.
 * Checks grid, constitutive equations, global conservation and physical bounds.
 * Does not prove the full transient PDE; convergence is qualified by offline tests.
 */
export function validateSpatialResult(value:unknown,request:SpatialRequest){
 const r=z.object({schemaVersion:z.literal('portfolio-result-v1'),algorithmVersion:z.literal('1.0.0'),plan:z.unknown(),planSha256:hash,operation:z.literal('stefan_spatial'),status:z.literal('insufficient_evidence'),validationStatus:z.literal('not_field_validated'),projectApproval:z.literal('blocked'),safetyApproval:z.literal('not_assessed'),limitations:z.array(z.string()).min(1),output:z.unknown()}).strict().parse(value);
 if(stable(r.plan)!==stable(request.plan))throw new Error('Spatial input binding');const p=request.plan,vector=z.array(finite).length(p.cells);
 const o=z.object({method:z.literal('explicit-cell-centered-enthalpy-v1'),steps:f(0,200000).int(),stepS:finite.nonnegative(),dxM:finite.positive(),xM:vector,temperatureK:vector,specificEnthalpyJkg:vector,liquidFraction:vector,equivalentMeltDepthM:finite.nonnegative(),storedJm2:finite.nonnegative(),boundaryInputJm2:finite.nonnegative(),residualJm2:finite,rightBoundary:z.literal('insulated'),initialState:z.literal('solid_at_melting_temperature'),semiInfiniteComparisonEligible:z.boolean(),scope:z.string().min(40)}).strict().parse(r.output);
 const dx=p.lengthM/p.cells,n=Math.ceil(p.durationS/(p.fourier*p.densityKgm3*p.heatCapacityJkgK*dx*dx/p.conductivityWmK));near(o.dxM,dx);if(o.steps!==n)throw new Error('Spatial time coverage');near(o.stepS,n?p.durationS/n:0);
 let enthalpy=0,liquid=0;
 for(let i=0;i<p.cells;i++){
  const h=o.specificEnthalpyJkg[i],t=o.temperatureK[i],fraction=o.liquidFraction[i];near(o.xM[i],(i+.5)*dx);
  if(h<0||t<p.meltingK||t>p.wallK+1e-8||fraction<0||fraction>1)throw new Error('Spatial phase/temperature bounds');
  near(t,p.meltingK+Math.max(h-p.latentHeatJkg,0)/p.heatCapacityJkgK);near(fraction,Math.max(0,Math.min(1,h/p.latentHeatJkg)));if(i&&h>o.specificEnthalpyJkg[i-1]+1e-8)throw new Error('Spatial monotone heating profile');enthalpy+=h;liquid+=fraction;
 }
 const stored=p.densityKgm3*dx*enthalpy,depth=dx*liquid;near(o.storedJm2,stored);near(o.equivalentMeltDepthM,depth);near(o.residualJm2,o.storedJm2-o.boundaryInputJm2);if(Math.abs(o.residualJm2)>1e-10*Math.max(1,o.storedJm2,o.boundaryInputJm2))throw new Error('Spatial energy conservation');if(o.semiInfiniteComparisonEligible!==(o.specificEnthalpyJkg[p.cells-1]===0&&depth<.5*p.lengthM))throw new Error('Spatial domain screening');
 if(p.durationS===0){near(o.storedJm2,0);near(o.boundaryInputJm2,0);}else if(o.boundaryInputJm2<=0)throw new Error('Missing boundary heating');
 return r;
}
