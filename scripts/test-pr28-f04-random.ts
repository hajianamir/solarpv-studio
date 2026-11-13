import {simulate24hEnergyBalance} from '../src/engine/simulation24hEngine';
import {formatEnergyKwh} from '../src/engine/energyFormatting';
import {writeFileSync} from 'node:fs';
let seed=171205;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const cases=[];const roundings=[];
const targets=[0,.0049,.005,.015,1.005,2.675,-.0049,-.005,-1.005,1.234,1.235,1e-8,-1e-8,1e21];
for(let n=0;n<1000;n++){const cap=rand()*500,psh=rand()*12,day=rand()*1000,night=rand()*1000,capacity=rand()*100,usable=capacity*rand(),soc=100*(1-usable/Math.max(capacity,1e-300))+rand()*100*(usable/Math.max(capacity,1e-300)),D=rand()*24,derate=.1+rand()*.9;const args=[cap,psh,day,night,usable,capacity,soc,D,derate] as const;cases.push({args,result:simulate24hEnergyBalance(...args)});targets.push((Math.floor(rand()*200000)-100000)/1000)}
for(const value of targets)roundings.push({decimal:value.toString(),actual:formatEnergyKwh(value)});
writeFileSync(process.env.REVIEW_OUTPUT!,JSON.stringify({cases,roundings}));
console.log('Generated 1000 reproducible randomized valid-model cases and',roundings.length,'independent decimal strings for external Python oracle.');
