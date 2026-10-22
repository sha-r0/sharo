import {
  pageExpenses,
  queryExpenseMatches,
} from "@/lib/server/expensePageService";

import {
  logFirestoreFailure,
} from "@/lib/firestoreDiagnostics";

import {
  adminDb,
} from "@/lib/firebase-admin";

import {
  listExpenses,
} from "@/lib/server/expenseListService";

import {
  authorizeCompanyRequest,
} from "@/lib/server/authorizeCompanyRequest";

import {
  creationError,
  expenseCreation,
} from "./_creation";

export async function POST(request) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    const result =
      await expenseCreation.create(
        context,
        await request.json()
      );

    return Response.json(
      {
        success: true,
        ...result,
      },
      {
        status:
          result.duplicate
            ? 200
            : 201,
      }
    );
  } catch (error) {
    return creationError(error);
  }
}

export async function GET(request) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    const url =
      new URL(request.url);

    const month =
      url.searchParams.get(
        "month"
      );

    const mode =
      url.searchParams.get(
        "mode"
      );

    const cursor =
      url.searchParams.get(
        "cursor"
      );

    let result;

    /*
     * ==========================================
     * FILTER / SEARCH MODE
     * ==========================================
     */
    if (
      month &&
      mode === "filter"
    ) {
      const filters =
        Object.fromEntries(
          [
            "search",
            "status",
            "category",
            "project",
            "employee",
            "fromDate",
            "toDate",
          ].map(
            (key) => [
              key,
              url.searchParams.get(
                key
              ) || "",
            ]
          )
        );

      result =
        await queryExpenseMatches(
          adminDb,
          context,
          month,
          filters,
          cursor
        );
    }

    /*
     * ==========================================
     * NORMAL MONTH PAGE
     * ==========================================
     */
    else if (month) {
      result =
        await pageExpenses(
          adminDb,
          context,
          month,
          cursor
        );
    }

    /*
     * ==========================================
     * LEGACY / NON-MONTH LIST
     * ==========================================
     */
    else {
      result = {
        expenses:
          await listExpenses(
            adminDb,
            context
          ),
      };
    }

    return Response.json(
      result,
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {
    const forbidden =
      [
        "FORBIDDEN",
        "COMPANY_INACTIVE",
      ].includes(
        error.message
      );

    const unauthenticated =
      error.message ===
        "UNAUTHENTICATED" ||
      String(
        error.code || ""
      ).startsWith(
        "auth/"
      );

    logFirestoreFailure({
      feature:
        "expenses",

      operation:
        "GET",

      path:
        error.path ||
        "/api/expenses",

      error,
    });

    return Response.json(
      {
        error:
          unauthenticated
            ? "Please sign in again."
            : forbidden
              ? "You do not have permission to view expenses."
              : error.message ===
                    "INVALID_PERIOD" ||
                  error.message ===
                    "INVALID_CURSOR"
                ? "Invalid expense request."
                : "Unable to load expenses.",

        code:
          error.code ??
          (
            unauthenticated
              ? "unauthenticated"
              : forbidden
                ? "permission-denied"
                : error.message ===
                      "INVALID_PERIOD" ||
                    error.message ===
                      "INVALID_CURSOR"
                  ? "invalid-request"
                  : "unknown"
          ),

        ...(
          error.path
            ? {
                path:
                  error.path,

                operation:
                  error.operation,

                query:
                  error.query,
              }
            : {}
        ),
      },
      {
        status:
          unauthenticated
            ? 401
            : forbidden
              ? 403
              : error.message ===
                    "INVALID_PERIOD" ||
                  error.message ===
                    "INVALID_CURSOR"
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