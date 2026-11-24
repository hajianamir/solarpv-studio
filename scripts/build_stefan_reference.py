"""Independent high precision Neumann reference; explicit validation dependency mpmath==1.3.0.
No finite-volume kernel import; no network; no licensed PDF reproduction.
"""
import argparse
import hashlib
import json
from pathlib import Path
import mpmath as mp

ROOT=Path(__file__).resolve().parents[1]

def build():
    if mp.__version__!='1.3.0':raise RuntimeError('Reference requires mpmath1.3.0')
    mp.mp.dps=70
    p=json.loads((ROOT/'docs/examples/stefan/paraffin.json').read_text());n=lambda key:mp.mpf(str(p[key]));cp=n('heatCapacityJkgK');rho=n('densityKgm3');k=n('conductivityWmK');latent=n('latentHeatJkg');delta=n('wallK')-n('meltingK');alpha=k/(rho*cp);ste=cp*delta/latent
    lam=mp.findroot(lambda x:mp.sqrt(mp.pi)*x*mp.exp(x*x)*mp.erf(x)-ste,(mp.mpf('.1'),mp.mpf('1')))
    rows=[]
    for t in [2880,10800,21600,36000,57600]:
        scale=2*mp.sqrt(alpha*t);front=lam*scale;energy=2*k*delta*mp.sqrt(t/alpha)/(mp.sqrt(mp.pi)*mp.erf(lam))
        temperature=lambda x:n('wallK')-delta*mp.erf(x/scale)/mp.erf(lam) if x<front else n('meltingK')
        rows.append(dict(timeS=t,frontM=str(front),energyJm2=str(energy),temperatureK=[dict(xM=str(x),value=str(temperature(mp.mpf(str(x))))) for x in [0,.01,.02,.03,.04,.05,.06,.07]]))
    return dict(schemaVersion='neumann-reference-v1',sourceUrl='https://www.comsol.com/paper/download/62472/groulx_paper.pdf',sourceRole='equations 5-7 and Table 1 parameters; not digitized figure values or COMSOL output',licenseBoundary='Independent equation evaluation and factual parameter transcription only; PDF not redistributed',generator='mpmath1.3.0,70 decimal digits; findroot and erf independent of scipy/numpy solver',fixtureSha256=hashlib.sha256((ROOT/'docs/examples/stefan/paraffin.json').read_bytes()).hexdigest(),lambdaValue=str(lam),rows=rows)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');args=parser.parse_args();path=ROOT/'docs/examples/stefan/neumann-reference.json';raw=json.dumps(build(),indent=2)+'\n'
    if args.write:path.write_text(raw)
    elif path.read_text()!=raw:raise RuntimeError('Frozen Neumann reference differs')
    print('PASS independent 70-digit Neumann reference')
