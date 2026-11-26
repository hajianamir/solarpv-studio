import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import ExcelJS from 'exceljs';

// Exercise the overridden libraries through ExcelJS, not just their own APIs.
const directory = await mkdtemp(path.join(tmpdir(), 'solarpv-dependencies-'));
try {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('داده CSV');
  const rows = [
    ['نام', 'توان kW', 'توضیح', 'صفر'],
    ['تهران', 12.75, 'comma, quote " and\nnewline', 0],
    ['Unicode ☀', -2.5, 'plain', 0],
  ];
  sheet.addRows(rows);
  const csv = await workbook.csv.writeBuffer({sheetId: sheet.id});
  const restored = new ExcelJS.Workbook();
  const csvSheet = await restored.csv.read(Readable.from([csv]), {sheetName: 'CSV'});
  assert.deepEqual(csvSheet.getSheetValues().slice(1).map(row => (row as unknown[]).slice(1)), rows);
  await assert.rejects(new ExcelJS.Workbook().csv.read(Readable.from(['"unterminated']), {}));

  // Streaming reader uses unzipper (ordinary buffer loading uses jszip).
  const file = path.join(directory, 'stream.xlsx');
  const writer = new ExcelJS.stream.xlsx.WorkbookWriter({filename: file, useSharedStrings: true, useStyles: true});
  const streamed = writer.addWorksheet('داده');
  rows.forEach(row => streamed.addRow(row).commit());
  streamed.commit();
  await writer.commit();
  const actual: unknown[][] = [];
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, {sharedStrings: 'cache', worksheets: 'emit'});
  for await (const worksheet of reader) {
    for await (const row of worksheet) actual.push((row.values as unknown[]).slice(1));
  }
  assert.deepEqual(actual, rows);
  const ordinary = new ExcelJS.Workbook();
  await ordinary.xlsx.readFile(file);
  assert.equal(ordinary.worksheets[0].getCell('B2').value, 12.75);
  assert.equal(ordinary.worksheets[0].getCell('D2').value, 0);

  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  for (const [name, entry] of Object.entries(lock.packages) as [string, {deprecated?: string}][]) {
    assert.ok(!entry.deprecated, `${name}: ${entry.deprecated}`);
    assert.ok(!/node_modules\/(rimraf|fstream|lodash\.isequal)$/.test(name), name);
  }
  console.log('PASS: Unicode/quoted multiline CSV, malformed CSV rejection, streaming XLSX/unzipper, ordinary XLSX, numeric/zero fidelity, no deprecated lockfile entries.');
} finally {
  await rm(directory, {recursive: true, force: true});
}
