"""Pinned offline pvlib oracle for U05 reference-parameter specialization.

Install the repository's services/pvlib_study/requirements.txt in an isolated
Python environment first. No network, TypeScript imports/execution or production
outputs are used by this generator. Upstream test vectors are not a live catalog
or certification. No CEC Adjust is applied: this explicitly tests De Soto.
"""
from pathlib import Path
import hashlib
import json
import platform
import sys
# Benchmark acquisition is explicit; this oracle is offline after installation.
def deny_network(event, args):
    if event in {'socket.connect', 'socket.getaddrinfo', 'socket.sendto', 'socket.bind'}:
        raise RuntimeError('Offline reference generator forbids network operation: ' + event)
sys.addaudithook(deny_network)
import numpy as np
import pvlib
import scipy
assert pvlib.__version__ == '0.13.1'
assert np.__version__ == '2.2.6'
assert scipy.__version__ == '1.15.3'
BASE='https://github.com/pvlib/pvlib-python/blob/v0.13.1/'
# Literal upstream tests/conftest.py vectors, not fitted to this application's outputs.
MODULES=[
 dict(id='cec_module_params',ns=18,area=.67,voc=10.4,isc=7.5,vmp=8.4,imp=6.6,alpha=.003,beta=-.04,a=.473,iph=7.545,i0=1.94e-9,rs=.094,rsh=15.72),
 dict(id='cec_module_cs5p_220m',ns=96,area=1.7,voc=59.4,isc=5.1,vmp=46.9,imp=4.69,alpha=.004539,beta=-.22216,a=2.6373,iph=5.114,i0=8.196e-10,rs=1.065,rsh=381.68),
]
rows=[]
for m in MODULES:
    for g in [50,200,1000,1400]:
        for temp in [-20,25,85]:
            for series in [1,12]:
                # Inverse of the declared legacy ideality/thermal product,
                # matching external a_ref, not numerically fitting a curve.
                n=m['a']/(m['ns']*1.380649e-23*298.15/1.60217663e-19)
                inputs=[m['voc'],m['isc'],m['vmp'],m['imp'],m['vmp']*m['imp'],100*m['beta']/m['voc'],100*m['alpha']/m['isc'],-.3,g,temp,series,
                        dict(iph=m['iph'],i0=m['i0'],rs=m['rs']*series,rsh=m['rsh']*series,n=n,cellsPerModule=m['ns'],moduleAreaM2=m['area'])]
                il,io,rs,rsh,a=pvlib.pvsystem.calcparams_desoto(g,temp,m['alpha'],m['a'],m['iph'],m['i0'],m['rsh'],m['rs'],EgRef=1.121,dEgdT=-.0002677)
                rs*=series;rsh*=series;a*=series
                exact=pvlib.pvsystem.singlediode(il,io,rs,rsh,a,method='brentq')
                volts=np.linspace(0,exact['v_oc'],81)
                currents=pvlib.pvsystem.i_from_v(volts,il,io,rs,rsh,a,method='brentq')
                power=volts*currents
                index=int(np.argmax(power))
                expected=dict(iph=float(il),i0=float(io),rs=float(rs),rsh=float(rsh),nNsVth=float(a),voc=float(exact['v_oc']),isc=float(exact['i_sc']),vmp=float(exact['v_mp']),imp=float(exact['i_mp']),pmp=float(exact['p_mp']),voltages=volts.tolist(),currents=currents.tolist(),sampledVmp=float(volts[index]),sampledImp=float(currents[index]),sampledPmp=float(power[index]))
                rows.append(dict(id=f"{m['id']}-G{g}-T{temp}-N{series}",module=m['id'],inputs=inputs,expected=expected))
paths={'pvlib.pvsystem':Path(pvlib.pvsystem.__file__),'pvlib.singlediode':Path(pvlib.singlediode.__file__)}
x=dict(schemaVersion=1,model='explicit_reference_desoto_specialization_v1',reference=dict(version=pvlib.__version__,numpy=np.__version__,scipy=scipy.__version__,python=platform.python_version(),parameterSource=BASE+'tests/conftest.py',upstreamParameterSourceSha256='161c0305130313eb8e49ae57bacc22cef9fe6995c9b637d0304aa26a7666130e',parameterLocators=[m['id'] for m in MODULES],translationSource=BASE+'pvlib/pvsystem.py',solverSource=BASE+'pvlib/singlediode.py',runtimeSourceSha256={k:hashlib.sha256(v.read_bytes()).hexdigest() for k,v in paths.items()}),independentCalculation=__doc__,units='W/m2, degC, V, A, ohm, W; module STC reference parameters translated then series-scaled',limitations=['Externally supplied upstream test parameters, not independent fitting validation','No CEC Adjust, spectral model, shading/bypass circuit, annual weather or financial adoption','Reference exact MPP differs from legacy80step sampled MPP','Reference Isc is implicit diode root; legacy scalar Isc is an approximation'],tolerances=dict(parameterAbsolute=1e-12,parameterRelative=1e-6,roundedVoltageAbsolute=.005001,roundedCurrentAbsolute=.005001,roundedPowerAbsolute=.050001,roundedRelative=1e-6),cases=rows)
out=Path('benchmarks/independent/phase3-single-diode.json')
text=json.dumps(x,indent=2,allow_nan=False)+'\n'
if '--check' in sys.argv:
    assert out.read_text()==text, 'Reference changed: investigate version/source/input drift before regenerating'
else:
    out.write_text(text)
print(f'Generated {len(rows)} pinned independent reference-parameter cases; no production outputs or network.')
