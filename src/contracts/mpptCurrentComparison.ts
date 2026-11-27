/** Input-domain guard for per-channel current comparison, not rating evidence. */
export function requireMpptCurrentComparison(strings:number,moduleCurrentAmps:number,ratingAmps:number):void {
  if(!Number.isInteger(strings)||strings<0||!Number.isFinite(moduleCurrentAmps)||moduleCurrentAmps<0||!Number.isFinite(ratingAmps)||ratingAmps<=0)throw new RangeError('MPPT current comparison requires nonnegative integer strings, finite nonnegative module current and a finite positive rating.');
}
