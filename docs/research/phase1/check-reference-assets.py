"""Integrity and structural QC only; never certifies field applicability."""
import csv, hashlib, io, json, re
from pathlib import Path
manifest=json.loads(Path('docs/audit/PHASE1-ACQUISITIONS.json').read_text())
results=[]
for asset in manifest['assets']:
    if asset['status']!='downloaded':
        continue
    raw=Path(asset['localPath']).read_bytes()
    assert len(raw)==asset['bytes']
    assert hashlib.sha256(raw).hexdigest()==asset['sha256']
    result={'path':asset['localPath'],'integrity':'PASS'}
    if asset['upstreamPath'].endswith('.csv'):
        rows=list(csv.reader(io.StringIO(raw.decode('utf-8-sig'))))
        widths=sorted(set(map(len,rows)))
        result.update(recordsAfterFirstRow=len(rows)-1,rowWidths=widths,
                      blankCells=sum(cell=='' for row in rows[1:] for cell in row),
                      timestampOffsetPolicy='not_assumed',
                      fieldValidated=False)
        if asset['upstreamPath'].endswith(('rmis_weather_data.csv','snow_data.csv')):
            result['operationalImport']='BLOCKED: timestamps lack explicit offset; metadata required'
        if asset['upstreamPath'].endswith('PVsyst_demo_model.csv'):
            result['format']='multi-section model fixture; not rectangular timeseries'
        if asset['upstreamPath'].endswith('singleaxis_tracker_wslope.csv'):
            result['classification']='tracker algorithm reference, not measured actuator motion'
    results.append(result)
Path('docs/audit/PHASE1-ASSET-QC.json').write_text(json.dumps({'scope':'hash,byte-count,CSV structure only; no calibration or model acceptance','results':results},indent=2)+'\n')
print(f'{len(results)}/{len(results)} asset integrity checks PASS')
