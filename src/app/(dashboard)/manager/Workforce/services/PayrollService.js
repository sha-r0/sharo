import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import notificationService from "@/app/allservice/notification/notificationService";
import { dayKey, employeeName, toDate } from "./WorkforceRealtimeService";

const number = (value) => Number(value || 0) || 0;
const salaryOf = (employee) => number(employee.salary || employee.employment?.salary || employee.compensation?.monthlySalary || employee.payroll?.salary);
const businessDays = (month) => { const [year, value] = month.split("-").map(Number), total = new Date(year, value, 0).getDate(); return Array.from({ length: total }, (_, index) => new Date(year, value - 1, index + 1)).filter((date) => ![0].includes(date.getDay())).length; };

export default class PayrollService {
  static async load(companyId) {
    const read = (name) => getDocs(collection(db, "Companies", companyId, name)).then((snap) => snap.docs.map((item) => ({ id: item.id, ...item.data() }))).catch(() => []);
    const [employees, attendance, leaves, advances, payroll] = await Promise.all([read("Usermanagement"), read("Attendance"), read("LeaveRequests"), read("advance_requests"), read("Payroll")]);
    return { employees, attendance, leaves, advances, payroll };
  }

  static calculate(data, month) {
    const scheduledDays = businessDays(month);
    return data.employees.filter((employee) => String(employee.employment?.status || employee.status || "active").toLowerCase() !== "inactive").map((employee) => {
      const ids = new Set([employee.id, employee.employeeId].filter(Boolean).map(String));
      const attendance = data.attendance.filter((item) => ids.has(String(item.employeeFirestoreId || item.employeeId)) && dayKey(item.date || item.checkIn).startsWith(month));
      const presentDays = new Set(attendance.filter((item) => item.checkIn || ["present", "late", "half day"].includes(String(item.status).toLowerCase())).map((item) => dayKey(item.date || item.checkIn))).size;
      const halfDays = attendance.filter((item) => String(item.status).toLowerCase().includes("half")).length;
      const paidLeaveDays = data.leaves.filter((item) => ids.has(String(item.employeeFirestoreId || item.employeeId)) && String(item.status).toLowerCase() === "approved" && String(item.leaveType || "").toLowerCase().includes("paid")).reduce((sum, item) => sum + number(item.totalDays || item.days || 1), 0);
      const payableDays = Math.min(scheduledDays, Math.max(0, presentDays - halfDays * 0.5 + paidLeaveDays));
      const grossSalary = salaryOf(employee), earnedSalary = scheduledDays ? grossSalary * payableDays / scheduledDays : 0;
      const advanceDeductions = data.advances.filter((item) => ids.has(String(item.employeeFirestoreId || item.employeeId)) && String(item.advanceType).toLowerCase() === "personal" && String(item.status).toLowerCase() === "approved" && number(item.remainingAmount) > 0 && (!item.firstDeductionDate || dayKey(item.firstDeductionDate).slice(0, 7) <= month)).map((item) => ({ advanceId: item.id, amount: Math.min(number(item.monthlyDeduction), number(item.remainingAmount)), previousRemaining: number(item.remainingAmount), previousSettled: number(item.settledAmount) }));
      const advanceDeduction = advanceDeductions.reduce((sum, item) => sum + item.amount, 0);
      return { id: `${month}_${employee.id}`, month, employeeFirestoreId: employee.id, employeeId: employee.employeeId || "", employeeName: employeeName(employee), department: employee.employment?.department || employee.department || "", designation: employee.employment?.designation || employee.designation || "", bankDetails: employee.bankDetails || employee.financialInfo?.bankDetails || {}, scheduledDays, presentDays, halfDays, paidLeaveDays, payableDays, grossSalary, earnedSalary, overtimeAmount: 0, bonus: 0, otherDeduction: 0, advanceDeductions, advanceDeduction, netSalary: Math.max(0, earnedSalary - advanceDeduction), status: "Draft" };
    });
  }

  static async save(companyId, rows, month) {
    await Promise.all(rows.map((row) => setDoc(doc(db, "Companies", companyId, "Payroll", row.id), { ...row, companyId, month, updatedAt: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true })));
  }

  static async setStatus(companyId, row, status) {
    await updateDoc(doc(db, "Companies", companyId, "Payroll", row.id), { status, [`${status.toLowerCase()}At`]: serverTimestamp(), updatedAt: serverTimestamp() });
    if (status === "Paid" && row.status !== "Paid") {
      await Promise.all((row.advanceDeductions || []).map((deduction) => {
        const remainingAmount = Math.max(0, number(deduction.previousRemaining) - number(deduction.amount));
        return updateDoc(doc(db, "Companies", companyId, "advance_requests", deduction.advanceId), { remainingAmount, settledAmount: number(deduction.previousSettled) + number(deduction.amount), status: remainingAmount === 0 ? "Settled" : "Approved", updatedAt: serverTimestamp() });
      }));
    }
    if (["Processed", "Paid"].includes(status)) await notificationService.emitSafe(status === "Paid" ? "payroll.paid" : "payroll.processed", { companyId, targetUsers: [row.employeeFirestoreId], employeeName: row.employeeName, actionId: row.id, actionRoute: "/manager/Workforce/payroll", metadata: { payrollId: row.id, month: row.month, netSalary: row.netSalary } });
  }
}
