"""Independent integer constraint oracle, Decimal arithmetic, no TypeScript execution.
Series voltage addition is the reference; temperature scaling is an explicitly
assumed linear input relation, not validation of manufacturer coefficients or IEC/NEC.
The formula list comes from the TypeScript AST inventory only; no production
calculation outputs are read. Fixture outputs are never copied from TS.
"""
import json
import subprocess
import sys
from decimal import Decimal as D
from pathlib import Path

manifest_path = Path('scripts/physics-reference-evidence.json')
manifest = json.loads(manifest_path.read_text())
inventory = """import {extractFormulaUnits} from './scripts/verify-physics-reference-gate';
import fs from 'node:fs';
const expressions=new Set(['Math.max(0,maxModules)','singleModuleVmpMaxCold<=0','tempMinC>tempMaxC','v>0','req.betaVmpPerC===undefined','value<=0',"maxModules<Math.max(1,minModules)?'infeasible':'feasible'"]);
console.log(JSON.stringify(extractFormulaUnits('src/engine/solarPvEngine.ts',fs.readFileSync('src/engine/solarPvEngine.ts','utf8')).filter(u=>u.functionName==='calculateStringSizing'&&expressions.has(u.expression))));
"""
units = json.loads(subprocess.run(['npx', 'tsx', '-e', inventory], check=True, capture_output=True, text=True).stdout)
assert len(units) == 7, 'String expressions changed; review generator cases before updating fixtures' 
for unit in units:
    # One impossible configuration specifically witnesses the zero upper bound.
    limit = 48 if unit['expression'] == 'Math.max(0,maxModules)' else 600
    req = dict(panelVoc=60, panelVmp=50, tempMinC=0, tempMaxC=25,
               betaVocPerC=-.0028, betaPmpPerC=-.0035,
               inverterVdcMax=limit, inverterMpptMin=100, inverterMpptMax=550)
    cold_voc = D(60) * (1 + D('-.0028') * D(-25))
    cold_vmp = D(50) * (1 + D('-.0035') * D(-25))
    hot_vmp = D(50)
    # Exhaustively enumerate positive integers instead of reproducing floor/ceil code.
    minimum = next(n for n in range(1, 201) if n * hot_vmp >= 100)
    allowed = [n for n in range(1, 201) if n*cold_voc <= limit and n*cold_vmp <= 550]
    maximum = allowed[-1] if allowed else 0
    warnings = ['Vmp temperature coefficient is approximated from Pmp/Voc; verify against manufacturer data.']
    if minimum > maximum:
        warnings.append('Minimum required modules exceeds maximum allowed string voltage.')
    result = dict(minModules=minimum, maxModules=maximum,
                  status='infeasible' if minimum > maximum else 'feasible',
                  hasWarning=bool(warnings), warnings=warnings, effectiveCellTempMaxC=25)
    ref = dict(title="OpenStax University Physics Volume 2: Kirchhoff's Rules",
               url='https://openstax.org/books/university-physics-volume-2/pages/10-3-kirchhoffs-rules',
               version='2016', locator='10.3 Multiple Voltage Sources: series voltages add. Integer feasibility under supplied voltage limits; assumed linear coefficients are not validated here. Warnings/status are API contracts only.')
    filename = 'scripts/fixtures/physics/priority-string-'+unit['formulaId'].split('#')[-1]+'.json'
    fixture = dict(schemaVersion=1, formulaId=unit['formulaId'], independentOfImplementation=True,
                   productionExport='calculateStringSizing', inputs=[req], expected=result,
                   independentCalculation='scripts/fixtures/generate-priority-strings.py uses independent Decimal series-voltage addition and exhaustive integer enumeration, not the production floor/ceil implementation. This verifies feasibility under assumed voltage/temperature inputs only, not standards compliance or measured coefficients.',
                   tolerances=dict(absolute=1e-10, relative=0), referenceSource=ref)
    Path(filename).write_text(json.dumps(fixture, indent=2)+'\n')
    manifest['fixtures'] = [r for r in manifest['fixtures'] if r['formulaId'] != unit['formulaId']]
    manifest['fixtures'].append(dict(formulaId=unit['formulaId'], fixtureFile=filename,
                                     productionExport='calculateStringSizing', referenceTitle=ref['title'],
                                     referenceUrl=ref['url'], referenceVersion=ref['version'], referenceLocator=ref['locator']))
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
# Preserve the existing grid-ledger manifest ordering/serialization contract.
subprocess.run([sys.executable, 'scripts/fixtures/physics/generate-grid-import-ledger.py'], check=True)
