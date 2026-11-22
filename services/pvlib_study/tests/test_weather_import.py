"""Declared-unit receipt contracts. Synthetic source only, never provider validation."""
import copy
import hashlib
import json
import unittest
from test_worker import BASE,worker

def imported():
    r=copy.deepcopy(BASE);w=r['weather']
    m=dict(schemaVersion='declared-interval-weather-v1',source='SYNTHETIC source CSV',quality=w['quality'],sourceVersion='test-v1',reference='Synthetic fixture',site=r['site'],intervalMinutes=w['intervalMinutes'],timestampConvention='interval_end',variableSemantics='interval_mean',windHeightM=10,units=dict(ghi='W/m2',dni='W/m2',dhi='W/m2',tempAir='degC',windSpeed='m/s'))
    raw='timestamp,ghi,dni,dhi,tempAir,windSpeed\n'+'\n'.join(','.join(str(row[k]) for k in ('timestamp','ghiWm2','dniWm2','dhiWm2','tempAirC','windSpeedMs')) for row in w['records'])
    manifest=json.dumps(m);sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
    w['source']='declared-import csv:'+sha(raw)+'; manifest:'+sha(manifest)
    canonical=json.dumps(w)
    w['importTrace']=dict(schemaVersion='declared-weather-receipt-v1',rawCsv=raw,rawManifest=manifest,canonicalWeatherJson=canonical,rawCsvSha256=sha(raw),manifestSha256=sha(manifest),canonicalWeatherSha256=sha(canonical))
    return r

class WeatherImportTests(unittest.TestCase):
    def test_source_retained_and_canonical_numbers_unchanged(self):
        r=imported();a=worker.run_study(r);b=worker.run_study(BASE)
        for k in ('samples','summary','monthly'):self.assertEqual(a[k],b[k])
        self.assertEqual(a['request']['weather']['importTrace'],r['weather']['importTrace'])

    def test_receipt_raw_hash_and_canonical_corruption_rejected(self):
        for patch in [lambda r:r['weather']['importTrace'].update(rawCsv='changed'),lambda r:r['weather']['records'][0].update(tempAirC=-89),lambda r:r['weather']['importTrace'].update(canonicalWeatherSha256='0'*64),lambda r:r['site'].update(altitudeM=1)]:
            r=imported();patch(r)
            with self.assertRaises(worker.InputError):worker.validate(r)

    def test_rehashed_wrong_semantics_and_wrong_conversion_rejected(self):
        for key,value in [('variableSemantics','instantaneous'),('windHeightM',2),('timestampConvention','interval_start'),('units',dict(ghi='kW/m2',dni='W/m2',dhi='W/m2',tempAir='degC',windSpeed='m/s'))]:
            r=imported();tr=r['weather']['importTrace'];m=json.loads(tr['rawManifest']);m[key]=value;tr['rawManifest']=json.dumps(m);tr['manifestSha256']=hashlib.sha256(tr['rawManifest'].encode()).hexdigest();r['weather']['source']='declared-import csv:'+tr['rawCsvSha256']+'; manifest:'+tr['manifestSha256'];tr['canonicalWeatherJson']=json.dumps({k:v for k,v in r['weather'].items() if k!='importTrace'});tr['canonicalWeatherSha256']=hashlib.sha256(tr['canonicalWeatherJson'].encode()).hexdigest()
            with self.subTest(key=key),self.assertRaises(worker.InputError):worker.validate(r)

    def test_boolean_is_not_canonical_numeric_one(self):
        r=imported();r['weather']['records'][0]['windSpeedMs']=1
        tr=r['weather']['importTrace'];canonical={k:copy.deepcopy(v) for k,v in r['weather'].items() if k!='importTrace'};canonical['records'][0]['windSpeedMs']=True;tr['canonicalWeatherJson']=json.dumps(canonical);tr['canonicalWeatherSha256']=hashlib.sha256(tr['canonicalWeatherJson'].encode()).hexdigest()
        with self.assertRaises(worker.InputError):worker.validate(r)
