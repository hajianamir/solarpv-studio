import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(process.env.GITHUB_SHA&&sha!==process.env.GITHUB_SHA)throw new Error('CI checkout SHA mismatch');
const licenseFile='.cache/phase6/npm-licenses.json';
const licenses=fs.existsSync(licenseFile)?JSON.parse(fs.readFileSync(licenseFile,'utf8')):null;
const receipt={schemaVersion:'phase6-ci-receipt-v1',sha,expectedSha:process.env.GITHUB_SHA??null,platform:process.platform,node:process.version,runId:process.env.GITHUB_RUN_ID??null,runAttempt:process.env.GITHUB_RUN_ATTEMPT??null,technicalStatus:process.env.TECHNICAL_STATUS??'not_assessed',releaseAcceptance:licenses?.status==='review_required'?'blocked_license_review':'not_assessed',licenseBlockers:licenses?.blockers??['license inventory unavailable'],nativeSafariAcceptance:'not_established_by_this_workflow',fieldValidation:false};
fs.mkdirSync('.cache/phase6',{recursive:true});fs.writeFileSync('.cache/phase6/ci-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n### Phase 6\n- Exact SHA: ${sha}\n- Technical checks: ${receipt.technicalStatus}\n- Release acceptance: **${receipt.releaseAcceptance}**\n- Inventory success is not legal clearance. Native Safari and field qualification are not established.\n`);
