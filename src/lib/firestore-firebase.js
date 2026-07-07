import { db } from "./firebase";

import {
  doc,
  collection,
} from "firebase/firestore";

/* ==========================================================
   Company
========================================================== */

export const companyDoc = (companyId) =>
  doc(db, "Companies", companyId);

/* ==========================================================
   Company Collections
========================================================== */

export const employeeCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "Usermanagement"
  );

  /* ==========================================================
   Employee Document
========================================================== */

export const employeeDoc = (
  companyId,
  employeeId
) =>
  doc(
    db,
    "Companies",
    companyId,
    "Usermanagement",
    employeeId
  );

export const projectCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "Projectmanagement"
  );

export const expenseCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "Expenses"
  );

export const advanceCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "Advances"
  );

export const noticeCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "Notices"
  );

export const holidayCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "Holidays"
  );

export const leaveTypeCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "LeaveTypes"
  );

export const shiftPolicyCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "ShiftPolicies"
  );

export const todoCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "Todos"
  );

export const appSettingsCollection = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "AppSettings"
  );