import { buildComplianceReport, validateMonth } from "./compliance.js";
import { buildEcr, buildEsiWorkbook, buildPreviewWorkbook } from "./exports.js";

const headers = { "Cache-Control": "private, no-store", "Vary": "Authorization", "X-Content-Type-Options": "nosniff" };
const json = (body, status = 200) => Response.json(body, { status, headers });
export const PAYROLL_COLLECTION = "Payrolls";

export async function loadComplianceDataset(db, companyId, month) {
  if (typeof companyId !== "string" || !companyId || companyId.includes("/")) throw new Error("FORBIDDEN");
  validateMonth(month);
  const company = db.collection("Companies").doc(companyId);
  const [employees, payroll] = await Promise.all([
    company.collection("Usermanagement").get(),
    company.collection(PAYROLL_COLLECTION).where("month", "==", month).get(),
  ]);
  const rows = (snapshot) => snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const payrollRows = rows(payroll);
  const employeeRows = rows(employees);
  // Legacy rows may omit companyId; an explicit different company is never accepted.
  if ([...payrollRows, ...employeeRows].some((row) => row.companyId != null && row.companyId !== companyId)) throw new Error("SOURCE_TENANT_MISMATCH");
  return { employees: employeeRows, payroll: payrollRows };
}

export function createComplianceGet({ authorize, requirePermission, load }) {
  return async function GET(request) {
    try {
      const context = await authorize(request);
      requirePermission(context, "payroll.view");
      const expectedCompany = request.headers.get("X-Company-Id");
      if (expectedCompany && expectedCompany !== context.companyId) throw new Error("FORBIDDEN");
      const params = new URL(request.url).searchParams;
      // Tenant is determined exclusively by the verified session, never query input.
      const month = validateMonth(params.get("month"));
      const format = params.get("format") || "report";
      const scheme = params.get("scheme") || "pf";
      if (!["report", "preview", "ecr", "esi"].includes(format) || !["pf", "esi"].includes(scheme)) throw new Error("INVALID_EXPORT");
      if (format !== "report") requirePermission(context, "payroll.export");
      const report = buildComplianceReport({ ...(await load(context.companyId, month)), month });
      if (format === "report") return json({ ...report, companyId: context.companyId });
      let body, filename, contentType;
      if (format === "ecr") {
        body = buildEcr(report); filename = `pf-ecr-${month}.txt`; contentType = "text/plain; charset=utf-8";
      } else if (format === "esi") {
        body = buildEsiWorkbook(report); filename = `esi-contribution-${month}.xls`; contentType = "application/vnd.ms-excel";
      } else {
        body = buildPreviewWorkbook(report, scheme); filename = `${scheme}-preview-${month}.xlsx`; contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }
      return new Response(body, { headers: { ...headers, "Content-Type": contentType, "Content-Disposition": `attachment; filename="${filename}"` } });
    } catch (error) {
      const code = String(error?.code || "").startsWith("auth/") ? "UNAUTHENTICATED" : error?.message;
      const statuses = { UNAUTHENTICATED: 401, FORBIDDEN: 403, COMPANY_INACTIVE: 403, INVALID_MONTH: 400, INVALID_EXPORT: 400, EXPORT_BLOCKED: 422, EXPORT_TOO_LARGE: 422, SOURCE_TENANT_MISMATCH: 409 };
      return json({ error: statuses[code] ? code : "COMPLIANCE_REQUEST_FAILED" }, statuses[code] || 500);
    }
  };
}
