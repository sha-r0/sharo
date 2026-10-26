"use strict";

const { resolveTravelRoute } = require("./travelRoute");
const { calculateExpensePolicy } = require("./creationPolicy");
const { assertExpensePeriodOpen } = require("./period");

const {
  expenseMonthKey,
  expenseSummaryDelta,
  emptyExpenseMonthlySummary,
  applyExpenseSummaryDelta,
} = require("./monthlySummary");

const EDITABLE_FIELDS = new Set([
  "amount",
  "categoryId",
  "category",
  "description",
  "title",
  "date",
  "projectFirestoreId",
  "projectId",
  "projectName",
  "billUrl",
  "locationType",
  "gstType",
  "quantity",
  "travelFrom",
  "travelTo",
  "travelMode",
  "travelDistance",
  "vendorId",
  "vendorName",
  "labourName",
  "labourCount",
  "remarks",
  "travelDetails",
  "vendorDetails",
  "labourDetails",
  "expenseDate",
  "receiptUrl",
  "attachments",
  "unit",
  "rate",
]);

const POLICY_FIELDS = [
  "allowedAmount",
  "policyExceeded",
  "excessAmount",
  "configuredRate",
  "configuredLimit",
  "ruleId",
  "ruleBasis",
  "calculationType",
  "locationType",
  "gstType",
  "quantity",
];

const has = (actor, permission) =>
  actor.isOwner ||
  actor.permissions?.includes(permission) ||
  actor.permissions?.includes("expense.manage");

const normalEmployee = (actor) =>
  !actor.isOwner &&
  String(
    actor.employee?.access?.roleId ||
    actor.employee?.employment?.role ||
    "employee"
  ).toLowerCase() === "employee";

const owns = (actor, expense) =>
  expense.employeeFirestoreId
    ? String(expense.employeeFirestoreId) ===
    String(actor.employee?.id)
    : Boolean(expense.employeeId) &&
    String(expense.employeeId) ===
    String(
      actor.employee?.employeeId ||
      actor.employee?.login?.employeeId ||
      ""
    );

function buildExpenseSearchTerms(
  expense
) {
  const values = [
    expense.title,
    expense.description,
    expense.category,
    expense.categoryName,
    expense.projectName,
    expense.projectId,
    expense.employeeName,
    expense.employeeId,
    expense.vendorName,
    expense.labourName,
    expense.remarks,
  ];

  const terms =
    new Set();

  for (
    const value of values
  ) {
    const text =
      String(
        value || ""
      )
        .trim()
        .toLowerCase();

    if (!text) {
      continue;
    }

    terms.add(text);

    for (
      const token of
      text.split(
        /\s+/
      )
    ) {
      if (token) {
        terms.add(token);
      }
    }
  }

  return [
    ...terms,
  ];
}

function assertAuthorized(actor, action, expense) {
  if (["approve", "reject"].includes(action)) {
    if (
      !has(actor, "expense.approve") ||
      normalEmployee(actor)
    ) {
      throw new Error("FORBIDDEN");
    }

    if (expense.status !== "pending") {
      throw new Error("EXPENSE_FINAL");
    }

    return;
  }

  const permission =
    action === "delete"
      ? "expense.delete"
      : "expense.edit";

  const employeeDelete =
    action === "delete" &&
    normalEmployee(actor) &&
    has(actor, "expense.create");

  if (
    !has(actor, permission) &&
    !employeeDelete
  ) {
    throw new Error("FORBIDDEN");
  }

  if (
    normalEmployee(actor) &&
    (
      !owns(actor, expense) ||
      expense.status !== "pending"
    )
  ) {
    throw new Error("FORBIDDEN");
  }
}

function editableUpdates(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error("INVALID_REQUEST");
  }

  const updates = {};

  for (const [key, value] of Object.entries(input)) {
    if (key === "expenseId") {
      continue;
    }

    if (!EDITABLE_FIELDS.has(key)) {
      throw new Error("INVALID_REQUEST");
    }

    updates[key] = value;
  }

  if (!Object.keys(updates).length) {
    throw new Error("INVALID_REQUEST");
  }

  if (
    "amount" in updates &&
    (
      typeof updates.amount !== "number" ||
      !Number.isFinite(updates.amount) ||
      updates.amount < 0
    )
  ) {
    throw new Error("INVALID_AMOUNT");
  }

  if ("billUrl" in updates) {
    if (
      typeof updates.billUrl !== "string" ||
      updates.billUrl.length > 2048
    ) {
      throw new Error("INVALID_REQUEST");
    }

    if (updates.billUrl) {
      let url;

      try {
        url = new URL(updates.billUrl);
      } catch {
        throw new Error("INVALID_REQUEST");
      }

      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password
      ) {
        throw new Error("INVALID_REQUEST");
      }
    }
  }

  if (
    "date" in updates &&
    (
      typeof updates.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(updates.date) ||
      !Number.isFinite(Date.parse(updates.date)) ||
      new Date(updates.date)
        .toISOString()
        .slice(0, 10) !== updates.date
    )
  ) {
    throw new Error("INVALID_REQUEST");
  }

  return updates;
}

async function recompute(
  transaction,
  company,
  before,
  updates
) {
  const after = {
    ...before,
    ...updates,
  };

  if (
    [
      "projectId",
      "projectFirestoreId",
      "projectName",
    ].some((key) => key in updates)
  ) {
    let project;

    const key =
      updates.projectFirestoreId ||
      updates.projectId ||
      before.projectFirestoreId ||
      before.projectId;

    if (
      typeof key !== "string" ||
      !key ||
      key.includes("/")
    ) {
      throw new Error("INVALID_PROJECT");
    }

    project = await transaction.get(
      company
        .collection("Projectmanagement")
        .doc(key)
    );

    if (!project.exists) {
      const matches =
        await transaction.get(
          company
            .collection("Projectmanagement")
            .where(
              "projectId",
              "==",
              key
            )
            .limit(2)
        );

      if (matches.size !== 1) {
        throw new Error("INVALID_PROJECT");
      }

      project =
        matches.docs[0];
    }

    if (
      project.data().companyId &&
      project.data().companyId !==
      company.id
    ) {
      throw new Error("FORBIDDEN");
    }

    Object.assign(after, {
      projectFirestoreId:
        project.id,

      projectFilterKey:
        project.id,

      projectId:
        project.data().projectId ||
        project.id,

      projectName:
        project.data().projectName ||
        "",
    });
  }

  if ("date" in updates) {
    Object.assign(after, {
      month:
        Number(
          after.date.slice(5, 7)
        ),

      year:
        Number(
          after.date.slice(0, 4)
        ),
    });
  }

  const policyChanged = [
    "amount",
    "categoryId",
    "category",
    "locationType",
    "gstType",
    "quantity",
    "projectId",
    "projectFirestoreId",
    "projectName",
  ].some(
    (key) =>
      key in updates
  );

  const routeChanged = [
    "travelFrom",
    "travelTo",
  ].some(
    (key) =>
      key in updates
  );

  if (
    !policyChanged &&
    !routeChanged
  ) {
    return after;
  }

  if (
    "categoryId" in updates &&
    (
      typeof updates.categoryId !== "string" ||
      !updates.categoryId ||
      updates.categoryId.includes("/")
    )
  ) {
    throw new Error("INVALID_CATEGORY");
  }

  let categoryId =
    after.categoryId;

  if (
    "category" in updates &&
    !("categoryId" in updates)
  ) {
    if (
      typeof updates.category !== "string" ||
      !updates.category.trim()
    ) {
      throw new Error("INVALID_CATEGORY");
    }

    const matches =
      await transaction.get(
        company
          .collection("ExpenseCategories")
          .where(
            "name",
            "==",
            updates.category.trim()
          )
          .limit(2)
      );

    if (matches.size !== 1) {
      throw new Error("INVALID_CATEGORY");
    }

    categoryId =
      matches.docs[0].id;
  }

  if (!categoryId) {
    if (routeChanged) {
      const route =
        resolveTravelRoute(
          {
            name:
              before.categoryName ||
              before.category,
          },
          after
        );

      delete after.travelFrom;
      delete after.travelTo;

      Object.assign(
        after,
        route
      );
    }

    if (
      [
        "locationType",
        "gstType",
        "quantity",
      ].some(
        (key) =>
          key in updates
      )
    ) {
      throw new Error("INVALID_CATEGORY");
    }

    if (
      typeof before.allowedAmount === "number" &&
      Number.isFinite(
        before.allowedAmount
      )
    ) {
      after.excessAmount =
        Math.round(
          Math.max(
            0,
            Number(after.amount || 0) -
            before.allowedAmount
          ) *
          100
        ) / 100;

      after.policyExceeded =
        after.excessAmount > 0;
    }

    return after;
  }

  const categorySnapshot =
    await transaction.get(
      company
        .collection("ExpenseCategories")
        .doc(categoryId)
    );

  if (!categorySnapshot.exists) {
    throw new Error("INVALID_CATEGORY");
  }

  const category =
    categorySnapshot.data();

  if (!policyChanged) {
    if (
      category.active !== true
    ) {
      throw new Error("INVALID_CATEGORY");
    }

    const route =
      resolveTravelRoute(
        category,
        after
      );

    delete after.travelFrom;
    delete after.travelTo;

    return {
      ...after,
      ...route,
    };
  }

  const selection = {
    amount:
      after.amount,
  };

  if (
    category.conditions?.locationEnabled
  ) {
    selection.locationType =
      after.locationType;
  }

  if (
    category.conditions?.gstEnabled
  ) {
    selection.gstType =
      after.gstType;
  }

  if (
    category.calculationType ===
    "per_unit"
  ) {
    selection.quantity =
      after.quantity;
  }

  let policy;

  try {
    policy =
      calculateExpensePolicy(
        category,
        selection
      );
  } catch (error) {
    throw new Error(
      `INVALID_POLICY: ${error.message.replace(
        /^INVALID_EXPENSE: /,
        ""
      )}`
    );
  }

  const route =
    resolveTravelRoute(
      category,
      after
    );

  delete after.travelFrom;
  delete after.travelTo;

  Object.assign(
    after,
    route
  );

  POLICY_FIELDS.forEach(
    (field) => {
      delete after[field];
    }
  );

  return {
    ...after,
    ...policy,

    categoryId,

    categoryFilterKey:
      categoryId,

    category:
      category.name,

    categoryName:
      category.name,
  };
}

async function mutateExpense(
  db,
  actor,
  expenseId,
  action,
  input,
  fields
) {
  if (
    typeof expenseId !== "string" ||
    !expenseId ||
    expenseId.includes("/")
  ) {
    throw new Error("INVALID_REQUEST");
  }

  if (
    ![
      "approve",
      "reject",
      "edit",
      "delete",
    ].includes(action)
  ) {
    throw new Error("INVALID_REQUEST");
  }

  if (
    action === "reject" &&
    (
      typeof input.managerRemarks !== "string" ||
      !input.managerRemarks.trim() ||
      input.managerRemarks.length > 2000
    )
  ) {
    throw new Error("REASON_REQUIRED");
  }

  const updates =
    action === "edit"
      ? editableUpdates(input)
      : {};

  const company =
    db
      .collection("Companies")
      .doc(actor.companyId);

  const ref =
    company
      .collection("Expenses")
      .doc(expenseId);

  const activity =
    company
      .collection("ActivityLogs")
      .doc();

  const history =
    ref
      .collection("EditHistory")
      .doc();

  return db.runTransaction(
    async (transaction) => {
      /*
       * ============================
       * READ EXPENSE
       * ============================
       */

      const snapshot =
        await transaction.get(
          ref
        );

      if (!snapshot.exists) {
        throw new Error(
          "EXPENSE_NOT_FOUND"
        );
      }

      const before =
        snapshot.data();

      if (
        before.companyId &&
        before.companyId !==
        actor.companyId
      ) {
        throw new Error(
          "FORBIDDEN"
        );
      }

      assertAuthorized(
        actor,
        action,
        before
      );

      /*
       * ============================
       * PERIOD LOCK
       * ============================
       */

      if (
        action === "edit" ||
        action === "delete"
      ) {
        await assertExpensePeriodOpen(
          transaction,
          company,
          before.date ||
          before.expenseDate
        );

        if (
          action === "edit" &&
          updates.date
        ) {
          await assertExpensePeriodOpen(
            transaction,
            company,
            updates.date
          );
        }
      }

      /*
       * ============================
       * REIMBURSEMENT LOCK
       * ============================
       */

      if (
        action === "delete" ||
        (
          action === "edit" &&
          "amount" in updates &&
          Number(updates.amount) !==
          Number(before.amount)
        )
      ) {
        const payments =
          await transaction.get(
            ref
              .collection(
                "Reimbursements"
              )
              .limit(1)
          );

        if (
          !payments.empty ||
          before.reimbursed === true ||
          Number(
            before.reimbursedAmount
          ) > 0
        ) {
          throw new Error(
            "REIMBURSEMENT_LOCKED"
          );
        }
      }

      /*
       * ============================
       * EMPLOYEE MIRROR
       * ============================
       */

      let employeeRef;

      if (
        before.employeeFirestoreId
      ) {
        employeeRef =
          company
            .collection(
              "Usermanagement"
            )
            .doc(
              String(
                before.employeeFirestoreId
              )
            );
      } else if (
        before.employeeId
      ) {
        const matches =
          await transaction.get(
            company
              .collection(
                "Usermanagement"
              )
              .where(
                "employeeId",
                "==",
                before.employeeId
              )
              .limit(2)
          );

        if (
          matches.size === 1
        ) {
          employeeRef =
            matches.docs[0].ref;
        }
      }

      if (!employeeRef) {
        throw new Error(
          "EMPLOYEE_MAPPING_REQUIRED"
        );
      }

      const employeeSnapshot =
        await transaction.get(
          employeeRef
        );

      if (
        !employeeSnapshot.exists
      ) {
        throw new Error(
          "EMPLOYEE_MAPPING_REQUIRED"
        );
      }

      const mirror =
        employeeRef
          .collection("Expenses")
          .doc(expenseId);

      const reviewer = {
        uid:
          actor.uid,

        employeeFirestoreId:
          actor.employee?.id ||
          null,

        role:
          actor.isOwner
            ? "owner"
            : actor.employee?.access
              ?.roleId ||
            "employee",

        name:
          actor.name ||
          actor.employee
            ?.personalInfo
            ?.fullName ||
          "",
      };

      /*
       * ============================
       * CALCULATE AFTER STATE
       * ============================
       */

      let after = {
        ...before,
      };

      if (
        after.employeeFirestoreId &&
        !after.employeeFilterKey
      ) {
        after.employeeFilterKey =
          String(
            after.employeeFirestoreId
          );
      }

      if (
        after.projectFirestoreId &&
        !after.projectFilterKey
      ) {
        after.projectFilterKey =
          String(
            after.projectFirestoreId
          );
      }

      if (
        after.categoryId &&
        !after.categoryFilterKey
      ) {
        after.categoryFilterKey =
          String(
            after.categoryId
          );
      }

      let metadata = {};

      let historyPayload =
        null;

      if (
        action === "edit"
      ) {
        after =
          await recompute(
            transaction,
            company,
            before,
            updates
          );

        const changedFields = [
          ...new Set([
            ...Object.keys(
              before
            ),
            ...Object.keys(
              after
            ),
          ]),
        ].filter(
          (key) =>
            JSON.stringify(
              before[key] ??
              null
            ) !==
            JSON.stringify(
              after[key] ??
              null
            )
        );

        if (
          !changedFields.length
        ) {
          throw new Error(
            "NO_CHANGES"
          );
        }

        const editCount =
          Number(
            before.editCount ||
            0
          ) + 1;

        Object.assign(
          after,
          {
            editCount,

            lastEditedAt:
              fields.serverTimestamp(),

            lastEditedByUid:
              actor.uid,

            lastEditedByName:
              reviewer.name,

            lastEditedByRole:
              reviewer.role,
          }
        );

        if (
          changedFields.includes(
            "amount"
          )
        ) {
          Object.assign(
            after,
            {
              lastEditPreviousAmount:
                Number(
                  before.amount ||
                  0
                ),

              lastEditNewAmount:
                after.amount,
            }
          );
        }

        historyPayload = {
          auditVersion: 2,

          expenseId,

          companyId:
            actor.companyId,

          editNumber:
            editCount,

          editedAt:
            fields.serverTimestamp(),

          editedByUid:
            actor.uid,

          editedByName:
            reviewer.name,

          editedByRole:
            reviewer.role,

          changedFields,

          before:
            Object.fromEntries(
              changedFields.map(
                (key) => [
                  key,
                  before[key] ??
                  null,
                ]
              )
            ),

          after:
            Object.fromEntries(
              changedFields.map(
                (key) => [
                  key,
                  after[key] ??
                  null,
                ]
              )
            ),
        };

        metadata = {
          changedFields,
          editCount,
        };
      } else if (
        action !== "delete"
      ) {
        [
          "approvedBy",
          "approvedAt",
          "rejectedBy",
          "rejectedAt",
          "managerRemarks",
          "reviewedBy",
          "reviewedAt",
          "reviewedByUid",
          "reviewedByName",
          "reviewedByRole",
        ].forEach(
          (key) => {
            delete after[key];
          }
        );

        Object.assign(
          after,
          {
            status:
              action ===
                "approve"
                ? "approved"
                : "rejected",

            reviewedBy:
              reviewer,

            reviewedAt:
              fields.serverTimestamp(),

            reviewedByUid:
              reviewer.uid,

            reviewedByName:
              reviewer.name,

            reviewedByRole:
              reviewer.role,
          }
        );

        if (
          action === "approve"
        ) {
          Object.assign(
            after,
            {
              approvedBy:
                reviewer,

              approvedAt:
                fields.serverTimestamp(),
            }
          );
        } else {
          Object.assign(
            after,
            {
              rejectedBy:
                reviewer,

              rejectedAt:
                fields.serverTimestamp(),

              managerRemarks:
                input.managerRemarks.trim(),
            }
          );
        }
      }

      /*
 * ============================
 * SEARCH INDEX
 * ============================
 *
 * Rebuild only after the final canonical
 * expense state has been calculated.
 */
      if (action !== "delete") {
        after.searchTerms =
          buildExpenseSearchTerms(
            after
          );
      }

      /*
       * ==================================
       * MONTHLY SUMMARY READS
       * ==================================
       */

      const beforeMonth =
        expenseMonthKey(
          before
        );

      const afterMonth =
        action === "delete"
          ? null
          : expenseMonthKey(
            after
          );

      if (!beforeMonth) {
        throw new Error(
          "INVALID_EXPENSE_DATE"
        );
      }

      if (
        action !== "delete" &&
        !afterMonth
      ) {
        throw new Error(
          "INVALID_EXPENSE_DATE"
        );
      }

      const summaryMonths = [
        ...new Set(
          [
            beforeMonth,
            afterMonth,
          ].filter(Boolean)
        ),
      ];

      const summarySnapshots =
        new Map();

      for (
        const month of summaryMonths
      ) {
        const summaryRef =
          company
            .collection(
              "ExpenseMonthlySummaries"
            )
            .doc(month);

        const summarySnapshot =
          await transaction.get(
            summaryRef
          );

        summarySnapshots.set(
          month,
          {
            ref:
              summaryRef,

            snapshot:
              summarySnapshot,
          }
        );
      }

      /*
       * Calculate summary writes.
       *
       * No writes have happened before this point.
       */

      const summaryWrites =
        [];

      if (
        action === "delete" ||
        beforeMonth ===
        afterMonth
      ) {
        const entry =
          summarySnapshots.get(
            beforeMonth
          );

        const current =
          entry.snapshot.exists
            ? entry.snapshot.data()
            : emptyExpenseMonthlySummary(
              beforeMonth
            );

        const delta =
          expenseSummaryDelta(
            before,
            action === "delete"
              ? null
              : after
          );

        summaryWrites.push({
          ref:
            entry.ref,

          month:
            beforeMonth,

          data:
            applyExpenseSummaryDelta(
              current,
              delta
            ),
        });
      } else {
        /*
         * Expense moved to another month.
         *
         * Example:
         * 2026-10-31 -> 2026-11-01
         */

        const previousEntry =
          summarySnapshots.get(
            beforeMonth
          );

        const previousCurrent =
          previousEntry.snapshot.exists
            ? previousEntry.snapshot.data()
            : emptyExpenseMonthlySummary(
              beforeMonth
            );

        summaryWrites.push({
          ref:
            previousEntry.ref,

          month:
            beforeMonth,

          data:
            applyExpenseSummaryDelta(
              previousCurrent,
              expenseSummaryDelta(
                before,
                null
              )
            ),
        });

        const nextEntry =
          summarySnapshots.get(
            afterMonth
          );

        const nextCurrent =
          nextEntry.snapshot.exists
            ? nextEntry.snapshot.data()
            : emptyExpenseMonthlySummary(
              afterMonth
            );

        summaryWrites.push({
          ref:
            nextEntry.ref,

          month:
            afterMonth,

          data:
            applyExpenseSummaryDelta(
              nextCurrent,
              expenseSummaryDelta(
                null,
                after
              )
            ),
        });
      }

      /*
       * ============================
       * WRITES START HERE
       * ============================
       */

      if (
        historyPayload
      ) {
        transaction.create(
          history,
          historyPayload
        );
      }

      for (
        const summary of summaryWrites
      ) {
        transaction.set(
          summary.ref,
          {
            ...summary.data,

            month:
              summary.month,

            companyId:
              actor.companyId,

            updatedAt:
              fields.serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      }

      if (
        action === "delete"
      ) {
        transaction.delete(
          ref
        );

        transaction.delete(
          mirror
        );

        metadata = {
          deletedExpense:
            before,
        };
      } else {
        after.updatedAt =
          fields.serverTimestamp();

        transaction.set(
          ref,
          after
        );

        transaction.set(
          mirror,
          after
        );
      }

      /*
       * ============================
       * ACTIVITY LOG
       * ============================
       */

      transaction.create(
        activity,
        {
          type:
            `expense.${action === "edit"
              ? "updated"
              : action ===
                "delete"
                ? "deleted"
                : action
            }`,

          actorId:
            actor.uid,

          actorEmployeeId:
            actor.employee?.id ||
            null,

          targetExpenseId:
            expenseId,

          companyId:
            actor.companyId,

          metadata,

          createdAt:
            fields.serverTimestamp(),
        }
      );

      return {
        success: true,
        ok: true,
        expenseId,
        action,

        ...(action === "edit"
          ? {
            ...metadata,
            auditVersion: 2,
          }
          : {}),
      };
    }
  );
}

module.exports = {
  mutateExpense,
  assertAuthorized,
  editableUpdates,
  EDITABLE_FIELDS,
};