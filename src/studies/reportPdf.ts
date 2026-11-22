import bidiFactory from "bidi-js";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
const bidi = bidiFactory();
/** Shape directional runs separately: a Latin label must not force Persian glyphs into Latin layout. */
export function pdfVisualRuns(text: string) {
  if (!text) return { runs: [], rtl: false };
  const embedding = bidi.getEmbeddingLevels(text),
    mirrors = bidi.getMirroredCharactersMap(text, embedding.levels),
    groups: { start: number; text: string }[] = [],
    membership: number[] = [];
  let previous = -1;
  for (let i = 0; i < text.length; i++) {
    const level = embedding.levels[i];
    if (level !== previous) {
      groups.push({ start: i, text: "" });
      previous = level;
    }
    groups[groups.length - 1].text += mirrors.get(i) ?? text[i];
    membership[i] = groups.length - 1;
  }
  const seen = new Set<number>(),
    runs: string[] = [];
  for (const i of bidi.getReorderedIndices(text, embedding)) {
    const group = membership[i];
    if (!seen.has(group)) {
      seen.add(group);
      runs.push(groups[group].text);
    }
  }
  return { runs, rtl: Boolean(embedding.paragraphs[0]?.level % 2) };
}
export type PdfSection = { title: string; rows: unknown[][] };
/** Real paginated vector PDF; bundled Unicode font, no print dialog/server/external font dependency. */
export async function createReportPdf(
  title: string,
  sections: PdfSection[],
  fontBytes?: Uint8Array,
) {
  if (!fontBytes) {
    const response = await fetch(
      new URL("../assets/fonts/DejaVuSans.ttf", import.meta.url),
    );
    if (!response.ok) throw new Error("Bundled PDF font unavailable");
    fontBytes = new Uint8Array(await response.arrayBuffer());
  }
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle(title);
  doc.setAuthor("SolarPV Studio");
  doc.setSubject("Engineering scenario — not field validated");
  const width = 595.28,
    height = 841.89,
    margin = 38,
    size = 9,
    lineHeight = 14,
    available = width - margin * 2;
  let page = doc.addPage([width, height]),
    y = height - margin;
  const line = (text: string, heading = false) => {
    if (y < margin + 24) {
      page = doc.addPage([width, height]);
      y = height - margin;
    }
    const layout = pdfVisualRuns(text),
      fontSize = heading ? 11 : size;
    const total = layout.runs.reduce(
      (v, r) => v + font.widthOfTextAtSize(r, fontSize),
      0,
    );
    let x = layout.rtl ? width - margin - total : margin;
    for (const run of layout.runs) {
      page.drawText(run, {
        x,
        y,
        font,
        size: fontSize,
        color: rgb(0.08, 0.1, 0.15),
      });
      x += font.widthOfTextAtSize(run, fontSize);
    }
    y -= heading ? 20 : lineHeight;
  };
  let lines = 0;
  const supported = new Set(font.getCharacterSet());
  const wrap = (text: string, heading = false) => {
    // No silent omission: explicitly fail if a report exceeds the export resource budget.
    for (const paragraph of text
      .replace(/[\r\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
      .split("\n")) {
      let value = "";
      for (const char of paragraph) {
        if (!supported.has(char.codePointAt(0)!))
          throw new Error(
            `PDF font does not support U+${char.codePointAt(0)!.toString(16)}; export JSON to preserve all characters`,
          );
        const next = value + char;
        if (
          pdfVisualRuns(next).runs.reduce(
            (v, r) => v + font.widthOfTextAtSize(r, heading ? 11 : size),
            0,
          ) > available &&
          value
        ) {
          line(value, heading);
          if (++lines > 10000) throw new Error("PDF exceeds 10000 lines");
          value = char;
        } else value = next;
      }
      line(value || " ", heading);
      if (++lines > 10000) throw new Error("PDF exceeds 10000 lines");
    }
  };
  wrap(title, true);
  wrap("MODELED ENGINEERING SCENARIO — NOT FIELD VALIDATED");
  for (const section of sections) {
    y -= 8;
    wrap(section.title, true);
    for (const row of section.rows)
      wrap(
        row
          .map((v) =>
            v === undefined || v === null
              ? "Not supplied"
              : typeof v === "object"
                ? JSON.stringify(v)
                : String(v),
          )
          .join(" | "),
      );
  }
  const pages = doc.getPages();
  pages.forEach((p, i) =>
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: margin,
      y: 20,
      font,
      size: 8,
    }),
  );
  return new Blob([new Uint8Array(await doc.save()).buffer], {
    type: "application/pdf",
  });
}
