import copy
import hashlib
import json
import math
from datetime import date, timedelta
from pathlib import Path
from statistics import NormalDist
import tempfile
import time
import unittest
from unittest.mock import patch
import numpy as np
from scipy.optimize import least_squares
from services.pvlib_research import thermal as t
from services.pvlib_research.thermal_worker import run as thermal_oracle_worker
from services.pvlib_research.uncertainty import review
from services.pvlib_research.__main__ import strict_json

ROOT = Path(__file__).resolve().parents[3]


def equation(rows, a, b):
    return [r['tempAirC'] + r['poaWm2']/(a+b*r['windSpeedMs']) for r in rows]


def synthetic():
    # Repeated envelope in disjoint windows; no temporal resampling/filling.
    rows=[]
    for i in range(24):
        r=dict(timestamp=(t.stamp('2020-01-01T01:00:00Z')+timedelta(hours=i)).isoformat(), poaWm2=200+100*(i%6),tempAirC=20.,windSpeedMs=.5+(i%6)*.6,eligible=True,reasons=[],used=True,filter1=True,filter2=True,filter3=True,filter4=True)
        r['moduleBackC']=equation([r],30,5)[0]
        rows.append(r)
    return t.dataset(rows,dict(kind='synthetic_software_test'))


def plan():
    return dict(train=['2020-01-01T00:00:00Z','2020-01-01T12:00:00Z'],holdout=['2020-01-01T12:00:00Z','2020-01-02T00:00:00Z'],u0Bounds=[20,40],u1Bounds=[0,10],baseline=[25,0],gridPoints=3,rounds=2,maxEvaluations=40,timeoutSeconds=5,minPairs=2,minPoaWm2=100,source='SYNTHETIC test only')


def budget(years=1):
    def c(ident,group,category,cv):
        return dict(id=ident,effectIds=[ident],group=group,category=category,coefficientOfVariation=cv,logBias=0.,source='SYNTHETIC assumption',sourceVersion='test-v1',documentSha256='a'*64,applicability='SYNTHETIC test only, not site evidence',historyYears=10 if group=='interannual' else 0)
    return dict(schemaVersion='project-energy-uncertainty-research-v1',studyInputSha256='b'*64,baselineEnergyWh=10000.,baselineInterpretation='annual_baseline_as_median_before_log_bias',horizonYears=years,
                components=[c('meter','systematic','metrology',.03),c('model','systematic','model',.04),c('resource','interannual','resource',.1)],systematicCorrelation=[[1,0],[0,1]],interannualCorrelation=[[1]],temporalCorrelation=np.eye(years).tolist(),crossGroupIndependenceSource='SYNTHETIC independence assumption, not measured',samples=30000,seed=48)


class ThermalTests(unittest.TestCase):
    def test_time_and_hour24(self):
        self.assertEqual(t.local_end(date(2019,6,4),11),'2019-06-04T10:00:00Z')
        self.assertEqual(t.local_end(date(2019,12,31),24),'2019-12-31T23:00:00Z')
        for hour in (0,25,1.5,True):
            with self.assertRaises(ValueError):t.local_end(date(2019,6,4),hour)
        with self.assertRaises(ValueError):t.stamp('2019-06-04T11:00:00')

    def test_original_workbook_reader_with_explicit_synthetic_receipt(self):
        import openpyxl
        wb=openpyxl.Workbook()
        s=wb.active;s.append(['SYNTHETIC test workbook; not original DTU']);s.append(t.METEO)
        met=[date(2019,6,4),11,600,3,500,3,100,3,20,60,2]
        s.append(met)
        v=wb.create_sheet();v.append(t.VALIDATION)
        row=[6,4,11,date(2019,6,4),'Monofacial','HSAT','T7',*(['Yes']*5),600,30,180,None,700,20000,40]
        v.append(row)
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'synthetic.xlsx';wb.save(path)
            with self.assertRaisesRegex(ValueError,'MD5'):t.parse_xlsx(path)
            # Test-only mocked expected receipt; never a production hash exemption.
            with patch.object(t,'DTU_MD5',hashlib.md5(path.read_bytes()).hexdigest()):
                parsed=t.parse_xlsx(path)
            self.assertEqual(parsed['records'][0]['moduleBackC'],40)
            self.assertEqual(parsed['records'][0]['timestamp'],'2019-06-04T10:00:00Z')
            self.assertEqual(parsed['receipt']['sha256'],hashlib.sha256(path.read_bytes()).hexdigest())
        with self.assertRaisesRegex(ValueError,'Duplicate'):t.assemble([met,met],[row],{})
        with self.assertRaisesRegex(ValueError,'Duplicate'):t.assemble([met],[row,row],{})
        missing=t.assemble([],[row],{})['records'][0]
        self.assertFalse(missing['eligible']);self.assertIsNone(missing['tempAirC'])
        excluded=copy.deepcopy(row);excluded[7]='No'
        self.assertFalse(t.assemble([met],[excluded],{})['records'][0]['eligible'])
        zero=met[:2]+[0]*9
        self.assertIn('publisher_all_zero_sentinel',t.assemble([zero],[row],{})['records'][0]['reasons'])
        other=row[:];other[6]='T15'
        with self.assertRaises(ValueError):t.assemble([met],[other],{})

    def test_real_rendered_excerpt(self):
        d=t.parse_excerpt(ROOT/'docs/examples/research/dtu-v3-t7-rendered-excerpt.csv')
        self.assertEqual(len(d['records']),7)
        self.assertEqual(d['receipt']['kind'],'tool_rendered_excerpt')
        self.assertIn('wind_sensor_installation_height_unverified',t.operational_blockers(d))
        self.assertEqual(d['records'][0]['poaWm2'],862.5833392)
        self.assertEqual(d['records'][0]['moduleBackC'],43.85833359)

    def test_known_parameters_oracle_and_no_leakage(self):
        d=synthetic();before=copy.deepcopy(d)
        fitted=t.fit_research(d,plan(),runner=equation)
        self.assertEqual(fitted['fitted'],[30,5]);self.assertTrue(fitted['identifiable'])
        self.assertLess(fitted['evaluation']['holdout']['fitted']['rmse'],1e-12)
        self.assertFalse(fitted['evaluation']['holdout']['acceptanceBlocked'])
        self.assertEqual(d,before)
        changed=copy.deepcopy(d)
        for r in changed['records'][12:]:r['moduleBackC']+=20
        changed['dataSha256']=t.digest({k:v for k,v in changed.items() if k!='dataSha256'})
        worse=t.fit_research(changed,plan(),runner=equation)
        self.assertEqual(worse['fitted'],fitted['fitted']);self.assertTrue(worse['holdoutWorse'])
        rows=d['records'][:12]
        oracle=least_squares(lambda p:np.array(equation(rows,*p))-np.array([r['moduleBackC'] for r in rows]),[25,2],bounds=([20,0],[40,10]))
        np.testing.assert_allclose(fitted['fitted'],oracle.x,atol=1e-7)

    def test_worker_real_process_and_sensitivity(self):
        rows=synthetic()['records'][:3]
        np.testing.assert_allclose(t.predict(rows,30,5),equation(rows,30,5),atol=1e-12)
        a=t.predict(rows,31,5);b=t.predict(rows,30,6)
        self.assertTrue(all(x<y for x,y in zip(a,equation(rows,30,5))))
        self.assertTrue(all(x<y for x,y in zip(b,equation(rows,30,5))))
        with self.assertRaises(ValueError):thermal_oracle_worker(dict(target='cell',u0=30,u1=5,rows=rows))
        with self.assertRaises(TimeoutError):t.predict(rows,30,5,timeout=.001)
        with self.assertRaisesRegex(RuntimeError,'Cancelled'):t.predict(rows,30,5,cancel=lambda:True)

    def test_gates_and_unidentifiable(self):
        d=synthetic();p=plan()
        for patch_plan in [dict(holdout=p['train']),dict(maxEvaluations=1),dict(source=' '),dict(baseline=[0,0]),dict(gridPoints=2),dict(extra=True)]:
            with self.assertRaises((ValueError,RuntimeError)):t.fit_research(d,{**p,**patch_plan},runner=equation)
        with self.assertRaisesRegex(RuntimeError,'Cancelled'):t.fit_research(d,p,runner=equation,cancel=lambda:True)
        def slow(*args):time.sleep(.01);return equation(*args)
        with self.assertRaises(TimeoutError):t.fit_research(d,{**p,'timeoutSeconds':.001},runner=slow)
        with self.assertRaisesRegex(ValueError,'output'):t.fit_research(d,p,runner=lambda *args:[math.nan]*12)
        constant=copy.deepcopy(d)
        for r in constant['records']:r['windSpeedMs']=1
        constant['dataSha256']=t.digest({k:v for k,v in constant.items() if k!='dataSha256'})
        self.assertFalse(t.fit_research(constant,p,runner=equation)['identifiable'])
        outside=copy.deepcopy(d);outside['records'][-1]['windSpeedMs']=20
        outside['dataSha256']=t.digest({k:v for k,v in outside.items() if k!='dataSha256'})
        self.assertTrue(t.fit_research(outside,p,runner=equation)['evaluation']['holdout']['acceptanceBlocked'])
        corrupt=copy.deepcopy(d);corrupt['records'][0]['moduleBackC']=0
        with self.assertRaisesRegex(ValueError,'integrity'):t.fit_research(corrupt,p,runner=equation)

    def test_json_boundary(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'plan.json'
            for raw in ['{"x":1,"x":2}','{"x":NaN}','x'*64001]:
                p.write_text(raw)
                with self.assertRaises(ValueError):strict_json(p)


class UncertaintyTests(unittest.TestCase):
    def test_single_year_normaldist_and_covariance_oracle(self):
        p=budget();before=copy.deepcopy(p);r=review(p)
        v=sum(math.log1p(c['coefficientOfVariation']**2) for c in p['components'])
        expected=10000*math.exp(NormalDist().inv_cdf(.1)*math.sqrt(v))
        self.assertAlmostEqual(r['analyticSingleYear']['p90Wh'],expected,places=9)
        self.assertLess(abs(r['monteCarlo']['p90Wh']/expected-1),.01)
        ci=r['monteCarloQuantile95PctDkwBandWh']['p90Wh'];self.assertLess(ci[0],expected);self.assertGreater(ci[1],expected)
        self.assertEqual(p,before);self.assertEqual(review(p),r)
        self.assertEqual(r['projectApproval'],'blocked');self.assertEqual(r['validationStatus'],'not_field_validated')

    def test_temporal_arithmetic_mean_not_geometric(self):
        p=budget(3);r=review(p)
        v_sys=sum(math.log1p(c['coefficientOfVariation']**2) for c in p['components'][:2]);v_var=math.log1p(.1**2)
        self.assertAlmostEqual(r['logGeometricMeanVariance'],v_sys+v_var/3)
        self.assertIsNone(r['analyticSingleYear'])
        mean=10000*math.exp((v_sys+v_var)/2)
        oracle_var=mean**2*(math.expm1(v_sys+v_var)/3+2*math.expm1(v_sys)/3)
        self.assertAlmostEqual(r['arithmeticMeanMoments']['varianceWh2']/oracle_var,1,places=12)
        self.assertLess(abs(r['monteCarloStdWh']/math.sqrt(oracle_var)-1),.03)
        self.assertAlmostEqual(r['monteCarlo']['meanWh']/10000,math.exp((v_sys+v_var)/2),delta=.005)
        full=copy.deepcopy(p);full['temporalCorrelation']=np.ones((3,3)).tolist();f=review(full)
        self.assertAlmostEqual(f['logGeometricMeanVariance'],v_sys+v_var)
        self.assertLess(f['monteCarlo']['p90Wh'],r['monteCarlo']['p90Wh'])

    def test_signed_cancel_bias_and_zero(self):
        p=budget();p['components'][1]['coefficientOfVariation']=.03
        p['systematicCorrelation']=[[1,-1],[-1,1]]
        r=review(p);self.assertLess(r['signedCrossTerms'][0]['signedLogVariance'],0)
        self.assertAlmostEqual(r['groupLogVariance']['systematic'],0,places=14)
        p['components'][0]['logBias']=math.log(.9)
        self.assertAlmostEqual(review(p)['analyticSingleYear']['p90Wh']/r['analyticSingleYear']['p90Wh'],.9)
        for c in p['components']:c['coefficientOfVariation']=0;c['logBias']=0
        r=review(p);self.assertEqual(r['monteCarlo']['p90Wh'],10000);self.assertEqual(r['analyticSingleYear']['meanWh'],10000)

    def test_strict_sources_double_count_psd_and_caps(self):
        base=budget()
        cases=[]
        for key,value in [('baselineEnergyWh',0),('samples',1000000),('horizonYears',1.5),('crossGroupIndependenceSource',' '),('seed',-1),('baselineInterpretation','mean'),('temporalCorrelation',[[2]]),('systematicCorrelation',[[1,2],[2,1]]),('extra',True)]:
            cases.append({**base,key:value})
        for patch_component in [dict(source=' '),dict(effectIds=['model']),dict(coefficientOfVariation=float('nan')),dict(documentSha256='unknown')]:
            p=copy.deepcopy(base);p['components'][0].update(patch_component);cases.append(p)
        p=copy.deepcopy(base);p['components'][-1]['historyYears']=1;cases.append(p)
        p=budget(3);p['temporalCorrelation']=[[1,.9,.9],[.9,1,-.9],[.9,-.9,1]];cases.append(p)
        for p in cases:
            with self.assertRaises(ValueError):review(p)


if __name__=='__main__':unittest.main()
