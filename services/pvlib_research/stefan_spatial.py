"""Conservative 1D isothermal enthalpy kernel, not a qualified PCM device model."""
import argparse
import json
import math
import sys
import numpy as np
from .science_c import header,output
from .portfolio import numeric_fields,integer


def stefan_spatial(p):
    header(p,'stefan-spatial-v1',('lengthM','cells','durationS','fourier','conductivityWmK','densityKgm3','heatCapacityJkgK','latentHeatJkg','meltingK','wallK'))
    numeric_fields(p,dict(lengthM=(.001,10),durationS=(0,1e7),fourier=(.01,.3),conductivityWmK=(.001,1000),densityKgm3=(1,30000),heatCapacityJkgK=(1,1e5),latentHeatJkg=(1,1e7),meltingK=(1,3000),wallK=(1,4000)))
    integer(p['cells'],8,512)
    if p['wallK']<=p['meltingK']:raise ValueError('Melting requires wallK > meltingK')
    dx=p['lengthM']/p['cells'];rho=p['densityKgm3'];cp=p['heatCapacityJkgK'];k=p['conductivityWmK'];latent=p['latentHeatJkg'];tm=p['meltingK'];tw=p['wallK'];duration=p['durationS']
    stable_dt=p['fourier']*rho*cp*dx*dx/k
    steps=math.ceil(duration/stable_dt)
    if steps>200000 or steps*p['cells']>20000000:raise ValueError('Spatial/time work budget exceeded')
    dt=duration/steps if steps else 0
    h=np.zeros(p['cells']);integral=0.0
    for _ in range(steps):
        temperature=tm+np.maximum(h-latent,0)/cp
        flux=np.zeros(p['cells']+1);flux[0]=2*k*(tw-temperature[0])/dx;flux[1:-1]=-k*np.diff(temperature)/dx
        h+=dt*(flux[:-1]-flux[1:])/(rho*dx)
        integral+=dt*float(flux[0])
    temperature=tm+np.maximum(h-latent,0)/cp;fraction=np.clip(h/latent,0,1);stored=rho*dx*math.fsum(h)
    if not np.all(np.isfinite(h)) or np.min(h)<-1e-8 or np.max(temperature)>tw+1e-8:raise RuntimeError('Enthalpy positivity/maximum principle')
    residual=stored-integral
    if abs(residual)>1e-10*max(1,abs(stored),abs(integral)):raise RuntimeError('Conservation failure')
    data=dict(method='explicit-cell-centered-enthalpy-v1',steps=steps,stepS=dt,dxM=dx,xM=((np.arange(p['cells'])+.5)*dx).tolist(),temperatureK=temperature.tolist(),specificEnthalpyJkg=h.tolist(),liquidFraction=fraction.tolist(),equivalentMeltDepthM=dx*math.fsum(fraction),storedJm2=stored,boundaryInputJm2=integral,residualJm2=residual,rightBoundary='insulated',initialState='solid_at_melting_temperature',semiInfiniteComparisonEligible=bool(h[-1]==0 and dx*math.fsum(fraction)<.5*p['lengthM']))
    return output(p,'stefan_spatial',data,'1D constant-property conduction-only isothermal melting; finite insulated domain; no convection, volume change, supercooling, PV-T/PEM coupling or field calibration. Equivalent melt depth is liquid volume per unit area, not a sharp-front reconstruction.')


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--enable-research',action='store_true');args=parser.parse_args()
    if not args.enable_research:parser.error('Research disabled; explicit --enable-research required')
    raw=sys.stdin.read(65537)
    if len(raw)>65536:raise ValueError('Input budget')
    p=json.loads(raw,parse_constant=lambda _:(_ for _ in ()).throw(ValueError('Nonfinite JSON')))
    print(json.dumps(stefan_spatial(p),allow_nan=False))


if __name__=='__main__':main()
