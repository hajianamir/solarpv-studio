// Advanced Engineering Report Generator & Multi-Format Exporter
// Generates professional Dossiers, true OOXML Word (.docx via docx), and true OOXML Excel (.xlsx via exceljs) (OUT-04)

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  BorderStyle,
  WidthType,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import ExcelJS from 'exceljs';

export interface ReportCompanyMeta {
  companyName: string;
  leadEngineer: string;
  clientName: string;
  projectTitle: string;
  documentId: string;
  version: string;
  approvalStatus: 'Draft' | 'Under Review' | 'Approved' | 'As-Built';
  logoBase64?: string;
  reportDate: string;
  detailLevel: 'summary' | 'standard' | 'detailed';
  includedSections: {
    projectSummary: boolean;
    siteClimate: boolean;
    shadingAnalysis: boolean;
    energyYield: boolean;
    electricalDesign: boolean;
    structuralFoundation: boolean;
    financialAnalysis: boolean;
    bomSchedule: boolean;
  };
  customNotes?: {
    summaryNote?: string;
    climateNote?: string;
    shadingNote?: string;
    energyNote?: string;
    electricalNote?: string;
    structuralNote?: string;
    financialNote?: string;
    bomNote?: string;
  };
}

/**
 * Parses raw text or basic HTML strings into structured docx elements.
 */
export function parseHtmlToDocxElements(html: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // If running in browser environment with DOMParser available
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstElementChild || doc.body;

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          elements.push(
            new Paragraph({
              children: [new TextRun({ text, font: 'Segoe UI', size: 20 })],
              spacing: { after: 60 },
            })
          );
        }
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'h1') {
          elements.push(
            new Paragraph({
              text: el.textContent?.trim() || '',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            })
          );
        } else if (tag === 'h2') {
          elements.push(
            new Paragraph({
              text: el.textContent?.trim() || '',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 180, after: 90 },
            })
          );
        } else if (tag === 'h3') {
          elements.push(
            new Paragraph({
              text: el.textContent?.trim() || '',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 120, after: 60 },
            })
          );
        } else if (tag === 'p') {
          const text = el.textContent?.trim();
          if (text) {
            elements.push(
              new Paragraph({
                children: [new TextRun({ text, font: 'Segoe UI', size: 21 })],
                spacing: { after: 100 },
              })
            );
          }
        } else if (tag === 'table') {
          const rows: TableRow[] = [];
          const trs = el.querySelectorAll('tr');
          trs.forEach((tr, rIdx) => {
            const cells: TableCell[] = [];
            const tds = tr.querySelectorAll('th, td');
            tds.forEach((td) => {
              const cellText = td.textContent?.trim() || '';
              cells.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cellText,
                          bold: rIdx === 0 || td.tagName.toLowerCase() === 'th',
                          font: 'Segoe UI',
                          size: 19,
                        }),
                      ],
                    }),
                  ],
                  shading: rIdx === 0 ? { fill: '0284C7', color: 'FFFFFF' } : undefined,
                  margins: { top: 80, bottom: 80, left: 100, right: 100 },
                })
              );
            });
            if (cells.length > 0) {
              rows.push(new TableRow({ children: cells }));
            }
          });

          if (rows.length > 0) {
            elements.push(
              new Table({
                rows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
          }
        } else {
          // If leaf container (e.g. metadata-bar item with no nested block elements), capture as paragraph
          const hasBlockChildren = Array.from(el.children).some((c) =>
            ['h1', 'h2', 'h3', 'p', 'table', 'div'].includes(c.tagName.toLowerCase())
          );
          if (!hasBlockChildren && el.textContent?.trim()) {
            elements.push(
              new Paragraph({
                children: [new TextRun({ text: el.textContent.trim(), font: 'Segoe UI', size: 20 })],
                spacing: { after: 80 },
              })
            );
            return;
          }

          // Process child nodes
          for (let i = 0; i < el.childNodes.length; i++) {
            walk(el.childNodes[i]);
          }
        }
      }
    };

    walk(container);
  }

  // Fallback if no elements were produced (or SSR environment)
  if (elements.length === 0) {
    const plainLines = html.replace(/<[^>]+>/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of plainLines) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: line, font: 'Segoe UI', size: 21 })],
          spacing: { after: 100 },
        })
      );
    }
  }

  return elements;
}

/**
 * Builds a true OOXML .docx Document object with headers, footers, and styles.
 */
export function buildWordDocument(
  htmlContent: string,
  options?: { title?: string; docId?: string }
): Document {
  const children = parseHtmlToDocxElements(htmlContent);

  return new Document({
    title: options?.title || 'SolarPV Engineering Dossier',
    description: 'Comprehensive EPC Engineering & Feasibility Report generated by SolarPV Studio',
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: options?.title || 'SolarPV Studio Pro — Engineering Dossier',
                    size: 16,
                    color: '64748B',
                    font: 'Segoe UI',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Segoe UI',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                    font: 'Segoe UI',
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Segoe UI',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                    font: 'Segoe UI',
                  }),
                ],
              }),
            ],
          }),
        },
        children: children.length > 0 ? children : [new Paragraph({ text: 'SolarPV Engineering Report' })],
      },
    ],
  });
}

/**
 * Generates true OOXML (.docx) Blob using docx library (OUT-04).
 */
export async function generateDocxBlob(
  htmlContent: string,
  options?: { title?: string; docId?: string }
): Promise<Blob> {
  const doc = buildWordDocument(htmlContent, options);
  return await Packer.toBlob(doc);
}

/**
 * Export to genuine OOXML Word Document (.docx)
 */
export async function exportToWordDocument(
  htmlContent: string,
  filename: string = 'SolarPV_Engineering_Report.docx'
): Promise<Blob> {
  const cleanName = filename.endsWith('.docx')
    ? filename
    : `${filename.replace(/\.[^/.]+$/, '')}.docx`;

  const blob = await generateDocxBlob(htmlContent, { title: cleanName });

  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return blob;
}

/**
 * Generates true OOXML (.xlsx) Blob using exceljs library (OUT-04).
 */
export async function generateXlsxBlob(
  sheets: { sheetName: string; rows: (string | number | boolean | null | undefined)[][] }[]
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SolarPV Studio Engineering Platform';
  workbook.created = new Date();

  for (const sheet of sheets) {
    const sanitizedSheetName = sheet.sheetName.replace(/[:\\/?*[\]]/g, '_').substring(0, 31);
    const ws = workbook.addWorksheet(sanitizedSheetName);

    for (let rIdx = 0; rIdx < sheet.rows.length; rIdx++) {
      const rowData = sheet.rows[rIdx].map((cell) => (cell === null || cell === undefined ? '' : cell));
      const row = ws.addRow(rowData);

      if (rIdx === 0) {
        row.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0284C7' },
        };
      }
    }

    // Auto-fit column widths
    ws.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const str = String(cell.value ?? '');
        if (str.length > maxLen) maxLen = Math.min(50, str.length);
      });
      col.width = maxLen + 3;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Export Multi-Table Structured Excel (.xlsx OOXML Format)
 */
export async function exportToExcelWorkbook(
  sheets: { sheetName: string; rows: (string | number | boolean | null | undefined)[][] }[],
  filename: string = 'SolarPV_EPC_Data.xlsx'
): Promise<Blob> {
  const cleanName = filename.endsWith('.xlsx')
    ? filename
    : `${filename.replace(/\.[^/.]+$/, '')}.xlsx`;

  const blob = await generateXlsxBlob(sheets);

  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return blob;
}

// ----------------------------------------------------
// XML Special Characters Escaping Helper (Compatibility)
// ----------------------------------------------------
export function escapeXml(str: string): string {
  if (typeof str !== 'string') str = String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ----------------------------------------------------
// Export Multi-Table Structured Excel (.xls XML Legacy Compatibility)
// ----------------------------------------------------
export function buildExcelWorkbookXml(
  sheets: { sheetName: string; rows: (string | number | boolean | null | undefined)[][] }[]
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:html="http://www.w3.org/TR/REC-html40">
    <Styles>
      <Style ss:ID="Default" ss:Name="Normal">
        <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
      </Style>
      <Style ss:ID="Header">
        <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
        <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
        </Borders>
      </Style>
      <Style ss:ID="Title">
        <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#0284C7"/>
      </Style>
    </Styles>
  `;

  for (const sheet of sheets) {
    const sanitizedSheetName = escapeXml(sheet.sheetName.replace(/[:\\/?*[\]]/g, '_').substring(0, 31));
    xml += `<Worksheet ss:Name="${sanitizedSheetName}">
      <Table>`;
    for (let r = 0; r < sheet.rows.length; r++) {
      const row = sheet.rows[r];
      const styleAttr = r === 0 ? ' ss:StyleID="Header"' : '';
      xml += '<Row>';
      for (const cell of row) {
        const val = cell ?? '';
        const isNum = typeof val === 'number' && Number.isFinite(val);
        const dataVal = isNum ? val : escapeXml(String(val));
        xml += `<Cell${styleAttr}><Data ss:Type="${isNum ? 'Number' : 'String'}">${dataVal}</Data></Cell>`;
      }
      xml += '</Row>';
    }
    xml += `</Table></Worksheet>`;
  }

  xml += '</Workbook>';
  return xml;
}
