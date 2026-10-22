import { buildQuotationList } from "../quotations/quotationList.js";

const ALLOWED_STATUSES = [
  "Draft",
  "Sent",
  "Approved",
  "Rejected",
];

function monthBounds(month) {
  if (
    !/^\d{4}-\d{2}$/.test(
      String(month || "")
    )
  ) {
    return null;
  }

  const [year, monthNumber] =
    month
      .split("-")
      .map(Number);

  const start =
    `${year}-${String(
      monthNumber
    ).padStart(2, "0")}-01`;

  const nextDate =
    new Date(
      Date.UTC(
        year,
        monthNumber,
        1
      )
    );

  const end =
    nextDate
      .toISOString()
      .slice(0, 10);

  return {
    start,
    end,
  };
}

function validateStatus(status) {
  if (
    !status ||
    status === "All"
  ) {
    return;
  }

  if (
    !ALLOWED_STATUSES.includes(
      status
    )
  ) {
    throw new Error(
      "INVALID_STATUS"
    );
  }
}

function applyStatusFilter(
  query,
  status
) {
  validateStatus(status);

  if (
    !status ||
    status === "All"
  ) {
    return query;
  }

  return query.where(
    "status",
    "==",
    status
  );
}

function applyQuotationOrder(
  query
) {
  return query
    .orderBy(
      "quotationSortCurrent",
      "desc"
    )
    .orderBy(
      "quotationSortYear",
      "desc"
    )
    .orderBy(
      "quotationSortSequence",
      "desc"
    )
    .orderBy(
      "quotationSortValue",
      "desc"
    )
    .orderBy(
      "__name__",
      "asc"
    );
}

function cursorForDocument(
  document
) {
  if (!document) {
    return null;
  }

  const data =
    document.data();

  return {
    id:
      document.id,

    quotationSortCurrent:
      Number(
        data.quotationSortCurrent ??
        0
      ),

    quotationSortYear:
      Number(
        data.quotationSortYear ??
        0
      ),

    quotationSortSequence:
      String(
        data.quotationSortSequence ??
        "000000:"
      ),

    quotationSortValue:
      String(
        data.quotationSortValue ??
        ""
      ),
  };
}

function validCursor(cursor) {
  return Boolean(
    cursor &&
    typeof cursor === "object" &&
    cursor.id &&
    cursor.quotationSortCurrent !==
      undefined &&
    cursor.quotationSortYear !==
      undefined &&
    cursor.quotationSortSequence !==
      undefined &&
    cursor.quotationSortValue !==
      undefined
  );
}

async function getSummary(
  quotationsRef
) {
  const [
    total,
    draft,
    sent,
    approved,
    rejected,
  ] =
    await Promise.all([
      quotationsRef
        .count()
        .get(),

      quotationsRef
        .where(
          "status",
          "==",
          "Draft"
        )
        .count()
        .get(),

      quotationsRef
        .where(
          "status",
          "==",
          "Sent"
        )
        .count()
        .get(),

      quotationsRef
        .where(
          "status",
          "==",
          "Approved"
        )
        .count()
        .get(),

      quotationsRef
        .where(
          "status",
          "==",
          "Rejected"
        )
        .count()
        .get(),
    ]);

  return {
    total:
      total.data().count,

    draft:
      draft.data().count,

    sent:
      sent.data().count,

    approved:
      approved.data().count,

    rejected:
      rejected.data().count,
  };
}

function totalForStatus(
  summary,
  status
) {
  if (
    !status ||
    status === "All"
  ) {
    return Number(
      summary.total || 0
    );
  }

  const key =
    String(status)
      .trim()
      .toLowerCase();

  return Number(
    summary[key] || 0
  );
}

/*
 * Month mode cannot use the quotation-number
 * sort directly with quotationDate range filters,
 * because Firestore requires ordering constraints
 * around inequality fields.
 *
 * We therefore read only the requested month's
 * quotations and preserve the existing JS sorting,
 * filtering and pagination behavior.
 */
async function getMonthQuotationList(
  company,
  quotationsRef,
  options
) {
  const bounds =
    monthBounds(
      options.month
    );

  if (!bounds) {
    throw new Error(
      "INVALID_MONTH"
    );
  }

  validateStatus(
    options.status
  );

  const monthQuery =
    quotationsRef
      .where(
        "quotationDate",
        ">=",
        bounds.start
      )
      .where(
        "quotationDate",
        "<",
        bounds.end
      );

  const [
    quotations,
    settings,
  ] =
    await Promise.all([
      monthQuery.get(),

      company
        .collection(
          "QuotationSettings"
        )
        .doc("default")
        .get(),
    ]);

  return buildQuotationList(
    quotations.docs.map(
      (document) => ({
        id:
          document.id,

        ...document.data(),
      })
    ),
    options,
    settings.data()
      ?.quotationPrefix ||
      "QT"
  );
}

/*
 * The existing search supports arbitrary,
 * case-insensitive substring matching across
 * quotation number and client name.
 *
 * Firestore cannot reproduce that exact behavior
 * directly, so search remains an in-memory
 * operation for correctness.
 */
async function getSearchQuotationList(
  company,
  quotationsRef,
  options
) {
  validateStatus(
    options.status
  );

  const [
    quotations,
    settings,
  ] =
    await Promise.all([
      quotationsRef.get(),

      company
        .collection(
          "QuotationSettings"
        )
        .doc("default")
        .get(),
    ]);

  return buildQuotationList(
    quotations.docs.map(
      (document) => ({
        id:
          document.id,

        ...document.data(),
      })
    ),
    options,
    settings.data()
      ?.quotationPrefix ||
      "QT"
  );
}

export async function getCompanyQuotationList(
  db,
  companyId,
  options = {}
) {
  const company =
    db
      .collection(
        "Companies"
      )
      .doc(companyId);

  const quotationsRef =
    company.collection(
      "Quotations"
    );

  const search =
    String(
      options.search || ""
    ).trim();

  const viewMode =
    options.viewMode === "month"
      ? "month"
      : "all";

  /*
   * Search must preserve the existing
   * contains-search behavior.
   */
  if (search) {
    if (
      viewMode === "month"
    ) {
      return getMonthQuotationList(
        company,
        quotationsRef,
        {
          ...options,
          viewMode,
        }
      );
    }

    return getSearchQuotationList(
      company,
      quotationsRef,
      {
        ...options,
        viewMode,
      }
    );
  }

  /*
   * Month view:
   * read only that month's records,
   * then preserve existing numeric ordering.
   */
  if (
    viewMode === "month"
  ) {
    return getMonthQuotationList(
      company,
      quotationsRef,
      {
        ...options,
        viewMode,
      }
    );
  }

  const status =
    options.status ||
    "All";

  validateStatus(status);

  const page =
    Math.max(
      1,
      Number(
        options.page ||
        1
      )
    );

  const pageSize =
    Math.min(
      100,
      Math.max(
        1,
        Number(
          options.pageSize ||
          10
        )
      )
    );

  /*
   * Normal "All" view:
   * Firestore performs filtering,
   * ordering and pagination.
   */
  let query =
    applyStatusFilter(
      quotationsRef,
      status
    );

  query =
    applyQuotationOrder(
      query
    );

  const cursor =
    validCursor(
      options.cursor
    )
      ? options.cursor
      : null;

  const direction =
    options.direction ===
    "previous"
      ? "previous"
      : options.direction ===
          "next"
        ? "next"
        : "";

  if (
    cursor &&
    direction
  ) {
    const cursorValues = [
      Number(
        cursor
          .quotationSortCurrent
      ),

      Number(
        cursor
          .quotationSortYear
      ),

      String(
        cursor
          .quotationSortSequence
      ),

      String(
        cursor
          .quotationSortValue
      ),

      quotationsRef.doc(
        String(
          cursor.id
        )
      ),
    ];

    if (
      direction ===
      "next"
    ) {
      query =
        query
          .startAfter(
            ...cursorValues
          )
          .limit(
            pageSize
          );
    } else {
      query =
        query
          .endBefore(
            ...cursorValues
          )
          .limitToLast(
            pageSize
          );
    }
  } else {
    /*
     * Direct numbered-page jumps still work.
     *
     * Once the UI sends cursors for sequential
     * Next/Previous navigation, those paths no
     * longer pay for skipped documents.
     */
    query =
      query
        .offset(
          (page - 1) *
          pageSize
        )
        .limit(
          pageSize
        );
  }

  const [
    snapshot,
    summary,
  ] =
    await Promise.all([
      query.get(),

      getSummary(
        quotationsRef
      ),
    ]);

  /*
   * No additional count query needed.
   *
   * Summary already contains counts for
   * every supported status.
   */
  const total =
    totalForStatus(
      summary,
      status
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        pageSize
      )
    );

  const firstDocument =
    snapshot.docs[0] ||
    null;

  const lastDocument =
    snapshot.docs[
      snapshot.docs.length -
      1
    ] || null;

  return {
    quotations:
      snapshot.docs.map(
        (document) => ({
          id:
            document.id,

          ...document.data(),
        })
      ),

    total,

    totalPages,

    page:
      Math.min(
        page,
        totalPages
      ),

    pageSize,

    summary,

    startCursor:
      cursorForDocument(
        firstDocument
      ),

    endCursor:
      cursorForDocument(
        lastDocument
      ),
  };
}