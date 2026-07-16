import ProjectCostService from "./ProjectCostService";

const number = (value) => Number(value || 0) || 0;
const lower = (value) => String(value || "").trim().toLowerCase();
const asDate = (value) => {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (Number.isFinite(value.seconds)) return new Date(value.seconds * 1000);
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};
const key = (value) => {
    const date = asDate(value);
    if (!date) return typeof value === "string" ? value.slice(0, 10) : "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const recordDate = (item) => key(item.date || item.workDate || item.createdAt || item.startTime || item.checkIn || item.updatedAt);
const hours = (item) => {
    const direct = number(item.totalHours || item.hoursWorked || item.durationHours || item.hours);
    if (direct) return direct;
    const start = asDate(item.startTime || item.checkIn); const end = asDate(item.endTime || item.checkOut);
    return start && end ? Math.max(0, (end - start) / 3_600_000) : 0;
};
const expenseType = (item) => lower(item.category || item.type || "miscellaneous");

export default class ProjectAnalyticsService {
    static analyze(data) {
        const { project } = data;
        const costs = ProjectCostService.calculate(data);
        const today = key(new Date());
        const assignedIds = new Set((project.employees || []).flatMap((item) => [item.firestoreId, item.employeeId]).filter(Boolean).map(String));
        const attendance = data.attendance.filter((item) => assignedIds.has(String(item.employeeFirestoreId || item.employeeId)));
        const leaves = data.leaves.filter((item) => assignedIds.has(String(item.employeeFirestoreId || item.employeeId)));
        const gps = data.gpsPunches.filter((item) => assignedIds.has(String(item.employeeFirestoreId || item.employeeId)));
        const actualExpense = costs.actualCost;
        const todayCost = costs.todayCost;
        const monthlyCost = costs.monthlyCost;
        const breakdown = { employee: 0, labour: 0, material: 0, vendor: 0, travel: 0, miscellaneous: 0 };
        costs.expenses.forEach((item) => {
            const type = expenseType(item);
            const bucket = Object.keys(breakdown).find((name) => type.includes(name)) || "miscellaneous";
            breakdown[bucket] += number(item.amount);
        });
        if (!costs.expenses.length) {
            breakdown.employee = number(project.employeeExpense); breakdown.material = number(project.materialExpense);
            breakdown.vendor = number(project.vendorExpense); breakdown.miscellaneous = number(project.normalExpense);
        }
        breakdown.employee = costs.employeeCost;
        breakdown.vendor = costs.vendorCost;
        const received = data.payments.filter((item) => ["received", "paid", "completed"].includes(lower(item.status)) || lower(item.type) === "received").reduce((sum, item) => sum + number(item.amount), 0) || number(project.totalReceived);
        const contract = number(project.contractValue || project.poAmount);
        const pendingPayment = Math.max(0, contract - received);
        const overdue = [...data.payments, ...data.invoices].filter((item) => item.dueDate && key(item.dueDate) < today && !["paid", "completed"].includes(lower(item.status))).reduce((sum, item) => sum + number(item.outstandingAmount || item.pendingAmount || item.amount), 0);
        const budget = number(project.approvedBudget || project.budget);
        const workHours = data.workLogs.reduce((sum, item) => sum + hours(item), 0);
        const completedTasks = data.tasks.filter((item) => ["completed", "done"].includes(lower(item.status))).length || number(project.completedTasks);
        const working = data.workLogs.filter((item) => recordDate(item) === today && (item.startTime || ["working", "active", "running"].includes(lower(item.status))) && !item.endTime).length;
        const paused = data.workLogs.filter((item) => recordDate(item) === today && ["paused", "break"].includes(lower(item.status))).length;
        const employeeStats = (project.employees || []).map((employee) => {
            const ids = new Set([employee.firestoreId, employee.employeeId].filter(Boolean).map(String));
            const logs = data.workLogs.filter((item) => ids.has(String(item.employeeFirestoreId || item.employeeId || item.userId)));
            const employeeAttendance = attendance.filter((item) => ids.has(String(item.employeeFirestoreId || item.employeeId)));
            const present = employeeAttendance.filter((item) => item.checkIn || ["present", "late", "half day"].includes(lower(item.status))).length;
            const totalHours = logs.reduce((sum, item) => sum + hours(item), 0);
            const completed = logs.reduce((sum, item) => sum + number(item.completedTasks), 0);
            const productivity = totalHours ? Math.min(100, (completed * 8 / totalHours) * 100) : 0;
            return { ...employee, hours: totalHours, completedTasks: completed, productivity, attendance: employeeAttendance.length ? present / employeeAttendance.length * 100 : 0, status: logs.some((item) => recordDate(item) === today && !item.endTime) ? "working" : "idle" };
        }).sort((a, b) => b.productivity - a.productivity || b.hours - a.hours);
        const dailyMap = {};
        costs.expenses.forEach((item) => { const date = recordDate(item); if (date) dailyMap[date] = (dailyMap[date] || 0) + number(item.amount); });
        const expenseTrend = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([label, value]) => ({ label: label.slice(5), value }));
        const activity = [
            ...data.workLogs.map((item) => ({ type: "work", title: item.title || `${item.employeeName || "Employee"} work log`, detail: item.status || `${hours(item).toFixed(1)} hours`, date: asDate(item.createdAt || item.startTime || item.date) })),
            ...data.expenses.map((item) => ({ type: "expense", title: `${item.employeeName || "Employee"} added an expense`, detail: `${item.category || "Expense"} • ₹${number(item.amount).toLocaleString("en-IN")}`, date: asDate(item.createdAt || item.date) })),
            ...data.payments.map((item) => ({ type: "payment", title: "Payment received", detail: `₹${number(item.amount).toLocaleString("en-IN")}`, date: asDate(item.createdAt || item.date) })),
            ...data.vendorPayments.map((item) => ({ type: "vendor-payment", title: `${item.vendorName || "Vendor"} payment`, detail: `${item.projectName || project.projectName} • ₹${number(item.amount).toLocaleString("en-IN")}`, date: asDate(item.createdAt || item.date) })),
            ...(project.vendors || []).map((item) => ({ type: "vendor", title: `${item.vendorName || "Vendor"} assigned`, detail: `Allocated ₹${number(item.allocatedAmount).toLocaleString("en-IN")}`, date: asDate(item.assignedAt || project.updatedAt || project.createdAt) })),
            ...data.notifications.map((item) => ({ type: item.module, title: item.title, detail: item.message, date: asDate(item.createdAt) })),
        ].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
        return {
            finance: { budget, approvedBudget: number(project.approvedBudget || budget), actualExpense, totalCost: costs.actualCost, employeeCost: costs.employeeCost, vendorCost: costs.vendorCost, expenseCost: costs.expenseCost, employeeHours: costs.employeeHours, averageCostPerHour: costs.averageCostPerHour, departmentCost: costs.departmentCost, remainingBudget: costs.remainingBudget, todayCost, monthlyCost, contract, poValue: number(project.poAmount), received, pendingPayment, overdue, outstanding: pendingPayment, profit: costs.expectedProfit, expectedProfit: costs.expectedProfit, profitPercent: costs.profitPercent, loss: costs.expectedLoss, burnRate: expenseTrend.length ? actualExpense / expenseTrend.length : 0, budgetUsed: costs.budgetUsed, breakdown, pendingBills: data.invoices.filter((item) => !["paid", "completed"].includes(lower(item.status))).length, pendingExpenses: data.expenses.filter((item) => lower(item.status) === "pending").length, pendingVendor: data.vendorPayments.filter((item) => !["paid", "completed", "approved"].includes(lower(item.status))).reduce((sum, item) => sum + number(item.amount), 0) },
            work: { totalHours: workHours, todayHours: data.workLogs.filter((item) => recordDate(item) === today).reduce((sum, item) => sum + hours(item), 0), working, paused, completedTasks, runningTasks: data.tasks.filter((item) => ["running", "in progress"].includes(lower(item.status))).length, pausedTasks: data.tasks.filter((item) => lower(item.status) === "paused").length, logs: [...data.workLogs].sort((a,b) => (asDate(b.createdAt || b.date)?.getTime() || 0) - (asDate(a.createdAt || a.date)?.getTime() || 0)) },
            employees: { assigned: project.employees?.length || 0, working, idle: Math.max(0, (project.employees?.length || 0) - working), absent: Math.max(0, (project.employees?.length || 0) - new Set(attendance.filter((item) => recordDate(item) === today).map((item) => item.employeeFirestoreId || item.employeeId)).size), onLeave: leaves.filter((item) => lower(item.status) === "approved" && key(item.fromDate) <= today && key(item.toDate) >= today).length, late: attendance.filter((item) => recordDate(item) === today && (lower(item.status) === "late" || item.isLate)).length, averageHours: employeeStats.length ? workHours / employeeStats.length : 0, averageProductivity: employeeStats.length ? employeeStats.reduce((sum, item) => sum + item.productivity, 0) / employeeStats.length : 0, attendancePercent: employeeStats.length ? employeeStats.reduce((sum, item) => sum + item.attendance, 0) / employeeStats.length : 0, list: employeeStats, top: employeeStats[0] || null, lowest: employeeStats.at(-1) || null },
            timeline: data.milestones.sort((a,b) => String(a.dueDate || a.date).localeCompare(String(b.dueDate || b.date))),
            payments: { invoices: data.invoices, history: data.payments }, vendors: { list: costs.vendorAssignments.map((assignment) => ({ ...data.vendors.find((item) => item.id === assignment.firestoreId || item.vendorId === assignment.vendorId), ...assignment })), payments: data.vendorPayments, paid: costs.vendorCost, allocated: costs.vendorAssignments.reduce((sum,item)=>sum+number(item.allocatedAmount),0), progress: costs.vendorAssignments.length?costs.vendorAssignments.reduce((sum,item)=>sum+number(item.progress),0)/costs.vendorAssignments.length:0 },
            documents: data.documents, client: data.client, map: { location: project.location || project.projectLocation || null, gps, radius: number(project.attendanceRadius) },
            charts: { expenses: expenseTrend, breakdown: Object.entries(breakdown).map(([label, value]) => ({ label, value })).filter((item) => item.value), employee: employeeStats.slice(0, 8).map((item) => ({ label: item.fullName?.split(" ")[0] || item.employeeId, value: item.productivity })), costMix: costs.costMix, profit: costs.profitTrend, vendorPayments: costs.vendorPaymentTrend },
            activity,
        };
    }
}

export { asDate, key, number, hours };
