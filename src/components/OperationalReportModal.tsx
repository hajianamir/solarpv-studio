import React, { useState } from "react";
import type { OperationalEnergy } from "../studies/operationalEnergy";
import { loadOperationalStudy } from "../studies/operationalStudy";
import type { FinancialAnalysisResult } from "../engine/financialEngine";
import {
  escapeXml,
  exportToWordDocument,
  exportToExcelWorkbook,
} from "../engine/reportingEngine";

/** Dedicated source-aware dossier. No screening waterfall, PR or 24h curve is reused. */
export function OperationalReportModal({
  receipt,
  financial,
  projectName,
  projectInputSnapshot,
  engineeringSnapshot,
  onClose,
}: {
  receipt: OperationalEnergy;
  financial: FinancialAnalysisResult;
  projectName: string;
  projectInputSnapshot: Record<string, unknown>;
  engineeringSnapshot: Record<string, unknown>;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const rows: (string | number)[][] = [
    ["Field", "Value", "Unit / qualification"],
    ["Project", projectName, "Engineering scenario only"],
    ["Energy source", receipt.source, "not_field_validated"],
    [
      "Study archive ID",
      receipt.studyId ?? "legacy memory receipt",
      "SHA-256 content identity; not authentication",
    ],
    [
      "Evidence SHA-256",
      receipt.sourceSha256,
      "Revalidated model result(s), not field measurements",
    ],
    ["Year", receipt.year, "Complete UTC calendar year"],
    ["Intervals", receipt.intervalCount, "No gap filling or annualization"],
    ["Export", receipt.exportKwh, "kWh/year"],
    [
      "Import",
      receipt.importKwh,
      "kWh/year; grid purchase tariff applied in financial model",
    ],
    ["Boundary", receipt.boundary, "Not necessarily the sale meter"],
    ["Latitude", receipt.context.latitude, "deg"],
    ["Longitude", receipt.context.longitude, "deg"],
    ["DC nameplate", receipt.context.dcCapacityKwp, "kWp"],
    ["Inverter AC nameplate", receipt.context.inverterCapacityKw, "kW"],
    [
      "Configuration SHA-256",
      receipt.context.configurationSha256,
      "Physical project dependency identity",
    ],
    [
      "Acknowledgement",
      receipt.acknowledgement,
      "User declared; not independent approval",
    ],
    [
      "LCOE",
      financial.isLcoeDefined && financial.lcoeUsdPerKwh !== null
        ? financial.lcoeUsdPerKwh
        : "Undefined",
      "USD/kWh; modeled",
    ],
    [
      "IRR",
      financial.isIrrDefined && financial.irrPct !== null
        ? financial.irrPct
        : "Undefined",
      "%; modeled",
    ],
    ["NPV", financial.npvUsd, "USD; modeled"],
    [
      "Qualification",
      "engineering_scenario / not_field_validated",
      "No field calibration, bankability, construction or standards-conformity claim",
    ],
    [
      "Excluded",
      "Screening waterfall, PR and representative 24h curve",
      "Not evidence of this source; no second application of losses",
    ],
    [
      "Portability",
      "Local saves store a reference; project export embeds the validated archive",
      "Export project bundle for one-file transfer; local browser storage can be cleared",
    ],
  ];
  const annexRows: (string | number | boolean | null)[][] = [
    ["Section / input key", "Value", "Qualification"],
  ];
  const flatten = (v: unknown, path: string) => {
    if (v !== null && typeof v === "object") {
      for (const [k, item] of Object.entries(v)) flatten(item, `${path}.${k}`);
    } else
      annexRows.push([
        path,
        typeof v === "number" || typeof v === "boolean"
          ? v
          : v == null
            ? null
            : String(v),
        "Design/screening input; not proof of annual energy or standards conformity",
      ]);
  };
  flatten(engineeringSnapshot, "engineering");
  const dispatchRows = Object.entries(receipt.dispatch ?? {}).map(([k, v]) => [
    k,
    typeof v === "object" ? JSON.stringify(v) : String(v),
  ]);
  rows.push(
    [
      "Valued PV self-consumption",
      receipt.valuedSelfConsumedKwh ?? 0,
      "kWh; conservative initial stored energy exclusion",
    ],
    ["Mode", receipt.context.mode, "Explicit operating mode"],
    [
      "Valued annual energy",
      receipt.financeEnergyKwh ?? receipt.exportKwh,
      "kWh/year; export + PV self-consumption (grid) or served PV load (island)",
    ],
    ...dispatchRows.map(([k, v]) => [
      k,
      v,
      "Raw operating ledger; valued energy separately excludes initial stored energy",
    ]),
  );
  rows.push([
    "Financial interpretation",
    receipt.context.mode === "ongrid"
      ? "Incremental PV benefit: avoided retail purchases + surplus export. Gross household grid purchases shown in ledger, NOT subtracted twice."
      : receipt.context.mode === "offgrid"
        ? "PV served-load avoided cost, no grid sales."
        : "PPA export minus modeled plant grid purchases.",
    "Later years use existing scalar degradation, not re-dispatched years",
  ]);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Operational engineering dossier</title></head><body><h1>Operational engineering dossier</h1><p>MODELED SCENARIO — NOT FIELD VALIDATED. Not a verified sale-meter assessment.</p><table border="1">${rows.map((row) => `<tr>${row.map((v) => `<td>${escapeXml(String(v))}</td>`).join("")}</tr>`).join("")}</table><h2>25-year modeled cashflow</h2><pre>${escapeXml(JSON.stringify(financial.cashFlow25Years, null, 2))}</pre><h2>EPC design annex — independent screening assessments</h2><p>Structural, electrical, protection, battery and array inputs below are design assessments only; they do not replace the adopted annual operating ledger.</p><table border="1">${annexRows.map((row) => `<tr>${row.map((v) => `<td>${escapeXml(String(v ?? "Not supplied"))}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const run = async (action: () => Promise<unknown> | unknown) => {
    try {
      await action();
      setError("");
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Operational engineering report"
      className="fixed inset-0 z-[200] bg-black/70 overflow-auto p-6"
    >
      <section
        className="bg-white text-black p-6 max-w-5xl mx-auto rounded-xl space-y-4"
        data-testid="operational-report"
      >
        <h2>گزارش منبع اجرایی / Operational engineering dossier</h2>
        <p>
          سناریوی مدل‌شده؛ اعتبارسنجی میدانی نشده. این گزارش عمداً PR، waterfall
          و منحنی ۲۴ ساعتهٔ screening را ترکیب نمی‌کند. مشخصات مستقل مطالعه و
          نسخه‌های runtime در آرشیو شواهد نگهداری می‌شوند.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={onClose}>Close operational report</button>
          <button
            onClick={() =>
              void run(async () => {
                const { createReportPdf } = await import(
                  "../studies/reportPdf"
                );
                download(
                  await createReportPdf("Operational engineering dossier", [
                    { title: "Source and financial summary", rows },
                    {
                      title: "25-year modeled cashflow",
                      rows: financial.cashFlow25Years.map((r, i) => [i, r]),
                    },
                    {
                      title:
                        "EPC design annex — independent screening assessments",
                      rows: annexRows,
                    },
                  ]),
                  "operational-report.pdf",
                );
              })
            }
          >
            Download operational PDF
          </button>
          <button
            onClick={() =>
              void run(() => {
                const w = window.open("", "_blank");
                if (!w)
                  throw new Error(
                    "Allow popup for report printing / Save as PDF",
                  );
                w.opener = null;
                w.document.write(html);
                w.document.close();
                w.focus();
                w.print();
              })
            }
          >
            Print operational report / PDF
          </button>
          <button
            onClick={() =>
              void run(() =>
                download(
                  new Blob([html], { type: "text/html;charset=utf-8" }),
                  "operational-report.html",
                ),
              )
            }
          >
            Download operational HTML
          </button>
          <button
            onClick={() =>
              void run(() =>
                exportToWordDocument(html, "operational-report.docx"),
              )
            }
          >
            Download operational Word
          </button>
          <button
            onClick={() =>
              void run(() =>
                exportToExcelWorkbook(
                  [
                    { sheetName: "EPC design annex", rows: annexRows },
                    { sheetName: "Source and financial summary", rows },
                    {
                      sheetName: "Cashflow",
                      rows: [
                        ["Year", "Modeled cashflow record"],
                        ...financial.cashFlow25Years.map((r, i) => [
                          i,
                          JSON.stringify(r),
                        ]),
                      ],
                    },
                  ],
                  "operational-report.xlsx",
                ),
              )
            }
          >
            Download operational Excel
          </button>
          <button
            onClick={() =>
              void run(async () => {
                if (!receipt.studyId)
                  throw new Error(
                    "Re-adopt evidence to create a portable report",
                  );
                const { document: study } = await loadOperationalStudy(
                  receipt.studyId,
                  receipt.context,
                );
                download(
                  new Blob(
                    [
                      JSON.stringify({
                        schemaVersion: "operational-report-v1",
                        projectName,
                        projectInputSnapshot,
                        engineeringSnapshot,
                        study,
                        receipt,
                        financial,
                        limitations: [
                          "engineering_scenario",
                          "not_field_validated",
                          "not_verified_sale_meter",
                          "no_screening_waterfall_applied",
                        ],
                      }),
                    ],
                    { type: "application/json" },
                  ),
                  "operational-report.json",
                );
              })
            }
          >
            Download operational JSON with evidence
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        <h3>
          EPC scope: site / equipment / loads / array / storage / protection /
          structural design
        </h3>
        <p>
          Independent design annex; no screening energy or PR reused. Future
          cashflows retain scalar degradation, not multi-year dispatch.
        </p>
        <details>
          <summary>Engineering design annex</summary>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(engineeringSnapshot, null, 2)}
          </pre>
        </details>
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((v, j) => (
                  <td className="border p-2 break-all" key={j}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
