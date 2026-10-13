import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";

const clean = (value) => String(value ?? "").trim();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function hasPermission(context, permission) {
  return (
    context.isOwner === true ||
    context.permissions?.includes(permission)
  );
}

/**
 * Owner:
 *   Can assign anyone in the company.
 *
 * Team Leader:
 *   Must have site_assignment.create
 *   AND target employee must belong to same teamId.
 *
 * Other roles:
 *   Permission is enough.
 */
function canAssignSiteToEmployee(
  context,
  targetEmployee,
) {
  if (context.isOwner) {
    return true;
  }

  if (
    !hasPermission(
      context,
      "site_assignment.create",
    )
  ) {
    return false;
  }

  if (context.roleId === "team_leader") {
    const actorTeam =
      context.employee?.reporting?.teamId ||
      context.employee?.employment?.teamId ||
      null;

    const targetTeam =
      targetEmployee?.reporting?.teamId ||
      targetEmployee?.employment?.teamId ||
      null;

    return Boolean(
      actorTeam &&
      targetTeam &&
      String(actorTeam) === String(targetTeam)
    );
  }

  return true;
}

function employeeName(employee) {
  return clean(
    employee?.personalInfo?.fullName ||
      employee?.employeeName ||
      employee?.name,
  );
}

function validLatitude(value) {
  return (
    Number.isFinite(value) &&
    value >= -90 &&
    value <= 90
  );
}

function validLongitude(value) {
  return (
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}

function errorResponse(error) {
  const code =
    error?.message ||
    "SITE_ASSIGNMENT_CREATE_FAILED";

  const status =
    code === "UNAUTHENTICATED"
      ? 401
      : code === "FORBIDDEN"
        ? 403
        : code === "EMPLOYEE_NOT_FOUND"
          ? 404
          : code === "PROJECT_NOT_FOUND"
            ? 404
            : 400;

  return NextResponse.json(
    { error: code },
    { status },
  );
}

export async function POST(request) {
  try {
    /*
     * 1. Resolve company + authenticated actor.
     * Never accept companyId or actor identity
     * from browser input.
     */
    const context =
      await authorizeCompanyRequest(request);

    if (
      !hasPermission(
        context,
        "site_assignment.create",
      )
    ) {
      throw new Error("FORBIDDEN");
    }

    /*
     * 2. Read request.
     */
    const body = await request.json();

    const employeeFirestoreId = clean(
      body.employeeFirestoreId,
    );

    if (!employeeFirestoreId) {
      throw new Error("EMPLOYEE_REQUIRED");
    }

    if (
      employeeFirestoreId.includes("/")
    ) {
      throw new Error("INVALID_EMPLOYEE");
    }

    /*
     * 3. Load target employee from authenticated
     * company's own Usermanagement collection.
     */
    const companyRef = adminDb
      .collection("Companies")
      .doc(context.companyId);

    const employeeRef = companyRef
      .collection("Usermanagement")
      .doc(employeeFirestoreId);

    const employeeSnapshot =
      await employeeRef.get();

    if (!employeeSnapshot.exists) {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }

    const targetEmployee = {
      id: employeeSnapshot.id,
      ...employeeSnapshot.data(),
    };

    /*
     * 4. Team boundary / permission enforcement.
     */
    if (
      !canAssignSiteToEmployee(
        context,
        targetEmployee,
      )
    ) {
      throw new Error("FORBIDDEN");
    }

    /*
     * 5. Site/location fields.
     */
    const siteName = clean(body.siteName);
    const siteAddress = clean(
      body.siteAddress,
    );

    const latitude = Number(body.latitude);
    const longitude = Number(
      body.longitude,
    );

    const radiusMeters = Number(
      body.radiusMeters ?? 100,
    );

    if (!siteName) {
      throw new Error("SITE_NAME_REQUIRED");
    }

    if (!validLatitude(latitude)) {
      throw new Error(
        "INVALID_SITE_LATITUDE",
      );
    }

    if (!validLongitude(longitude)) {
      throw new Error(
        "INVALID_SITE_LONGITUDE",
      );
    }

    if (
      !Number.isFinite(radiusMeters) ||
      radiusMeters < 10 ||
      radiusMeters > 5000
    ) {
      throw new Error(
        "INVALID_SITE_RADIUS",
      );
    }

    /*
     * 6. Assignment dates.
     *
     * These are date-only values.
     * Never use createdAt as assignment date.
     */
    const startDate = clean(
      body.startDate,
    );

    const endDate =
      clean(body.endDate) || startDate;

    if (
      !DATE_PATTERN.test(startDate) ||
      !DATE_PATTERN.test(endDate)
    ) {
      throw new Error(
        "INVALID_ASSIGNMENT_DATE",
      );
    }

    if (endDate < startDate) {
      throw new Error(
        "INVALID_ASSIGNMENT_DATE_RANGE",
      );
    }

    /*
     * 7. Attendance timings.
     */
    const reportingTime = clean(
      body.reportingTime,
    );

    const checkInFrom =
      clean(body.checkInFrom) || null;

    const lateAfter =
      clean(body.lateAfter) || null;

    const absentAfter =
      clean(body.absentAfter) || null;

    const expectedCheckout =
      clean(body.expectedCheckout) || null;

    if (
      !TIME_PATTERN.test(reportingTime)
    ) {
      throw new Error(
        "INVALID_REPORTING_TIME",
      );
    }

    for (const [
      key,
      value,
    ] of [
      ["checkInFrom", checkInFrom],
      ["lateAfter", lateAfter],
      ["absentAfter", absentAfter],
      [
        "expectedCheckout",
        expectedCheckout,
      ],
    ]) {
      if (
        value &&
        !TIME_PATTERN.test(value)
      ) {
        throw new Error(
          `INVALID_${key.toUpperCase()}`,
        );
      }
    }

    /*
     * Optional sanity checks for same-day clock order.
     */
    if (
      checkInFrom &&
      checkInFrom > reportingTime
    ) {
      throw new Error(
        "CHECK_IN_FROM_AFTER_REPORTING_TIME",
      );
    }

    if (
      lateAfter &&
      lateAfter < reportingTime
    ) {
      throw new Error(
        "LATE_TIME_BEFORE_REPORTING_TIME",
      );
    }

    if (
      absentAfter &&
      lateAfter &&
      absentAfter < lateAfter
    ) {
      throw new Error(
        "ABSENT_TIME_BEFORE_LATE_TIME",
      );
    }

    /*
     * 8. Optional project.
     *
     * Never trust projectName supplied by browser when
     * projectId is available. Resolve project server-side.
     */
    const projectId = clean(
      body.projectId,
    );

    let projectName = null;

    if (projectId) {
      if (projectId.includes("/")) {
        throw new Error(
          "INVALID_PROJECT",
        );
      }

      const projectSnapshot =
        await companyRef
          .collection(
            "Projectmanagement",
          )
          .doc(projectId)
          .get();

      if (!projectSnapshot.exists) {
        throw new Error(
          "PROJECT_NOT_FOUND",
        );
      }

      const project =
        projectSnapshot.data() || {};

      projectName =
        clean(
          project.projectName ||
            project.name ||
            project.title,
        ) || null;
    }

    /*
     * 9. Create authoritative assignment.
     */
    const assignmentRef = companyRef
      .collection("SiteAssignments")
      .doc();

    const assignment = {
      companyId: context.companyId,

      employeeFirestoreId,

      employeeId:
        clean(
          targetEmployee.employeeId ||
            targetEmployee.login
              ?.employeeId,
        ) || null,

      employeeName:
        employeeName(targetEmployee) ||
        null,

      projectId: projectId || null,
      projectName,

      site: {
        name: siteName,
        address: siteAddress || null,

        latitude,
        longitude,

        radiusMeters,
      },

      assignmentType:
        startDate === endDate
          ? "single_day"
          : "date_range",

      startDate,
      endDate,

      reportingTime,
      checkInFrom,
      lateAfter,
      absentAfter,
      expectedCheckout,

      notes:
        clean(body.notes) || null,

      status: "Active",

      assignedBy: {
        uid: context.uid,

        employeeFirestoreId:
          context.employeeFirestoreId ||
          null,

        employeeId:
          context.employeeId || null,

        employeeName:
          context.employeeName || null,

        roleId: context.roleId,
      },

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    };

    await assignmentRef.set(
      assignment,
    );

    /*
     * Don't return Firestore server timestamp object
     * before it has resolved.
     */
    return NextResponse.json(
      {
        ok: true,
        assignmentId:
          assignmentRef.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[site-assignment:create]",
      error,
    );

    return errorResponse(error);
  }
}

export async function GET(request) {
    try {
      const context =
        await authorizeCompanyRequest(request);
  
      if (
        !hasPermission(
          context,
          "site_assignment.view",
        )
      ) {
        throw new Error("FORBIDDEN");
      }
  
      const companyRef = adminDb
        .collection("Companies")
        .doc(context.companyId);
  
      const assignmentsSnapshot =
        await companyRef
          .collection("SiteAssignments")
          .orderBy("startDate", "desc")
          .get();
  
      let assignments =
        assignmentsSnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          }),
        );
  
      /*
       * Team Leader can only view assignments
       * for employees inside the same team.
       */
      if (
        !context.isOwner &&
        context.roleId === "team_leader"
      ) {
        const actorTeam =
          context.employee?.reporting?.teamId ||
          context.employee?.employment?.teamId ||
          null;
  
        if (!actorTeam) {
          assignments = [];
        } else {
          const employeeSnapshots =
            await companyRef
              .collection("Usermanagement")
              .get();
  
          const allowedEmployeeIds =
            new Set(
              employeeSnapshots.docs
                .filter((doc) => {
                  const employee =
                    doc.data() || {};
  
                  const targetTeam =
                    employee?.reporting?.teamId ||
                    employee?.employment?.teamId ||
                    null;
  
                  return (
                    targetTeam &&
                    String(targetTeam) ===
                      String(actorTeam)
                  );
                })
                .map((doc) => doc.id),
            );
  
          assignments =
            assignments.filter((item) =>
              allowedEmployeeIds.has(
                item.employeeFirestoreId,
              ),
            );
        }
      }
  
      return NextResponse.json({
        ok: true,
        assignments,
      });
    } catch (error) {
      console.error(
        "[site-assignment:list]",
        error,
      );
  
      return errorResponse(error);
    }
  }