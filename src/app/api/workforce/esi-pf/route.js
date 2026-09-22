import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import { createComplianceGet, loadComplianceDataset } from "@/lib/esi-pf/server";

export const runtime = "nodejs";
export const GET = createComplianceGet({
  authorize: authorizeCompanyRequest,
  requirePermission: requireCompanyPermission,
  load: (companyId, month) => loadComplianceDataset(adminDb, companyId, month),
});
