"""Explicit synthetic engineering examples; Chen2020 is a named published test cell only."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'docs/examples/physical-models'


def examples():
    dc = dict(schemaVersion='dc-coupled-plan-v1', source='Synthetic DC topology verification; not operational measurements',
        mode='ongrid', allowGridCharging=False, islandCapable=True, dcChargingWhenIslanded=True,
        equipment=dict(pvMpptEfficiency=.98, inverterEfficiency=.96, rectifierEfficiency=.95,
            inverterAcRatingW=5000, inverterDcLimitW=6000, converterBusLimitW=5000,
            chargeConverterEfficiency=.97, dischargeConverterEfficiency=.97),
        battery=dict(capacityKwh=20, initialKwh=5, minimumKwh=2, maximumChargeW=5000, maximumDischargeW=5000,
            storageChargeEfficiency=.98, storageDischargeEfficiency=.98),
        intervals=[dict(start='2026-01-01T00:00:00Z', durationS=3600, pvAvailableDcW=10000, loadAcW=1000,
            batteryBusCommandW=-4000, gridAvailable=True, gridImportLimitW=10000, exportLimitW=4000),
            dict(start='2026-01-01T01:00:00Z', durationS=3600, pvAvailableDcW=0, loadAcW=3000,
            batteryBusCommandW=3500, gridAvailable=True, gridImportLimitW=10000, exportLimitW=0)])
    xs = [i/2000 for i in range(2001)]
    # Fits and electrochemical parameters transcribed from the pinned, retained
    # PyBaMM Chen2020 source, with its original license in reference/.
    un = [[x, 1.9793*math.exp(-39.3631*x)+.2482-.0909*math.tanh(29.8538*(x-.1234))
           -.04478*math.tanh(14.9159*(x-.2769))-.0205*math.tanh(30.4444*(x-.6103))] for x in xs]
    up = [[x, -.809*x+4.4875-.0428*math.tanh(18.5138*(x-.5542))
           -17.7326*math.tanh(15.789*(x-.3117))+17.5842*math.tanh(15.9308*(x-.312))] for x in xs]
    spm = dict(schemaVersion='spm-plan-v1', source='Chen et al. JES167(2020)080534, LG M50; PyBaMM25.10.2 Chen2020.py commit313dd7f5793ae24429b1c5f814bd795637600305. Synthetic current protocol, not measured data.',
        temperatureK=298.15, electrolyteConcentrationMolM3=1000, seriesCells=1, parallelCells=1,
        ohmicResistanceOhm=0, lowerCellVoltageV=2.5, upperCellVoltageV=4.3,
        radialCells=30, maximumStepS=5, relativeTolerance=1e-8,
        negative=dict(radiusM=5.86e-6, diffusivityM2S=3.3e-14, maximumConcentrationMolM3=33133,
            activeVolumeM3=.065*1.58*8.52e-5*.75, initialStoichiometry=29866/33133,
            reactionRate=6.48e-7, activationEnergyJMol=35000, referenceTemperatureK=298.15, ocp=un),
        positive=dict(radiusM=5.22e-6, diffusivityM2S=4e-15, maximumConcentrationMolM3=63104,
            activeVolumeM3=.065*1.58*7.56e-5*.665, initialStoichiometry=17038/63104,
            reactionRate=3.42e-6, activationEnergyJMol=17800, referenceTemperatureK=298.15, ocp=up),
        intervals=[dict(start='2026-01-01T00:00:00Z', durationS=300, packCurrentA=2.5),
                   dict(start='2026-01-01T00:05:00Z', durationS=120, packCurrentA=0)])
    control = dict(schemaVersion='dq-control-plan-v1', source='Synthetic balanced stiff-grid test, Imperix TN106/TN103 equations; user gains/settings, no hardware qualification',
        sampleS=.00002, outputEvery=50,
        plant=dict(inductanceH=.005, resistanceOhm=.2, dcVoltageV=800, maximumModulation=.95,
            openCircuitDumpResistanceOhm=5, initialCurrentAlphaA=0, initialCurrentBetaA=0),
        controller=dict(currentKpOhm=5, currentKiOhmPerS=200, antiWindupPerS=200,
            maximumCurrentPeakA=30, pllKpPerS=2*math.sqrt(.5)*2*math.pi*20, pllKiPerS2=(2*math.pi*20)**2,
            nominalFrequencyHz=50, maximumFrequencyDeviationHz=15, initialPllAngleRad=0,
            initialGridAngleRad=.1, minimumPllVoltagePeakV=20),
        protection=dict(pickupRmsA=25, curve='normal_inverse', timeMultiplier=.1, minimumOperateS=.01,
            instantaneousRmsA=50, breakerDelayS=.005, underVoltagePeakV=200, overVoltagePeakV=400,
            voltageDelayS=.02, underFrequencyHz=45, overFrequencyHz=55, frequencyDelayS=.05, startupBlankingS=.05),
        intervals=[dict(start='2026-01-01T00:00:00Z', durationS=.15, gridVoltagePeakV=325, gridFrequencyHz=50,
            gridPhaseJumpRad=0, currentReferenceDPeakA=10, currentReferenceQPeakA=0),
            dict(start='2026-01-01T00:00:00.150Z', durationS=.10, gridVoltagePeakV=100, gridFrequencyHz=50,
            gridPhaseJumpRad=0, currentReferenceDPeakA=20, currentReferenceQPeakA=0)])
    return {'dc_coupled': dc, 'electrochemical_spm': spm, 'dq_protection_control': control}


if __name__ == '__main__':
    for operation, plan in examples().items():
        (OUT/(operation+'.json')).write_text(json.dumps(dict(operation=operation, plan=plan), indent=2)+'\n')
