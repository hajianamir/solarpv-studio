"""Published MATPOWER case33bw + independent nodal-admittance SciPy root oracle.
No benchmark value is a product default. Perturbations are explicitly numerical tests.
"""
import hashlib
import json
from pathlib import Path
import re
import numpy as np
from scipy.optimize import root
from services.pvlib_research.electrical import solve

path = Path('docs/examples/benchmarks/case33bw.m')
text = path.read_text()
def matrix(name):
    body = re.search(r'mpc\.' + name + r'\s*=\s*\[(.*?)\];', text, re.S)[1]
    return [[float(x) for x in row.split()] for row in
            re.sub(r'%[^\n]*', '', body).strip().split(';') if row.strip()]
bus, branches = matrix('bus'), [b for b in matrix('branch') if b[10] == 1]
assert len(bus) == 33 and len(branches) == 32
plan = {'schemaVersion': 'radial-ac-plan-v1', 'source': 'Published MATPOWER case33bw; Baran & Wu DOI 10.1109/61.25627',
        'voltageLLV': 12660, 'toleranceV': 1e-9, 'maxIterations': 1000, 'nodes': []}
for i, b in enumerate(bus[1:], 2):
    branch = next(row for row in branches if row[1] == i)
    plan['nodes'].append(dict(parent=int(branch[0])-1, rOhm=branch[2], xOhm=branch[3],
        loadW=b[2]*1000, loadVar=b[3]*1000, generationW=0, generationPf=1, generationQSign=1))

def independent(p):
    n = len(p['nodes']) + 1
    y = np.zeros((n, n), complex)
    powers = []
    for i, row in enumerate(p['nodes'], 1):
        j = row['parent']; admittance = 1/complex(row['rOhm'], row['xOhm'])
        y[i, i] += admittance; y[j, j] += admittance
        y[i, j] -= admittance; y[j, i] -= admittance
        gen = row['generationW'] * complex(1, row['generationQSign'] * np.tan(np.arccos(row['generationPf'])))
        powers.append((complex(row['loadW'], row['loadVar'])-gen)/3)
    powers = np.array(powers); v0 = p['voltageLLV']/np.sqrt(3)
    def residual(x):
        v = x[:n-1] + 1j*x[n-1:]
        r = y[1:, 1:] @ v + y[1:, 0]*v0 + np.conj(powers/v)
        return np.r_[r.real, r.imag]
    fit = root(residual, np.r_[np.full(n-1, v0), np.zeros(n-1)], tol=1e-10)
    assert fit.success and np.max(np.abs(residual(fit.x))) < 1e-6, fit.message
    v = np.r_[complex(v0), fit.x[:n-1]+1j*fit.x[n-1:]]
    loss = sum(3*abs((v[i]-v[r['parent']])/complex(r['rOhm'], r['xOhm']))**2*r['rOhm']
               for i, r in enumerate(p['nodes'], 1))
    return np.abs(v)*np.sqrt(3), loss

results = []
for scale in [.5, 1., 1.25]:
    p = json.loads(json.dumps(plan))
    for row in p['nodes']:
        row['loadW'] *= scale; row['loadVar'] *= scale
    observed = solve(p)['final']; voltage, loss = independent(p)
    assert np.max(np.abs(np.array(observed['nodeVoltageLLV'])-voltage)) < 1e-5
    assert abs(observed['seriesLossW']-loss) < .01
    assert observed['balanceResidualVA'] < .001
    if scale == 1:
        assert abs(loss/1000-202.677) < .02
        assert abs(min(voltage)/12660-.91309) < 1e-5
    results.append({'loadScale': scale, 'seriesLossW': loss, 'minVoltagePu': min(voltage)/12660})
receipt = {'status': 'PASS', 'source': 'https://github.com/MATPOWER/matpower/blob/b6c85b0323d20fb801cab3377c803a285d730847/data/case33bw.m',
           'fileSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'results': results,
           'qualification': 'Published network benchmark and numerical perturbations, not field validation'}
out = Path('.cache/phase5-evidence'); out.mkdir(parents=True, exist_ok=True)
(out/'published-radial-benchmark.json').write_text(json.dumps(receipt, indent=2))
print(json.dumps(receipt, indent=2))
