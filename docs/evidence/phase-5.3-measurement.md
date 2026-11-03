# Phase 5.3 — strictNullChecks + SPI Baseline Report

Measured on branch `arena/aa3988a2-solarpv-studio` at `4474993` (post Phase 5.2),
with `strictNullChecks: true` + `strictPropertyInitialization: true` enabled together.

## Total

- Combined errors (SNC + SPI): **M = 1**
- SPI-only errors (TS2564): **0**
- SNC-only errors: **1**

## Per error code

| Code   | Count | Description |
|--------|-------|-------------|
| TS2322 | 1     | Type mismatch (null branch) |
| other  | 0     | — |

## Top files by error count

1. `src/components/OfficialReportModal.tsx` — 1 (TS2322 at line 243: climate sheet row
   containing optional `dataRetrievalDate?: string` produces `(string|undefined)[]`
   not assignable to `(string|number)[][]`)

## Directory distribution

| Directory         | Errors | % of M |
|-------------------|--------|--------|
| src/components/** | 1      | 100%   |
| src/engine/**     | 0      | 0%     |
| src/App.tsx etc.  | 0      | 0%     |

## Path decision

- M = 1 ≤ 400 → **PATH A (single PR)**
