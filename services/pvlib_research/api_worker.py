"""Fixed isolated stdin/stdout entry point; never accepts filesystem paths."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
import json
import hashlib
from importlib.metadata import version
from services.pvlib_research.electrical import keys
from services.pvlib_research.advanced_thermal import simulate
from services.pvlib_research.diode_network import solve
from services.pvlib_research.integrated import run_integrated
from services.power_dynamics.dc_coupled import simulate as dc_coupled
from services.power_dynamics.electrochemistry import simulate as electrochemical_spm
from services.power_dynamics.control import simulate as dq_protection_control

def main():
    raw=sys.stdin.buffer.read(8*1024*1024+1)
    if len(raw)>8*1024*1024:raise ValueError('Request too large')
    def unique(pairs):
        obj={}
        for key,value in pairs:
            if key in obj:raise ValueError('Duplicate JSON key')
            obj[key]=value
        return obj
    request=json.loads(raw,object_pairs_hook=unique,parse_constant=lambda s:(_ for _ in ()).throw(ValueError('Nonfinite JSON')))
    keys(request,('operation','plan'))
    if version('pvlib')!='0.13.1':raise RuntimeError('Pinned pvlib required')
    functions={'integrated':run_integrated,'thermal_two_node':simulate,'diode_network':solve,'dc_coupled':dc_coupled,'electrochemical_spm':electrochemical_spm,'dq_protection_control':dq_protection_control}
    if request['operation'] not in functions:raise ValueError('Unknown operation')
    canonical=json.dumps(request,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)
    result=functions[request['operation']](request['plan'])
    manifest=dict(python=sys.version.split()[0],pvlib=version('pvlib'),numpy=version('numpy'),scipy=version('scipy'),codeSha256=hashlib.sha256(b''.join(path.read_bytes() for path in sorted(set(Path(__file__).parent.glob('*.py')) | set((Path(__file__).parents[1]/'power_dynamics').glob('*.py')) | set((Path(__file__).parents[1]/'pvlib_study').glob('*.py'))))).hexdigest())
    output=json.dumps(dict(schemaVersion='research-api-result-v1',operation=request['operation'],requestCanonicalJson=canonical,requestSha256=hashlib.sha256(canonical.encode()).hexdigest(),result=result,runtime=manifest),allow_nan=False,separators=(',',':'))
    if len(output.encode())>32*1024*1024:raise RuntimeError('Output budget')
    print(output)
if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,TypeError):
        print('{"code":"INVALID_INPUT"}');sys.exit(2)
    except Exception:
        print('{"code":"WORKER_FAILED"}');sys.exit(3)
