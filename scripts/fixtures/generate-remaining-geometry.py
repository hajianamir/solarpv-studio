"""Pinned independent pvlib geometry oracle, no TS imports/outputs or network.
Requires pvlib==0.13.1. Tests geometric model components, NOT annual/site yield.
"""
import json
from pathlib import Path
import pvlib
assert pvlib.__version__ == '0.13.1'
rows=[]
for tilt in [0,5]:
    for gcr in [.2,.4,.6]:
        for maximum in [45,60,90]:
            for backtrack in [False,True]:
                for zenith in [10,30,60,80,89]:
                    for azimuth in [45,90,135,180,225,270,315]:
                        tracker=pvlib.tracking.singleaxis(zenith,azimuth,axis_tilt=tilt,axis_azimuth=0,max_angle=maximum,backtrack=backtrack,gcr=gcr)
                        rotation=float(tracker['tracker_theta'][0])
                        shade=float(pvlib.shading.shaded_fraction1d(zenith,azimuth,0,rotation,collector_width=1,pitch=1/gcr,axis_tilt=tilt,surface_to_axis_offset=0,cross_axis_slope=0))
                        rows.append(dict(zenith=zenith,azimuth=azimuth,axisTilt=tilt,gcr=gcr,maximum=maximum,backtrack=backtrack,rotation=rotation,shade=shade))
rear=[]
for tilt in [0,30,60,90]:
    for azimuth in [0,90,180,270]:
        for sunaz in [0,90,180,270]:
            for dni in [0,800]:
                expected=float(pvlib.irradiance.beam_component(180-tilt,(azimuth+180)%360,60,sunaz,dni))
                rear.append(dict(tilt=tilt,azimuth=azimuth,sunaz=sunaz,zenith=60,dni=dni,direct=expected))
Path('benchmarks/independent/remaining-geometry.json').write_text(json.dumps(dict(reference='pvlib 0.13.1 singleaxis + shading.shaded_fraction1d (Anderson & Jensen 2024 Eq12); rear beam_component using reversed normal; identical rows, zero cross-axis slope/offset; not field validation',tracker=rows,rear=rear),indent=2)+'\n')
print(len(rows),'tracker and',len(rear),'rear-beam cases')
