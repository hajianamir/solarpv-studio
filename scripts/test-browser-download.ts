import assert from "node:assert/strict";
import { downloadBlob } from "../src/browser/download";
// Independent fake DOM / clock contract: no blob URL may be revoked during click;
// each delivered or failed export must eventually release its resource and anchor.
const globals = globalThis as unknown as Record<string, unknown>;
const oldDocument = globals.document;
const create = URL.createObjectURL, revoke = URL.revokeObjectURL, timer = globalThis.setTimeout;
const events: string[] = [];
let callback: (() => void) | undefined, deadline: number | undefined, fail = false;
const anchor = { href: "", download: "", click() {
  events.push('click'); assert.ok(!events.includes('revoke'));
  if (fail) throw new Error('Independent click failure');
}, remove() { events.push('remove'); } };
try {
  globals.document = { createElement: (tag: string) => { assert.equal(tag, 'a'); return anchor; },
    body: { appendChild: (link: unknown) => { assert.equal(link, anchor); events.push('append'); } } };
  URL.createObjectURL = () => { events.push('create'); return 'blob:independent-test'; };
  URL.revokeObjectURL = url => { assert.equal(url, 'blob:independent-test'); events.push('revoke'); };
  globals.setTimeout = (fn: () => void, milliseconds: number) => { callback = fn; deadline = milliseconds; events.push('schedule'); return 1; };
  downloadBlob(new Blob(['independent download bytes']), 'report.docx');
  assert.equal(anchor.download, 'report.docx'); assert.equal(anchor.href, 'blob:independent-test');
  assert.deepEqual(events, ['create', 'append', 'click', 'schedule', 'remove']);
  assert.equal(deadline, 60_000); assert.ok(callback); callback();
  assert.equal(events.at(-1), 'revoke');
  events.length = 0; fail = true;
  assert.throws(() => downloadBlob(new Blob(['failure']), 'failed.xlsx'), /Independent click failure/);
  assert.deepEqual(events, ['create', 'append', 'click', 'revoke', 'remove']);
  console.log('PASS browser download adapter: DOM attachment, delivery, delayed cleanup and failure cleanup; no engineering formulas');
} finally {
  if (oldDocument === undefined) delete globals.document; else globals.document = oldDocument;
  URL.createObjectURL = create; URL.revokeObjectURL = revoke; globalThis.setTimeout = timer;
}
