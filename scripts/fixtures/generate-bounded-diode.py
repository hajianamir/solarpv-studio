"""Offline independent pvlib0.13.1 oracle for explicit reference diode solver.

No production TypeScript imports, execution or numerical targets. Source-pinned
upstream parameter vectors; De Soto translation and Bishop88/brentq reference
solving. Contract rejection/budget vectors are specification tests, not physical data.
High-Rsh endpoint uses a separately labeled Decimal ideal-Voc limit because
external floating-point solvers fail there; no failed external run is adopted.
"""
from pathlib import Path
import json,sys,hashlib

def offline(event,args):
    if event in {'socket.connect','socket.getaddrinfo','socket.sendto','socket.bind'}:
        raise RuntimeError('Offline oracle forbids '+event)
sys.addaudithook(offline)
import numpy as np
import pvlib
import scipy
from scipy.optimize import brentq
assert pvlib.__version__=='0.13.1'
assert np.__version__=='2.2.6'
assert scipy.__version__=='1.15.3'
OUT=Path('scripts/fixtures/physics')
IDENT=dict(modelPolicy='desoto_reference_bounded_v1',financialAdoptionEligible=False)
SOURCE=dict(title='pvlib0.13.1 De Soto translation and Bishop88 bounded implicit single diode reference',url='https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/singlediode.py',version='pvlib0.13.1; scipy1.15.3; upstream test vectors conftest.py',locator='bishop88, bishop88_v_from_i, bishop88_mpp; pvsystem.calcparams_desoto/singlediode. Diode voltage x=V+I*Rs; I/V/P and dp/dx from independent reference. Per-module STC to string conditions. Contract/budget vectors and Decimal ideal-Voc limiting witness are separately labeled; not external whole-model validation.')
MODULES=[dict(id='cec_module_params',il=7.545,io=1.94e-9,rs=.094,rsh=15.72,a=.473,alpha=.003),dict(id='cec_module_cs5p_220m',il=5.114,io=8.196e-10,rs=1.065,rsh=381.68,a=2.6373,alpha=.004539)]
pools={k:[] for k in ['translateReferenceDiode','evaluateDiodeState','solveBoundedDiodeRoot','evaluateReferenceDiode']}
cases=[]
def state(p,x):
    b=pvlib.singlediode.bishop88(x,p['iph'],p['i0'],p['rs'],p['rsh'],p['a'],gradients=True)
    return dict(current=float(b[0]),voltage=float(b[1]),power=float(b[2]),powerDerivative=float(b[6]*b[4]))
def parameter_case(p,identity):
    exact=pvlib.pvsystem.singlediode(p['iph'],p['i0'],p['rs'],p['rsh'],p['a'],method='brentq')
    roots=dict(voc=float(exact['v_oc']),isc=float(exact['i_sc']*p['rs']),mpp=float(exact['v_mp']+exact['i_mp']*p['rs']))
    for target,x in roots.items():pools['solveBoundedDiodeRoot'].append(dict(inputs=[p,target,128],expected=x))
    for x in [0,roots['voc']/2,roots['mpp'],roots['voc']]:pools['evaluateDiodeState'].append(dict(inputs=[p,x],expected=state(p,x)))
    return dict(IDENT,status='available',parameters=p,voc=float(exact['v_oc']),isc=float(exact['i_sc']),vmp=float(exact['v_mp']),imp=float(exact['i_mp']),pmp=float(exact['p_mp']),residuals=dict(openCircuitAmps=0,shortCircuitVolts=0,mppDerivativeAmps=0))
for m in MODULES:
    for g in [50,200,1000,1400]:
        for temp in [-20,25,85]:
            for n in [1,12,100]:
                inp=dict(modelPolicy=IDENT['modelPolicy'],reference=dict(basis='per_module_stc',photocurrentA=m['il'],saturationCurrentA=m['io'],seriesResistanceOhm=m['rs'],shuntResistanceOhm=m['rsh'],diodeFactorV=m['a'],alphaScAperC=m['alpha'],referenceCellTempC=25,referenceIrradianceWm2=1000,bandgapEv=1.121,bandgapTemperatureCoefficientPerK=-.0002677,provenance=dict(source='pvlib0.13.1 tests/conftest.py (test vector, not verified catalog)',recordId=m['id'])),conditions=dict(effectiveIrradianceWm2=g,cellTempC=temp,seriesModules=n),iterationLimit=128)
                il,io,rs,rsh,a=pvlib.pvsystem.calcparams_desoto(g,temp,m['alpha'],m['a'],m['il'],m['io'],m['rsh'],m['rs'],EgRef=1.121,dEgdT=-.0002677)
                p=dict(iph=float(il),i0=float(io),rs=float(rs*n),rsh=float(rsh*n),a=float(a*n))
                expected=parameter_case(p,m['id']);expected['input']=inp
                pools['translateReferenceDiode'].append(dict(inputs=[inp],expected=p))
                case=dict(id=f"{m['id']}-G{g}-T{temp}-N{n}",inputs=[inp],expected=expected)
                pools['evaluateReferenceDiode'].append(dict(inputs=[inp],expected=expected));cases.append(case)
# Additional external root/state regimes, including exact-zero Rs and high-Rsh endpoint.
for j,p in enumerate([dict(iph=5.,i0=1e-9,rs=0.,rsh=500.,a=2.),dict(iph=.01,i0=1e-15,rs=4.,rsh=10000.,a=1.2)]):parameter_case(p,f'extra-{j}')
# High-Rsh numerical endpoint: independent Decimal ideal-Voc limit. Finite
# shunt perturbation below1e-290 V, negligible versus declared comparison budget.
from decimal import Decimal as D, getcontext
getcontext().prec=60
pools['solveBoundedDiodeRoot'].append(dict(inputs=[dict(iph=5.,i0=1e-9,rs=.1,rsh=1e300,a=2.),'voc',128],expected=float(2*(D(1)+D(5)/D('1e-9')).ln())))
# Analytic two-bisection-step witness: ideal upper=4 and physical Voc=1.
# Isolates iteration initial value/update/budget sensitivity without TS outputs.
analytic=dict(iph=float(np.expm1(4.)),i0=1.,rs=0.,rsh=float(1/(np.expm1(4.)-np.expm1(1.))),a=1.)
pools['solveBoundedDiodeRoot'] += [dict(inputs=[analytic,'voc',2],expected=1.),dict(inputs=[analytic,'voc',1],expected=None)]
# Iteration-boundary characterization uses the external Bishop88 function and
# declared bisection residual policy; successful expected roots come from Brent,
# not this bisection or production outputs. These are solver-policy evidence.
budget_p=pools['translateReferenceDiode'][2]['expected']
for target in ['voc','isc','mpp']:
    reference=pvlib.pvsystem.singlediode(budget_p['iph'],budget_p['i0'],budget_p['rs'],budget_p['rsh'],budget_p['a'],method='brentq')
    expected_root=float(reference['v_oc'] if target=='voc' else reference['i_sc']*budget_p['rs'] if target=='isc' else reference['v_mp']+reference['i_mp']*budget_p['rs'])
    for budget in range(1,65):
        lo=0.;hi=float(budget_p['a']*np.log1p(budget_p['iph']/budget_p['i0']))
        key='current' if target=='voc' else 'voltage' if target=='isc' else 'powerDerivative'
        fl=state(budget_p,lo)[key]
        tol=1e-10+1e-12*(hi if target=='isc' else budget_p['iph'])
        converged=False
        for _ in range(budget):
            mid=lo+(hi-lo)/2;fm=state(budget_p,mid)[key]
            if abs(fm)<=tol:converged=True;break
            if np.sign(fm)==np.sign(fl):lo=mid;fl=fm
            else:hi=mid
        pools['solveBoundedDiodeRoot'].append(dict(inputs=[budget_p,target,budget],expected=expected_root if converged else None))
# Specified fail-closed boundary cases, not numerical reference accuracy claims.
pools['solveBoundedDiodeRoot'].append(dict(inputs=[dict(iph=1e-300,i0=1e300,rs=0,rsh=1,a=1),'voc',128],expected=None))
base=cases[0]['inputs'][0]
import copy
for g in [0]:
    inp=copy.deepcopy(base);inp['conditions']['effectiveIrradianceWm2']=g
    pools['evaluateReferenceDiode'].append(dict(inputs=[inp],expected=dict(IDENT,status='dark',input=inp,voc=0,isc=0,vmp=0,imp=0,pmp=0)))
inp=copy.deepcopy(base);inp['iterationLimit']=1
pools['evaluateReferenceDiode'].append(dict(inputs=[inp],expected=dict(IDENT,status='unavailable',reason='not_converged')))
inp=copy.deepcopy(base);inp['reference']['alphaScAperC']=100
pools['evaluateReferenceDiode'].append(dict(inputs=[inp],expected=dict(IDENT,status='unavailable',reason='numerical_domain')))
pools['evaluateReferenceDiode'].append(dict(inputs=[{}],expected=dict(IDENT,status='unavailable',reason='invalid_input')))
for owner,rows in pools.items():
    for row in rows:
        kind='independent_component'
        if owner=='solveBoundedDiodeRoot':
            if row['inputs'][0]['rsh']==1e300:kind='analytical_decimal_limit'
            elif row['inputs'][2]!=128:kind='independent_solver_policy'
            elif row['expected'] is None:kind='numerical_domain_contract'
        elif owner=='evaluateReferenceDiode' and row['expected']['status']!='available':kind='result_boundary_contract'
        row['evidenceClass']=kind
meta=dict(schemaVersion=1,independentOfImplementation=True,independentCalculation=__doc__,referenceSource=SOURCE,referenceRuntimeSha256={k:hashlib.sha256(Path(v.__file__).read_bytes()).hexdigest() for k,v in [('pvsystem',pvlib.pvsystem),('singlediode',pvlib.singlediode)]})
result=dict(meta,cases=cases,pools=pools,tolerances=dict(absolute=2e-7,relative=1e-8))
file=OUT/'bounded-diode-pvlib.json';text=json.dumps(result,indent=2,allow_nan=False)+'\n'
if '--check' in sys.argv:assert file.read_text()==text,'Bounded diode independent reference drift; investigate before regenerating'
else:file.write_text(text)
print(f'Independent pvlib: {len(cases)} end-to-end cases; '+', '.join(f'{k}={len(v)}' for k,v in pools.items()))
