import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import projectRepository from "./projectRepository";
import ProjectAnalyticsService from "./ProjectAnalyticsService";
import ProjectPredictionService from "./ProjectPredictionService";
import ProjectAlertService from "./ProjectAlertService";
import notificationService from "@/app/allservice/notification/notificationService";

class ProjectDashboardService {
    constructor() { this.cache = new Map(); }

    async load(companyId, projectId, force = false) {
        const key = `${companyId}:${projectId}`;
        const cached = this.cache.get(key);
        if (!force && cached && Date.now() - cached.savedAt < 60_000) return cached.value;
        const data = await projectRepository.getIntelligenceData(companyId, projectId, force);
        if (!data) return null;
        const analytics = ProjectAnalyticsService.analyze(data);
        const predictions = ProjectPredictionService.predict(data.project, analytics);
        const alerts = ProjectAlertService.generate(data.project, analytics, predictions);
        const budgetHealth = Math.max(0, 100 - Math.max(0, analytics.finance.budgetUsed - 70) * 2);
        const scheduleHealth = Math.max(0, 100 - predictions.delayProbability);
        const profitability = Math.max(0, Math.min(100, 50 + analytics.finance.profitPercent));
        const productivity = analytics.employees.averageProductivity || (analytics.work.totalHours ? 55 : 0);
        const paymentHealth = Math.max(0, 100 - predictions.clientPaymentRisk);
        const healthScore = Math.round(budgetHealth * .25 + scheduleHealth * .25 + profitability * .2 + productivity * .15 + paymentHealth * .15);
        const riskLevel = healthScore < 60 ? "critical" : healthScore < 80 ? "high" : healthScore < 95 ? "medium" : "low";
        const healthLabel = healthScore >= 95 ? "Excellent" : healthScore >= 80 ? "Good" : healthScore >= 60 ? "Needs Attention" : "Critical";
        await Promise.all(alerts.filter((alert) => ["critical", "high"].includes(alert.severity)).map((alert) =>
            notificationService.ensureProjectAlert(companyId, data.project, alert).catch((error) => {
                console.error("Project intelligence notification failed:", error);
                return null;
            })
        ));
        const value = { ...data, analytics, predictions, alerts, health: { score: healthScore, label: healthLabel, riskLevel, budget: budgetHealth, schedule: scheduleHealth, profitability, productivity, payment: paymentHealth } };
        this.cache.set(key, { value, savedAt: Date.now() });
        return value;
    }

    subscribe(companyId, projectId, callback, onError) {
        let timer;
        let active = true;
        const refresh = () => {
            clearTimeout(timer);
            timer = setTimeout(() => this.load(companyId, projectId, true).then((value) => active && callback(value)).catch(onError), 250);
        };
        const paths = [doc(db, "Companies", companyId, "Projectmanagement", projectId), collection(db, "Companies", companyId, "Expenses"), collection(db, "Companies", companyId, "WorkLogs"), collection(db, "Companies", companyId, "VendorPayments"), collection(db, "Companies", companyId, "Payments")];
        const unsubscribers = paths.map((reference) => onSnapshot(reference, refresh, onError));
        return () => { active = false; clearTimeout(timer); unsubscribers.forEach((unsubscribe) => unsubscribe()); };
    }
}

export default new ProjectDashboardService();
