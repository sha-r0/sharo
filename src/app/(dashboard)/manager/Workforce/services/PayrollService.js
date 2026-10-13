import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import payrollEligibility from "../../../../../../functions/src/workforce/payrollEligibility";
import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import payrollOrder from "../../../../../../functions/src/workforce/payrollOrder";
import payrollMath from "../../../../../../functions/src/workforce/payrollMath";

const markSaved = (rows, saved) => payrollOrder.sortPayrollEmployees(rows).map((row) => ({ ...row, _saved: saved, _dirty: false }));

export default class PayrollService {
  static async load(companyId, month) {
    // Load the roster under the existing Firestore read rules. A failed or
    // undeployed preview callable must not masquerade as an empty employee list.
    const [rosterResult, previewResult] = await Promise.allSettled([
      getDocs(collection(db, "Companies", companyId, "Usermanagement")),
      httpsCallable(functions, "previewPayroll")({ month }),
    ]);
    const employees = rosterResult.status === "fulfilled"
      ? rosterResult.value.docs.map((doc) => ({ ...doc.data(), id: doc.id })).filter(payrollEligibility.isPayrollEmployee)
      : [];
    try {
      if (previewResult.status === "rejected") throw previewResult.reason;
      const response = previewResult.value;
      if (!Array.isArray(response.data?.rows)) throw new Error("Invalid payroll preview response.");
      if (!response.data.rows.length && employees.length) throw new Error("Payroll preview returned no employees although active employee records exist. Check the deployed previewPayroll function and authenticated company.");
      return markSaved(response.data.rows, response.data.saved === true);
    } catch (error) {
      error.employeeRows = payrollOrder.sortPayrollEmployees(employees.map((employee) => ({
        id: `${month}_${employee.id}`, month, employeeFirestoreId: employee.id,
        employeeId: employee.employeeId || employee.login?.employeeId || "",
        employeeName: employee.personalInfo?.fullName || employee.name || "Employee",
        department: employee.employment?.department || employee.department || "",
        status: "Preview unavailable", _unavailable: true, _saved: false,
      })));
      throw error;
    }
  }

  static updateAdjustment(row, key, value) {
    if (row.status !== "Draft") return row;
    return { ...payrollMath.adjustPayrollRow(row, key, value), _dirty: true };
  }

  static async save(companyId, rows, month) {
    void companyId;
    const adjustments = Object.fromEntries(rows.map((row) => [row.employeeFirestoreId, {
      bonus: row.bonus, otherDeduction: row.otherDeduction,
    }]));
    const response = await httpsCallable(functions, "generatePayroll")({ month, adjustments });
    return markSaved(response.data.rows, true);
  }

  static async setStatus(companyId, row, status) {
    void companyId;
    if (!row._saved || row._dirty) throw new Error("Generate payroll before processing changes.");
    const response = await httpsCallable(functions, "transitionPayroll")({ payrollId: row.id, status });
    return response.data;
  }
}
