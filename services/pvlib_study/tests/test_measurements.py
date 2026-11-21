"""Imported observations are independent declared data, never physical inputs."""
import copy
import hashlib
import json
import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from test_worker import BASE,worker
from test_inverter_blocks import request as blocks_request
from test_multi_mppt import request as mppt_request

ROOT=Path(__file__).resolve().parents[3]
def dataset():
    d=json.loads((ROOT/'docs/examples/measurement-manifest.synthetic.json').read_text())
    raw=(ROOT/'docs/examples/measurement-observations.synthetic.csv').read_text()
    d['records']=[]
    for line in raw.splitlines()[1:]:
        t,value,flag,reason=line.split(',');r=dict(timestamp=t,value=float(value) if value else None,qualityFlag=flag)
        if reason:r['reason']=reason
        d['records'].append(r)
    d['importTrace']=dict(schemaVersion='measurement-csv-receipt-v1',rawCsv=raw,rawCsvSha256=hashlib.sha256(raw.encode()).hexdigest())
    return d

def measured(base=BASE):
    r=copy.deepcopy(base);r['measurements']=[dataset()];return r

class MeasurementTests(unittest.TestCase):
    def test_preservation_and_no_physical_effect(self):
        for base in [BASE,blocks_request(),mppt_request()]:
            r=measured(base);a=worker.run_study(r);b=worker.run_study(base)
            self.assertEqual(a['request']['measurements'],r['measurements'])
            for key in ('samples','summary','monthly'):self.assertEqual(a[key],b[key])
            for child in a.get('blockResults',[]):self.assertNotIn('measurements',child['request'])
        self.assertIsNone(r['measurements'][0]['records'][2]['value'])
        self.assertEqual(r['measurements'][0]['records'][0]['value'],0)

    def test_sparse_outside_and_equivalent_offset_supported(self):
        r=measured();d=r['measurements'][0];d.pop('importTrace')
        d['records'][0]['timestamp']='2017-04-01T10:00:00-07:00'
        worker.validate(r)
        self.assertEqual(len(d['records']),5)
        d['records'][0]['timestamp']='2017-04-01T17:01:00Z'
        with self.assertRaises(worker.InputError):worker.validate(r)

    def test_invalid_contracts(self):
        patches=[lambda d:d.update(siteLatitude=1),lambda d:d.update(intervalMinutes=15),lambda d:d.update(statistic='instantaneous'),lambda d:d.update(unit='Wh'),lambda d:d.update(source=' '),lambda d:d.update(quality='weather_provider'),lambda d:d.update(records=list(reversed(d['records']))),lambda d:d['records'][0].update(timestamp=d['records'][1]['timestamp']),lambda d:d['records'][0].update(value=True),lambda d:d['records'][0].update(value=-1),lambda d:d['records'][0].update(value=1e9),lambda d:d['records'][0].update(value=None),lambda d:d['records'][2].update(value=0),lambda d:d['records'][2].pop('reason'),lambda d:d.update(modelPoint='reference_cell_temperature'),lambda d:d['records'][0].update(extra=1)]
        for patch in patches:
            r=measured();d=r['measurements'][0];d.pop('importTrace');patch(d)
            with self.subTest(dataset=d),self.assertRaises(worker.InputError):worker.validate(r)
        r=measured();r['measurements']*=2
        with self.assertRaises(worker.InputError):worker.validate(r)

    def test_receipt_tamper_rehashed_disagreement_and_crlf(self):
        r=measured();tr=r['measurements'][0]['importTrace'];tr['rawCsv']=tr['rawCsv'].replace('\n','\r\n');tr['rawCsvSha256']=hashlib.sha256(tr['rawCsv'].encode()).hexdigest();worker.validate(r)
        tr['rawCsv']=tr['rawCsv'].replace(',1.2,',',2.2,');tr['rawCsvSha256']=hashlib.sha256(tr['rawCsv'].encode()).hexdigest()
        with self.assertRaises(worker.InputError):worker.validate(r)
        r=measured();r['measurements'][0]['importTrace']['rawCsvSha256']='0'*64
        with self.assertRaises(worker.InputError):worker.validate(r)

    def test_signed_net_temperature_and_excluded_values(self):
        r=measured();d=r['measurements'][0];d.pop('importTrace');d['modelPoint']='plant_net_grid';d['records'][0]['value']=-2;worker.validate(r)
        d.update(modelPoint='reference_cell_temperature',unit='degC')
        for row in d['records']:
            if row['value'] is not None and row['qualityFlag']=='valid':row['value']=-10
        worker.validate(r)
        d['records'][0]['value']=151
        with self.assertRaises(worker.InputError):worker.validate(r)

    def test_total_record_budget_and_output_bounds(self):
        r=measured();d=r['measurements'][0];d.pop('importTrace');start=datetime(2017,1,1,tzinfo=timezone.utc)
        # Two bounded 8784-record series, same UTC grid; outside study period is retained, not filled.
        d['records']=[dict(timestamp=(start+timedelta(hours=i+1)).isoformat(),value=0,qualityFlag='valid') for i in range(8784)]
        other=copy.deepcopy(d);other['id']='second';r['measurements'].append(other)
        worker.validate(r);out=worker.run_study(r);self.assertLess(len(json.dumps(out).encode()),16*1024*1024)
        other['records'].append(dict(timestamp=(start+timedelta(hours=8785)).isoformat(),value=0,qualityFlag='valid'))
        with self.assertRaises(worker.InputError):worker.validate(r)
