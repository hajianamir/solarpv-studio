"""Independent pvlib0.13.1 component oracle; no production imports/outputs.
Solar NOAA vs SPA comparison budget0.1deg (different algorithms); IAM rounded
absolute5.01e-7. Polar vector direction is local north/east longitude convention,
not a physical unique geographic north at the exact pole. Not field validation.
"""
import json
from pathlib import Path
import pandas as pd
import pvlib
assert pvlib.__version__ == '0.13.1'
solar=[]
for lat in [89.999999,-89.999999,89.9,-89.9,35.69,0,-35]:
 for hour in [0,6,12,18]:
  date=pd.Timestamp(f'2025-06-21T{hour:02}:00:00Z')
  row=pvlib.solarposition.get_solarposition(pd.DatetimeIndex([date]),lat,0,method='nrel_numpy').iloc[0]
  solar.append(dict(input=[lat,0,date.timestamp()],azimuthDeg=float(row.azimuth),zenithDeg=float(row.zenith)))
iam=[dict(angle=a,b0=b,expected=float(pvlib.iam.ashrae(a,b))) for a in [0,30,60,85,86,87,88,89,90,95] for b in [.01,.02,.05]]
Path(__file__).with_name('audit-remaining-pvlib.json').write_text(json.dumps(dict(reference='pvlib0.13.1',limitations=__doc__,solar=solar,iam=iam),indent=2)+'\n')
print(f'PASS generated {len(solar)} independent SPA and {len(iam)} IAM vectors')
