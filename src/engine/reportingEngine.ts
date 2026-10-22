// Advanced Engineering Report Generator & Multi-Format Exporter
// Generates professional Dossiers, HTML-based Word (.doc), and multi-sheet XML-based Excel (.xls)

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

// ----------------------------------------------------
// Export to Formatted Word (.doc HTML-compatible)
// ----------------------------------------------------
export function exportToWordDocument(
  htmlContent: string,
  filename: string = 'SolarPV_Engineering_Report.doc'
): void {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>SolarPV Engineering Dossier</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; }
        h1 { font-size: 20pt; color: #0284c7; border-bottom: 2pt solid #0284c7; padding-bottom: 6pt; margin-top: 18pt; }
        h2 { font-size: 14pt; color: #0f172a; border-bottom: 1pt solid #cbd5e1; padding-bottom: 4pt; margin-top: 14pt; }
        h3 { font-size: 12pt; color: #334155; margin-top: 10pt; }
        table { border-collapse: collapse; width: 100%; margin: 12pt 0; font-size: 10pt; }
        th { background-color: #f1f5f9; color: #0f172a; border: 1pt solid #cbd5e1; padding: 6pt 8pt; text-align: left; }
        td { border: 1pt solid #e2e8f0; padding: 5pt 8pt; }
        .badge { background-color: #e0f2fe; color: #0369a1; padding: 2pt 6pt; border-radius: 4pt; font-weight: bold; }
        .page-break { page-break-before: always; }
        .meta-box { background-color: #f8fafc; border: 1pt solid #e2e8f0; padding: 12pt; border-radius: 6pt; margin-bottom: 16pt; }
        .footer { font-size: 8pt; color: #64748b; text-align: center; margin-top: 30pt; border-top: 1pt solid #e2e8f0; padding-top: 8pt; }
      </style>
    </head>
    <body>
  `;
  const footer = '</body></html>';
  const fullHtml = header + htmlContent + footer;

  const blob = new Blob(['\ufeff', fullHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------
// Export Multi-Table Structured Excel (.xls XML Format)
// ----------------------------------------------------
export function exportToExcelWorkbook(
  sheets: { sheetName: string; rows: (string | number)[][] }[],
  filename: string = 'SolarPV_EPC_Data.xls'
): void {
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
    xml += `<Worksheet ss:Name="${sheet.sheetName.replace(/[:\\/?*[\]]/g, '_').substring(0, 31)}">
      <Table>`;
    for (let r = 0; r < sheet.rows.length; r++) {
      const row = sheet.rows[r];
      const styleAttr = r === 0 ? ' ss:StyleID="Header"' : '';
      xml += '<Row>';
      for (const cell of row) {
        const val = cell ?? '';
        const isNum = typeof val === 'number';
        xml += `<Cell${styleAttr}><Data ss:Type="${isNum ? 'Number' : 'String'}">${val}</Data></Cell>`;
      }
      xml += '</Row>';
    }
    xml += `</Table></Worksheet>`;
  }

  xml += '</Workbook>';

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
