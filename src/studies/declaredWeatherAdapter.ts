import {z} from 'zod';
import {sha256} from '@noble/hashes/sha256';
import {bytesToHex} from '@noble/hashes/utils';
const text=z.string().min(1).max(500).refine(s=>!!s.trim());
const finite=(a:number,b:number)=>z.number().finite().min(a).max(b);
export const DeclaredWeatherManifestSchema=z.object({
 schemaVersion:z.literal('declared-interval-weather-v1'),source:text,quality:z.enum(['measured','weather_provider','user_configured','assumed']),sourceVersion:text,reference:text,
 site:z.object({latitude:finite(-90,90),longitude:finite(-180,180),altitudeM:finite(-500,9000),timezone:z.string().min(1).max(100)}).strict(),
 intervalMinutes:z.number().int().min(1).max(60),timestampConvention:z.literal('interval_end'),variableSemantics:z.literal('interval_mean'),windHeightM:z.literal(10),
 units:z.object({ghi:z.enum(['W/m2','kW/m2']),dni:z.enum(['W/m2','kW/m2']),dhi:z.enum(['W/m2','kW/m2']),tempAir:z.enum(['degC','K']),windSpeed:z.enum(['m/s','km/h'])}).strict(),
}).strict();
const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const WeatherImportTraceSchema=z.object({schemaVersion:z.literal('declared-weather-receipt-v1'),rawCsv:z.string().max(2*1024*1024),rawManifest:z.string().max(64000),canonicalWeatherJson:z.string().max(4*1024*1024),rawCsvSha256:digest,manifestSha256:digest,canonicalWeatherSha256:digest}).strict();
export type WeatherImportTrace=z.infer<typeof WeatherImportTraceSchema>;
export const weatherSha256=(s:string)=>bytesToHex(sha256(new TextEncoder().encode(s)));
const same=(a:unknown,b:unknown):boolean=>{if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;const x=Object.entries(a),y=Object.entries(b);return x.length===y.length&&x.every(([k,v])=>Object.prototype.hasOwnProperty.call(b,k)&&same(v,(b as Record<string,unknown>)[k]));};
export function convertDeclaredWeather(rawManifest:string,rawCsv:string,site:z.infer<typeof DeclaredWeatherManifestSchema>['site']){
 if(new TextEncoder().encode(rawCsv).length>2*1024*1024||new TextEncoder().encode(rawManifest).length>64000)throw new Error('Declared weather package exceeds size limit');
 const manifest=DeclaredWeatherManifestSchema.parse(JSON.parse(rawManifest));
 if(!same(manifest.site,site))throw new Error('Declared weather site differs from active study site');
 try{new Intl.DateTimeFormat('en',{timeZone:site.timezone});}catch{throw new Error('IANA timezone required');}
 const lines=rawCsv.replace(/^\uFEFF/,'').split(/\r?\n/);if(lines.at(-1)==='')lines.pop();
 if(lines[0]!=='timestamp,ghi,dni,dhi,tempAir,windSpeed'||lines.length<3||lines.length>17569)throw new Error('Declared CSV header/row count invalid');
 const records=lines.slice(1).map(line=>{
  const cells=line.split(',');if(cells.length!==6||cells.some(c=>!c.trim()))throw new Error('Declared CSV: missing is not zero');
  const ts=cells[0];const t=Date.parse(ts);
  if(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(ts)||!Number.isFinite(t)||new Date(ts.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==ts.slice(0,10))throw new Error('Explicit offset and valid calendar timestamp required');
  const n=cells.slice(1).map(c=>{if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(c.trim())||!Number.isFinite(Number(c)))throw new Error('Invalid declared finite numeric value');return Number(c);});
  const unit=manifest.units;
  const row={timestamp:ts,ghiWm2:n[0]*(unit.ghi==='kW/m2'?1000:1),dniWm2:n[1]*(unit.dni==='kW/m2'?1000:1),dhiWm2:n[2]*(unit.dhi==='kW/m2'?1000:1),tempAirC:n[3]-(unit.tempAir==='K'?273.15:0),windSpeedMs:n[4]/(unit.windSpeed==='km/h'?3.6:1)};
  for(const k of ['ghiWm2','dniWm2','dhiWm2'] as const)finite(0,2000).parse(row[k]);finite(-90,70).parse(row.tempAirC);finite(0,75).parse(row.windSpeedMs);
  return row;
 });
 const times=records.map(r=>Date.parse(r.timestamp)),step=manifest.intervalMinutes*60000;
 if(times.slice(1).some((t,i)=>t-times[i]!==step)||times.at(-1)!-times[0]+step>366*86400000||new Date(times[0]-step).getUTCFullYear()<1900||new Date(times.at(-1)!).getUTCFullYear()>2200)throw new Error('Regular ordered supported interval timeline required; no fill/shift/resampling');
 const rawCsvSha256=weatherSha256(rawCsv),manifestSha256=weatherSha256(rawManifest);
 const weather={source:`declared-import csv:${rawCsvSha256}; manifest:${manifestSha256}`,quality:manifest.quality,windHeightM:10 as const,timestampConvention:'interval_end' as const,intervalMinutes:manifest.intervalMinutes,records};
 const canonicalWeatherJson=JSON.stringify(weather);
 const importTrace=WeatherImportTraceSchema.parse({schemaVersion:'declared-weather-receipt-v1',rawCsv,rawManifest,canonicalWeatherJson,rawCsvSha256,manifestSha256,canonicalWeatherSha256:weatherSha256(canonicalWeatherJson)});
 return {weather:{...weather,importTrace},manifest,receipt:importTrace};
}
export function validateWeatherImportTrace(weather:Record<string,unknown>,site:z.infer<typeof DeclaredWeatherManifestSchema>['site']):void{
 if(weather.importTrace===undefined)return;
 const trace=WeatherImportTraceSchema.parse(weather.importTrace);
 const rebuilt=convertDeclaredWeather(trace.rawManifest,trace.rawCsv,site);
 const {importTrace:_,...canonical}=weather;
 const {importTrace:__,...rebuiltCanonical}=rebuilt.weather;
 if(trace.rawCsvSha256!==rebuilt.receipt.rawCsvSha256||trace.manifestSha256!==rebuilt.receipt.manifestSha256||trace.canonicalWeatherSha256!==weatherSha256(trace.canonicalWeatherJson)||!same(canonical,JSON.parse(trace.canonicalWeatherJson))||!same(canonical,rebuiltCanonical))throw new Error('Declared weather receipt/conversion differs from canonical weather');
}
