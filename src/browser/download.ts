/** Browser delivery adapter. No model equations or engineering parameters live here. */
export function downloadBlob(blob: Blob, filename: string) {
  if (typeof document === "undefined") throw new Error("Download requires a browser document");
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    // Keep the native navigation's Blob alive; release the resource after one minute.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  } finally {
    link.remove();
  }
}
