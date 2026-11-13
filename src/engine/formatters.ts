/** Presentation-only formatters. Never feed their string results back into calculations or project data. */
export function formatPsh(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '—';
}
