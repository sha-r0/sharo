const number = (value) => Number(value || 0) || 0;
const lower = (value) => String(value || "").toLowerCase();
const dateValue = (value) => value?.toDate?.() || (value ? new Date(value) : new Date(0));

export default class VendorAnalyticsService {
  static analyze(vendors, payments, projects) {
    const assignments = projects.flatMap((project) => (project.vendors || []).map((item) => ({ ...item, projectId: project.id, projectName: project.projectName, projectProgress: number(project.progress) })));
    const list = vendors.map((vendor) => {
      const ids = new Set([vendor.id, vendor.vendorId].filter(Boolean));
      const vendorAssignments = assignments.filter((item) => ids.has(item.vendorId) || ids.has(item.firestoreId));
      const vendorPayments = payments.filter((item) => ids.has(item.vendorId));
      const allocated = vendorAssignments.reduce((sum, item) => sum + number(item.allocatedAmount || item.contractValue), 0);
      const paid = vendorPayments.filter((item) => !["rejected", "cancelled", "failed"].includes(lower(item.status))).reduce((sum, item) => sum + number(item.amount), 0);
      const completed = vendorPayments.filter((item) => ["paid", "completed", "approved"].includes(lower(item.status))).reduce((sum, item) => sum + number(item.amount), 0);
      const pending = vendorPayments.filter((item) => ["pending", "submitted"].includes(lower(item.status))).reduce((sum, item) => sum + number(item.amount), 0);
      const rating = number(vendor.rating || vendor.performance?.rating);
      const onTime = vendorAssignments.length ? vendorAssignments.filter((item) => lower(item.status) === "completed" && number(item.progress) >= 100).length / vendorAssignments.length * 100 : 0;
      const performance = rating ? Math.min(100, rating * 20 * .65 + onTime * .35) : onTime;
      return { ...vendor, assignments: vendorAssignments, payments: vendorPayments.sort((a,b) => dateValue(b.date || b.createdAt) - dateValue(a.date || a.createdAt)), allocated, paid, completedPayments: completed, pendingPayments: pending, outstanding: Math.max(0, allocated - paid), paymentPercent: allocated ? paid / allocated * 100 : 0, performance, projectsAssigned: vendorAssignments.length };
    });
    const totalAllocated = list.reduce((sum, item) => sum + item.allocated, 0);
    const totalPaid = list.reduce((sum, item) => sum + item.paid, 0);
    return {
      vendors: list,
      summary: {
        total: list.length, active: list.filter((item) => lower(item.status) === "active").length,
        inactive: list.filter((item) => lower(item.status) === "inactive").length,
        blocked: list.filter((item) => lower(item.status) === "blocked").length,
        pendingPayments: list.reduce((sum, item) => sum + item.pendingPayments, 0),
        completedPayments: list.reduce((sum, item) => sum + item.completedPayments, 0),
        outstanding: Math.max(0, totalAllocated - totalPaid), performance: list.length ? list.reduce((sum,item)=>sum+item.performance,0)/list.length : 0,
        totalWorkGiven: totalAllocated, totalPaid, remaining: Math.max(0, totalAllocated - totalPaid),
      },
      recent: [...list].sort((a,b) => dateValue(b.createdAt) - dateValue(a.createdAt)).slice(0, 6),
    };
  }
}

export { number, lower, dateValue };
