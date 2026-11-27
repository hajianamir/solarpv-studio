/** Diagnostic reproduction, not a correctness/standards-conformity gate.
 * Run: npx tsx docs/audit/dual-independent-audit-review/probes.ts
 * No network, server, storage mutation, fixture registration or application edits.
 */
import {calculateUnifiedWindPressureQz,calculateUnifiedKz} from '../../../src/engine/core/structuralContract';
import {simulateAnnualHourlyThermalDerate} from '../../../src/engine/core/hourlyThermalEngine';
import {calculateThermalDerate} from '../../../src/engine/core/thermalDerate';
import {evaluateMpptCompatibility} from '../../../src/engine/core/electricalSizingContract';
import {calculateSingleDiodeCurve} from '../../../src/engine/singleDiodeModel';
import {rearGainFraction} from '../../../src/engine/bifacialGain';
import {calculateSolarPosition,calculatePoaIrradiance,calculateLcoe} from '../../../src/engine/solarPvEngine';
import {runIranianRegulationFinancialModel} from '../../../src/engine/iranianRegulationsFinancial';
import {readFileSync} from 'node:fs';
import {CATALOG_MODULES} from '../../../src/engine/equipmentCatalogData';
const thermal={latitudeDeg:35,peakSunHours:5,ambientTempMinC:-5,ambientTempMaxC:40,ambientTempMeanC:18,noctC:45,tempCoeffPmpPct:-0.3};
const mppt={moduleVoc:50,moduleVmp:40,moduleIsc:14,moduleImp:13,modulePmp:520,tempCoeffVocPct:-0.26,tempCoeffVmpPct:-0.3,modulesPerString:15,parallelStrings:1,inverterVdcMax:1100,inverterVmpptMin:200,inverterVmpptMax:1000,inverterImppMaxPerMppt:20,inverterIscMaxPerMppt:16,inverterMpptChannels:1,inverterPnomAcKw:10,ambientTempMinC:0,ambientTempMaxC:40};
const diode=(beta:number,gamma:number)=>{const r=calculateSingleDiodeCurve(50,14,42,13,546,beta,0.045,gamma,1000,70);return {voc:r.voc,pmp:r.pmp};};
const poa={ghi:800,dni:800,dhi:100,tiltDeg:30,azimuthDeg:0,sunZenithDeg:30,sunAzimuthDeg:180};
const cold={module:{noctC:45,tempCoeffPmpPct:-0.3},ambientTempMaxC:-10,ambientTempMeanC:-20,evaluationMode:'annual_energy' as const};
const spa=JSON.parse(readFileSync('benchmarks/independent/solar-position-spa.json','utf8'));
let maxZenith=0,maxAzimuth=0,outsideTolerance=0;
for(const row of spa.rows){
 const actual=calculateSolarPosition(row.latitude,row.longitude,row.utcTs);
 const dz=Math.abs(actual.zenithDeg-row.zenith);
 const da=Math.abs(((actual.azimuthDeg-row.azimuth+540)%360)-180);
 maxZenith=Math.max(maxZenith,dz);maxAzimuth=Math.max(maxAzimuth,da);
 if(dz>spa.tolerancesDegrees.zenith||da>spa.tolerancesDegrees.azimuth)outsideTolerance++;
}
const results={
 spaStoredReferenceComparison:{rows:spa.rows.length,maxZenith,maxAzimuth,outsideTolerance,tolerancesDegrees:spa.tolerancesDegrees,scope:'Production function vs pre-existing independently sourced fixture; not newly generated SPA or horizon validation'},
 evidenceClass:'internal diagnostic reproduction only; candidate equations below are NOT approved reference targets',
 wind:[0,500,1000,1190,2000].map(elevationM=>({elevationM,actual:calculateUnifiedWindPressureQz({basicWindSpeedKmh:120,elevationM}),candidateMetric119:Math.exp(-0.000119*elevationM),candidate8000:Math.exp(-elevationM/8000)})),
 kz:{omitted:calculateUnifiedKz('C'),explicit3m:calculateUnifiedKz('C',3)},
 hemisphere:{north:simulateAnnualHourlyThermalDerate(thermal),south:simulateAnnualHourlyThermalDerate({...thermal,latitudeDeg:-35})},
 hotCell:{fallbackAmbientPlus25:65,noct45:calculateThermalDerate({module:{noctC:45,tempCoeffPmpPct:-0.3},ambientTempMaxC:40}).cellTempHotC,noct42:calculateThermalDerate({module:{noctC:42,tempCoeffPmpPct:-0.3},ambientTempMaxC:40}).cellTempHotC},
 mppt:{inputs:mppt,output:evaluateMpptCompatibility(mppt)},
 diode:{baseline:diode(-0.26,-0.30),gammaOnly:diode(-0.26,-0.40),betaOnly:diode(-0.4,-0.30)},
 bifacial:[0.3,0.6].map(groundCoverRatio=>({groundCoverRatio,gainFraction:rearGainFraction({isBifacial:true,bifacialityFactor:0.8,groundCoverRatio,albedo:0.22})})),
 coldAnnual:calculateThermalDerate(cold),
 poa:{inputs:poa,libraryDefault:calculatePoaIrradiance(poa),explicitSouth:calculatePoaIrradiance({...poa,surfaceAzimuthConvention:'south_zero'})},
 iran:[0.5,1,5,10].map(kwp=>{const r=runIranianRegulationFinancialModel(kwp,kwp*1.6,'satba_fit_ppa');return {kwp,capexMillion:r.totalCapexMillionToman,year1:r.cashFlow25Years[0]};}),
 catalog:{total:CATALOG_MODULES.length,measuredVmp:CATALOG_MODULES.filter(m=>m.tempCoeffVmpPct!==undefined).length},
 invalidLcoe:calculateLcoe(1000,10,0,0.1,25),
};
console.log(JSON.stringify(results,null,2));
