import { FieldPath } from "firebase-admin/firestore";
import { requireCompanyPermission } from "./companyPermission.js";
import { summarizeExpenses } from "../expenses/dashboard.js";
import {
  expenseSearchLookupTerm,
  normalizeExpenseSearch,
} from "../expenses/searchIndex.js";

export const EXPENSE_PAGE_SIZE = 30; // One reimbursement IN query; Firestore supports at most 30 values.
function optionValues(rows, field) {
  return [...new Map(rows.map((row) => {
    const id = String(row[`${field}FirestoreId`] || row[`${field}Id`] || row[`${field}Name`] || row[field] || "");
    return [id, { id, name: row[`${field}Name`] || row[field] || id }];
  })).values()].filter((item) => item.id).sort((a, b) => a.name.localeCompare(b.name));
}
function monthlySummary(data = {}) {
  return {
    totalExpense: Number(data.totalExpense || 0),
    approvedExpense: Number(data.approvedExpense || 0),
    pendingExpense: Number(data.pendingExpense || 0),
    rejectedExpense: Number(data.rejectedExpense || 0),
    overPolicy: Number(data.overPolicy || 0),
  };
}
function employeeOptions(snapshot) {
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();

      const id =
        String(
          doc.id ||
          data.employeeId ||
          data.login?.employeeId ||
          ""
        );

      const name =
        data.personalInfo?.fullName ||
        data.fullName ||
        data.name ||
        data.employeeName ||
        data.employeeId ||
        id;

      return {
        id,
        name: String(name),
      };
    })
    .filter((item) => item.id)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

function projectOptions(snapshot) {
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name:
          data.projectName ||
          data.name ||
          data.projectId ||
          doc.id,
      };
    })
    .filter((item) => item.id)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

function categoryOptions(snapshot) {
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name:
          data.name ||
          data.categoryName ||
          doc.id,
      };
    })
    .filter((item) => item.id)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}
function employeeScope(context) {
  const role = String(context.employee?.access?.roleId || context.employee?.employment?.role || "employee").toLowerCase();
  if (context.isOwner || role !== "employee") return null;
  const id = context.employee?.employeeId || context.employee?.login?.employeeId;
  if (!id) throw new Error("FORBIDDEN");
  return id;
}
export function expensePeriod(month) {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("INVALID_PERIOD");
  const [year, number] = month.split("-").map(Number);
  if (year < 1900 || year > 9998) throw new Error("INVALID_PERIOD");
  return { start: `${month}-01`, end: `${number === 12 ? year + 1 : year}-${String(number === 12 ? 1 : number + 1).padStart(2, "0")}-01` };
}
export async function pageExpenses(
  db,
  context,
  month,
  cursor
) {
  requireCompanyPermission(
    context,
    "expense.view"
  );

  const {
    start,
    end,
  } = expensePeriod(month);

  const company =
    db
      .collection("Companies")
      .doc(context.companyId);

  let source =
    company.collection("Expenses");

  const employeeId =
    employeeScope(context);

  if (employeeId) {
    source =
      source.where(
        "employeeId",
        "==",
        employeeId
      );
  }

  const period =
    source
      .where(
        "date",
        ">=",
        start
      )
      .where(
        "date",
        "<",
        end
      );

  let page =
    period
      .orderBy(
        "date",
        "desc"
      )
      .orderBy(
        FieldPath.documentId(),
        "desc"
      );

  let decoded;

  if (cursor) {
    try {
      decoded =
        JSON.parse(
          Buffer.from(
            cursor,
            "base64url"
          ).toString()
        );
    } catch {
      throw new Error(
        "INVALID_CURSOR"
      );
    }

    if (
      typeof decoded.date !== "string" ||
      decoded.date < start ||
      decoded.date >= end ||
      typeof decoded.id !== "string" ||
      !/^[\w-]{1,128}$/.test(
        decoded.id
      )
    ) {
      throw new Error(
        "INVALID_CURSOR"
      );
    }

    page =
      page.startAfter(
        decoded.date,
        decoded.id
      );
  }

  let snapshot;

  let summary = null;
  let totalCount = null;
  let options = null;

  try {
    /*
     * =================================================
     * LOAD MORE
     * =================================================
     *
     * Cursor pages only need the next 31 expense docs.
     * No summary/options are re-read.
     */

    if (cursor) {
      snapshot =
        await page
          .limit(
            EXPENSE_PAGE_SIZE + 1
          )
          .get();
    }

    /*
     * =================================================
     * EMPLOYEE-SCOPED VIEW
     * =================================================
     *
     * Do NOT use the company-wide monthly summary here.
     *
     * An employee must only see totals belonging
     * to their own expenses.
     */

    else if (employeeId) {
      const [
        pageSnapshot,
        totalsSnapshot,
      ] =
        await Promise.all([
          page
            .limit(
              EXPENSE_PAGE_SIZE + 1
            )
            .get(),

          period
            .orderBy(
              "date",
              "desc"
            )
            .select(
              "amount",
              "status",
              "allowedAmount",
              "employeeId",
              "employeeFirestoreId",
              "employeeName",
              "projectId",
              "projectFirestoreId",
              "projectName",
              "categoryId",
              "categoryName",
              "category"
            )
            .get(),
        ]);

      snapshot =
        pageSnapshot;

      const rows =
        totalsSnapshot.docs.map(
          (doc) =>
            doc.data()
        );

      summary =
        summarizeExpenses(
          rows
        );

      totalCount =
        totalsSnapshot.size;

      options = {
        employees:
          optionValues(
            rows,
            "employee"
          ),

        projects:
          optionValues(
            rows,
            "project"
          ),

        categories:
          optionValues(
            rows,
            "category"
          ),
      };
    }

    /*
     * =================================================
     * OWNER / MANAGER VIEW
     * =================================================
     *
     * Fast month load:
     *
     * - 31 expense documents
     * - 1 monthly summary document
     * - small reference collections for filters
     *
     * No full-month expense scan.
     */

    else {
      const summaryRef =
        company
          .collection(
            "ExpenseMonthlySummaries"
          )
          .doc(month);

      const [
        pageSnapshot,
        summarySnapshot,
        employeeSnapshot,
        projectSnapshot,
        categorySnapshot,
      ] =
        await Promise.all([
          page
            .limit(
              EXPENSE_PAGE_SIZE + 1
            )
            .get(),

          summaryRef.get(),

          company
            .collection(
              "Usermanagement"
            )
            .select(
              "employeeId",
              "login.employeeId",
              "personalInfo.fullName",
              "fullName",
              "name",
              "employeeName"
            )
            .get(),

          company
            .collection(
              "Projectmanagement"
            )
            .select(
              "projectId",
              "projectName",
              "name"
            )
            .get(),

          company
            .collection(
              "ExpenseCategories"
            )
            .select(
              "name",
              "categoryName"
            )
            .get(),
        ]);

      snapshot =
        pageSnapshot;

      /*
       * A missing summary is valid for a completely
       * empty month.
       *
       * Existing months were already backfilled and
       * verified before enabling this code.
       */

      if (
        summarySnapshot.exists
      ) {
        const data =
          summarySnapshot.data();

        summary =
          monthlySummary(
            data
          );

        totalCount =
          Number(
            data.totalCount ||
            0
          );
      } else {
        summary = {
          totalExpense: 0,
          approvedExpense: 0,
          pendingExpense: 0,
          rejectedExpense: 0,
          overPolicy: 0,
        };

        totalCount = 0;
      }

      options = {
        employees:
          employeeOptions(
            employeeSnapshot
          ),

        projects:
          projectOptions(
            projectSnapshot
          ),

        categories:
          categoryOptions(
            categorySnapshot
          ),
      };
    }
  } catch (error) {
    /*
     * Existing fallback for employee accounts while
     * employeeId + date index is unavailable.
     */

    if (
      !employeeId ||
      ![
        9,
        "9",
        "failed-precondition",
      ].includes(
        error.code
      ) ||
      !/index/i.test(
        error.message ||
        ""
      )
    ) {
      error.path =
        `Companies/${context.companyId}/Expenses`;

      error.operation =
        "get";

      throw error;
    }

    const monthRows =
      await company
        .collection(
          "Expenses"
        )
        .where(
          "date",
          ">=",
          start
        )
        .where(
          "date",
          "<",
          end
        )
        .select(
          "employeeId",
          "date",
          "amount",
          "status",
          "allowedAmount",
          "employeeFirestoreId",
          "employeeName",
          "projectId",
          "projectFirestoreId",
          "projectName",
          "categoryId",
          "categoryName",
          "category"
        )
        .get();

    const own =
      monthRows.docs
        .filter(
          (doc) =>
            doc.data()
              .employeeId ===
            employeeId
        )
        .sort(
          (a, b) =>
            a.data().date ===
              b.data().date
              ? a.id < b.id
                ? 1
                : -1
              : a.data()
                .date <
                b.data()
                  .date
                ? 1
                : -1
        );

    if (!cursor) {
      const rows =
        own.map(
          (doc) =>
            doc.data()
        );

      summary =
        summarizeExpenses(
          rows
        );

      totalCount =
        own.length;

      options = {
        employees:
          optionValues(
            rows,
            "employee"
          ),

        projects:
          optionValues(
            rows,
            "project"
          ),

        categories:
          optionValues(
            rows,
            "category"
          ),
      };
    }

    const remaining =
      decoded
        ? own.filter(
          (doc) =>
            doc.data().date <
            decoded.date ||
            (
              doc.data()
                .date ===
              decoded.date &&
              doc.id <
              decoded.id
            )
        )
        : own;

    const refs =
      remaining
        .slice(
          0,
          EXPENSE_PAGE_SIZE +
          1
        )
        .map(
          (doc) =>
            doc.ref
        );

    snapshot = {
      docs:
        refs.length
          ? (
            await db.getAll(
              ...refs
            )
          ).filter(
            (doc) =>
              doc.exists
          )
          : [],
    };
  }

  const docs =
    snapshot.docs.slice(
      0,
      EXPENSE_PAGE_SIZE
    );

  const last =
    docs.at(-1);

  return {
    expenses:
      docs.map(
        (doc) => ({
          ...doc.data(),
          id:
            doc.id,
        })
      ),

    cursor:
      snapshot.docs.length >
        EXPENSE_PAGE_SIZE &&
        last
        ? Buffer.from(
          JSON.stringify({
            date:
              last.data()
                .date,

            id:
              last.id,
          })
        ).toString(
          "base64url"
        )
        : null,

    ...(
      !cursor
        ? {
          summary,
          totalCount,
          options,
        }
        : {}
    ),
  };
}

export async function queryExpenseMatches(
  db,
  context,
  month,
  filters = {},
  cursor = null
) {
  requireCompanyPermission(
    context,
    "expense.view"
  );

  const { start, end } =
    expensePeriod(month);

  const company =
    db
      .collection("Companies")
      .doc(context.companyId);

  const scopedEmployeeId =
    employeeScope(context);

  const fromDate =
    filters.fromDate &&
    filters.fromDate >= start &&
    filters.fromDate < end
      ? filters.fromDate
      : start;

  const toDate =
    filters.toDate &&
    filters.toDate >= fromDate &&
    filters.toDate < end
      ? filters.toDate
      : null;

  const searchText =
    normalizeExpenseSearch(
      filters.search || ""
    );

  const searchLookup =
    expenseSearchLookupTerm(
      filters.search || ""
    );

  const indexedSearch =
    searchLookup.length >= 3;

  /*
   * Cursor is based on the last scanned Firestore document.
   */
  let decodedCursor = null;

  if (cursor) {
    try {
      decodedCursor =
        JSON.parse(
          Buffer.from(
            cursor,
            "base64url"
          ).toString()
        );
    } catch {
      throw new Error(
        "INVALID_CURSOR"
      );
    }

    if (
      typeof decodedCursor.date !== "string" ||
      typeof decodedCursor.id !== "string" ||
      !decodedCursor.date ||
      !/^[\w-]{1,128}$/.test(
        decodedCursor.id
      )
    ) {
      throw new Error(
        "INVALID_CURSOR"
      );
    }
  }

  /*
   * Final compatibility/security check.
   */
  function matchesExpense(expense) {
    const expenseDate =
      String(
        expense.date ||
        expense.expenseDate ||
        ""
      );

    if (
      !expenseDate ||
      expenseDate < fromDate
    ) {
      return false;
    }

    if (
      toDate
        ? expenseDate > toDate
        : expenseDate >= end
    ) {
      return false;
    }

    if (
      scopedEmployeeId &&
      String(
        expense.employeeId || ""
      ) !==
        String(scopedEmployeeId)
    ) {
      return false;
    }

    if (
      !scopedEmployeeId &&
      filters.employee &&
      String(
        expense.employeeFilterKey ||
        expense.employeeFirestoreId ||
        ""
      ) !==
        String(filters.employee)
    ) {
      return false;
    }

    if (
      filters.project &&
      String(
        expense.projectFilterKey ||
        expense.projectFirestoreId ||
        ""
      ) !==
        String(filters.project)
    ) {
      return false;
    }

    if (
      filters.status &&
      String(
        expense.status || ""
      ) !==
        String(filters.status)
    ) {
      return false;
    }

    if (
      filters.category &&
      String(
        expense.categoryFilterKey ||
        expense.categoryId ||
        expense.categoryName ||
        expense.category ||
        ""
      ) !==
        String(filters.category)
    ) {
      return false;
    }

    if (!searchText) {
      return true;
    }

    return [
      expense.employeeName,
      expense.employeeId,

      expense.projectName,
      expense.projectId,

      expense.categoryName,
      expense.category,

      expense.description,

      expense.travelFrom,
      expense.travelTo,

      expense.vendorName,
      expense.labourName,

      expense.title,
      expense.remarks,
    ].some(
      (value) =>
        normalizeExpenseSearch(
          value
        ).includes(searchText)
    );
  }

  /*
   * We read candidates in small batches until:
   *
   * - 30 matching rows are found, or
   * - Firestore has no more candidates.
   *
   * This prevents one request from returning the
   * complete month.
   */
  const matches = [];

  let scanCursor =
    decodedCursor;

  let hasMore =
    true;

  /*
   * Maximum candidates examined in one HTTP request.
   *
   * Prevents a very selective in-memory filter from
   * producing an unlimited Firestore scan.
   */
  const MAX_BATCHES = 5;
  const SCAN_BATCH_SIZE = 60;

  let batches = 0;
  let nextCursor = null;

  while (
    matches.length <
      EXPENSE_PAGE_SIZE &&
    hasMore &&
    batches < MAX_BATCHES
  ) {
    batches += 1;

    let source =
      company.collection(
        "Expenses"
      );

    /*
     * Indexed text search.
     */
    if (indexedSearch) {
      source =
        source.where(
          "searchTerms",
          "array-contains",
          searchLookup
        );

      /*
       * Keep search inside selected date range.
       */
      source =
        source.where(
          "date",
          ">=",
          fromDate
        );

      if (toDate) {
        source =
          source.where(
            "date",
            "<=",
            toDate
          );
      } else {
        source =
          source.where(
            "date",
            "<",
            end
          );
      }
    } else {
      /*
       * Normal structured query.
       */
      if (scopedEmployeeId) {
        source =
          source.where(
            "employeeId",
            "==",
            scopedEmployeeId
          );
      }

      source =
        source.where(
          "date",
          ">=",
          fromDate
        );

      if (toDate) {
        source =
          source.where(
            "date",
            "<=",
            toDate
          );
      } else {
        source =
          source.where(
            "date",
            "<",
            end
          );
      }

      if (filters.status) {
        source =
          source.where(
            "status",
            "==",
            filters.status
          );
      }

      if (
        !scopedEmployeeId &&
        filters.employee
      ) {
        source =
          source.where(
            "employeeFilterKey",
            "==",
            filters.employee
          );
      }

      if (filters.project) {
        source =
          source.where(
            "projectFilterKey",
            "==",
            filters.project
          );
      }
    }

    /*
     * Stable pagination.
     */
    source =
      source
        .orderBy(
          "date",
          "desc"
        )
        .orderBy(
          FieldPath.documentId(),
          "desc"
        );

    if (scanCursor) {
      source =
        source.startAfter(
          scanCursor.date,
          scanCursor.id
        );
    }

    let snapshot;

    try {
      snapshot =
        await source
          .limit(SCAN_BATCH_SIZE)
          .get();
    } catch (error) {
      error.path =
        `Companies/${context.companyId}/Expenses`;

      error.operation =
        "get";

      throw error;
    }

    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    for (const document of snapshot.docs) {
      const expense =
        document.data();

      /*
       * Advance scan position on every candidate.
       */
      scanCursor = {
        date:
          String(
            expense.date ||
            expense.expenseDate ||
            ""
          ),

        id:
          document.id,
      };

      if (
        matchesExpense(expense)
      ) {
        matches.push(
          document
        );

        /*
         * Stop at exactly 30 visible results.
         *
         * Cursor points to this document so no
         * visible rows are skipped.
         */
        if (
          matches.length ===
          EXPENSE_PAGE_SIZE
        ) {
          nextCursor =
            Buffer.from(
              JSON.stringify(
                scanCursor
              )
            ).toString(
              "base64url"
            );

          break;
        }
      }
    }

    if (
      matches.length ===
      EXPENSE_PAGE_SIZE
    ) {
      break;
    }

    if (
      snapshot.size <
      SCAN_BATCH_SIZE
    ) {
      hasMore = false;
      break;
    }

    /*
     * Continue scanning from the last candidate.
     */
    nextCursor =
      scanCursor
        ? Buffer.from(
            JSON.stringify(
              scanCursor
            )
          ).toString(
            "base64url"
          )
        : null;
  }

  /*
   * If the scan cap was reached before finding 30
   * matches, preserve a cursor so the user can
   * continue with Load More.
   */
  if (
    hasMore &&
    matches.length <
      EXPENSE_PAGE_SIZE &&
    scanCursor
  ) {
    nextCursor =
      Buffer.from(
        JSON.stringify(
          scanCursor
        )
      ).toString(
        "base64url"
      );
  }

  if (!hasMore) {
    nextCursor = null;
  }

  const rows =
    matches.map(
      (document) => ({
        ...document.data(),
        id: document.id,
      })
    );

  return {
    expenses:
      rows,

    summary:
      summarizeExpenses(
        rows
      ),

    /*
     * This is deliberately the loaded-page count.
     * We no longer scan the entire filter result just
     * to calculate an expensive total.
     */
    totalCount:
      rows.length,

    cursor:
      nextCursor,
  };
}
export async function getExpense(db, context, id) {
  requireCompanyPermission(context, "expense.view");
  if (typeof id !== "string" || !/^[\w-]{1,128}$/.test(id)) throw new Error("INVALID_REQUEST");
  const doc = await db.collection("Companies").doc(context.companyId).collection("Expenses").doc(id).get();
  if (!doc.exists) throw new Error("EXPENSE_NOT_FOUND");
  const employeeId = employeeScope(context);
  if ((doc.data().companyId && doc.data().companyId !== context.companyId) || (employeeId && doc.data().employeeId !== employeeId)) throw new Error("FORBIDDEN");
  return (await hydrateExpenses(db, context, { docs: [doc] }, true))[0];
}
