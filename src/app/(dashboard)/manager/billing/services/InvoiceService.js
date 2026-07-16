import invoiceRepository from "./InvoiceRepository";
import InvoiceCalculationService from "./InvoiceCalculationService";

const allowedTypes = ["Tax Invoice", "Proforma Invoice", "Commercial Invoice", "Debit Note", "Credit Note", "Partial Invoice", "Final Invoice"];

class InvoiceService {
  async create(companyId, input, context = {}) {
    const project = context.project;
    if (!project?.id) throw new Error("Project is required.");
    if (!allowedTypes.includes(input.type)) throw new Error("Invalid invoice type.");
    if (!input.invoiceDate || !input.dueDate) throw new Error("Invoice and due dates are required.");
    if (input.dueDate < input.invoiceDate) throw new Error("Due date cannot be before invoice date.");
    const totals = InvoiceCalculationService.calculate(input);
    if (!(totals.invoiceAmount > 0)) throw new Error("Invoice total must be greater than zero.");
    const adjustment = ["Debit Note", "Credit Note"].includes(input.type);
    if (!adjustment && totals.taxableValue > Number(context.remainingBillable || 0) + .01) throw new Error("Invoice exceeds the remaining project billable amount.");
    const payload = {
      ...input, ...totals,
      status: "draft", paidAmount: 0, pendingAmount: totals.receivable,
      clientId: context.client?.id || input.clientId || "",
      clientName: context.client?.companyName || context.client?.clientName || input.clientName || project.clientName || "",
      projectId: project.id, projectBusinessId: project.projectId || "", projectName: project.projectName,
      poNumber: project.poNumber || project.projectCode || project.projectId || "",
      contractValue: Number(context.contractValue || 0),
      createdBy: { id: context.user?.id || context.user?.uid || "", name: context.user?.name || context.user?.displayName || "Finance" },
      companySnapshot: input.companySnapshot, clientSnapshot: input.clientSnapshot,
    };
    return invoiceRepository.create(companyId, payload);
  }

  async setStatus(companyId, id, status) {
    if (!["draft", "sent", "viewed", "cancelled"].includes(status)) throw new Error("Unsupported manual invoice status.");
    return invoiceRepository.update(companyId, id, { status, ...(status === "sent" ? { sentAt: new Date() } : {}), ...(status === "viewed" ? { viewedAt: new Date() } : {}) });
  }
}

export default new InvoiceService();
