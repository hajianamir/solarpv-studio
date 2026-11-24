"""Rebuild or verify data-derived example sections; no network and no new calibration."""
import argparse
import contextlib
import io
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def derived():
    import pvdeg
    import yaml
    weather,meta=pvdeg.weather.read(str(ROOT/'docs/reference-data/pvdeg/weather.csv'),'psm')
    with contextlib.redirect_stdout(io.StringIO()):
        poa=pvdeg.spectral.poa_irradiance(weather,meta)
        module=pvdeg.temperature.module(weather,meta,poa=poa)
        cell=pvdeg.temperature.cell(weather,meta,poa=poa)
        rh=pvdeg.humidity.surface_relative(rh_ambient=weather.relative_humidity,temp_ambient=weather.temp_air,temp_module=module)
    exposure=[dict(timestamp=t.isoformat(),irradianceWm2=float(poa.poa_global.iloc[i]),temperatureC=float(cell.iloc[i]),rhPct=float(rh.iloc[i])) for i,t in enumerate(weather.index[:24])]
    raw=yaml.safe_load((ROOT/'docs/reference-data/silicon/Green-2008.yml').read_text());table=[tuple(map(float,row.split())) for row in raw['DATA'][0]['data'].splitlines() if row.strip()];silicon=[r for r in table if .5<=r[0]<=1.1]
    return exposure,silicon


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');args=parser.parse_args();exposure,silicon=derived()
    path=ROOT/'docs/examples/references/pvdeg.json';pv=json.loads(path.read_text());path2=ROOT/'docs/examples/references/silicon.json';si=json.loads(path2.read_text());wave=[r[0]*1000 for r in silicon];n=[r[1] for r in silicon];k=[r[2] for r in silicon]
    if args.write:
        pv['plan']['temperatureBasis']='cell';pv['plan']['records']=exposure;path.write_text(json.dumps(pv,indent=2)+'\n')
        si['plan']['wavelengthNm']=wave;si['plan']['irradianceWm2Nm']=[.5]*len(wave)
        for layer in si['plan']['layers']:
            if layer['thicknessNm'] is not None:layer.update(n=n,k=k)
            else:layer.update(n=[layer['n'][0]]*len(wave),k=[layer['k'][0]]*len(wave))
        path2.write_text(json.dumps(si,indent=2)+'\n')
    else:
        if pv['plan']['temperatureBasis']!='cell' or pv['plan']['records']!=exposure or si['plan']['wavelengthNm']!=wave or si['plan']['layers'][1]['n']!=n or si['plan']['layers'][1]['k']!=k:raise ValueError('Derived reference example mismatch')
    print('PASS derived examples: explicit cell exposure/material RH and exact-grid compiled Si n/k')


if __name__=='__main__':main()
