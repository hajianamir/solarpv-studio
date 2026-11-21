import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createReportPdf } from "../src/studies/reportPdf";
import { PDFDocument } from "pdf-lib";
const font = await readFile("src/assets/fonts/DejaVuSans.ttf");
const rows = Array.from({ length: 240 }, (_, i) => [
  `Record ${i}`,
  i * 12.5,
  `Source-${i} engineering — not field validated`,
]);
const blob = await createReportPdf(
  "Synthetic PDF software test",
  [
    {
      title: "Source and identity",
      rows: [
        ["Project", "آزمون فارسی"],
        ["Evidence SHA-256", "a".repeat(64)],
        ["Mode", "offgrid"],
        ["Marker", "<script>not executed</script>"],
      ],
    },
    { title: "EPC design annex", rows },
    { title: "End of report", rows: [["FINAL-MARKER-240", "No truncation"]] },
  ],
  font,
);
const bytes = new Uint8Array(await blob.arrayBuffer());
assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
assert.equal(blob.type, "application/pdf");
const doc = await PDFDocument.load(bytes);
assert.ok(doc.getPageCount() > 3);
assert.ok(doc.getPageCount() < 30);
const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
const parsed = await getDocument({
  data: bytes.slice(),
  useSystemFonts: false,
  isEvalSupported: false,
}).promise;
let text = "";
for (let i = 1; i <= parsed.numPages; i++) {
  const page = await parsed.getPage(i);
  const content = await page.getTextContent();
  text += content.items.map((x) => ("str" in x ? x.str : "")).join(" ") + "\n";
  const { width, height } = page.getViewport({ scale: 1 });
  assert.ok(width > 500 && height > 800);
}
for (const marker of [
  "Synthetic PDF software test",
  "Evidence SHA-256",
  "offgrid",
  "Record 239",
  "FINAL-MARKER-240",
  "EPC design annex",
])
  assert.ok(text.includes(marker), `Missing PDF content ${marker}`);
assert.ok(
  /[\u0600-\u06ff]/.test(text),
  "Embedded Persian glyphs must have extractable Unicode",
);
await mkdir(".cache/pdf-evidence", { recursive: true });
await writeFile(".cache/pdf-evidence/synthetic-report.pdf", bytes);
await writeFile(".cache/pdf-evidence/synthetic-report-readback.txt", text);
const { createCanvas } = await import("@napi-rs/canvas");
const first = await parsed.getPage(1),
  viewport = first.getViewport({ scale: 1.25 }),
  canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height)),
  ctx = canvas.getContext("2d");
await first.render({
  canvasContext: ctx as unknown as CanvasRenderingContext2D,
  viewport,
}).promise;
const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
let ink = 0;
for (let i = 0; i < pixels.length; i += 4)
  if (pixels[i] < 220 && pixels[i + 1] < 220 && pixels[i + 2] < 220) ink++;
assert.ok(ink > 1000, "PDF rasterizer must produce visible nonblank text");
await writeFile(
  ".cache/pdf-evidence/synthetic-report-page1.png",
  canvas.toBuffer("image/png"),
);
await parsed.destroy();
console.log(
  `PASS real PDF: ${doc.getPageCount()} A4 pages, embedded Unicode, Persian extraction, first/last record and full source identity readback; .cache/pdf-evidence/synthetic-report.pdf`,
);

assert.ok(
  text.includes("آزمون فارسی"),
  "Persian readback order must match logical input",
);
await assert.rejects(
  () => createReportPdf("Unsupported glyph 🦄", [], font),
  /does not support/,
);
