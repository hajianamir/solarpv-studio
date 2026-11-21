import {spawnSync} from 'node:child_process';
// Trusted workflow commands only. Make bounded failure details available in check annotations
// when runner log/artifact CDN downloads are inaccessible to the reviewing environment.
const args=process.argv.slice(2);if(!args.length)throw new Error('Command required');
const r=spawnSync(args.join(' '),{shell:true,encoding:'utf8',maxBuffer:16*1024*1024,env:process.env});
process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');
if(r.status!==0){const tail=((r.stdout??'')+'\n'+(r.stderr??'')+'\n'+String(r.error??'')).slice(-10000).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');console.log(`::error title=Bounded command failure::${tail}`);}
process.exit(r.status??1);
