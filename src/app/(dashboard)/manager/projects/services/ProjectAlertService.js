import { asDate, key } from "./ProjectAnalyticsService";

export default class ProjectAlertService {
    static generate(project, analytics, predictions) {
        const alerts = [];
        const add = (severity, title, message, module = "project") => alerts.push({ id: `${severity}-${title}`, severity, title, message, module });
        if (analytics.finance.budgetUsed >= 100) add("critical", "Budget exceeded", `Actual expense is ${analytics.finance.budgetUsed.toFixed(0)}% of budget.`, "finance");
        else if (analytics.finance.budgetUsed >= 85) add("high", "Project reaching budget", `${analytics.finance.budgetUsed.toFixed(0)}% of the approved budget has been used.`, "finance");
        if (predictions.budgetOverrun > 0) add("critical", "Budget overrun predicted", `Current trends indicate an overrun of ₹${predictions.budgetOverrun.toLocaleString("en-IN", { maximumFractionDigits: 0 })}.`, "prediction");
        if (predictions.expectedLoss > 0) add("critical", "Loss predicted", `The projected loss is ₹${predictions.expectedLoss.toLocaleString("en-IN", { maximumFractionDigits: 0 })}.`, "prediction");
        if (predictions.delayProbability >= 65) add("high", "Schedule delay likely", `Delay probability is ${predictions.delayProbability.toFixed(0)}%.`, "timeline");
        if (analytics.finance.overdue > 0) add("high", "Client payment overdue", `₹${analytics.finance.overdue.toLocaleString("en-IN")} is overdue.`, "payment");
        if (analytics.finance.pendingVendor > 0 && predictions.vendorPaymentRisk >= 40) add("high", "Vendor payment risk", `₹${analytics.finance.pendingVendor.toLocaleString("en-IN")} is pending for vendors.`, "vendor");
        analytics.vendors.list.forEach((vendor) => {
            const name = vendor.vendorName || vendor.companyName || "Vendor";
            if (vendor.paymentPercent > 100) add("critical", "Vendor payment exceeded", `${name} has received ${vendor.paymentPercent.toFixed(0)}% of its allocation. Further payments require manager approval.`, "vendor");
            else if (vendor.paymentPercent >= 90) add("critical", "Vendor payment at 90%", `${name} has received ${vendor.paymentPercent.toFixed(0)}% while project completion is ${Number(project.progress || 0).toFixed(0)}%.`, "vendor");
            else if (vendor.paymentPercent >= 80) add("high", "Vendor payment at 80%", `${name} has received ${vendor.paymentPercent.toFixed(0)}% while project completion is ${Number(project.progress || 0).toFixed(0)}%. Review before releasing more payments.`, "vendor");
            if (["inactive", "blocked"].includes(String(vendor.status || "").toLowerCase()) && Number(vendor.progress || 0) < 100) add("high", "Vendor inactive", `${name} is inactive with incomplete assigned work.`, "vendor");
            if (vendor.targetCompletion && asDate(vendor.targetCompletion) < new Date() && Number(vendor.progress || 0) < 100) add("high", "Vendor completion delayed", `${name} has passed its target completion date.`, "vendor");
        });
        if (!analytics.work.todayHours && !["completed", "hold", "on hold"].includes(String(project.status || "").toLowerCase())) add("medium", "No work log today", "No work has been logged against this project today.", "work");
        if (analytics.employees.assigned && analytics.employees.working === 0) add("medium", "Project team inactive", "No assigned employees are currently working.", "employee");
        if (analytics.employees.averageProductivity < 45 && analytics.work.totalHours > 0) add("high", "Low employee productivity", `Average productivity is ${analytics.employees.averageProductivity.toFixed(0)}%.`, "employee");
        if (analytics.employees.absent > 0) add("medium", "Project attendance gap", `${analytics.employees.absent} assigned employee(s) have no attendance today.`, "attendance");
        if (analytics.map.gps.some((item) => item.gpsValid === false || item.outsideRadius)) add("high", "GPS mismatch", "One or more project employees punched outside the allowed radius.", "gps");
        if (analytics.employees.late >= 2) add("medium", "Repeated late attendance", `${analytics.employees.late} late attendance records require attention.`, "attendance");
        if (project.endDate && key(project.endDate) < key(new Date()) && String(project.status).toLowerCase() !== "completed") add("critical", "Project end date passed", "The planned completion date has passed.", "timeline");
        if (analytics.timeline.some((item) => item.dueDate && asDate(item.dueDate) < new Date() && !["completed", "done"].includes(String(item.status).toLowerCase()))) add("high", "Delayed milestone", "One or more milestones are overdue.", "timeline");
        if (!alerts.length) add("low", "No immediate risks", "Current project signals are within expected operating ranges.");
        const rank = { critical: 4, high: 3, medium: 2, low: 1 };
        return alerts.sort((a, b) => rank[b.severity] - rank[a.severity]);
    }
}
