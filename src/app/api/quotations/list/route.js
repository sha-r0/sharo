import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";
import {
  getCompanyQuotationList,
} from "@/lib/server/quotationList";

function parseCursor(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        Buffer.from(
          value,
          "base64url"
        ).toString("utf8")
      );

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return null;
    }

    const id =
      String(
        parsed.id || ""
      ).trim();

    const quotationSortCurrent =
      Number(
        parsed.quotationSortCurrent
      );

    const quotationSortYear =
      Number(
        parsed.quotationSortYear
      );

    const quotationSortSequence =
      String(
        parsed.quotationSortSequence ??
        ""
      );

    const quotationSortValue =
      String(
        parsed.quotationSortValue ??
        ""
      );

    if (
      !id ||
      !Number.isFinite(
        quotationSortCurrent
      ) ||
      !Number.isFinite(
        quotationSortYear
      ) ||
      !quotationSortSequence
    ) {
      return null;
    }

    return {
      id,
      quotationSortCurrent,
      quotationSortYear,
      quotationSortSequence,
      quotationSortValue,
    };
  } catch {
    return null;
  }
}

export async function GET(
  request
) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    requireCompanyPermission(
      context,
      "quotation.view",
      "quotation.manage"
    );

    const params =
      new URL(
        request.url
      ).searchParams;

    const cursorParam =
      params.get(
        "cursor"
      );

    const cursor =
      parseCursor(
        cursorParam
      );

    if (
      cursorParam &&
      !cursor
    ) {
      throw new Error(
        "INVALID_CURSOR"
      );
    }

    const direction =
      params.get(
        "direction"
      ) || "";

    if (
      direction &&
      ![
        "next",
        "previous",
      ].includes(
        direction
      )
    ) {
      throw new Error(
        "INVALID_DIRECTION"
      );
    }

    const result =
      await getCompanyQuotationList(
        adminDb,
        context.companyId,
        {
          viewMode:
            params.get(
              "viewMode"
            ) ||
            "all",

          month:
            params.get(
              "month"
            ) ||
            "",

          search:
            params.get(
              "search"
            ) ||
            "",

          status:
            params.get(
              "status"
            ) ||
            "All",

          page:
            params.get(
              "page"
            ) ||
            1,

          pageSize:
            params.get(
              "pageSize"
            ) ||
            10,

          cursor,

          direction,
        }
      );

    const encodeCursor =
      (cursorValue) => {
        if (
          !cursorValue
        ) {
          return null;
        }

        return Buffer
          .from(
            JSON.stringify(
              cursorValue
            ),
            "utf8"
          )
          .toString(
            "base64url"
          );
      };

    return NextResponse.json(
      {
        ...result,

        startCursor:
          encodeCursor(
            result.startCursor
          ),

        endCursor:
          encodeCursor(
            result.endCursor
          ),
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {
    const code =
      error?.message ||
      "QUOTATION_LIST_FAILED";

    const status =
      code ===
      "UNAUTHENTICATED"
        ? 401
        : code ===
            "FORBIDDEN"
          ? 403
          : code.startsWith(
              "INVALID_"
            )
            ? 400
            : 500;

    console.error(
      "Quotation list failed",
      {
        code,
      }
    );

    return NextResponse.json(
      {
        error: code,
      },
      {
        status,
      }
    );
  }
}