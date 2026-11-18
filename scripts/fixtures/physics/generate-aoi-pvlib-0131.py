"""Reproduce BUG-02 reference fixtures, without importing the TypeScript engine.
Run from repository root with Python 3 and pvlib==0.13.1 installed:
  python scripts/fixtures/physics/generate-aoi-pvlib-0131.py
Node dependencies must also be installed (npm ci). The unchanged formula detector
is used only to inventory expression IDs/owners against base 64f173a, never to
generate numerical reference outputs. Manifest registration is separate.
"""
import json
import subprocess
from pathlib import Path
import pvlib

assert pvlib.__version__ == '0.13.1'
root = Path('scripts/fixtures/physics')
units = json.loads(subprocess.check_output(['node_modules/.bin/tsx', '-e', r"""
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { changedFormulaUnits } from './scripts/verify-physics-reference-gate';
const units = ['src/engine/optical/iamEngine.ts','src/engine/core/physicalLossContract.ts']
  .flatMap(f => changedFormulaUnits(f,
    execFileSync('git',['show',`64f173a:${f}`],{encoding:'utf8'}), fs.readFileSync(f,'utf8')));
console.log(JSON.stringify(units));
"""], text=True))
geom_source = dict(title='pvlib.irradiance.aoi',
    url='https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.irradiance.aoi.html',
    version='pvlib-python 0.13.1', locator='aoi and aoi_projection; pvlib/irradiance.py at tag v0.13.1; north-clockwise surface and solar azimuths')
iam_source = dict(title='pvlib.iam.martin_ruiz',
    url='https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.iam.martin_ruiz.html',
    version='pvlib-python 0.13.1', locator='martin_ruiz(aoi, a_r); pvlib/iam.py at tag v0.13.1; Martin and Ruiz (2001), DOI 10.1016/S0038-092X(00)00155-4')
# Tilt zero: Brandemuehl equivalent sky angle is its published intercept 59.7;
# ground equivalent incidence is grazing (90). At 25 C the temperature correction
# vanishes identically. Only beam contributes to the effective irradiance.
beam = round(float(pvlib.iam.martin_ruiz(65.0, a_r=0.16)), 4)
sky = round(float(pvlib.iam.martin_ruiz(59.7, a_r=0.16)), 4)
details = dict(iamBeam=beam, iamSkyDiffuse=sky, iamGroundDiffuse=0.0,
    iamPoaEffective=beam, effectiveTransmissionLossPercent=round(100 * (1-beam), 2))
loss = -round(details['effectiveTransmissionLossPercent'], 1)
iam_input = dict(beamPoaWm2=700, skyDiffusePoaWm2=0, groundReflectedPoaWm2=0,
    aoiBeamDeg=65, tiltDeg=0, cellTemperatureC=25, arCoatingFactor=0.16)
# The gate compares exact object keys, including optional diagnostics. Provide
# explicit zero-deposition/no-snow controls rather than omit these diagnostics.
# These are deterministic zero-state API assertions, NOT scientific references
# for snow, soiling, bifacial, NOCT, thermal, or annual yield models.
profile = [dict(dayOfYear=d, rainfallMm=0, dustStormOccurred=False,
    manualCleanPerformed=False, dailySoilingLossPercent=0,
    cumulativeSoilingFactor=1, soilingRatio=1) for d in range(1,366)]
snow = dict(annualSnowLossPercent=0, snowCoverageDays=0, avalancheDammingRisk='NONE', maxSnowStructuralLoadKnM2=0)
soiling = dict(annualAverageSoilingLossPercent=0, maxMonthlySoilingLossPercent=0,
    recommendedWashingCyclesPerYear=2, dustStormVulnerabilityCategory='LOW', dailyProfile=profile)
bifacial = dict(gainFraction=0, gainPct=0, unclampedGainPct=0,
    isClampedAt15Pct=False, clampedExcessPct=0, modelUsed='view_factor_2d')
for unit in units:
    owner = unit['functionName']
    if owner == 'calculateBeamAoiDeg':
        inputs = [59.1, 30, 150, 210]
        expected = float(pvlib.irradiance.aoi(30, 210, 59.1, 150))
        source = geom_source
        method = ('Python pvlib==0.13.1: float(pvlib.irradiance.aoi(30,210,59.1,150)); '
            'positional production inputs are [zenith, tilt, solar azimuth, surface azimuth]. '
            'pvlib evaluates acos(aoi_projection(...)), with north-clockwise azimuths. '
            'Nonzero, nonaligned geometry makes all degree conversions output-sensitive. '
            'No application function or application output was used to generate this value.')
        tolerance = 1e-9
    else:
        source = iam_source
        method = ('Python pvlib==0.13.1: round(float(pvlib.iam.martin_ruiz(65,a_r=0.16)),4) '
            'for beam; round(float(pvlib.iam.martin_ruiz(59.7,a_r=0.16)),4) for sky; '
            'grazing ground IAM=0. The zero-tilt equivalent sky incidence 59.7 degrees '
            'is the intercept of Brandemuehl & Beckman (1980), Solar Energy 24(5),511-513, '
            'Ground incidence is 90 degrees. '
            'At 25 C the thermo-optic correction is zero; diffuse/ground irradiances '
            'are zero, so effective IAM is beam IAM. Loss=100*(1-IAM), rounded to '
            '2 decimals and then 1 decimal for the contract. Rounding follows the '
            'public output precision. Unified-contract diagnostics use explicit '
            'zero-deposition, no-storm, no-snow, no-bifacial controls and explicit '
            'NOCT=45: zeros, unit daily soiling ratios and constant metadata are '
            'API zero-state assertions, not independent validation of those models. '
            'No application function or output was used for reference generation.')
        tolerance = 0.0000005
        if owner == 'calculateEffectivePoaIam':
            inputs = [700,0,0,65,0,25,0.16]
            expected = details
        elif owner == 'evaluatePhysicalIamLoss':
            inputs = [iam_input]
            expected = dict(iamLossPct=loss, iamPoaEffective=beam, details=details)
        elif owner == 'evaluatePhysicalLossModels':
            inputs = [dict(iam=iam_input, module=dict(noctC=45),
                snow=dict(weatherHourly=[dict(hourOfYear=1,ambientTempC=25,snowfallDepthCm=0,accumulatedGroundSnowCm=0)]),
                soiling=dict(config=dict(dailySoilingRatePercent=0,scheduledWashIntervalDays=0,dustStormVulnerabilityFactor=1)))]
            expected = dict(bifacialGainPct=0, iamLossPct=loss, snowLossPct=0,soilingLossPct=0,noctC=45,
                diagnostics=dict(bifacialDiagnostics=bifacial,iamDetails=details,snowSummary=snow,
                    soilingSummary=soiling,noctResolved=dict(noctC=45,isFallback=False)))
        else:
            raise ValueError(owner)
    fixture = dict(schemaVersion=1,formulaId=unit['formulaId'],independentOfImplementation=True,
        productionExport=owner,inputs=inputs,expected=expected,independentCalculation=method,
        tolerances=dict(absolute=tolerance,relative=0),referenceSource=source)
    name = 'aoi-pvlib-0131-' + unit['formulaId'].split('#')[-1] + '.json'
    (root/name).write_text(json.dumps(fixture,indent=2)+'\n')
