import { db } from "@/lib/firebase";

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

const expenseService = {
  /* ==========================================
      Get All Expenses
  ========================================== */

  async getExpenses(companyId) {
    if (!companyId) {
      throw new Error("Company ID is required.");
    }

    const snap = await getDocs(
      collection(
        db,
        "Companies",
        companyId,
        "Expenses",
      ),
    );

    return snap.docs.map((expenseDoc) => ({
      id: expenseDoc.id,
      ...expenseDoc.data(),
    }));
  },

  /* ==========================================
      Find Employee Firestore Document
  ========================================== */

  async getEmployeeDocId(companyId, employeeId) {
    if (!companyId) {
      throw new Error("Company ID is required.");
    }

    if (!employeeId) {
      throw new Error("Employee ID is required.");
    }

    const snap = await getDocs(
      query(
        collection(
          db,
          "Companies",
          companyId,
          "Usermanagement",
        ),
        where("employeeId", "==", employeeId),
      ),
    );

    if (snap.empty) {
      throw new Error(
        `Employee not found for ID ${employeeId}.`,
      );
    }

    return snap.docs[0].id;
  },

  /* ==========================================
      Get Both Expense References
  ========================================== */

  async getExpenseReferences(companyId, expense) {
    if (!companyId) {
      throw new Error("Company ID is required.");
    }

    if (!expense?.id) {
      throw new Error("Expense ID is required.");
    }

    if (!expense?.employeeId) {
      throw new Error(
        "Expense employee ID is required.",
      );
    }

    const employeeDocId =
      await this.getEmployeeDocId(
        companyId,
        expense.employeeId,
      );

    const managerExpenseRef = doc(
      db,
      "Companies",
      companyId,
      "Expenses",
      expense.id,
    );

    const employeeExpenseRef = doc(
      db,
      "Companies",
      companyId,
      "Usermanagement",
      employeeDocId,
      "Expenses",
      expense.id,
    );

    return {
      employeeDocId,
      managerExpenseRef,
      employeeExpenseRef,
    };
  },

  /* ==========================================
      Approve Expense
  ========================================== */

  async approveExpense(
    companyId,
    expense,
    approver = {},
  ) {
    const {
      managerExpenseRef,
      employeeExpenseRef,
    } = await this.getExpenseReferences(
      companyId,
      expense,
    );

    const batch = writeBatch(db);

    const updateData = {
      status: "approved",
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      approvedBy: {
        uid: approver.uid || "",
        name: approver.name || "Admin",
        role: approver.role || "admin",
      },
    };

    batch.update(managerExpenseRef, updateData);
    batch.update(employeeExpenseRef, updateData);

    await batch.commit();

    return {
      success: true,
      message: "Expense approved successfully.",
    };
  },

  /* ==========================================
      Reject Expense
  ========================================== */

  async rejectExpense(
    companyId,
    expense,
    rejector = {},
  ) {
    const {
      managerExpenseRef,
      employeeExpenseRef,
    } = await this.getExpenseReferences(
      companyId,
      expense,
    );

    const batch = writeBatch(db);

    const updateData = {
      status: "rejected",
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      rejectedBy: {
        uid: rejector.uid || "",
        name: rejector.name || "Admin",
        role: rejector.role || "admin",
      },
    };

    batch.update(managerExpenseRef, updateData);
    batch.update(employeeExpenseRef, updateData);

    await batch.commit();

    return {
      success: true,
      message: "Expense rejected successfully.",
    };
  },

  /* ==========================================
      Update Expense Amount
  ========================================== */

  async updateAmount(
    companyId,
    expense,
    amount,
    options = {},
  ) {
    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 0
    ) {
      throw new Error(
        "Enter a valid expense amount.",
      );
    }

    const {
      managerExpenseRef,
      employeeExpenseRef,
    } = await this.getExpenseReferences(
      companyId,
      expense,
    );

    const wasApproved =
      String(expense.status || "")
        .trim()
        .toLowerCase() === "approved";

    const editedAfterApproval =
      wasApproved ||
      options.editedAfterApproval === true;

    const editor = options.editor || {};

    const updateData = {
      amount: numericAmount,
      updatedAt: serverTimestamp(),
    };

    /*
      These fields are added only when an already
      approved expense is changed by the admin.
    */
    if (editedAfterApproval) {
      updateData.editedAfterApproval = true;

      updateData.editedAfterApprovalAt =
        serverTimestamp();

      updateData.editedAfterApprovalBy = {
        uid: editor.uid || "",
        name: editor.name || "Admin",
        role: editor.role || "admin",
      };

      updateData.previousAmount = Number(
        expense.amount || 0,
      );
    }

    const batch = writeBatch(db);

    batch.update(managerExpenseRef, updateData);
    batch.update(employeeExpenseRef, updateData);

    await batch.commit();

    return {
      success: true,
      editedAfterApproval,
      previousAmount: Number(
        expense.amount || 0,
      ),
      updatedAmount: numericAmount,
    };
  },
};

export default expenseService;