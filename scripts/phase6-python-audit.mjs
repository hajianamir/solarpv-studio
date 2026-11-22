import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const py=process.platform==='win32'?'.cache/audit-env/Scripts/python.exe':'.cache/audit-env/bin/python';
fs.mkdirSync('.cache/phase6',{recursive:true});
for(const args of [['-m','pip','install','pip-audit==2.9.0'],['-m','pip_audit','-r','services/pvlib_research/requirements.txt','--format','json','--output','.cache/phase6/python-audit.json']]){
 const r=spawnSync(py,args,{stdio:'inherit',shell:false});if(r.status!==0)process.exit(r.status??1);
}
