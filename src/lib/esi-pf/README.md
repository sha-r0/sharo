# ESI & PF compliance: read-only data contract

This feature only serves `/manager/Workforce/esi-pf` and its GET API,
`/api/workforce/esi-pf`. The page/API do not write to Firestore or call payroll
mutations. The existing server-owned Payroll generation/finalization functions
now capture the inputs and persist the monthly statutory results described below.

## Schema inspected

- `functions/src/workforce/WorkforceFunctions.js`: `generatePayroll` writes
  `Companies/{companyId}/Payrolls/{month}_{employeeFirestoreId}`. Rows contain
  `month`, `employeeFirestoreId`, `employeeId`, `employeeName`, `grossSalary`,
  `earnedSalary`, `payableDays`, `pfEnabled`, `esiEnabled`, `pfDeduction`,
  `esiDeduction`, and `status`.
- `transitionPayroll` changes Draft to Processed, records `finalizedAt` and a
  partial salary `finalizedSnapshot` and versioned `compliance`, then allows Processed to Paid. Generation refuses
  to overwrite Processed, Paid, or Finalized rows. Those three states are accepted;
  Draft/unknown states never supply amounts. `finalizedSnapshot` only contains
  gross/net salary, payable days, and aggregate deductions. Statutory detail lives
  separately in `compliance`; no old salary field is replaced.
- `employeeMapper.js` and `EmployeeForm.jsx` store employee names under
  `personalInfo.fullName` and PF/ESI settings under `salaryStructure.includePf`,
  `includeEsi`, and employee/employer percentage fields.
- Add/Edit Employee also captures `statutoryDetails.uan` and `ipNumber` in the
  PF & ESI Details section. The existing salary eligibility flags are reused.
  The authenticated employee API validates and merges these fields, preserving
  legacy profiles when older callers omit them. Submitted identifiers must be
  strings of 12/10 digits, and are required only for applicable schemes.
- The payroll writer currently reads `compensation`/`payroll` eligibility and
  flat deductions instead of `salaryStructure`. This discrepancy is surfaced;
  this feature does not replace those deductions or change existing net salary.

The inspection was of repository schemas, not live tenant records.

## Frozen monthly inputs and calculation

Generation captures `statutoryInputs` (version 1): wage month, the actual monthly
salary source used by the existing calculator, salary components and configured
rates, eligibility, joining date, UAN and IP number. Regeneration clears stale
draft compliance results. It does not change `calculatePayrollRow` or net pay.

Draft -> Processed atomically writes `compliance` version 2 and the existing
salary finalization fields. No current employee profile is read at finalization.
Repeated processing is idempotent; Processed -> Paid never recalculates or
backfills statutory data. Existing finalized records are not migrated or modified.

Calculations only use frozen inputs and recorded monthly values:

| Result | Source / calculation |
| --- | --- |
| PF gross wages | Confirmed generated earned salary plus bonus, rounded to whole rupees; an explicit stored statutory value takes precedence |
| EPF wages | Explicit monthly wage basis, or earned basic-only wages when salary components explicitly reconcile, HRA/other allowance are zero, bonus is zero and monthly pay is at most 15,000 (from September 2014) |
| EPS / EDLI wages | Explicit monthly values only; PF applicability does not prove pension membership or EDLI exemption |
| Employee PF / ESI | Existing payroll `pfDeduction` / `esiDeduction`, unchanged |
| Employer EPS | Explicit stored share, or 8.33% of confirmed EPS wages up to 15,000, rounded to a rupee (from September 2014) |
| Employer PF | Explicit stored share, or rounded employer total at the frozen 10%/12% rate, less the EPS share |
| NCP days | Explicit monthly value; otherwise zero for a confirmed fully paid month with joining on/before month start and no pending attendance, or calendar-month length for confirmed zero wages/zero paid days |
| PF advance refund | Explicit monthly value only; never inferred from salary advance recovery or defaulted to zero |
| ESI wages | Explicit monthly value, or confirmed regular earned wages when bonus is zero and no overtime classification is needed |
| Employer ESI | Explicit stored share, or confirmed ESI wages times frozen 3.25%, rounded up (from July 2019) |
| ESI payable days | Stored payroll payable days, unchanged |
| Zero-wage reason / last working day | Explicit monthly evidence when applicable; reason 0 only for positive wages and paid days |

The basis is unconfirmed if the real salary input is missing, the earned amount
does not reconcile with the original salary/day calculation, or unclassified OT
is present. `salaryStructure.grossSalary` is never substituted for the salary
source the payroll calculator actually used. Unclassified bonus blocks automatic
ESI wage derivation. Partial-month NCP, missing membership/exemption information,
missing PF refunds, and zero-wage reasons are not guessed.

Known deduction/rate mismatches, unsupported/missing rates, eligibility conflicts
and pending attendance are persisted as review issues. A possible employee ESI
exemption is not inferred to explain a different deduction. Salary results stay
unchanged; these issues block Ready and portal exports instead.

`compliance.sources` records per-field provenance; `compliance.issues` records
unresolved calculation inputs. Null remains unknown and is never replaced by
zero. Portal-level field validation runs separately in the read-only API.

## Stored field contract and historical compatibility

To make the read-only exporters usable with complete authoritative records, the
adapter recognizes the following version 2 fields. Employee identifiers are
supported by Add/Edit Employee and frozen at generation for new payroll.
Missing monthly facts still require authoritative upstream records; this feature
does not add an input form, invent values, or alter locked rows.

| Source | Fields |
| --- | --- |
| `Usermanagement.statutoryDetails` | `uan` (12-digit string), `ipNumber` (10-digit string) |
| Finalized `Payroll.compliance.pf` | `applicable`, `uan`, `memberName`, `grossWages`, `epfWages`, `epsWages`, `edliWages`, `employeePf`, `employerPf`, `employerEps`, `ncpDays`, `refundOfAdvance` |
| Finalized `Payroll.compliance.esi` | `applicable`, `ipNumber`, `memberName`, `esiWages`, `employeeEsi`, `employerEsi`, `payableDays`, `zeroContributionReason`, `lastWorkingDay` (`YYYY-MM-DD` or null) |

PF `employerPf` means the **EPF residual share excluding EPS**. Unversioned
historical snapshots retain their original mappings: PF `epsContribution`,
`employerContribution`, `refunds`; ESI `grossWages`, `employerContribution`,
`zeroWageReasonCode`; employee contributions/payable days on the payroll row.
They are read without migration or recalculation. Old drafts without frozen
inputs may only reuse their existing recorded values; current employee rates
cannot be applied retroactively.

Version 2 exports exclusively use the finalized snapshot; absent snapshot
identifiers/amounts cannot fall back to a current employee profile or salary.
Disagreements with payroll deductions, paid days, or employee identifiers block
export. Legacy unversioned identifier fallback remains available for compatibility.
Numeric identifiers are invalid: lost leading zeroes are never reconstructed.
Explicit zero monetary values are valid; absent/invalid values stay null.

## Joins, validation and scope

Employees are joined by Firestore document ID first. Only records without that
reference may use an exact, unique `employeeId` match. No name, fuzzy, or numeric
ID normalization is used. Missing employee records, duplicate finalized payroll,
duplicate UAN/IP numbers, and ambiguous joins stay visible and block filing.

The table and total count include current company employee records plus unmatched
finalized monthly rows. No employee is silently excluded based on current active
status. Finalized eligibility wins; missing finalized flags or differences from
current employee settings require review. Explicitly ineligible, nonconflicting
employees are excluded from portal files. Unknown eligibility blocks filing.

Missing Data counts employees with any validation issue, once per employee.
Search changes the on-screen table only. Preview workbooks include all records.
Portal downloads require every candidate in that scheme to be ready; they never
silently export a ready subset. Downloads reload source data and revalidate.

## Files and portal references

- PF `.txt`: eleven fields separated by `#~#`, no header, CRLF lines, whole-number
  amounts. [EPFO ECR 2.0 specification](https://www.epfindia.gov.in/site_docs/PDFs/EPFOUnifiedPortal/Introduction_ECR2.0.pdf).
  The [2025 revamped-ECR FAQ](https://www.epfindia.gov.in/site_docs/PDFs/Circulars/Y2025-2026/ComplianceLetter_08102025.pdf)
  states the text layout is unchanged.
- ESIC `.xls`: real BIFF8 workbook, Sheet1, six columns in portal order; every
  cell is text. Paid days round up only during serialization. Contribution
  columns belong in the review workbook, not the portal template.
  [ESIC monthly contribution manual](https://portal.esic.gov.in/InsuranceGlobalWebV4/ESICInsurancePortal/Documents/MC_Presentation.pdf).
- PF/ESI `.xlsx` previews: review-only files, preserving missing data and
  validation messages. String cells are literal, never Excel formulas.

Rate references: [EPFO EPS contribution clarification](https://www.epfindia.gov.in/site_docs/PDFs/Updates/FAQ_Reduced_rate_of_contribution_20052020.pdf),
[ESIC contribution rates](https://www.esic.gov.in/attachments/publicationfile/b830b6c5a968aae81fdbc3a09e9063fb.pdf).

Ready means locally complete and structurally valid, not accepted by EPFO/ESIC.
The portals still verify registration, establishment linkage, membership and
applicable statutory rules. This feature does not connect to or submit to them.

## Access

The existing verified-token company authorization determines the tenant;
query-supplied company IDs are ignored. Reads need `payroll.view`. Every download
also needs `payroll.export`. Existing verified-owner bypass applies. Responses
are private/no-store and expose only compliance fields, not employee access,
banking, contact, or identity documents. The browser has no direct database calls.
Generation keeps `payroll.create`/`payroll.edit`/`payroll.manage`; finalization keeps
`payroll.approve`/`payroll.manage`, with the existing verified owner access. The
tenant comes only from the verified actor. Client-supplied statutory objects are
not accepted. Status IDs cannot contain paths, and explicit tenant mismatches fail.

## Validation

Run `node --test tests/esi-pf.test.mjs tests/esi-pf-page.test.mjs tests/employee-rbac.test.mjs`.
Monthly persistence/export tests:
`node --test functions/test/payroll-statutory.test.js functions/test/workforce-hardening.test.js`
and `node --test tests/payroll-statutory-integration.test.mjs`.
