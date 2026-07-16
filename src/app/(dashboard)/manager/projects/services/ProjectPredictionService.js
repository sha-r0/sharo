import { asDate, number } from "./ProjectAnalyticsService";

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const day = 86_400_000;

export default class ProjectPredictionService {
    static predict(project, analytics) {
        const now = new Date();
        const start = asDate(project.startDate) || asDate(project.createdAt) || now;
        const plannedEnd = asDate(project.endDate);
        const elapsedDays = Math.max(1, (now - start) / day);
        const plannedDays = plannedEnd ? Math.max(1, (plannedEnd - start) / day) : 0;
        const progress = clamp(number(project.progress));
        const progressRate = progress / elapsedDays;
        const remainingDays = progressRate > 0 ? (100 - progress) / progressRate : plannedDays || 0;
        const estimatedCompletion = remainingDays ? new Date(now.getTime() + remainingDays * day) : plannedEnd;
        const actualExpense = analytics.finance.actualExpense;
        const finalCost = progress > 5 ? actualExpense / (progress / 100) : Math.max(actualExpense, analytics.finance.budget);
        const expectedProfit = analytics.finance.contract - finalCost;
        const scheduledProgress = plannedDays ? clamp(elapsedDays / plannedDays * 100) : progress;
        const scheduleGap = scheduledProgress - progress;
        const expenseVelocity = analytics.finance.burnRate;
        const requiredCash = Math.max(0, finalCost - actualExpense - analytics.finance.received);
        const dataSignals = [project.startDate, project.endDate, project.budget, project.progress, analytics.finance.contract, analytics.work.totalHours, analytics.charts.expenses.length].filter(Boolean).length;
        const confidence = clamp(42 + dataSignals * 7 + Math.min(10, analytics.charts.expenses.length));
        const delayProbability = clamp(20 + scheduleGap * 1.5 + (estimatedCompletion && plannedEnd && estimatedCompletion > plannedEnd ? 25 : 0) - Math.min(15, progress / 5));
        const overrun = Math.max(0, finalCost - analytics.finance.budget);
        const paymentRisk = clamp((analytics.finance.overdue > 0 ? 55 : 10) + (analytics.finance.pendingPayment > analytics.finance.contract * .5 ? 25 : 0));
        const riskyVendor = analytics.vendors.list.some((item) => item.paymentPercent >= 80 && number(item.progress) + 20 < item.paymentPercent);
        const delayedVendor = analytics.vendors.list.some((item) => item.targetCompletion && asDate(item.targetCompletion) < now && number(item.progress) < 100);
        const vendorRisk = clamp((analytics.finance.pendingVendor > 0 ? 25 : 5) + (riskyVendor ? 40 : 0) + (delayedVendor ? 35 : 0));
        const failure = clamp(delayProbability * .35 + (overrun > 0 ? 25 : 0) + (expectedProfit < 0 ? 30 : 0) + paymentRisk * .15);
        const currentEmployees = analytics.employees.assigned;
        const requiredEmployees = progressRate > 0 && plannedDays ? Math.max(currentEmployees, Math.ceil(currentEmployees * Math.max(1, scheduledProgress / Math.max(progress, 1)))) : currentEmployees;
        return {
            estimatedCompletion, finalCost, expectedProfit: Math.max(0, expectedProfit), expectedLoss: Math.max(0, -expectedProfit),
            budgetOverrun: overrun, delayProbability, labourRequirement: requiredEmployees,
            additionalLabour: Math.max(0, requiredEmployees - currentEmployees), cashFlowRequirement: requiredCash,
            clientPaymentRisk: paymentRisk, vendorPaymentRisk: vendorRisk, failureProbability: failure,
            vendorRisk,
            expenseVelocity, confidence,
        };
    }
}
