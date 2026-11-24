"""Actual PV ICE selected-material replay and declared-inventory reconciliation."""
import contextlib
import io
import math
import re
import tempfile
from .reference_models import ROOT,DATA,evidence,runtime,restore_directory
from .science_d import header
from .portfolio import numeric_fields,integer,result
from .electrical import keys

MATERIALS=('glass','silicon','silver','copper','aluminium_frames','encapsulant','backsheet')
FIELDS=dict(manufacturingInputKg='mat_Manufacturing_Input',usedInModulesKg='mat_UsedSuccessfullyinModuleManufacturing',remfgYieldKg='mat_reMFG_yield',scrapKg='mat_MFG_Scrap',virginStockKg='mat_Virgin_Stock',landfillKg='mat_Total_Landfilled',eolLandfillKg='mat_Total_EOL_Landfilled',manufacturingLandfillKg='mat_Total_MFG_Landfilled')
METRICS=('virginStockKg','landfillKg','usedInModulesKg')


def inventory_header(p):
    header(p,'pvice-inventory-v1',('installationScale','materials','inventory'))
    numeric_fields(p,dict(installationScale=(.001,10)))
    selected=p['materials']
    if not isinstance(selected,list) or not 1<=len(selected)<=7 or any(not isinstance(n,str) or n not in MATERIALS for n in selected) or len(set(selected))!=len(selected):raise ValueError('Unique registered materials')
    inventory=p['inventory']
    if inventory is not None:
        keys(inventory,('schemaVersion','source','documentSha256','contextSha256','unit','boundary','observations'))
        if inventory['schemaVersion']!='declared-material-inventory-v1' or inventory['unit']!='kg' or inventory['boundary']!='annual_selected_material_flows':raise ValueError('Version, kg and annual selected-material flow boundary required')
        if not isinstance(inventory['source'],str) or not 10<=len(inventory['source'].strip())<=1000:raise ValueError('Inventory provenance')
        for field in ['documentSha256','contextSha256']:
            if not isinstance(inventory[field],str) or not re.fullmatch('[a-f0-9]{64}',inventory[field]):raise ValueError('Inventory hash')
        rows=inventory['observations']
        if not isinstance(rows,list) or not 1<=len(rows)<=100:raise ValueError('Observation budget')
        seen=set()
        for r in rows:
            keys(r,('year','material','metric','observedKg','absoluteToleranceKg'));integer(r['year'],1995,2050);numeric_fields(r,dict(observedKg=(0,1e15),absoluteToleranceKg=(0,1e12)))
            if r['material'] not in selected or r['metric'] not in METRICS:raise ValueError('Selected material and registered mass metric required')
            key=(r['year'],r['material'],r['metric'])
            if key in seen:raise ValueError('Duplicate inventory observation')
            seen.add(key)
    return inventory


def pvice_inventory(p):
    inventory=inventory_header(p)
    paths=['docs/reference-data/pvice/us-module.csv']+['docs/reference-data/pvice/us-'+n+'.csv' for n in p['materials']]+['docs/reference-data/pvice/LICENSE.txt','docs/reference-data/pvice/material-summary.json'];hashes=evidence(paths)
    import PV_ICE
    engine=runtime('PV_ICE','0.4.3',PV_ICE.main);materials=[]
    with tempfile.TemporaryDirectory(prefix='solarpv-inventory-') as directory,restore_directory(),contextlib.redirect_stdout(io.StringIO()):
        sim=PV_ICE.Simulation(name='inventory',path=directory,baselinepath=str(DATA/'pvice'));sim.createScenario('fixed',massmodulefile=str(DATA/'pvice/us-module.csv'));s=sim.scenario['fixed'];s.dataIn_m['new_Installed_Capacity_[MW]']*=p['installationScale']
        for name in p['materials']:s.addMaterial(name,massmatfile=str(DATA/'pvice'/('us-'+name+'.csv')))
        sim.calculateMassFlow()
        for name in p['materials']:
            trace=[]
            for i,row in s.material[name].matdataOut_m.iterrows():
                v={k:float(row[col])/1000 for k,col in FIELDS.items()}
                if any(not math.isfinite(x) or x< -1e-6 for x in v.values()):raise ValueError('Nonphysical material flow')
                m=v['manufacturingInputKg']+v['remfgYieldKg']-v['usedInModulesKg']-v['scrapKg'];land=v['landfillKg']-v['eolLandfillKg']-v['manufacturingLandfillKg']
                if abs(m)>1e-8*max(1,v['manufacturingInputKg']) or abs(land)>1e-8*max(1,v['landfillKg']):raise ValueError('Material stage ledger')
                trace.append(dict(year=int(s.dataIn_m.loc[i,'year']),installedMw=float(s.dataIn_m.loc[i,'new_Installed_Capacity_[MW]']),areaM2=float(s.dataOut_m.loc[i,'Area']),**v,manufacturingResidualKg=m,landfillResidualKg=land))
            materials.append(dict(material=name,trace=trace,totals={k:math.fsum(r[k] for r in trace) for k in FIELDS}))
    by_key={(r['year'],m['material']):r for m in materials for r in m['trace']}
    if inventory and any((r['year'],r['material']) not in by_key for r in inventory['observations']):raise ValueError('Inventory year outside frozen baseline')
    comparisons=[];state='not_provided'
    if inventory:
        state='context_mismatch'
        if inventory['contextSha256']==p['contextSha256']:
            for r in inventory['observations']:
                model=by_key[r['year'],r['material']][r['metric']];residual=model-r['observedKg'];comparisons.append(dict(**r,modelKg=model,residualKg=residual,withinTolerance=abs(residual)<=r['absoluteToleranceKg']))
            state='within_declared_tolerance' if all(r['withinTolerance'] for r in comparisons) else 'outside_declared_tolerance'
    return result(p,'pvice_inventory',dict(runtime=engine,referenceHashes=hashes,materials=materials,selectedMaterialTotals={k:math.fsum(m['totals'][k] for m in materials) for k in FIELDS},reconciliation=dict(status=state,comparisons=comparisons,provenanceStatus='caller_declared_not_independently_verified'),scope='Actual PV ICE selected c-Si baseline materials; annual flows kg, not measured site BOM or whole-module composition. Two stage ledgers only, not full global cohort closure. Inventory matching checks declared context and boundary, not authenticity. Tolerance is a decision threshold, not statistical uncertainty. No LCA, carbon credits, costs, finance or energy adoption.'),'insufficient_evidence')
