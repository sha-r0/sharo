import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";

const clean = (value) => String(value ?? "").trim();

function indiaDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function errorResponse(error) {
  const code = ["UNAUTHENTICATED", "FORBIDDEN", "COMPANY_INACTIVE"].includes(error?.message)
    ? error.message : "SITE_ASSIGNMENT_LOOKUP_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401
    : ["FORBIDDEN", "COMPANY_INACTIVE"].includes(code) ? 403 : 500;

  return NextResponse.json(
    { error: code },
    { status },
  );
}

export async function GET(request) {
  try {
    const context =
      await authorizeCompanyRequest(request);

    /*
     * This endpoint is for the logged-in employee.
     * Owner has no employeeFirestoreId, so return no assignment.
     */
    if (
      context.isOwner ||
      !context.employeeFirestoreId
    ) {
      return NextResponse.json({
        ok: true,
        date: indiaDateKey(),
        assignment: null,
      });
    }

    const today = indiaDateKey();

    const snapshot = await adminDb
      .collection("Companies")
      .doc(context.companyId)
      .collection("SiteAssignments")
      .where(
        "employeeFirestoreId",
        "==",
        context.employeeFirestoreId,
      )
      .get();

    const assignments = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((item) => {
        const status =
          clean(item.status).toLowerCase();

        if (
          status &&
          status !== "active"
        ) {
          return false;
        }

        const startDate =
          clean(item.startDate);

        const endDate =
          clean(item.endDate) ||
          startDate;

        return (
          startDate &&
          startDate <= today &&
          endDate >= today
        );
      })
      .sort((a, b) => {
        const aTime =
          clean(a.reportingTime);

        const bTime =
          clean(b.reportingTime);

        return aTime.localeCompare(bTime);
      });

    /*
     * V1 rule:
     * one primary assignment per employee per day.
     */
    const assignment =
      assignments[0] || null;

    if (!assignment) {
      return NextResponse.json({
        ok: true,
        date: today,
        assignment: null,
      });
    }

    return NextResponse.json({
      ok: true,

      date: today,

      assignment: {
        assignmentId:
          assignment.id,

        projectId:
          assignment.projectId ||
          null,

        projectName:
          assignment.projectName ||
          null,

        siteName:
          assignment.site?.name ||
          null,

        siteAddress:
          assignment.site?.address ||
          null,

        latitude:
          assignment.site?.latitude ??
          null,

        longitude:
          assignment.site?.longitude ??
          null,

        radiusMeters:
          assignment.site?.radiusMeters ??
          100,

        startDate:
          assignment.startDate,

        endDate:
          assignment.endDate,

        reportingTime:
          assignment.reportingTime ||
          null,

        checkInFrom:
          assignment.checkInFrom ||
          null,

        lateAfter:
          assignment.lateAfter ||
          null,

        absentAfter:
          assignment.absentAfter ||
          null,

        expectedCheckout:
          assignment.expectedCheckout ||
          null,

        notes:
          assignment.notes ||
          null,
      },
    });
  } catch (error) {
    console.error(
      "[site-assignment:today]",
      { error: ["UNAUTHENTICATED", "FORBIDDEN", "COMPANY_INACTIVE"].includes(error?.message) ? error.message : "SITE_ASSIGNMENT_LOOKUP_FAILED" },
    );

    return errorResponse(error);
  }
}