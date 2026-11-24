"""Independent optional oracle. Run with isolated pybamm==25.10.2 environment.
No production model imports. Produces numerical reference, never field validation.
"""
import json
import os
from pathlib import Path
os.environ['PYBAMM_DISABLE_TELEMETRY'] = 'true'
import pybamm

if pybamm.__version__ != '25.10.2':
    raise RuntimeError('Pinned oracle required')
model = pybamm.lithium_ion.SPM()
params = pybamm.ParameterValues('Chen2020')
experiment = pybamm.Experiment(['Discharge at 2.5 A for 300 seconds', 'Rest for 120 seconds'], period='5 seconds')
sim = pybamm.Simulation(model, parameter_values=params, experiment=experiment,
                        var_pts={'r_n': 80, 'r_p': 80, 'x_n': 10, 'x_s': 10, 'x_p': 10},
                        solver=pybamm.CasadiSolver(mode='safe', rtol=1e-9, atol=1e-9))
solution = sim.solve()
times = [0, 5, 30, 60, 120, 240, 299, 301, 330, 420]
output = dict(source='PyBaMM25.10.2 independent SPM/Chen2020/CasadiSolver; synthetic protocol, no field data',
    pybammVersion=pybamm.__version__, radialCells=80, timesS=times,
    cellVoltageV=[float(solution['Voltage [V]'](t)) for t in times],
    negativeSurfaceMolM3=[float(solution['Negative particle surface concentration [mol.m-3]'](t).mean()) for t in times],
    positiveSurfaceMolM3=[float(solution['Positive particle surface concentration [mol.m-3]'](t).mean()) for t in times])
p = Path(__file__).resolve().parents[1]/'docs/examples/physical-models/pybamm-oracle.json'
p.write_text(json.dumps(output, indent=2)+'\n')
print(p)
