import { useMemo } from "react";
import type { StudyRequest, StudyResult } from "../studies/studyContract";
import { studyInsights } from "../studies/studyInsights";
export function StudyInsights({
  request,
  result,
  en,
}: {
  request: StudyRequest;
  result?: StudyResult;
  en: boolean;
}) {
  const info = useMemo(() => studyInsights(request, result), [request, result]);
  return (
    <div
      className="text-xs space-y-2"
      data-testid={result ? "study-insights-result" : "study-insights-review"}
    >
      <h4>
        {en ? "Data diagnostics & UTC coverage" : "بررسی داده و پوشش زمانی UTC"}
      </h4>
      <p>
        {info.coverage.startUtc} → {info.coverage.endUtc} ·{" "}
        {info.coverage.hours} h ·{" "}
        {info.coverage.completeUtcCalendarYear
          ? en
            ? "Complete UTC calendar year"
            : "سال تقویمی کامل UTC"
          : en
            ? "Partial period; not annualized"
            : "دورهٔ ناقص؛ بدون سالانه‌سازی"}
      </p>
      <p>
        {en
          ? "Informational checks only; no correction or quality certification. Midpoint geometry is an approximation for interval averages."
          : "بررسی‌ها صرفاً اطلاعاتی‌اند؛ بدون اصلاح داده یا تأیید کیفیت. هندسهٔ میانه تقریب دادهٔ میانگین بازه است."}
      </p>
      <p>
        {en ? "Solar-geometry checks" : "بررسی‌های هندسهٔ خورشید"}:{" "}
        {info.weather.geometryStatus};{" "}
        {en ? "eligible closure intervals" : "بازه‌های قابل بررسی closure"}:{" "}
        {info.weather.closureEligible ?? "—"}
      </p>
      <ul>
        {info.weather.checks.map((c) => (
          <li key={c.code}>
            {c.code}: {c.count}
            <details>
              <summary>
                {en
                  ? "Definition / examples (max 5)"
                  : "تعریف / نمونه‌ها (حداکثر ۵)"}
              </summary>
              <p>{c.description}</p>
              {c.examples.map((t, i) => (
                <div key={i}>{t}</div>
              ))}
            </details>
          </li>
        ))}
      </ul>
      <details>
        <summary>
          {en
            ? "Monthly UTC coverage (not sensor availability)"
            : "پوشش ماهانه UTC (نه availability حسگر)"}
        </summary>
        <p>
          {en
            ? "Coverage splits elapsed time at UTC boundaries. Energy keeps whole intervals assigned by midpoint; it is not prorated."
            : "پوشش زمانی در مرز UTC تفکیک می‌شود. انرژی هر بازه کامل به ماه میانه نسبت داده می‌شود و تسهیم نمی‌شود."}
        </p>
        <ul>
          {info.coverage.years.map((y) => (
            <li key={y.year}>
              {y.year}: {y.hours} / {y.calendarHours} h ·{" "}
              {y.fraction.toFixed(6)}
            </li>
          ))}
        </ul>
        <table>
          <thead>
            <tr>
              <th>UTC</th>
              <th>Hours</th>
              <th>Calendar hours</th>
              <th>Energy midpoint hours</th>
              <th>Fraction</th>
            </tr>
          </thead>
          <tbody>
            {info.coverage.months.map((m) => (
              <tr key={m.month}>
                <td>{m.month}</td>
                <td>{m.hours}</td>
                <td>{m.calendarHours}</td>
                <td>{m.midpointAssignedHours}</td>
                <td>{m.fraction.toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <details data-testid="study-source-ledger">
        <summary>
          {en ? "Sources & assumptions ledger" : "دفتر منابع و فرض‌ها"}
        </summary>
        <p>
          {en
            ? "Caller-declared, not independently verified. Equipment submodels inherit equipment provenance."
            : "منابع اعلام‌شدهٔ کاربر، نه تأیید مستقل. زیرمدل‌های تجهیزات منبع پارامترها را به ارث می‌برند."}
        </p>
        <pre dir="ltr" className="whitespace-pre-wrap break-all">
          {JSON.stringify(info.sources, null, 2)}
        </pre>
      </details>
    </div>
  );
}
