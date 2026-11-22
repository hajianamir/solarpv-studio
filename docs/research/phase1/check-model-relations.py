"""Small independent arithmetic probes, not production or field validation."""
import hashlib
import json
import math
from decimal import Decimal as D
from pathlib import Path
import pvlib

assert pvlib.__version__ == '0.13.1'
checks = []
def check(name, actual, expected):
    assert math.isclose(float(actual), float(expected), rel_tol=1e-10, abs_tol=1e-9), (name, actual, expected)
    checks.append(dict(name=name, actual=float(actual), expected=float(expected), status='PASS'))

for name, g, t, expected in [('stc', 1000, 25, 1000), ('hot', 800, 45, 736), ('dark', 0, 25, 0)]:
    check('pvwatts_dc_' + name, pvlib.pvsystem.pvwatts_dc(g, t, 1000, -0.004), expected)
check('inverter_zero', pvlib.inverter.pvwatts(0, 1000), 0)
check('inverter_rated', pvlib.inverter.pvwatts(1000, 1000), 960)
check('inverter_clip', pvlib.inverter.pvwatts(2000, 1000), 960)
check('faiman', pvlib.temperature.faiman(800, 20, 2, 25, 6.84), D(20) + D(800)/(D(25)+D('6.84')*2))
check('two_losses_not_sum', pvlib.pvsystem.pvwatts_losses(soiling=10, shading=20, snow=0, mismatch=0, wiring=0, connections=0, lid=0, nameplate_rating=0, age=0, availability=0), 28)
# Proposed bus-side energy contract: 2 kW charge for 0.5 h at 90% stores 0.9 kWh.
# Delivering 0.72 kWh at 80% efficiency removes the same stored energy.
check('battery_storage_change', D('.9')*2*D('.5') - D('.72')/D('.8'), 0)
check('offgrid_energy_fraction_not_time_fraction', D(1)/D(10), D('.1'))
manifest=json.loads(Path('docs/audit/PHASE1-MODEL-SOURCES.json').read_text())
for asset in manifest['assets']:
    raw=Path(asset['localPath']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==asset['sha256']
    assert len(raw)==asset['bytes']
Path('docs/audit/PHASE1-MODEL-PROBES.json').write_text(json.dumps(dict(
    scope='independent arithmetic probes only; no annual, field, dispatch or bankability validation',
    pvlibVersion=pvlib.__version__, verifiedSourceFiles=len(manifest['assets']), checks=checks),indent=2)+'\n')
print(f'{len(checks)}/{len(checks)} arithmetic probes PASS; {len(manifest["assets"])} source hashes PASS')
