"""Independent acquisition gate; never treats measured data as model validation."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
steps=[[sys.executable,'scripts/acquire_chen_validation.py'],[sys.executable,'-m','unittest','scripts.test_chen_validation_data','-v']]
checks=[]
for command in steps:
    completed=subprocess.run(command,cwd=ROOT,check=False,timeout=60)
    checks.append(dict(command=command,passed=completed.returncode==0,exitCode=completed.returncode))
files=['scripts/acquire_chen_validation.py','scripts/test_chen_validation_data.py','scripts/verify_chen_validation_data.py']+[str(p.relative_to(ROOT)) for p in sorted((ROOT/'docs/reference-data/chen-validation').iterdir()) if p.is_file()]
receipt=dict(schemaVersion='chen-validation-data-gate-v1',runtimeTimestamp=datetime.now(timezone.utc).isoformat(),softwareStatus='ready-for-review' if all(c['passed'] for c in checks) else 'blocked',evidenceLevel='original_publisher_checksummed_measured_data_acquisition_only',modelValidationPerformed=False,projectApproval='blocked',automaticEnergyAdoption=False,financeMutation=False,checks=checks,fileSha256={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in files})
(ROOT/'docs/audit/CHEN-VALIDATION-DATA-GATE.json').write_text(json.dumps(receipt,indent=2)+'\n')
sys.exit(0 if all(c['passed'] for c in checks) else 1)
