import type {WaterfallLossReport} from '../waterfallLossEngine';
import type {AnnualReferenceEvaluation} from '../reference/annualReferenceLosses';
/** Reporting labels only; no loss equations or model execution. */
export function labelReferenceLosses(report:WaterfallLossReport,evaluation:AnnualReferenceEvaluation|null) {
  report={...report,stages:report.stages.map(stage=>({...stage}))};
  if (evaluation) {
    report.annualReference = evaluation;
    for (const stage of report.stages) {
      const model = stage.id === 'soiling' ? evaluation.metadata?.soiling : stage.id === 'snow' ? evaluation.metadata?.snow : null;
      if (model) {
        stage.nameEn = `${stage.id} (pvlib 0.13.1; not field validated)`;
        stage.nameFa = `${stage.id} (pvlib 0.13.1؛ بدون اعتبارسنجی میدانی)`;
        stage.descriptionEn = `${model.modelId} v${model.modelVersion}; pvlib 0.13.1 algorithm; full-year energy-weighted replacement, not field validated. Weather: ${model.quality}; parameters: ${model.parameterQuality}.`;
        stage.descriptionFa = `${model.modelId} v${model.modelVersion}؛ جایگزین وزن‌دار انرژی سال کامل؛ بدون اعتبارسنجی میدانی. کیفیت هواشناسی: ${model.quality}؛ پارامترها: ${model.parameterQuality}.`;
      } else if (stage.id === 'soiling' || stage.id === 'snow') {
        stage.descriptionEn = `${stage.descriptionEn} Reference not applied: ${evaluation.reason ?? 'model not selected'}; original screening/manual input retained.`;
        stage.descriptionFa = `${stage.descriptionFa} مدل مرجع اعمال نشد: ${evaluation.reason ?? 'انتخاب نشده'}؛ ورودی screening/دستی قبلی حفظ شد.`;
      }
    }
  }
  return report;
}
