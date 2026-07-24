import notificationRepository from "./notificationRepository";
import { normalizeNotification } from "./notificationUtilities";

class NotificationService {
  async create(input) {
    const payload = normalizeNotification(input);

    if (!payload.audienceKeys.length) {
      throw new Error(
        "At least one notification audience is required",
      );
    }

    return notificationRepository.create(
      input.companyId,
      payload,
      input.sender?.id || input.sender?.uid,
    );
  }

  async createAnnouncement(input) {
    return this.create({
      ...input,
      type: "announcement",
      module: "announcement",
      icon: "megaphone",
    });
  }

  async ensureExpenseSubmitted(companyId, expense) {
    const payload = normalizeNotification({
      companyId,
      type: "expense.submitted",
      module: "expense",
      title: "Expense submitted",
      message: `${
        expense.employeeName || "An employee"
      } submitted an expense${
        expense.amount
          ? ` for ₹${Number(expense.amount).toLocaleString(
              "en-IN",
            )}`
          : ""
      }.`,
      priority: "high",

      sender: {
        id:
          expense.employeeId ||
          expense.employeeFirestoreId ||
          null,
        name: expense.employeeName || "Employee",
        role: "employee",
      },

      targetRole: "manager",
      actionRoute: "/manager/expenses",
      actionId: expense.id,

      metadata: {
        expenseId: expense.id,
        employeeId: expense.employeeId || null,
        employeeName: expense.employeeName || null,
        projectName: expense.projectName || null,
        category: expense.category || null,
        amount: Number(expense.amount || 0),
      },
    });

    return notificationRepository.createOnceForSource(
      companyId,
      "Expenses",
      expense.id,
      "submitted",
      payload,
    );
  }

  async ensureProjectAlert(companyId, project, alert) {
    const eventKey = `intelligence_${String(alert.id)
      .replace(/[^a-z0-9]+/gi, "_")
      .toLowerCase()}`;

    const payload = normalizeNotification({
      companyId,
      type: "project.intelligence-alert",
      module: "project",
      title: `${project.projectName}: ${alert.title}`,
      message: alert.message,
      priority:
        alert.severity === "critical"
          ? "critical"
          : "high",
      targetRole: "manager",
      actionRoute: `/manager/projects/${project.id}`,
      actionId: project.id,

      metadata: {
        projectId: project.id,
        projectName: project.projectName,
        alertId: alert.id,
        severity: alert.severity,
      },
    });

    return notificationRepository.createOnceForSource(
      companyId,
      "Projectmanagement",
      project.id,
      eventKey,
      payload,
    );
  }

  async emit(event, context) {
    const actor =
      context.sender?.name ||
      context.sender?.displayName ||
      context.employeeName ||
      "An employee";

    const definitions = {
      "attendance.check-in": [
        "attendance",
        "Employee checked in",
        `${actor} checked in.`,
        "low",
      ],

      "attendance.check-out": [
        "attendance",
        "Employee checked out",
        `${actor} checked out.`,
        "low",
      ],

      "attendance.late": [
        "attendance",
        "Late check-in",
        `${actor} checked in late.`,
        "high",
      ],

      "attendance.early-checkout": [
        "attendance",
        "Early checkout",
        `${actor} checked out early.`,
        "high",
      ],

      "attendance.missing-punch": [
        "attendance",
        "Missing attendance punch",
        `${actor} has a missing punch.`,
        "high",
      ],

      "gps.outside-radius": [
        "gps",
        "Outside office radius",
        `${actor} punched outside the allowed radius.`,
        "critical",
      ],

      "leave.applied": [
        "leave",
        "New leave request",
        `${actor} applied for leave.`,
        "high",
      ],

      "leave.approved": [
        "leave",
        "Leave approved",
        "Your leave request was approved.",
        "medium",
      ],

      "leave.rejected": [
        "leave",
        "Leave rejected",
        "Your leave request was rejected.",
        "high",
      ],

      "leave.cancelled": [
        "leave",
        "Leave cancelled",
        `${actor} cancelled a leave request.`,
        "medium",
      ],

      "advance.requested": [
        "advance",
        "New advance request",
        `${actor} requested an advance.`,
        "high",
      ],

      "advance.approved": [
        "advance",
        "Advance approved",
        "Your advance request was approved.",
        "medium",
      ],

      "advance.rejected": [
        "advance",
        "Advance rejected",
        "Your advance request was rejected.",
        "high",
      ],

      "payroll.processed": [
        "payroll",
        "Salary processed",
        "Your salary has been processed.",
        "medium",
      ],

      "payroll.paid": [
        "payroll",
        "Salary paid",
        "Your salary has been marked as paid.",
        "medium",
      ],

      "expense.submitted": [
        "expense",
        "Expense submitted",
        `${actor} submitted an expense.`,
        "high",
      ],

      "expense.approved": [
        "expense",
        "Expense approved",
        "Your expense was approved.",
        "medium",
      ],

      "expense.rejected": [
        "expense",
        "Expense rejected",
        "Your expense was rejected.",
        "high",
      ],

      "work.started": [
        "work-log",
        "Work started",
        `${actor} started work.`,
        "low",
      ],

      "work.finished": [
        "work-log",
        "Work finished",
        `${actor} finished work.`,
        "low",
      ],

      "project.created": [
        "project",
        "Project created",
        `${context.projectName || "A project"} was created.`,
        "medium",
      ],

      "project.assigned": [
        "project",
        "Assigned to project",
        `You were assigned to ${
          context.projectName || "a project"
        }.`,
        "medium",
      ],

      "project.removed": [
        "project",
        "Removed from project",
        `You were removed from ${
          context.projectName || "a project"
        }.`,
        "medium",
      ],

      "project.delayed": [
        "project",
        "Project delayed",
        `${context.projectName || "A project"} is delayed.`,
        "critical",
      ],

      "project.completed": [
        "project",
        "Project completed",
        `${context.projectName || "A project"} was completed.`,
        "medium",
      ],

      "quotation.created": [
        "quotation",
        "Quotation created",
        `${
          context.quotationNumber || "A quotation"
        } was created.`,
        "medium",
      ],

      "quotation.approved": [
        "quotation",
        "Quotation approved",
        `${
          context.quotationNumber || "A quotation"
        } was approved.`,
        "medium",
      ],

      "quotation.rejected": [
        "quotation",
        "Quotation rejected",
        `${
          context.quotationNumber || "A quotation"
        } was rejected.`,
        "high",
      ],

      "employee.created": [
        "user-management",
        "New employee added",
        `${actor} was added to the company.`,
        "medium",
      ],

      "employee.activated": [
        "user-management",
        "Employee activated",
        `${actor} was activated.`,
        "medium",
      ],

      "employee.deactivated": [
        "user-management",
        "Employee deactivated",
        `${actor} was deactivated.`,
        "high",
      ],

      "company.updated": [
        "company",
        "Company settings updated",
        "Company settings were updated.",
        "medium",
      ],

      "shift.updated": [
        "company",
        "Shift policy updated",
        `${
          context.shiftName || "A shift policy"
        } was updated.`,
        "medium",
      ],

      "holiday.added": [
        "holiday",
        "Holiday added",
        `${context.holidayName || "A holiday"} was added.`,
        "low",
      ],

      "notice.created": [
        "notice",
        "New company notice",
        context.message || "A new notice was published.",
        "high",
      ],

      "client.created": [
        "client",
        "New client added",
        `${context.clientName || "A client"} was added.`,
        "low",
      ],

      "client.updated": [
        "client",
        "Client updated",
        `${
          context.clientName || "A client"
        } was updated.`,
        "low",
      ],

      "client.deleted": [
        "client",
        "Client deleted",
        `${
          context.clientName || "A client"
        } was deleted.`,
        "medium",
      ],
    };

    const definition = definitions[event];

    if (!definition) {
      throw new Error(
        `Unsupported notification event: ${event}`,
      );
    }

    const [module, title, message, priority] =
      definition;

    return this.create({
      ...context,
      type: event,
      module,
      title,
      message,
      priority,
    });
  }

  async emitSafe(event, context) {
    try {
      return await this.emit(event, context);
    } catch (error) {
      console.error(
        `Notification event failed (${event}):`,
        error,
      );

      return null;
    }
  }

  markRead(
    companyId,
    userId,
    notificationId,
  ) {
    return notificationRepository.setUserState(
      companyId,
      userId,
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }

  togglePinned(
    companyId,
    userId,
    notificationId,
    isPinned,
  ) {
    return notificationRepository.setUserState(
      companyId,
      userId,
      notificationId,
      {
        isPinned,
      },
    );
  }

  archive(
    companyId,
    userId,
    notificationId,
  ) {
    return notificationRepository.setUserState(
      companyId,
      userId,
      notificationId,
      {
        isArchived: true,
      },
    );
  }

  remove(
    companyId,
    userId,
    notificationId,
  ) {
    return notificationRepository.setUserState(
      companyId,
      userId,
      notificationId,
      {
        isDeleted: true,
      },
    );
  }
}

export default new NotificationService();