"""Pinned independent PVWatts component oracle; no imports from production TS.
Run .venv/bin/python scripts/fixtures/physics/generate-signed-thermal-stage.py.
Temperatures/coefficients are synthetic component conditions, NOT annual weather.
"""
import json
from pathlib import Path
import pvlib
assert pvlib.__version__ == '0.13.1'
cases=[]
for temperature in [-20,0,25,50,80]:
    for gamma in [-.002,-.004,-.005]:
        power=float(pvlib.pvsystem.pvwatts_dc(1000,temperature,1,gamma))
        gain=100*(power-1)
        cases.append({'cellTempC':temperature,'gammaPerC':gamma,'lossPct':-gain,'expectedStagePct':gain})
x={'schemaVersion':1,'formulaId':'src/engine/core/signedThermalStage.ts#thermalStagePercentage#4d62ea984c25','independentOfImplementation':True,'productionExport':'thermalStagePercentage','inputs':[cases[0]['lossPct']],'expected':cases[0]['expectedStagePct'],'cases':cases,'independentCalculation':'Execute pvlib 0.13.1 PVWatts DC at 1000 W/m2 and reference power 1 W for independently specified cell temperatures and gamma. Expected stage percent is 100*(external Pdc/Pref - 1); input signed loss is its negative by the loss-budget definition. No production TypeScript values or annual-climate predictions are used. This verifies the sign-conversion component only, not NOCT, mounting offsets, seasonal weather, bifacial or whole-model yield.','tolerances':{'absolute':1e-10,'relative':0},'referenceSource':{'title':'PVWatts DC temperature correction, pvlib','url':'https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.pvwatts_dc.html','version':'0.13.1','locator':'PVWatts DC power equation: gamma*(Tcell-Tref); Tref=25 C; G=1000 W/m2, Pdc0=1 W'}}
Path('scripts/fixtures/physics/pvlib-0131-signed-thermal-stage.json').write_text(json.dumps(x,indent=2)+'\n')
