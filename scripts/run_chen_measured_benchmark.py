"""Explicit offline numerical experiment. No API routes or production consumers."""
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from services.pvlib_research.chen_measured_benchmark import run_benchmark

if __name__=='__main__':
    report=run_benchmark()
    trace_path=ROOT/'.cache/chen-measured-traces.json';trace_path.parent.mkdir(exist_ok=True)
    raw=json.dumps(report,allow_nan=False,separators=(',',':')).encode();trace_path.write_bytes(raw)
    report['derivedTraceArtifact']=dict(path='.cache/chen-measured-traces.json',sha256=hashlib.sha256(raw).hexdigest(),persisted=False,note='Reproducible with this runner; trace cache is intentionally not versioned.')
    for case in report['cases']:
        for run in case['runs']:
            for phase in ('discharge','rest'):
                if run.get(phase) is not None:run[phase].pop('trace')
    files=['services/pvlib_research/chen_measured_benchmark.py','scripts/run_chen_measured_benchmark.py','docs/features/CHEN-MEASURED-BENCHMARK-SPEC.fa.md','docs/reference-data/chen-validation/manifest.json','docs/reference-data/pybamm/Chen2020.txt']
    report['fileSha256']={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in files}
    path=ROOT/'docs/audit/CHEN-MEASURED-BENCHMARK.json';path.write_text(json.dumps(report,allow_nan=False,indent=2)+'\n')
    for case in report['cases']:
        fine=case['runs'][-1];d=fine.get('discharge');s=fine.get('rest')
        print(case['cell'],case['nominalCurrentA'],fine['solverStatus'],'discharge RMSE',d['voltageV']['rmse'] if d and d['voltageV'] else None,'coverage',d['sampleCoverage'] if d else 0,'rest RMSE',s['voltageV']['rmse'] if s and s['voltageV'] else None,flush=True)
