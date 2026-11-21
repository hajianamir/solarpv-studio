"""Bounded review matrix: contract-only is NOT numerical or field evidence.
Pair coverage is over admissible discrete option labels, not parameter domains.
"""
import copy
import itertools
import math
import unittest
from test_worker import BASE,worker
from test_electrical import E
from test_sandia import INV
from test_tracking import TRACK
from test_rows import ROWS
from test_optical_models import OPT
from test_ac_plant import PLANT
from test_environment import ENV
from test_balanced_thermal import P,explicit


def candidate(case):
    geometry,sky,iam,spectral,thermal,dc,ac,plant,horizon,environment,exportcap=case
    r=copy.deepcopy(BASE);s=r['system'];s.update(arrayPdc0W=8800,additionalDcLossPct=0)
    if geometry in (1,3):s['tracking']=TRACK.copy()
    if geometry in (2,3):s['rowIrradiance']=ROWS.copy()
    s['skyDiffuseModel']='perez' if sky else 'haydavies'
    if iam:s['physicalIam']=copy.deepcopy(OPT['physicalIam'])
    if spectral:s['sapmSpectral']=copy.deepcopy(OPT['sapmSpectral'])
    if thermal==1:s['faiman']=dict(u0=30,u1=5,windHeightM=10)
    elif thermal==2:s['pvsystTemperature']=P.copy()
    elif thermal==3:s['cellTemperatureSchedule']=explicit(r)
    if dc:s['electrical']=copy.deepcopy(E)
    if ac:s.update(sandia=copy.deepcopy(INV),inverterPdc0W=INV['Pdco'])
    if plant:s.update(copy.deepcopy(PLANT))
    if horizon:s['horizonProfile']=copy.deepcopy(ENV['horizonProfile'])
    if environment:
        s["soilingSchedule"]=copy.deepcopy(ENV["soilingSchedule"]);s["albedoSchedule"]=copy.deepcopy(ENV["albedoSchedule"])
    if exportcap:s["acExportLimitW"]=500
    return r


def allowed(case):
    geometry,sky,_,_,_,dc,ac,_,horizon,_,_=case
    return not ((geometry in (2,3) and (sky or horizon)) or (ac and not dc))


def pairs(case):
    return {(a,case[a],b,case[b]) for a in range(len(case)) for b in range(a+1,len(case))}


def all_cases():
    return list(itertools.product(range(4),range(2),range(2),range(2),range(4),range(2),range(2),range(2),range(2),range(2),range(2)))

def selected_cases(valid):
    remaining=set().union(*(pairs(case) for case in valid));selected=[]
    while remaining:
        case=max(valid,key=lambda item:len(pairs(item)&remaining))
        selected.append(case);remaining-=pairs(case)
    return selected

class ReviewCombinationTests(unittest.TestCase):
    def test_contract_matrix_and_admissible_pair_runtime_evidence(self):
        cases=all_cases()
        self.assertEqual(len(cases),8192)
        valid=[]
        for case in cases:
            with self.subTest(contract=case):
                if allowed(case):worker.validate(candidate(case));valid.append(case)
                else:
                    with self.assertRaises(worker.InputError):worker.validate(candidate(case))
        self.assertEqual(len(valid),3840)
        selected=selected_cases(valid)
        self.assertEqual(set().union(*(pairs(case) for case in selected)),set().union(*(pairs(case) for case in valid)))
        for case in selected:
            with self.subTest(runtime=case):
                out=worker.run_study(candidate(case))
                self.assertEqual(len(out['samples']),6)
                self.assertTrue(all(math.isfinite(v) for v in out['summary'].values()))
                self.assertAlmostEqual(out['summary']['dcWh'],sum(row['dcW'] for row in out['samples']),places=7)
                self.assertAlmostEqual(out['summary']['acWh'],sum(row['acW'] for row in out['samples']),places=7)
        print(f'Review matrix: 8192 contract cases; {8192-len(valid)} rejected; {len(selected)} runtime-executed; {len(valid)-len(selected)} contract-only, not numerically executed; admissible option-pair coverage complete.')
