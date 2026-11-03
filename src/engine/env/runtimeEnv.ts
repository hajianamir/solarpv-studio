/**
 * Cross-runtime environment flag reader.
 * Works in Node (scripts/tsx, Express) and in the browser (Vite).
 * Never throws. Returns `false` when the flag cannot be read.
 */
export function isRealInternetEnabled(): boolean {
  // Node / server context
  try {
    // @ts-ignore - `process` may not exist in the browser
    if (typeof process !== 'undefined' && process?.env?.REAL_INTERNET === 'true') {
      return true;
    }
  } catch {
    /* ignore */
  }
  // Browser / Vite context
  try {
    // @ts-ignore - `import.meta.env` is Vite-specific and may be undefined
    const meta = import.meta as any;
    if (meta?.env?.VITE_REAL_INTERNET === 'true') {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
