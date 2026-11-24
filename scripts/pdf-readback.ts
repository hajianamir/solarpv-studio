import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
export async function readbackPdf(bytes: Uint8Array) {
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() > 0);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
    isEvalSupported: false,
  }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text +=
      content.items.map((x) => ("str" in x ? x.str : "")).join(" ") + "\n";
  }
  assert.equal(pdf.numPages, document.getPageCount());
  await pdf.destroy();
  return {
    pages: document.getPageCount(),
    text,
    compact: text.replace(/\s/g, ""),
  };
}
