"""One-way interval-energy coupling; no thermal feedback or equipment qualification."""
import copy
import math
from .science_c import header,pvt_pcm,pem_dispatch,output
from .portfolio import numeric_fields
from .electrical import keys

PEM_FIELDS=('schemaVersion','source','contextSha256','intervalS','cells','reversibleV','activationV','exchangeCurrentA','resistanceOhm','maximumCurrentA','minimumCurrentA','rampAPerS','faradaicEfficiency','hydrogenHhvJMol','auxiliaryW','startupS','startupW')


def pvt_pem_coupled(p):
    header(p,'pvt-pem-coupled-v1',('areaM2','transferEfficiency','hydrogenToleranceKg','collector','electrolyzer'))
    numeric_fields(p,dict(areaM2=(.001,10000),transferEfficiency=(0,1),hydrogenToleranceKg=(1e-12,1)))
    c=p['collector'];e=p['electrolyzer'];keys(e,PEM_FIELDS)
    if not isinstance(c,dict) or c.get('contextSha256')!=p['contextSha256'] or e['contextSha256']!=p['contextSha256'] or c.get('intervalS')!=e['intervalS']:raise ValueError('Matched context and interval required')
    collector=pvt_pcm(c)
    if collector['output']['numericalGate']!='passed':raise ValueError('Collector refinement gate failed; no coupled output')
    area=p['areaM2'];eff=p['transferEfficiency'];dt=c['intervalS'];solutions=[]
    for label in ('coarse','fine'):
        records=[dict(timestamp=r['timestamp'],availableW=r['electricalJm2']*area*eff/dt) for r in collector['output'][label]['trace']]
        plan=copy.deepcopy(e);plan['records']=records;solutions.append(pem_dispatch(plan))
    coarse,fine=solutions;rows=[]
    for c_row,e_row in zip(collector['output']['fine']['trace'],fine['output']['trace']):
        electric=c_row['electricalJm2']*area;available=electric*eff;loss=electric-available;absorbed=c_row['absorbedJm2']*area;storage=c_row['storageJm2']*area;fluid=c_row['fluidJm2']*area;ambient=c_row['ambientJm2']*area
        residual=absorbed-storage-fluid-ambient-loss-e_row['auxiliaryJ']-e_row['startupJ']-e_row['curtailedJ']-e_row['chemicalHhvJ']-e_row['heatJ']
        scale=max(1,abs(absorbed),abs(storage)+abs(fluid)+abs(ambient)+abs(e_row['heatJ']))
        if abs(residual)>1e-7*scale:raise ValueError('Combined energy ledger')
        rows.append(dict(timestamp=c_row['timestamp'],collectorElectricJ=electric,transferredJ=available,transferLossJ=loss,absorbedJ=absorbed,collectorStorageJ=storage,fluidHeatJ=fluid,ambientHeatJ=ambient,pemAuxiliaryJ=e_row['auxiliaryJ'],pemStartupJ=e_row['startupJ'],pemCurtailedJ=e_row['curtailedJ'],chemicalHhvJ=e_row['chemicalHhvJ'],pemHeatJ=e_row['heatJ'],combinedResidualJ=residual))
    delta=abs(coarse['output']['hydrogenKg']-fine['output']['hydrogenKg']);fields=[k for k in rows[0] if k!='timestamp'];totals={k:math.fsum(r[k] for r in rows) for k in fields}
    return output(p,'pvt_pem_coupled',dict(collectorResult=collector,coarsePemResult=coarse,finePemResult=fine,trace=rows,totals=totals,hydrogenDeltaKg=delta,numericalGate='passed' if delta<=p['hydrogenToleranceKg'] else 'failed_refinement',thermalFeedback=False,powerAvailabilityBasis='interval_average_from_collector_energy'), 'One-way PV-T/PCM electrical interval-energy feed to isothermal PEM; constant mean power each interval is a scheduling approximation, not instantaneous feasibility. No feedwater preheating credit, thermal feedback, compressor/storage model, direct spatial Stefan coupling, experimental device validation, annual yield or economic adoption.')
