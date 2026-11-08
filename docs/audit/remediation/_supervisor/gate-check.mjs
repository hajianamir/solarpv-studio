#!/usr/bin/env node
/**
 * gate-check.mjs — ابزار داوری مکانیکی ناظر (فقط ناظر)
 * usage:
 *   node gate-check.mjs                        # بررسی وضعیت جاری مخزن
 *   node gate-check.mjs --zip /path/to/x.zip   # بررسی زیپ تحویلی در برابر HEAD
 *   node gate-check.mjs --json                 # خروجی JSON برای پردازش
 * هیچ فایلی را تغییر نمی‌دهد؛ فقط می‌خواند.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import os from 'node:os';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const zipIdx = args.indexOf('--zip');
const ZIP = zipIdx >= 0 ? args[zipIdx + 1] : null;

const EV = 'docs/audit/remediation/evidence/phase01';
const MEAS = `${EV}/measurements.json`;
const SPEC = 'docs/audit/remediation/phase01-formula-spec.fa.md';
const MANIFEST = 'docs/audit/remediation/phase01-baseline-manifest.json';
const FIXTURES = 'scripts/remediation/fixtures';
const HARNESS_DIRS = ['scripts/remediation'];

const EXPECTED_Q = [
  ...['A1','A2','A3','A4','A5','A6'].map(x=>'M-'+x),
  ...['B1','B2','B3','B4','B5'].map(x=>'M-'+x),
  ...['C1','C2','C3','C4'].map(x=>'M-'+x),
  ...['D1','D2','D3','D4'].map(x=>'M-'+x),
  ...['E1','E2','E3','E4','E5'].map(x=>'M-'+x),
  ...['F1','F2','F3','F4','F5','F6'].map(x=>'M-'+x),
  ...['G1','G2','G3','G4','G5'].map(x=>'M-'+x),
  ...['H1','H2','H3','H4','H5'].map(x=>'M-'+x),
  ...['I1','I2','I3','I4','I5'].map(x=>'M-'+x),
];
const EXPECTED_C = Array.from({length:10},(_,i)=>`C-${String(i+1).padStart(2,'0')}`);
const EXPECTED_D = ['D-1','D-2','D-3','D-4','D-5','D-6','D-7'];
const BASELINE_ANY = 93;

const out = { meta: {}, verdict: {}, findings: [] };
const F = (id, sev, msg, detail) => out.findings.push({ id, sev, msg, detail });
const sh = (cmd) => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim(); } catch (e) { return `__ERR__:${(e.stdout||'')}${(e.stderr||e.message||'')}`; } };
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const shaFile = (p) => exists(p) ? sha(fs.readFileSync(path.join(ROOT, p))) : null;

/* ---------- 1. لنگر خط مبنا ---------- */
out.meta.head = sh('git rev-parse HEAD');
out.meta.branch = sh('git rev-parse --abbrev-ref HEAD');
out.meta.baselineCommit = 'dbf0aca24e64cb9b19e090cb5bbea62e1cd7c54d';
out.meta.isBaselineCommit = out.meta.head === out.meta.baselineCommit;
out.meta.gitStatus = sh('git status --porcelain').split('\n').filter(Boolean);

/* ---------- 2. دامنه: آیا src/ یا server.ts لمس شده؟ ---------- */
const scopeDiff = sh('git diff --stat -- src/ server.ts package.json tsconfig.json vite.config.ts .eslintrc.cjs .eslintrc.js 2>/dev/null');
out.meta.scopeDiffEmpty = scopeDiff === '';
if (!out.meta.scopeDiffEmpty) {
  F('K-01', 'FATAL', 'دامنه نقض شده: تغییر در src/ یا server.ts یا فایل پیکربندی', scopeDiff.split('\n').slice(-8));
}
const untrackedSrc = out.meta.gitStatus.filter(l => l.startsWith('??') && /(^|\s)(src\/|server\.ts|package\.json|tsconfig\.json|vite\.config|\.eslintrc)/.test(l));
if (untrackedSrc.length) F('K-01b','FATAL','فایل جدید در مسیر ممنوع', untrackedSrc);

/* ---------- 3. اگر زیپ داده شده: استخراج و مقایسه ---------- */
out.meta.zip = null;
let cmpRoot = ROOT;
if (ZIP) {
  if (!fs.existsSync(ZIP)) { F('Z','FATAL','زیپ یافت نشد', ZIP); }
  else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-zip-'));
    try {
      execSync(`unzip -qq -o "${ZIP}" -d "${tmp}"`, { stdio: ['ignore','pipe','pipe'] });
      // اگر یک پوشه تک درون زیپ بود، به آن برو
      let entries = fs.readdirSync(tmp).filter(n => n !== '__MACOSX');
      let root = tmp;
      if (entries.length === 1 && fs.statSync(path.join(tmp, entries[0])).isDirectory()) root = path.join(tmp, entries[0]);
      cmpRoot = root;
      const list = [];
      const walk = (d, rel='') => { for (const n of fs.readdirSync(d)) { if (n==='node_modules'||n==='.git'||n==='__MACOSX') continue; const a=path.join(d,n); const r=rel?`${rel}/${n}`:n; if (fs.statSync(a).isDirectory()) walk(a,r); else list.push([r,a]); } };
      walk(root);
      const added=[], modified=[], same=[];
      for (const [rel, abs] of list) {
        const local = path.join(ROOT, rel);
        if (!fs.existsSync(local)) added.push(rel);
        else if (sha(fs.readFileSync(abs)) !== sha(fs.readFileSync(local))) modified.push(rel);
        else same.push(rel);
      }
      out.meta.zip = { path: ZIP, filesInZip: list.length, added: added.length, modified: modified.length, identical: same.length,
        addedList: added.slice(0,80), modifiedList: modified.slice(0,80) };
      const scopeViolations = [...added, ...modified].filter(r => /^(src\/|server\.ts$|package(-lock)?\.json$|tsconfig.*\.json$|vite\.config|\.eslintrc|benchmarks\/|\.github\/)/.test(r));
      if (scopeViolations.length) F('Z-01','FATAL','زیپ فایل بیرون از دامنه دارد', scopeViolations.slice(0,40));
      const allowed = [...added, ...modified].filter(r => !/^(src\/|server\.ts$|package(-lock)?\.json$|tsconfig.*\.json$|vite\.config|\.eslintrc|benchmarks\/|\.github\/)/.test(r));
      out.meta.zip.allowedChanges = allowed;
      if (allowed.length === 0) F('Z-02','WARN','زیپ هیچ تغییر مجازی ندارد — یا زیپ فقط مخزن پایه است یا مسیرها جابه‌جا شده‌اند');
    } catch (e) { F('Z','FATAL','استخراج زیپ شکست خورد', String(e.message||e).slice(0,400)); }
  }
}
const R = (p) => path.join(cmpRoot, p);
const readMaybe = (p) => { try { return fs.readFileSync(R(p), 'utf8'); } catch { return null; } };

/* ---------- 4. وجود خروجی‌های D-1..D-7 ---------- */
const dmap = {
  'D-1': exists(FIXTURES) ? fs.readdirSync(path.join(ROOT,FIXTURES)).filter(f=>f.endsWith('.json')) : [],
  'D-2': exists('scripts/remediation/import-map.ts') ? ['ok'] : [],
  'D-3': exists('scripts/remediation/measure.ts') ? ['ok'] : [],
  'D-4': exists('scripts/remediation/run-phase01.ts') ? ['ok'] : [],
  'D-5': exists(MEAS) ? ['ok'] : [],
  'D-6': exists(SPEC) ? ['ok'] : [],
  'D-7': exists(MANIFEST) ? ['ok'] : [],
};
for (const [k,v] of Object.entries(dmap)) if (!v.length) F(k,'FATAL',`خروجی ${k} موجود نیست`, null);
out.meta.fixtures = dmap['D-1'];

/* ---------- 5. اعتبار measurements.json ---------- */
out.meta.quantities = 0; out.meta.checks = 0;
let meas = null;
const measRaw = readMaybe(MEAS);
if (measRaw) {
  try {
    meas = JSON.parse(measRaw);
    if (meas.schema !== 'solarpv.audit.phase01.v1') F('S-01','FATAL','schema نامعتبر', meas.schema);
    if (!meas.generatedAtCommit) F('S-02','FATAL','generatedAtCommit غایب');
    if (!meas.harnessSha256) F('S-03','FATAL','harnessSha256 غایب');
    const qs = Array.isArray(meas.quantities) ? meas.quantities : [];
    out.meta.quantities = qs.length;
    const ids = qs.map(q => q.id);
    const present = new Set(ids);
    const missing = EXPECTED_Q.filter(x => !present.has(x));
    const dupes = ids.filter((x,i) => ids.indexOf(x) !== i);
    if (missing.length) F('S-04','FATAL',`کمیت‌های غایب: ${missing.length}`, missing);
    if (dupes.length) F('S-05','FATAL','شناسهٔ تکراری', dupes);
    const noRepro = qs.filter(q => !q.reproduce).map(q=>q.id);
    if (noRepro.length) F('S-06','FATAL','کمیت بدون دستور بازتولید', noRepro);
    const unverified = qs.filter(q => q.verified !== true).map(q=>q.id);
    if (unverified.length) F('S-07','FATAL','کمیت تأییدنشده (verified!=true)', unverified);
    const noChain = qs.filter(q => !Array.isArray(q.chain) || q.chain.length === 0).map(q=>q.id);
    if (noChain.length) F('S-08','FATAL','کمیت بدون زنجیرهٔ فراخوانی', noChain);
    const noProducer = qs.filter(q => !q.producer || !/:\d+/.test(q.producer)).map(q=>q.id);
    if (noProducer.length) F('S-09','FATAL','کمیت بدون producer با شمارهٔ خط', noProducer);
    const noUnit = qs.filter(q => !q.unit).map(q=>q.id);
    if (noUnit.length) F('S-10','WARN','کمیت بدون واحد', noUnit);
    // دامنهٔ مقادیر باید متناهی باشد
    const badVal = qs.filter(q => typeof q.value !== 'number' || !Number.isFinite(q.value)).map(q=>q.id);
    if (badVal.length) F('S-11','FATAL','مقدار غیرعددی/غیرمتناهی', badVal);
    // بررسی‌های انسجام
    const cs = Array.isArray(meas.checks) ? meas.checks : [];
    out.meta.checks = cs.length;
    const cIds = new Set(cs.map(c=>c.id));
    const missC = EXPECTED_C.filter(x=>!cIds.has(x));
    if (missC.length) F('S-12','FATAL',`بررسی‌های انسجام غایب: ${missC.length}`, missC);
    const badC = cs.filter(c => typeof c.lhs !== 'number' || typeof c.rhs !== 'number').map(c=>c.id);
    if (badC.length) F('S-13','FATAL','بررسی با lhs/rhs غیرعددی', badC);
    // دروازه‌ها
    const g = meas.gates || {};
    if (g.lintErrors !== 0) F('S-14','FATAL','lintErrors باید 0 باشد', g.lintErrors);
    if (typeof g.anyWarnings !== 'number' || g.anyWarnings > BASELINE_ANY) F('K-03','FATAL',`anyWarnings بیشتر از خط مبنا (${BASELINE_ANY})`, g.anyWarnings);
    if (g.testFail !== 0) F('K-04','FATAL','testFail باید 0 باشد', g.testFail);
    if (g.testSkip !== 0) F('K-04b','FATAL','testSkip باید 0 باشد', g.testSkip);
    if (g.buildExit !== 0) F('K-05','FATAL','buildExit باید 0 باشد', g.buildExit);
    // هش fixtureها
    const cases = Array.isArray(meas.cases) ? meas.cases : [];
    const caseIds = new Set(cases.map(c=>c.id));
    for (const need of ['G-1','G-2','G-3','G-4']) if (!caseIds.has(need)) F('S-15','FATAL',`کیس ${need} در measurements نیست`);
    out.meta.cases = [...caseIds];
    // observationها (ثبت بدون اصلاح)
    out.meta.observations = Array.isArray(meas.observations) ? meas.observations.length : 0;
  } catch (e) { F('S-00','FATAL','JSON نامعتبر', String(e.message).slice(0,200)); }
}

/* ---------- 6. مشخصات فرمول: هر کمیت باید بلوک داشته باشد ---------- */
const spec = readMaybe(SPEC);
if (spec) {
  const headings = [...spec.matchAll(/###\s+(M-[A-I]\d+)/g)].map(m=>m[1]);
  const set = new Set(headings);
  const miss = EXPECTED_Q.filter(x=>!set.has(x));
  out.meta.specBlocks = headings.length;
  if (miss.length) F('W-01','FATAL',`بلوک فرمول غایب برای ${miss.length} کمیت`, miss);
  const magicTable = (spec.match(/ثابت‌های جادویی/g)||[]).length;
  if (!magicTable) F('W-02','FATAL','جدول «ثابت‌های جادویی» غایب');
  const rows = (spec.split('ثابت‌های جادویی')[1]||'').split('\n').filter(l=>/^\|/.test(l) && !/^\|\s*-+/.test(l)).length;
  out.meta.magicRows = Math.max(0, rows - 1);
  if (out.meta.magicRows < 15) F('W-03','FATAL',`ردیف‌های جدول ثابت‌های جادویی < 15 (${out.meta.magicRows})`);
  if (/تأیید نشد/.test(spec)) out.meta.unverifiedInSpec = (spec.match(/تأیید نشد/g)||[]).length;
}

/* ---------- 7. مانیفست و هش‌ها ---------- */
const manRaw = readMaybe(MANIFEST);
if (manRaw) {
  try {
    const man = JSON.parse(manRaw);
    const entries = man.files || man.hashes || [];
    const arr = Array.isArray(entries) ? entries : Object.entries(entries).map(([k,v])=>({path:k, sha256:v}));
    out.meta.manifestEntries = arr.length;
    let bad = 0; const badList = [];
    for (const e of arr) {
      const p = e.path || e.file; const h = e.sha256 || e.sha;
      const actual = shaFile(p);
      if (!actual || actual !== h) { bad++; if (badList.length<20) badList.push(p); }
    }
    if (bad) F('K-08','FATAL',`${bad} فایل با هش مانیفست نمی‌خواند`, badList);
    // آیا هش هارنس با measurements می‌خواند؟
    if (meas && meas.harnessSha256) {
      const files = [];
      const walk = (d) => { const a=path.join(ROOT,d); if(!fs.existsSync(a)) return; for (const n of fs.readdirSync(a)) { const p=`${d}/${n}`; const s=fs.statSync(path.join(ROOT,p)); if (s.isDirectory()) walk(p); else if (n.endsWith('.ts')||n.endsWith('.mjs')) files.push(p); } };
      HARNESS_DIRS.forEach(walk);
      const concat = crypto.createHash('sha256').update(files.sort().map(f=>fs.readFileSync(path.join(ROOT,f))).reduce((a,b)=>Buffer.concat([a,b]), Buffer.alloc(0))).digest('hex');
      out.meta.harnessRecomputed = concat;
      out.meta.harnessMatches = concat === meas.harnessSha256;
      if (!out.meta.harnessMatches) F('K-08b','FATAL','harnessSha256 با بازمحاسبهٔ مستقل نمی‌خواند (یا روش هش اعلام نشده)');
    }
  } catch (e) { F('K-08c','FATAL','مانیفست نامعتبر', String(e.message).slice(0,200)); }
}

/* ---------- 8. تضعیف تست (اسکن افزوده‌ها) ---------- */
const scanTargets = [];
if (ZIP && out.meta.zip) scanTargets.push(...(out.meta.zip.allowedChanges||[]));
else {
  const g = sh('git status --porcelain').split('\n').filter(Boolean).map(l=>l.slice(3).trim());
  scanTargets.push(...g);
}
const weaken = [];
for (const t of scanTargets) {
  if (!/\.(ts|tsx|js|mjs)$/.test(t)) continue;
  const c = readMaybe(t) ?? (exists(t) ? fs.readFileSync(path.join(ROOT,t),'utf8') : null);
  if (!c) continue;
  for (const pat of [/\.skip\(/g, /@ts-ignore/g, /@ts-expect-error/g, /eslint-disable/g, /\bxit\(/g, /\bxdescribe\(/g]) {
    const m = c.match(pat);
    if (m) weaken.push(`${t}: ${pat.source} ×${m.length}`);
  }
}
if (weaken.length) F('K-02','FATAL','نشانهٔ تضعیف تست/تایپ', weaken.slice(0,30));

/* ---------- 9. جمع‌بندی ---------- */
const fatal = out.findings.filter(f=>f.sev==='FATAL').length;
const warn = out.findings.filter(f=>f.sev==='WARN').length;
out.verdict = { fatal, warn, status: fatal ? 'REJECTED' : (warn ? 'PASS-WITH-CONDITIONS' : 'APPROVED-CANDIDATE') };

if (asJson) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
/* ---------- 10. حالت --plot: ۱۰ نمونهٔ تصادفی برای بازتولید دستی ---------- */
if (args.includes('--plot') && meas) {
  const qs = (meas.quantities||[]).filter(q=>q.reproduce);
  const seed = 1337; let st = seed;
  const rnd = () => (st = (st*1103515245 + 12345) % 2147483648) / 2147483648;
  const picks = new Set();
  while (picks.size < Math.min(10, qs.length)) picks.add(Math.floor(rnd()*qs.length));
  console.log('\n— نمونه‌های بازتولید (دانهٔ ثابت 1337) —');
  [...picks].sort((a,b)=>a-b).forEach(i => {
    const q = qs[i];
    console.log(`\n[${q.id}] value=${q.value} ${q.unit||''}`);
    console.log(`  run: ${q.reproduce}`);
  });
  console.log('');
}


const line = '─'.repeat(72);
console.log(`\n${line}\n🔎 داوری مکانیکی فاز ۱ — gate-check\n`);
console.log(`HEAD: ${out.meta.head.slice(0,12)}  |  branch: ${out.meta.branch}  |  baseline: ${out.meta.isBaselineCommit ? 'HEAD == dbf0aca' : 'HEAD ≠ dbf0aca (کامیت جدید)'}`);
console.log(`دامنهٔ src/سرور/پیکربندی: ${out.meta.scopeDiffEmpty ? '✅ پاک' : '❌ نقض شده'}`);
if (out.meta.zip) {
  const z = out.meta.zip;
  console.log(`\n📦 زیپ: ${z.filesInZip} فایل | افزوده: ${z.added} | تغییرکرده: ${z.modified} | یکسان: ${z.identical}`);
  if (z.addedList.length) console.log('  + ' + z.addedList.slice(0,25).join('\n  + '));
  if (z.modifiedList.length) console.log('  ~ ' + z.modifiedList.slice(0,25).join('\n  ~ '));
}
console.log(`\n📊 کمیت‌ها: ${out.meta.quantities}/${EXPECTED_Q.length}   بررسی‌های انسجام: ${out.meta.checks}/10   بلوک فرمول: ${out.meta.specBlocks ?? '-'}   ثابت جادویی: ${out.meta.magicRows ?? '-'}`);
console.log(`🔐 هارنس بازمحاسبه‌شده: ${out.meta.harnessRecomputed ?? '-'} ${out.meta.harnessMatches ? '✅ منطبق' : '❌'}`);
console.log(`\n${line}`);
if (!out.findings.length) console.log('هیچ ایراد مکانیکی یافت نشد — داوری محتوایی (K-10..K-12، خ-۱..خ-۳) باقی است.');
else for (const f of out.findings) {
  console.log(`${f.sev === 'FATAL' ? '🛑' : '⚠️ '} [${f.id}] ${f.msg}`);
  if (f.detail) console.log('     ' + (Array.isArray(f.detail) ? f.detail.join(' | ') : String(f.detail)).slice(0, 400));
}
console.log(`${line}\nحکم مکانیکی: ${out.verdict.status}   (FATAL=${fatal}, WARN=${warn})\n`);
