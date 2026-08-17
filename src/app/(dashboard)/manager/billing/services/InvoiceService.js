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
      status: "draft", invoiceStatus: "draft", paymentStatus: "unpaid", paidAmount: 0, pendingAmount: totals.receivable,
      clientId: context.client?.id || input.clientId || "",
      clientName: context.client?.companyName || context.client?.clientName || input.clientName || project.clientName || "",
      projectId: project.id, projectBusinessId: project.projectId || "", projectName: project.projectName,
      poNumber: project.poNumber || project.projectCode || project.projectId || "",
      contractValue: Number(context.contractValue || 0),
      createdBy: { id: context.user?.id || context.user?.uid || "", name: context.user?.name || context.user?.displayName || "Finance" },
      updatedBy: { id: context.user?.id || context.user?.uid || "", name: context.user?.name || context.user?.displayName || "Finance" },
      companySnapshot: input.companySnapshot, clientSnapshot: input.clientSnapshot,
    };
    return invoiceRepository.create(companyId, payload);
  }

  async update(companyId, id, input, context = {}) {
    const project = context.project;
    if (!id || !project?.id) throw new Error("Invoice and project are required.");
    if (!allowedTypes.includes(input.type)) throw new Error("Invalid invoice type.");
    if (!input.invoiceDate || !input.dueDate) throw new Error("Invoice and due dates are required.");
    if (input.dueDate < input.invoiceDate) throw new Error("Due date cannot be before invoice date.");
    const totals = InvoiceCalculationService.calculate(input);
    if (!(totals.invoiceAmount > 0)) throw new Error("Invoice total must be greater than zero.");
    const paidAmount = Number(context.original?.paidAmount || 0);
    if (totals.receivable + 0.001 < paidAmount) throw new Error("Invoice total cannot be reduced below the amount already paid.");
    const { id: _id, invoiceNumber: _invoiceNumber, companyId: _companyId, createdAt: _createdAt, updatedAt: _updatedAt, ...editable } = input;
    const payload = {
      ...editable,
      ...totals,
      paidAmount,
      pendingAmount: Math.max(0, totals.receivable - paidAmount),
      paymentStatus: Math.max(0, totals.receivable - paidAmount) <= 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
      updatedBy: { id: context.user?.id || context.user?.uid || "", name: context.user?.name || context.user?.displayName || "Finance" },
      clientId: context.client?.id || input.clientId || "",
      clientName: context.client?.companyName || context.client?.clientName || input.clientName || project.clientName || "",
      projectId: project.id,
      projectBusinessId: project.projectId || "",
      projectName: project.projectName,
      poNumber: project.poNumber || project.projectCode || project.projectId || "",
      contractValue: Number(project.contractValue || 0),
    };
    return invoiceRepository.update(companyId, id, payload);
  }

  async setStatus(companyId, id, status) {
    if (!["draft", "issued", "cancelled"].includes(status)) throw new Error("Unsupported invoice status.");
    return invoiceRepository.update(companyId, id, { status, invoiceStatus: status, ...(status === "issued" ? { issuedAt: new Date() } : {}) });
  }

  issue(companyId, id, user) {
    const actor = { id: user?.id || user?.uid || "", uid: user?.uid || "", name: user?.name || user?.displayName || "Finance" };
    return invoiceRepository.update(companyId, id, { status: "issued", invoiceStatus: "issued", issuedAt: new Date(), issuedBy: actor, updatedBy: actor });
  }

  cancel(companyId, id, reason, user) {
    if (!reason?.trim()) throw new Error("Cancellation reason is required.");
    const actor = { id: user?.id || user?.uid || "", uid: user?.uid || "", name: user?.name || user?.displayName || "Finance" };
    return invoiceRepository.update(companyId, id, { status: "cancelled", invoiceStatus: "cancelled", cancellationReason: reason.trim(), cancelledAt: new Date(), cancelledBy: actor, updatedBy: actor });
  }
}

export default new InvoiceService();
