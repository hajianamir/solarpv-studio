import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const packages=Object.entries(lock.packages).filter(([p])=>p).map(([location,p])=>{
 const installed=fs.existsSync(location);const notices=[];
 if(installed)for(const name of fs.readdirSync(location)){if(/^(license|licence|copying|notice)(\.|$|-)/i.test(name)){
  const file=path.join(location,name);if(fs.statSync(file).isFile()){const bytes=fs.readFileSync(file);notices.push({file:name,sha256:hash(bytes),text:bytes.toString('utf8')});}
 }}
 return {location,name:location.split('node_modules/').at(-1),version:p.version,license:p.license??'UNKNOWN',dev:!!p.dev,optional:!!p.optional,installed,notices};
});
const blockers=[{id:'ROOT_LICENSE_UNSPECIFIED',description:'No owner-authorized root license; do not assign a license on the owner’s behalf.'},...packages.filter(p=>p.license==='UNKNOWN').map(p=>({id:'DEPENDENCY_LICENSE_UNKNOWN',name:p.name,version:p.version,description:'Installed package metadata and archive contain no license. Distribution clearance required.'})),{id:'BENCHMARK_CASE_RIGHTS_REVIEW',description:'MATPOWER notice excludes case files from code BSD license; retained case33bw attribution is not an explicit distribution license.'}];
const report={schemaVersion:'phase6-license-inventory-v1',sha:process.env.GITHUB_SHA??'local-working-tree',lockSha256:hash(fs.readFileSync('package-lock.json')),status:'review_required',legalApproval:false,blockers,packages,retainedNotices:['src/assets/fonts/LICENSE-DejaVu.txt','docs/examples/physical-models/reference/PYBAMM-LICENSE.txt','docs/examples/benchmarks/MATPOWER-LICENSE.txt']};
for(const p of report.retainedNotices)if(!fs.existsSync(p))throw new Error(`Missing required retained notice: ${p}`);
fs.mkdirSync('.cache/phase6',{recursive:true});fs.writeFileSync('.cache/phase6/npm-licenses.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS license inventory: ${packages.length} locked packages; RELEASE REVIEW REQUIRED (${blockers.length} blockers)`);
