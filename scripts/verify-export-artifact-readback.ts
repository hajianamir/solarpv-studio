import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { unzipSync } from 'fflate';
import { createProjectTransferEnvelope, restoreProjectTransferEnvelope } from '../src/engine/offlineTransferEngine';
import { getDefaultClimateCity } from '../src/engine/climaticData';
import { buildProjectProvenanceSnapshot } from '../src/engine/provenance/projectProvenance';
import { generateDocxBlob, generateXlsxBlob } from '../src/engine/reportingEngine';

const reportCity = getDefaultClimateCity();
reportCity.peakSunHours = 4.25;
reportCity.fieldProvenance = {
  ...(reportCity.fieldProvenance ?? {}),
  peakSunHours: {
    sourceKind: 'provider_value',
    providerName: 'PVGIS',
    sourceDataset: 'PVGIS fixture dataset',
    sourceParameter: 'H(h)_m annual average',
    unit: 'kWh/m²/day',
    value: 4.25,
    retrievedAt: '2026-11-03T12:00:00.000Z',
  },
};
const dataProvenance = buildProjectProvenanceSnapshot(reportCity);
const pshProvenance = dataProvenance.find((row) => row.key === 'peakSunHours')!;

const fixture = {
  projectName: 'Read-back Verification Site',
  projectData: {
    projectName: 'Read-back Verification Site',
    systemMode: 'powerplant',
    design: { capacityKwp: 1250 },
    city: reportCity,
    siteOverrides: {},
    dataProvenance,
  },
  metadata: {
    docId: 'DOC-READBACK-2026-01',
    docVersion: 'Rev 4',
    companyName: 'Northstar Engineering',
    leadEngineer: 'Avery Engineer',
    clientName: 'Example Energy LLC',
    approvalStatus: 'Under Review',
    detailLevel: 'detailed',
    engineerNotes: 'Read-back fixture',
  },
};

const check = (label: string, fn: () => void) => {
  fn();
  console.log(`[PASS] ${label}`);
};

async function main() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'solarpv-export-readback-'));
  try {
    // DOCX: write the actual generated OOXML artifact, reopen its document part, and
    // verify report metadata plus the prepared/review/client sign-off fields survive.
    const docxBlob = await generateDocxBlob(
      `<h1>${fixture.projectName}</h1>` +
      `<p>Document ID: ${fixture.metadata.docId}</p>` +
      `<p>Version / Revision: ${fixture.metadata.docVersion}</p>` +
      `<p>Approval Status: ${fixture.metadata.approvalStatus}</p>` +
      `<p>PREPARED BY (DESIGN ENGINEER): ${fixture.metadata.leadEngineer}</p>` +
      `<p>CHECKED &amp; VERIFIED BY (P.E.): ${fixture.metadata.companyName}</p>` +
      `<p>CLIENT ACCEPTANCE &amp; APPROVAL: ${fixture.metadata.clientName}</p>` +
      `<table><tr><th>Key</th><th>Value</th><th>Unit</th><th>Provider</th></tr>` +
      `<tr><td>${pshProvenance.key}</td><td>${pshProvenance.value}</td><td>${pshProvenance.unit}</td><td>${pshProvenance.provider}</td></tr></table>`,
      { title: fixture.projectName, docId: fixture.metadata.docId },
    );
    const docxPath = path.join(tempDir, 'report.docx');
    await writeFile(docxPath, Buffer.from(await docxBlob.arrayBuffer()));
    const docxZip = unzipSync(await readFile(docxPath));
    const docxXml = new TextDecoder().decode(docxZip['word/document.xml']);
    check('DOCX OOXML opens and contains project/document/revision/approval metadata', () => {
      for (const field of [fixture.projectName, fixture.metadata.docId, fixture.metadata.docVersion, fixture.metadata.approvalStatus]) {
        assert.ok(docxXml.includes(field), `DOCX missing ${field}`);
      }
    });
    check('DOCX read-back retains the shared provenance value, unit, and source', () => {
      assert.ok(docxXml.includes(String(pshProvenance.value)));
      assert.ok(docxXml.includes(pshProvenance.unit));
      assert.ok(docxXml.includes(pshProvenance.provider));
    });
    check('DOCX read-back retains preparer, reviewer, and client sign-off names', () => {
      for (const field of [fixture.metadata.leadEngineer, fixture.metadata.companyName, fixture.metadata.clientName]) {
        assert.ok(docxXml.includes(field), `DOCX missing sign-off name ${field}`);
      }
      assert.match(docxXml, /PREPARED BY/);
      assert.match(docxXml, /VERIFIED BY/);
      assert.match(docxXml, /CLIENT ACCEPTANCE/);
    });

    // XLSX: parse the generated workbook again with ExcelJS (not just ZIP magic bytes).
    const xlsxBlob = await generateXlsxBlob([
      {
        sheetName: 'Project Summary',
        rows: [
          ['Field', 'Value'],
          ['Project Title', fixture.projectName],
          ['Document ID', fixture.metadata.docId],
          ['Version / Revision', fixture.metadata.docVersion],
          ['Approval Status', fixture.metadata.approvalStatus],
          ['Lead Engineer', fixture.metadata.leadEngineer],
          ['Checked / Verified By', fixture.metadata.companyName],
          ['Client Acceptance', fixture.metadata.clientName],
        ],
      },
      {
        sheetName: 'Data Provenance',
        rows: [
          ['Key', 'Value', 'Unit', 'Provider', 'Source Kind', 'Confidence'],
          [pshProvenance.key, pshProvenance.value, pshProvenance.unit, pshProvenance.provider, pshProvenance.sourceKind, pshProvenance.confidence],
        ],
      },
    ]);
    const xlsxBuffer = Buffer.from(await xlsxBlob.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsxBuffer as any);
    const summary = workbook.getWorksheet('Project Summary');
    assert.ok(summary, 'XLSX Project Summary sheet missing');
    const provenanceSheet = workbook.getWorksheet('Data Provenance');
    assert.ok(provenanceSheet, 'XLSX Data Provenance sheet missing');
    const pshRow = provenanceSheet!.getRow(2);
    check('XLSX read-back preserves the same provenance value, unit, and source as DOCX/JSON', () => {
      assert.equal(pshRow.getCell(1).value, pshProvenance.key);
      assert.equal(pshRow.getCell(2).value, pshProvenance.value);
      assert.equal(pshRow.getCell(3).value, pshProvenance.unit);
      assert.equal(pshRow.getCell(4).value, pshProvenance.provider);
    });
    const xlsxValues = new Map<string, string>();
    summary!.eachRow((row) => {
      xlsxValues.set(String(row.getCell(1).value), String(row.getCell(2).value));
    });
    check('XLSX round-trip preserves project, document ID, revision, and approval fields', () => {
      assert.equal(xlsxValues.get('Project Title'), fixture.projectName);
      assert.equal(xlsxValues.get('Document ID'), fixture.metadata.docId);
      assert.equal(xlsxValues.get('Version / Revision'), fixture.metadata.docVersion);
      assert.equal(xlsxValues.get('Approval Status'), fixture.metadata.approvalStatus);
    });
    check('XLSX round-trip preserves preparer, reviewer, and client sign-off names', () => {
      assert.equal(xlsxValues.get('Lead Engineer'), fixture.metadata.leadEngineer);
      assert.equal(xlsxValues.get('Checked / Verified By'), fixture.metadata.companyName);
      assert.equal(xlsxValues.get('Client Acceptance'), fixture.metadata.clientName);
    });

    // JSON: serialize the actual versioned transfer envelope, parse it back, and
    // verify the envelope contract, full project fields, revision, and sign-off metadata.
    const envelope = createProjectTransferEnvelope(fixture);
    const jsonPath = path.join(tempDir, 'project.solarpv.json');
    await writeFile(jsonPath, JSON.stringify(envelope, null, 2));
    const readBack = JSON.parse(await readFile(jsonPath, 'utf8'));
    check('JSON envelope read-back preserves format/schema, project fields, and revision metadata', () => {
      assert.equal(readBack.format, 'solarpv_project_envelope');
      assert.equal(readBack.schemaVersion, '3.1.0');
      assert.equal(readBack.projectData.projectName, fixture.projectName);
      assert.equal(readBack.projectData.design.capacityKwp, 1250);
      assert.equal(readBack.metadata.docId, fixture.metadata.docId);
      assert.equal(readBack.metadata.docVersion, fixture.metadata.docVersion);
      assert.equal(readBack.metadata.approvalStatus, fixture.metadata.approvalStatus);
      const jsonPsh = readBack.projectData.dataProvenance.find((row: { key: string }) => row.key === 'peakSunHours');
      assert.equal(jsonPsh.value, pshProvenance.value);
      assert.equal(jsonPsh.unit, pshProvenance.unit);
      assert.equal(jsonPsh.provider, pshProvenance.provider);
    });
    check('JSON envelope read-back preserves engineer/company/client sign-off metadata', () => {
      assert.equal(readBack.metadata.leadEngineer, fixture.metadata.leadEngineer);
      assert.equal(readBack.metadata.companyName, fixture.metadata.companyName);
      assert.equal(readBack.metadata.clientName, fixture.metadata.clientName);
      assert.equal(readBack.metadata.engineerNotes, fixture.metadata.engineerNotes);
    });
    const restored = restoreProjectTransferEnvelope(readBack);
    check('Re-import of the real serialized JSON restores site coordinates, PSH, and override scope', () => {
      assert.equal(restored.success, true, restored.migrationResult.warnings.join('; '));
      assert.equal(restored.project.city.latitude, reportCity.latitude);
      assert.equal(restored.project.city.longitude, reportCity.longitude);
      assert.equal(restored.project.city.peakSunHours, reportCity.peakSunHours);
      assert.deepEqual(restored.project.siteOverrides, {});
    });

    console.log('Export artifact read-back verification: all checks PASS (DOCX, XLSX, JSON + re-import)');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('[FAIL] Export artifact read-back verification failed:', error);
  process.exitCode = 1;
});
