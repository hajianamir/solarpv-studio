"""Verify actual experiment and independent metrics. --run explicitly recomputes it."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from services.pvlib_research.chen_measured_benchmark import measurements,segments,CASES


def witness():
    summary=json.loads((ROOT/'docs/audit/CHEN-MEASURED-BENCHMARK.json').read_text());raw=(ROOT/'.cache/chen-measured-traces.json').read_bytes();report=json.loads(raw)
    if hashlib.sha256(raw).hexdigest()!=summary['derivedTraceArtifact']['sha256']:raise ValueError('Experiment trace identity; recompute with --run')
    if len(report['cases'])!=12:raise ValueError('All cells and currents required')
    for p,h in summary['fileSha256'].items():
        if hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h:raise ValueError('Experiment source changed; recompute with --run')
    for case in report['cases']:
        rows,_=measurements(case['cell']);d,s=next((a,b) for a,b,_ in CASES if a==case['dischargeStep']);groups=segments(rows,d,s)
        if case['initialSoc']!=1:raise ValueError('No fitted initial SOC')
        for run in case['runs']:
            if run['solverStatus']!='completed':raise ValueError('Solver failure must block software experiment gate')
            for phase,observed in zip(['discharge','rest'],groups):
                result=run.get(phase)
                if result is None:
                    if phase!='rest' or run['restStatus']!='blocked_model_cutoff_before_measured_switch':raise ValueError('Unexplained missing phase')
                    continue
                if len(result['trace'])!=result['scoredSamples'] or len(observed)!=result['totalSamples']:raise ValueError('Measurement coverage')
                # Match every supported sample, preserving duplicate boundary records.
                if phase=='discharge':selected=[r for r in observed if r['Step Time [s]']<=run['modelDischargeEndS']]
                else:selected=observed
                if len(selected)!=len(result['trace']):raise ValueError('Cherry-picked support')
                for t,r in zip(result['trace'],selected):
                    if t['stepTimeS']!=r['Step Time [s]'] or t['measuredV']!=r['Voltage [V]'] or t['measuredK']!=r['Temperature Cell [degC]']+273.15:raise ValueError('Measurement binding')
                for unit,pred,obs in [('voltageV','predictedV','measuredV'),('temperatureK','predictedK','measuredK')]:
                    errors=[t[pred]-t[obs] for t in result['trace']];n=len(errors)
                    expected=dict(count=n,mae=math.fsum(abs(e) for e in errors)/n,rmse=math.sqrt(math.fsum(e*e for e in errors)/n),bias=math.fsum(errors)/n,maxAbs=max(abs(e) for e in errors))
                    for k,v in expected.items():
                        if not math.isclose(result[unit][k],v,rel_tol=1e-12,abs_tol=1e-12):raise ValueError('Independent numerical metric oracle')
    # Summary differs only by trace removal and provenance added by explicit runner.
    stripped=json.loads(raw)
    for case in stripped['cases']:
        for run in case['runs']:
            for phase in ['discharge','rest']:
                if run.get(phase) is not None:run[phase].pop('trace')
    comparable={k:v for k,v in summary.items() if k not in ['fileSha256','derivedTraceArtifact']}
    if comparable!=stripped:raise ValueError('Summary differs from actual trace experiment')
    print('PASS original-data-bound all-case traces and independent math.fsum metric witness')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--run',action='store_true',help='Recompute expensive pinned DFN experiment first');args=parser.parse_args()
    if args.run:subprocess.run([sys.executable,'scripts/run_chen_measured_benchmark.py'],cwd=ROOT,check=True,timeout=1800)
    commands=[[sys.executable,'scripts/verify_chen_validation_data.py'],[sys.executable,'-m','unittest','scripts.test_battery_protocol','scripts.test_chen_measured_benchmark','-v']]
    checks=[]
    for command in commands:
        r=subprocess.run(command,cwd=ROOT,check=False,timeout=180);checks.append(dict(command=command,passed=r.returncode==0,exitCode=r.returncode))
    try:witness();checks.append(dict(command='original-data and independent metric witness',passed=True))
    except (ValueError,KeyError,FileNotFoundError) as error:print(error);checks.append(dict(command='original-data and independent metric witness',passed=False))
    diff=subprocess.run(['git','diff','--check'],cwd=ROOT,check=False);checks.append(dict(command='git diff --check',passed=diff.returncode==0,exitCode=diff.returncode))
    files=['services/pvlib_research/chen_measured_benchmark.py','scripts/run_chen_measured_benchmark.py','scripts/test_chen_measured_benchmark.py','scripts/verify_chen_measured_benchmark.py','docs/features/CHEN-MEASURED-BENCHMARK-SPEC.fa.md','docs/features/CHEN-MEASURED-BENCHMARK.fa.md','docs/features/CHEN-MEASURED-RESULTS.fa.md','docs/audit/CHEN-MEASURED-BENCHMARK.json','docs/audit/CHEN-VALIDATION-DATA-GATE.json']
    receipt=dict(schemaVersion='chen-measured-benchmark-gate-v1',softwareStatus='ready-for-review' if all(c['passed'] for c in checks) else 'blocked',allRemainingItemsCompleted=False,physicalQualification='not_established',projectApproval='blocked',safetyApproval='not_assessed',automaticEnergyAdoption=False,financeMutation=False,evidenceLevel='retrospective_published_measurement_comparison_not_independent_project_qualification',expensiveExperimentRecomputedThisInvocation=args.run,checks=checks,fileSha256={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in files if (ROOT/p).exists()})
    (ROOT/'docs/audit/CHEN-MEASURED-BENCHMARK-GATE.json').write_text(json.dumps(receipt,indent=2)+'\n');sys.exit(0 if all(c['passed'] for c in checks) else 1)
if __name__=='__main__':main()
