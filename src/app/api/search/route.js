import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { canReadEmployeeDirectory } from "@/app/allservice/employee/employeeDirectory";

const clean = (value) =>
  String(value ?? "").trim();

const lower = (value) =>
  clean(value).toLowerCase();

function errorResponse(error) {
  const code =
    error?.message || "SEARCH_FAILED";

  if (code === "UNAUTHENTICATED") {
    return NextResponse.json(
      { error: code },
      { status: 401 }
    );
  }

  if (code === "FORBIDDEN") {
    return NextResponse.json(
      { error: code },
      { status: 403 }
    );
  }

  console.error("[global-search]", error);

  return NextResponse.json(
    { error: "SEARCH_FAILED" },
    { status: 500 }
  );
}

export async function GET(request) {
  try {
    const context =
      await authorizeCompanyRequest(request);

    const url =
      new URL(request.url);

    const q =
      clean(url.searchParams.get("q"));

    if (q.length < 2) {
      return NextResponse.json({
        results: [],
      });
    }

    const text = q.toLowerCase();

    const results = [];

    const permissions =
      Array.isArray(context.permissions)
        ? context.permissions
        : [];

    const isOwner =
      context.isOwner === true;

    const canViewEmployees =
      isOwner ||
      permissions.includes("employee.view");

    const canViewProjects =
      isOwner ||
      permissions.includes("projects.view");

    const canViewClients =
      isOwner ||
      permissions.includes("clients.view");

    const companyRef = adminDb
      .collection("Companies")
      .doc(context.companyId);

    if (canViewEmployees) {
      const snapshot = await companyRef
        .collection("Usermanagement")
        .limit(50)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();

        const name =
          clean(
            data.personalInfo?.fullName ||
            data.fullName ||
            data.employeeName ||
            data.name
          );

        const employeeId =
          clean(
            data.employeeId ||
            data.login?.employeeId
          );

        const department =
          clean(
            data.department ||
            data.employment?.department
          );

        const haystack =
          `${name} ${employeeId} ${department}`
            .toLowerCase();

        if (!haystack.includes(text)) {
          continue;
        }

        results.push({
          id: `employee-${doc.id}`,
          type: "employee",
          label:
            name || employeeId || "Employee",
          detail:
            department ||
            employeeId ||
            "Employee",
          href:
            `/manager/userManagement/${doc.id}`,
        });

        if (results.length >= 8) {
          break;
        }
      }
    }

    if (
      results.length < 8 &&
      canViewProjects
    ) {
      const snapshot = await companyRef
        .collection("Projectmanagement")
        .limit(50)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();

        const projectName =
          clean(
            data.projectName ||
            data.name
          );

        const clientName =
          clean(
            data.clientName
          );

        const haystack =
          `${projectName} ${clientName}`
            .toLowerCase();

        if (!haystack.includes(text)) {
          continue;
        }

        results.push({
          id: `project-${doc.id}`,
          type: "project",
          label:
            projectName || "Project",
          detail:
            clientName || "Project",
          href:
            `/manager/projects/${doc.id}`,
        });

        if (results.length >= 8) {
          break;
        }
      }
    }

    if (
      results.length < 8 &&
      canViewClients
    ) {
      const snapshot = await companyRef
        .collection("Clients")
        .limit(50)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();

        const clientName =
          clean(
            data.clientName ||
            data.name
          );

        const haystack =
          `${clientName}`
            .toLowerCase();

        if (!haystack.includes(text)) {
          continue;
        }

        results.push({
          id: `client-${doc.id}`,
          type: "client",
          label:
            clientName || "Client",
          detail: "Client",
          href: "/manager/clients",
        });

        if (results.length >= 8) {
          break;
        }
      }
    }

    return NextResponse.json({
      results:
        results.slice(0, 8),
    });
  } catch (error) {
    return errorResponse(error);
  }
}