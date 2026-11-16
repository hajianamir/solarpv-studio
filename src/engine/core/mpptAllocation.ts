/**
 * MPPT string-to-channel allocation used by sizing and compatibility checks.
 *
 * When the physical wiring is not supplied, strings are assigned round-robin to
 * describe an explicit, balanced proposed layout. Callers must not treat that
 * assumed layout as evidence of an existing installation's wiring; supply the
 * actual per-channel counts to assess an installed/committed design.
 */
export interface MpptStringAllocation {
  stringsPerChannel: number[];
  maxStringsPerChannel: number;
  isAssumed: boolean;
  isValid: boolean;
}

export function allocateStringsToMpptChannels(
  totalStrings: number,
  channelCount: number,
  specifiedAllocation?: readonly number[],
): MpptStringAllocation {
  const validDimensions = Number.isInteger(totalStrings)
    && totalStrings >= 0
    && Number.isInteger(channelCount)
    && channelCount >= 1;

  if (!validDimensions) {
    return { stringsPerChannel: [], maxStringsPerChannel: 0, isAssumed: specifiedAllocation === undefined, isValid: false };
  }

  if (specifiedAllocation !== undefined) {
    const allocation = [...specifiedAllocation];
    const isValid = allocation.length === channelCount
      && allocation.every((count) => Number.isInteger(count) && count >= 0)
      && allocation.reduce((sum, count) => sum + count, 0) === totalStrings;
    return {
      stringsPerChannel: allocation,
      maxStringsPerChannel: isValid ? Math.max(0, ...allocation) : 0,
      isAssumed: false,
      isValid,
    };
  }

  const allocation = Array.from({ length: channelCount }, () => 0);
  for (let stringIndex = 0; stringIndex < totalStrings; stringIndex += 1) {
    allocation[stringIndex % channelCount] += 1;
  }
  return {
    stringsPerChannel: allocation,
    maxStringsPerChannel: Math.max(0, ...allocation),
    isAssumed: true,
    isValid: true,
  };
}
