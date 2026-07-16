import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";

const expenseService = {
  /* ==========================================
      Get All Expenses
  ========================================== */

  async getExpenses(companyId) {
    const snap = await getDocs(
      collection(
        db,
        "Companies",
        companyId,
        "Expenses"
      )
    );

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  /* ==========================================
      Find Employee Firestore Doc
  ========================================== */

  async getEmployeeDocId(companyId, employeeId) {
    const snap = await getDocs(
      query(
        collection(
          db,
          "Companies",
          companyId,
          "Usermanagement"
        ),
        where("employeeId", "==", employeeId)
      )
    );

    if (snap.empty) {
      throw new Error("Employee not found");
    }

    return snap.docs[0].id;
  },

  /* ==========================================
      Approve Expense
  ========================================== */

  async approveExpense(companyId, expense) {
    // Manager Copy

    await updateDoc(
      doc(
        db,
        "Companies",
        companyId,
        "Expenses",
        expense.id
      ),
      {
        status: "approved",
      }
    );

    // Employee Copy

    const employeeDocId = await this.getEmployeeDocId(
      companyId,
      expense.employeeId
    );

    await updateDoc(
      doc(
        db,
        "Companies",
        companyId,
        "Usermanagement",
        employeeDocId,
        "Expenses",
        expense.id
      ),
      {
        status: "approved",
      }
    );

  },

  /* ==========================================
      Reject Expense
  ========================================== */

  async rejectExpense(companyId, expense) {
    // Manager Copy

    await updateDoc(
      doc(
        db,
        "Companies",
        companyId,
        "Expenses",
        expense.id
      ),
      {
        status: "rejected",
      }
    );

    // Employee Copy

    const employeeDocId = await this.getEmployeeDocId(
      companyId,
      expense.employeeId
    );

    await updateDoc(
      doc(
        db,
        "Companies",
        companyId,
        "Usermanagement",
        employeeDocId,
        "Expenses",
        expense.id
      ),
      {
        status: "rejected",
      }
    );

  },

  /* ==========================================
      Update Expense Amount
  ========================================== */

  async updateAmount(companyId, expense, amount) {
    // Manager Copy

    await updateDoc(
      doc(
        db,
        "Companies",
        companyId,
        "Expenses",
        expense.id
      ),
      {
        amount: Number(amount),
      }
    );

    // Employee Copy

    const employeeDocId = await this.getEmployeeDocId(
      companyId,
      expense.employeeId
    );

    await updateDoc(
      doc(
        db,
        "Companies",
        companyId,
        "Usermanagement",
        employeeDocId,
        "Expenses",
        expense.id
      ),
      {
        amount: Number(amount),
      }
    );
  },
};

export default expenseService;
