/** JSON text boundary for protocol/analysis files: finite numbers, unique decoded keys and bounded depth. */
export function parseStudyJson(raw:string,maxBytes:number,label='Study JSON'):unknown {
 if(new TextEncoder().encode(raw).length>maxBytes)throw new Error(`${label} exceeds byte limit (${maxBytes})`);
 const text=raw.replace(/^\uFEFF/,'');
 const parsed:unknown=JSON.parse(text); // Syntax validation is delegated to the platform JSON parser.
 let at=0;
 const space=()=>{while(at<text.length&&/\s/.test(text[at]))at++;};
 const string=()=>{const start=at++;while(at<text.length){if(text[at]==='\\'){at+=2;continue;}if(text[at++]==='"')break;}return JSON.parse(text.slice(start,at)) as string;};
 const value=(depth:number):void=>{
  if(depth>64)throw new Error(`${label} exceeds nesting limit (64)`);
  space();const first=text[at];
  if(first==='{'){
   at++;space();const keys=new Set<string>();if(text[at]==='}'){at++;return;}
   while(at<text.length){space();const key=string();if(keys.has(key))throw new Error(`${label}: duplicate JSON key ${JSON.stringify(key)}`);keys.add(key);space();at++;value(depth+1);space();if(text[at++]==='}')return;}
  }else if(first==='['){at++;space();if(text[at]===']'){at++;return;}while(at<text.length){value(depth+1);space();if(text[at++]===']')return;}}
  else if(first==='"')string();
  else {const start=at;while(at<text.length&&!/[\s,}\]]/.test(text[at]))at++;const token=text.slice(start,at);if(token!=='true'&&token!=='false'&&token!=='null'&&!Number.isFinite(Number(token)))throw new Error(`${label}: nonfinite JSON number`);}
 };
 value(0);return parsed;
}
