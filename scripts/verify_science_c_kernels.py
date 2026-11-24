"""Kernel-only gate. Deliberately cannot mark C phases or product integration ready."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime,timezone


def main():
    checks=[]
    for command in ([sys.executable,'-m','unittest','scripts.test_science_c','-v'], ['npm','run','verify:science-b'], ['git','diff','--check']):
        env={**os.environ,'PVLIB_PYTHON':str(Path(sys.executable).absolute())}
        completed=subprocess.run(command,env=env,timeout=1500,check=False)
        checks.append(dict(command=command,exitCode=completed.returncode,passed=completed.returncode==0))
    files=['services/pvlib_research/science_c.py','scripts/test_science_c.py','scripts/verify_science_c_kernels.py','docs/features/C1-C3-SPEC.fa.md','docs/features/C1-C3-IMPLEMENTATION.fa.md','docs/audit/B1-B3-GATE.json']+[str(p) for p in sorted(Path('docs/examples/science-c').glob('*.json'))]
    passed=all(c['passed'] for c in checks)
    receipt=dict(schemaVersion='science-c-kernel-gate-v1',runtimeTimestamp=datetime.now(timezone.utc).isoformat(),kernelChecksPassed=passed,softwareStatus='kernel_checks_only_see_C1_C3_INTEGRATION_GATE',fullPhaseStatus={k:'partial_bounded_kernels_not_field_validated' for k in ('C1','C2','C3')},overallReleaseStatus='blocked',productIntegrationAssessment='not_assessed_by_kernel_gate',financeMutation=False,automaticEnergyAdoption=False,projectApproval='blocked',safetyApproval='not_assessed',checks=checks,fileSha256={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files})
    Path('docs/audit/C1-C3-KERNEL-GATE.json').write_text(json.dumps(receipt,indent=2)+'\n')
    return 0 if passed else 1


if __name__=='__main__':sys.exit(main())
