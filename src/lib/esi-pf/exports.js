import * as XLSX from "xlsx";

export const PF_HEADERS = ["UAN", "Member Name", "Gross Wages", "EPF Wages", "EPS Wages", "EDLI Wages", "EE Share Remitted", "EPS Contribution Remitted", "ER Share Remitted", "NCP Days", "Refunds"];
export const ESI_HEADERS = ["IP Number", "IP Name", "No of Days for which wages paid/payable", "Total Monthly Wages", "Reason Code for Zero working days", "Last Working Day"];

function portalRows(report, scheme) {
  const rows = report.rows.filter((row) => row[scheme].candidate);
  if (!rows.length || rows.some((row) => !row[scheme].ready || row[scheme].issues.length)) throw new Error("EXPORT_BLOCKED");
  return rows;
}

function pfValues(row) {
  const pf = row.pf;
  return [pf.identifier, pf.name, pf.grossWages, pf.epfWages, pf.epsWages, pf.edliWages, pf.employeeContribution, pf.epsContribution, pf.employerContribution, pf.ncpDays, pf.refunds];
}

function esiValues(row) {
  const esi = row.esi;
  // ESIC requires a whole number of paid days, rounded up, and every cell as text.
  const days = esi.workingDays === null ? "" : String(Math.ceil(esi.workingDays));
  const reason = esi.zeroWageReasonCode ?? (esi.grossWages > 0 && esi.workingDays > 0 ? 0 : "");
  const date = esi.lastWorkingDay ? esi.lastWorkingDay.split("-").reverse().join("-") : "";
  return [esi.identifier, esi.name, days, esi.grossWages, reason, date].map((value) => value == null ? "" : String(value));
}

export function buildEcr(report) {
  // EPFO ECR 2.0: eleven #~# separated fields, no header, CRLF record boundaries.
  return `${portalRows(report, "pf").map((row) => pfValues(row).join("#~#")).join("\r\n")}\r\n`;
}

function workbook(sheets, bookType) {
  const book = XLSX.utils.book_new();
  for (const [name, values] of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(values);
    // Strings remain literal cells (including =, +, -, @); never create formulas.
    for (const [address, cell] of Object.entries(sheet)) if (!address.startsWith("!") && cell.t === "s") cell.z = "@";
    sheet["!cols"] = values[0].map(() => ({ wch: 24 }));
    XLSX.utils.book_append_sheet(book, sheet, name);
  }
  return XLSX.write(book, { type: "buffer", bookType });
}

export function buildEsiWorkbook(report) {
  const rows = portalRows(report, "esi");
  if (rows.length > 65535) throw new Error("EXPORT_TOO_LARGE");
  return workbook([["Sheet1", [ESI_HEADERS, ...rows.map(esiValues)]]], "biff8");
}

export function buildPreviewWorkbook(report, scheme) {
  if (!["pf", "esi"].includes(scheme)) throw new Error("INVALID_EXPORT");
  const headers = scheme === "pf" ? PF_HEADERS : [...ESI_HEADERS, "Employee ESI (stored)", "Employer ESI (stored)", "Working days (stored)"];
  const rows = report.rows.map((row) => [
    row.employeeId, row.employeeName,
    ...(scheme === "pf" ? pfValues(row) : [...esiValues(row), row.esi.employeeContribution, row.esi.employerContribution, row.esi.workingDays]),
    row[scheme].eligible === null ? "Unknown" : row[scheme].eligible ? "Yes" : "No",
    row.payrollStatus || "Missing payroll", row.payrollGrossSalary, row.earnedSalary,
    row[scheme].issues.join("; ") || (row[scheme].ready ? "Ready" : "Not eligible"),
  ]);
  return workbook([
    ["Preview - NOT FOR UPLOAD", [["Employee ID", "Employee", ...headers, "Eligible", "Payroll status", "Payroll gross salary (not statutory)", "Payroll earned salary (not statutory)", "Validation"], ...rows]],
    ["Read me", [
      ["Month", report.month],
      ["Purpose", "Review workbook only. Use the dedicated portal download for filing."],
      ["Scope", "All employees for the selected month; search does not filter exports."],
      ["Amounts", "Stored finalized payroll only. Blank means unavailable, not zero. No contribution calculations."],
      ["PF employer share", "EPF residual share excluding the separately stored EPS contribution."],
      ["ESI days", "Portal paid days are rounded up; original payroll days are included separately."],
    ]],
  ], "xlsx");
}
