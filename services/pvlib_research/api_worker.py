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

def main():
    raw=sys.stdin.buffer.read(8*1024*1024+1)
    if len(raw)>8*1024*1024:raise ValueError('Request too large')
    request=json.loads(raw,parse_constant=lambda s:(_ for _ in ()).throw(ValueError('Nonfinite JSON')))
    keys(request,('operation','plan'))
    if version('pvlib')!='0.13.1':raise RuntimeError('Pinned pvlib required')
    functions={'integrated':run_integrated,'thermal_two_node':simulate,'diode_network':solve}
    if request['operation'] not in functions:raise ValueError('Unknown operation')
    canonical=json.dumps(request,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)
    result=functions[request['operation']](request['plan'])
    manifest=dict(python=sys.version.split()[0],pvlib=version('pvlib'),numpy=version('numpy'),scipy=version('scipy'),codeSha256=hashlib.sha256(b''.join(Path(__file__).with_name(name).read_bytes() for name in ('api_worker.py','advanced_thermal.py','diode_network.py','integrated.py'))).hexdigest())
    output=json.dumps(dict(schemaVersion='research-api-result-v1',operation=request['operation'],requestCanonicalJson=canonical,requestSha256=hashlib.sha256(canonical.encode()).hexdigest(),result=result,runtime=manifest),allow_nan=False,separators=(',',':'))
    if len(output.encode())>32*1024*1024:raise RuntimeError('Output budget')
    print(output)
if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,TypeError):
        print('{"code":"INVALID_INPUT"}');sys.exit(2)
    except Exception:
        print('{"code":"WORKER_FAILED"}');sys.exit(3)
