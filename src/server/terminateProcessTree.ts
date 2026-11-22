import {spawn,type ChildProcess} from 'node:child_process';
/** Workers must be spawned detached on POSIX. Never accepts a command from HTTP. */
export function terminateProcessTree(child:ChildProcess):void{
 if(!child.pid)return;
 if(process.platform==='win32'){
  // taskkill accepts an integer PID, not interpolated shell text.
  const killer=spawn('taskkill',['/pid',String(child.pid),'/T','/F'],{shell:false,windowsHide:true,stdio:'ignore'});
  killer.once('error',()=>{child.kill('SIGKILL');});
  killer.once('exit',code=>{if(code!==0)child.kill('SIGKILL');});
 }else{
  try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}
 }
}
