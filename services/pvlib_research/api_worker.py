"""Fixed isolated stdin/stdout entry point; never accepts filesystem paths."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from services.pvlib_research.battery_protocol import battery_protocol
import json
import hashlib
from importlib.metadata import version
from services.pvlib_research.electrical import keys
from services.pvlib_research.advanced_thermal import simulate
from services.pvlib_research.diode_network import solve
from services.pvlib_research.integrated import run_integrated
from services.pvlib_research.interval_calibration import interval_calibration
from services.pvlib_research.pvt_pem_coupling import pvt_pem_coupled
from services.pvlib_research.material_inventory import pvice_inventory
from services.pvlib_research.incoherent_optics import incoherent_optics
from services.pvlib_research.stefan_spatial import stefan_spatial
from services.pvlib_research.applied_research import bill_local_ensemble, pv_lcoe_scenarios
from services.pvlib_research.reference_models import pvdeg_acceleration, pvice_massflow, coherent_optics
from services.pvlib_research.science_c import grid_support, agri_water, fpv_balance, pem_dispatch, pvt_pcm
from services.pvlib_research.science_d import degradation_exposure, circular_lca, bill_ensemble, grounded_scenario
from services.pvlib_research.science_b import oet_patch, tandem_spectrum
from services.pvlib_research.battery_pybamm import battery_pybamm
from services.pvlib_research.survival import cohort_survival
from services.pvlib_research.portfolio_advanced import uq_convergence, hybrid_design, twin_site_holdout
from services.pvlib_research.portfolio import project_uq, hybrid_sizing, batch_twin
from services.power_dynamics.dc_coupled import simulate as dc_coupled
from services.power_dynamics.electrochemistry import simulate as electrochemical_spm
from services.power_dynamics.control import simulate as dq_protection_control

def main():
    raw=sys.stdin.buffer.read(8*1024*1024+1)
    if len(raw)>8*1024*1024:raise ValueError('Request too large')
    def unique(pairs):
        obj={}
        for key,value in pairs:
            if key in obj:raise ValueError('Duplicate JSON key')
            obj[key]=value
        return obj
    request=json.loads(raw,object_pairs_hook=unique,parse_constant=lambda s:(_ for _ in ()).throw(ValueError('Nonfinite JSON')))
    keys(request,('operation','plan'))
    if version('pvlib')!='0.13.1':raise RuntimeError('Pinned pvlib required')
    functions={'battery_protocol':battery_protocol,'interval_calibration':interval_calibration,'pvt_pem_coupled':pvt_pem_coupled,'pvice_inventory':pvice_inventory,'incoherent_optics':incoherent_optics,'stefan_spatial':stefan_spatial,'bill_local_ensemble':bill_local_ensemble,'pv_lcoe_scenarios':pv_lcoe_scenarios,'pvdeg_acceleration':pvdeg_acceleration,'pvice_massflow':pvice_massflow,'coherent_optics':coherent_optics,'grid_support':grid_support,'agri_water':agri_water,'fpv_balance':fpv_balance,'pem_dispatch':pem_dispatch,'pvt_pcm':pvt_pcm,'degradation_exposure':degradation_exposure,'circular_lca':circular_lca,'bill_ensemble':bill_ensemble,'grounded_scenario':grounded_scenario,'oet_patch':oet_patch,'tandem_spectrum':tandem_spectrum,'battery_pybamm':battery_pybamm,'cohort_survival':cohort_survival,'uq_convergence':uq_convergence,'hybrid_design':hybrid_design,'twin_site_holdout':twin_site_holdout,'project_uq':project_uq,'hybrid_sizing':hybrid_sizing,'batch_twin':batch_twin,'integrated':run_integrated,'thermal_two_node':simulate,'diode_network':solve,'dc_coupled':dc_coupled,'electrochemical_spm':electrochemical_spm,'dq_protection_control':dq_protection_control}
    if request['operation'] not in functions:raise ValueError('Unknown operation')
    canonical=json.dumps(request,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)
    result=functions[request['operation']](request['plan'])
    manifest=dict(python=sys.version.split()[0],pvlib=version('pvlib'),numpy=version('numpy'),scipy=version('scipy'),codeSha256=hashlib.sha256(b''.join(path.read_bytes() for path in sorted(set(Path(__file__).parent.glob('*.py')) | set((Path(__file__).parents[1]/'power_dynamics').glob('*.py')) | set((Path(__file__).parents[1]/'pvlib_study').glob('*.py'))))).hexdigest())
    output=json.dumps(dict(schemaVersion='research-api-result-v1',operation=request['operation'],requestCanonicalJson=canonical,requestSha256=hashlib.sha256(canonical.encode()).hexdigest(),result=result,runtime=manifest),allow_nan=False,separators=(',',':'))
    if len(output.encode())>32*1024*1024:raise RuntimeError('Output budget')
    print(output)
if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,TypeError):
        print('{"code":"INVALID_INPUT"}');sys.exit(2)
    except Exception:
        print('{"code":"WORKER_FAILED"}');sys.exit(3)
