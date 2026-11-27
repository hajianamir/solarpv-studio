/** Elementary steady-state voltage-drop screen, not a cable impedance model.
 * Schneider Electrical Installation Guide 2010, chapter G, voltage-drop equations.
 * R is calculated from supplied effective conductivity and equal-sharing total area.
 * AC X is the supplied EQUIVALENT circuit reactance per metre, not automatically X/N.
 * Inductive lagging PF only. External source must establish arrangement and frequency.
 */
export interface CableDropInput {
  isDc: boolean;
  isThreePhase?: boolean;
  oneWayLengthM: number;
  designCurrentAmps: number;
  powerFactor?: number;
  equivalentReactanceOhmPerM?: number;
}
export function candidateVoltageDropVolts(input: CableDropInput, effectiveConductivity: number, sectionMm2: number, runs: number): number {
  const resistance = 1 / (effectiveConductivity * sectionMm2 * runs);
  const multiplier = input.isDc || !input.isThreePhase ? 2 : Math.sqrt(3);
  const pf = input.isDc ? 1 : (input.powerFactor ?? 0.95);
  const reactance = input.isDc ? 0 : (input.equivalentReactanceOhmPerM ?? 0.00008);
  return multiplier * input.oneWayLengthM * input.designCurrentAmps
    * (resistance * pf + reactance * Math.sqrt(1 - pf * pf));
}
