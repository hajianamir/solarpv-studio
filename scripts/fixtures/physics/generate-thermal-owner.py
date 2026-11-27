"""Independent pvlib/Decimal thermal and MPPT component conditions.
No production TS imported or numerical outputs copied. NOCT linear temperature:
Tcell=Tamb+(NOCT-20)*G/800, cited Applied Sciences 2020 10(3)914 Eq1.
PVWatts DC temperature factor independently executed by pvlib 0.13.1.
MPPT example uses explicitly synthetic measured voltage coefficient -.3 percent/C,
linear voltage windows and one physically specified channel. No manufacturer,
mounting-offset, annual-weather or standards-conformity validation claimed.
"""
from pathlib import Path
from decimal import Decimal as D
import json,pvlib
assert pvlib.__version__=='0.13.1'
ref=dict(title='NOCT linear temperature and pvlib PVWatts DC temperature correction',url='https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.pvwatts_dc.html',version='pvlib 0.13.1; Applied Sciences 2020 10(3)914',locator='PVWatts DC equation; NOCT linear temperature DOI 10.3390/app10030914 Eq1. Synthetic voltage-coefficient/component conditions, not climate or mounting validation.')
cases=[]
for noct in [40,42,45]:
 for mean in [-40,0,25,40]:
  for gamma in [-.3,.3]:
   inp=dict(module=dict(noctC=noct,tempCoeffPmpPct=gamma),ambientTempMaxC=40,ambientTempMeanC=mean,irradianceWm2=1000,installationEnvironment='ground_mount',evaluationMode='annual_energy')
   cell=float(D(mean)+(D(noct)-20)*D(1000)/800)
   hot=float(D(40)+(D(noct)-20)*D(1000)/800)
   loss=100*(1-float(pvlib.pvsystem.pvwatts_dc(1000,cell,1,gamma/100)))
   expected=dict(cellTempHotC=hot,cellTempAnnualMeanC=cell,annualMeanDeratePct=loss,deratePct=loss,derateFraction=loss/100,mountingDeltaTC=0,source='NOCT_BASE_WITH_UNVALIDATED_MOUNTING_ASSUMPTIONS',evaluationMode='annual_energy',effectiveAmbientTempC=mean)
   cases.append(dict(inputs=[inp],expected=expected))
witness=cases[0]
f=dict(schemaVersion=1,independentOfImplementation=True,productionExport='calculateThermalDerate',inputs=witness['inputs'],expected=witness['expected'],cases=cases,independentCalculation=__doc__,tolerances=dict(absolute=1e-10,relative=1e-12),referenceSource=ref)
Path('scripts/fixtures/physics/thermal-owner-pvlib.json').write_text(json.dumps(f,indent=2)+'\n')
evidence=dict(basis='factored_array_isc',scope='per_mppt',source='SYNTHETIC component fixture, not manufacturer evidence',sourceDate='2026-01-01',conditions='Synthetic voltage/one-channel evaluation only',requiredMultiplier=1.25,operatingCurrentAmps=20,shortCircuitCurrentAmps=25)
inp=dict(mpptRatingEvidence=evidence,moduleVoc=50,moduleVmp=40,moduleIsc=10,moduleImp=9,modulePmp=400,tempCoeffVocPct=-.2,tempCoeffVmpPct=-.3,tempCoeffPmpPct=-.3,modulesPerString=10,parallelStrings=1,inverterVdcMax=1000,inverterVmpptMin=100,inverterVmpptMax=900,inverterImppMaxPerMppt=20,inverterIscMaxPerMppt=25,inverterMpptChannels=1,inverterCount=1,inverterPnomAcKw=5,ambientTempMinC=0,ambientTempMaxC=40,noctC=42,installationEnvironment='ground_mount',stringsPerMpptAllocation=[1])
tcell=D(40)+(D(42)-20)*D(1000)/800
hot=float(D(10)*40*(1+D('-.003')*(tcell-25)))
expected=dict(electricalReadiness=dict(status='screening_evidence_complete',conformity=None,legacyShortCircuitMultiplier=1.25,reasons=[]),isVoltageFeasible=True,isCurrentFeasible=True,isCompliant=True,stringVocMaxColdV=525,stringVmpMinHotV=hot,stringVmpMaxColdV=430,effectiveMpptChannels=1,stringsPerMppt=1,stringsPerMpptAllocation=[1],isMpptAllocationAssumed=False,operatingCurrentAmps=9,shortCircuitCurrentAmps=12.5,currentSafetyMarginPct=55,dcAcRatio=.8,singleInverterDcAcRatio=.8,blockingErrors=[],warnings=[])
m=dict(schemaVersion=1,independentOfImplementation=True,productionExport='evaluateMpptCompatibility',inputs=[inp],expected=expected,independentCalculation=__doc__+' Independently specified NOCT42 and ambient40 at 1000 W/m2 imply Tcell67.5 C; hot string Vmp=10*40*(1-.003*(67.5-25))=349 V, versus old +25 C fallback352 V. Cold Voc525 V, cold Vmp430 V. One string: Imp9 A, factored Isc12.5 A. Four kW DC / five kW AC = .8. Evidence fields are synthetic test metadata, not a real product record.',tolerances=dict(absolute=1e-9,relative=1e-12),referenceSource=ref)
Path('scripts/fixtures/physics/mppt-hot-owner-independent.json').write_text(json.dumps(m,indent=2)+'\n')
registry=json.loads(Path('scripts/physics-reference-evidence.json').read_text())
for r in registry['fixtures']:
 if 'thermal-owner-' in r['fixtureFile']:
  Path(r['fixtureFile']).write_text(json.dumps(dict(f,formulaId=r['formulaId'],cases=[]),indent=2)+'\n')
 if 'mppt-hot-owner-reference' in r['fixtureFile']:
  Path(r['fixtureFile']).write_text(json.dumps(dict(m,formulaId=r['formulaId']),indent=2)+'\n')
