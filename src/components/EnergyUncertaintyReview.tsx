import React,{useMemo} from 'react';
import type {StudyResult} from '../studies/studyContract';
import type {StudyValidationPlan} from '../studies/studyValidation';
import {energyUncertaintyReview,energyUncertaintyBudgetCsv,energyUncertaintyReviewHtml} from '../studies/energyUncertaintyReview';
function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function EnergyUncertaintyReview({result,plan}:{result:StudyResult;plan:Extract<StudyValidationPlan,{tool:'energy_uncertainty'}>}){
 const review=useMemo(()=>energyUncertaintyReview(result,plan),[result,plan]);
 return <section data-testid="energy-uncertainty-review"><h4>46. Conditional uncertainty budget / بودجهٔ عدم‌قطعیت شرطی</h4>
 <p data-testid="uncertainty-horizon">Horizon: {plan.horizon}; {review.period.startUtc} → {review.period.endUtc}; AC export, Wh. Baseline explicitly declared median, NOT arithmetic mean. No annualization or automatic calibration.</p>
 <table data-testid="uncertainty-quantiles"><caption>Exceedance under caller-declared lognormal assumptions, not a confidence interval</caption><thead><tr><th>Statistic</th><th>Exceedance probability</th><th>Energy Wh</th><th>Energy kWh</th></tr></thead><tbody>{review.quantiles.map(q=><tr key={q.label}><th>{q.label}</th><td>{q.exceedanceProbability*100}%</td><td>{q.energyWh}</td><td>{q.energyWh/1000}</td></tr>)}<tr><th>Arithmetic mean</th><td>not a quantile</td><td>{review.meanWh}</td><td>{review.meanWh/1000}</td></tr></tbody></table>
 <table data-testid="uncertainty-components"><caption>Diagonal budget; CV is a fraction (0.05 = 5%). No source is independently verified.</caption><thead><tr><th>Component</th><th>Source / version</th><th>CV</th><th>Log σ</th><th>Diagonal log variance</th></tr></thead><tbody>{review.components.map(c=><tr key={c.id}><th>{c.id}</th><td>{c.source} / {c.sourceVersion}</td><td>{c.coefficientOfVariation}</td><td>{c.logStandardDeviation}</td><td>{c.diagonalLogVariance}</td></tr>)}</tbody></table>
 <table data-testid="uncertainty-correlations"><caption>Unordered pairs in log space; signed 2ρσᵢσⱼ terms, NOT energy losses</caption><thead><tr><th>Pair</th><th>Log-space ρ</th><th>Signed log variance</th></tr></thead><tbody>{review.crossTerms.map(c=><tr key={c.first+':'+c.second}><th>{c.first} / {c.second}</th><td>{c.logSpaceCorrelation}</td><td>{c.signedLogVariance}</td></tr>)}</tbody></table>
 <pre data-testid="uncertainty-budget-total" dir="ltr">{JSON.stringify(review.budget,null,2)}</pre>
 <ul data-testid="uncertainty-warnings">{review.warnings.map(w=><li key={w}>{w}</li>)}</ul>
 <button type="button" data-testid="download-uncertainty-review-json" onClick={()=>download('energy-uncertainty-review.json',JSON.stringify(review,null,2),'application/json')}>Uncertainty review JSON</button>
 <button type="button" data-testid="download-uncertainty-budget-csv" onClick={()=>download('energy-uncertainty-budget.csv',energyUncertaintyBudgetCsv(review),'text/csv;charset=utf-8')}>Quantiles + budget CSV</button>
 <button type="button" data-testid="download-uncertainty-review-html" onClick={()=>download('energy-uncertainty-review.html',energyUncertaintyReviewHtml(review),'text/html;charset=utf-8')}>Uncertainty review HTML</button>
 </section>;
}
