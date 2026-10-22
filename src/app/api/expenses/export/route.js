import * as XLSX from "xlsx";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { requireCompanyPermission } from "@/lib/server/companyPermission";
import { expensePeriod } from "@/lib/server/expensePageService";

function employeeScope(context) {
  const role = String(
    context.employee?.access?.roleId ||
      context.employee?.employment?.role ||
      "employee"
  ).toLowerCase();

  if (
    context.isOwner ||
    role !== "employee"
  ) {
    return null;
  }

  const id =
    context.employee?.employeeId ||
    context.employee?.login?.employeeId;

  if (!id) {
    throw new Error("FORBIDDEN");
  }

  return String(id);
}

function safeFilePart(value) {
  return String(value || "")
    .replace(/[^\w-]/g, "-")
    .slice(0, 40);
}

export async function GET(request) {
  try {
    const context =
      await authorizeCompanyRequest(request);

    /*
     * Export must be authorized on the server.
     */
    requireCompanyPermission(
      context,
      "expense.export",
      "expense.manage"
    );

    const url =
      new URL(request.url);

    const month =
      url.searchParams.get("month");

    const filters = {
      search:
        url.searchParams.get("search") || "",

      status:
        url.searchParams.get("status") || "",

      category:
        url.searchParams.get("category") || "",

      project:
        url.searchParams.get("project") || "",

      employee:
        url.searchParams.get("employee") || "",

      fromDate:
        url.searchParams.get("fromDate") || "",

      toDate:
        url.searchParams.get("toDate") || "",
    };

    const {
      start,
      end,
    } = expensePeriod(month);

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

    const company =
      adminDb
        .collection("Companies")
        .doc(context.companyId);

    let query =
      company.collection("Expenses");

    const scopedEmployeeId =
      employeeScope(context);

    /*
     * Employee users can export only their own expenses.
     */
    if (scopedEmployeeId) {
      query =
        query.where(
          "employeeId",
          "==",
          scopedEmployeeId
        );
    } else if (
      filters.employee
    ) {
      query =
        query.where(
          "employeeFilterKey",
          "==",
          filters.employee
        );
    }

    if (filters.project) {
      query =
        query.where(
          "projectFilterKey",
          "==",
          filters.project
        );
    }

    if (filters.status) {
      query =
        query.where(
          "status",
          "==",
          filters.status
        );
    }

    query =
      query.where(
        "date",
        ">=",
        fromDate
      );

    if (toDate) {
      query =
        query.where(
          "date",
          "<=",
          toDate
        );
    } else {
      query =
        query.where(
          "date",
          "<",
          end
        );
    }

    /*
     * Export only needs these fields.
     *
     * This reduces document payload significantly compared
     * with sending complete expense documents to the browser.
     */
    query =
      query.select(
        "date",
        "employeeName",
        "employeeId",
        "projectName",
        "projectId",
        "category",
        "categoryName",
        "categoryId",
        "categoryFilterKey",
        "description",
        "travelFrom",
        "travelTo",
        "amount",
        "status"
      );

    const snapshot =
      await query.get();

    const search =
      String(
        filters.search || ""
      )
        .trim()
        .toLowerCase();

    /*
     * Category remains legacy-compatible.
     *
     * 216 historical expenses do not have a current
     * categoryFilterKey/categoryId.
     */
    const rows =
      snapshot.docs
        .map((document) => ({
          id:
            document.id,

          ...document.data(),
        }))
        .filter((expense) => {
          if (
            filters.category &&
            String(
              expense.categoryFilterKey ||
                expense.categoryId ||
                expense.categoryName ||
                expense.category ||
                ""
            ) !==
              String(
                filters.category
              )
          ) {
            return false;
          }

          if (!search) {
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
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(search)
          );
        })
        .sort(
          (left, right) =>
            String(
              right.date
            ).localeCompare(
              String(
                left.date
              )
            ) ||
            String(
              right.id
            ).localeCompare(
              String(
                left.id
              )
            )
        );

    /*
     * Keep the same Excel columns you already use.
     */
    const excelRows =
      rows.map((expense) => ({
        Date:
          expense.date || "",

        Employee:
          expense.employeeName || "",

        Project:
          expense.projectName || "",

        Category:
          expense.categoryName ||
          expense.category ||
          "",

        Description:
          expense.description || "",

        Amount:
          Number(
            expense.amount || 0
          ),

        Status:
          expense.status || "",
      }));

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelRows
      );

    /*
     * Make the exported sheet easier to read.
     */
    worksheet["!cols"] = [
      { wch: 13 },
      { wch: 24 },
      { wch: 28 },
      { wch: 24 },
      { wch: 45 },
      { wch: 14 },
      { wch: 14 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Expenses"
    );

    const buffer =
      XLSX.write(
        workbook,
        {
          bookType:
            "xlsx",

          type:
            "buffer",
        }
      );

    const filename =
      `Expenses_${safeFilePart(fromDate)}_to_${safeFilePart(
        toDate || end.slice(0, 7)
      )}.xlsx`;

    return new Response(
      buffer,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Cache-Control":
            "private, no-store",

          "X-Expense-Count":
            String(rows.length),
        },
      }
    );
  } catch (error) {
    console.error(
      "Expense export failed:",
      error
    );

    const code =
      error?.message ||
      "INTERNAL_ERROR";

    const unauthenticated =
      code ===
        "UNAUTHENTICATED" ||
      String(
        error?.code || ""
      ).startsWith("auth/");

    const forbidden =
      [
        "FORBIDDEN",
        "COMPANY_INACTIVE",
      ].includes(code);

    return Response.json(
      {
        error:
          unauthenticated
            ? "Please sign in again."
            : forbidden
              ? "You do not have permission to export expenses."
              : "Unable to export expenses.",

        code,
      },
      {
        status:
          unauthenticated
            ? 401
            : forbidden
              ? 403
              : code.startsWith("INVALID_")
                ? 400
                : 500,

        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  }
}