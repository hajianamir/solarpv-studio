import {z} from 'zod';

export const ReferenceDiodeInputSchema=z.object({
  modelPolicy:z.literal('desoto_reference_bounded_v1'),
  reference:z.object({
    basis:z.literal('per_module_stc'),
    photocurrentA:z.number().finite().positive(),
    saturationCurrentA:z.number().finite().positive(),
    seriesResistanceOhm:z.number().finite().nonnegative(),
    shuntResistanceOhm:z.number().finite().positive(),
    diodeFactorV:z.number().finite().positive(),
    alphaScAperC:z.number().finite(),
    referenceCellTempC:z.literal(25),
    referenceIrradianceWm2:z.literal(1000),
    bandgapEv:z.literal(1.121),
    bandgapTemperatureCoefficientPerK:z.literal(-0.0002677),
    provenance:z.object({source:z.string().trim().min(1).max(1000),recordId:z.string().trim().min(1).max(200)}).strict(),
  }).strict(),
  conditions:z.object({
    effectiveIrradianceWm2:z.number().finite().min(0).max(1400).refine(g=>g===0||g>=50,'Supported nonzero effective irradiance is 50–1400 W/m²'),
    cellTempC:z.number().finite().min(-20).max(85),
    seriesModules:z.number().int().min(1).max(100),
  }).strict(),
  iterationLimit:z.number().int().min(1).max(128).default(128),
}).strict();
export type ReferenceDiodeRequest=z.input<typeof ReferenceDiodeInputSchema>;
export type ReferenceDiodeInput=z.infer<typeof ReferenceDiodeInputSchema>;
/** At-condition aggregate string parameters; a is explicitly nNsVth, not legacy vt. */
export const DiodeConditionParametersSchema=z.object({
  iph:z.number().finite().positive(),i0:z.number().finite().positive(),
  rs:z.number().finite().nonnegative(),rsh:z.number().finite().positive(),a:z.number().finite().positive(),
}).strict();
export type DiodeConditionParameters=z.infer<typeof DiodeConditionParametersSchema>;
export type DiodeRootTarget='voc'|'isc'|'mpp';
export type ReferenceDiodeResult=
 | {status:'unavailable';modelPolicy:'desoto_reference_bounded_v1';financialAdoptionEligible:false;reason:'invalid_input'|'numerical_domain'|'not_converged'}
 | {status:'dark';input:ReferenceDiodeInput;modelPolicy:'desoto_reference_bounded_v1';financialAdoptionEligible:false;voc:0;isc:0;vmp:0;imp:0;pmp:0}
 | {status:'available';input:ReferenceDiodeInput;modelPolicy:'desoto_reference_bounded_v1';financialAdoptionEligible:false;parameters:DiodeConditionParameters;voc:number;isc:number;vmp:number;imp:number;pmp:number;residuals:{openCircuitAmps:number;shortCircuitVolts:number;mppDerivativeAmps:number}};
