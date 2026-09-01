"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} = require("firebase/firestore");

const COMPANY_A = "agcqb5F8KKZCXjRkotut";
const OWNER_UID = "k4rjlKJpTgWX7aBza2BqkBll68g2";
const EMPLOYEE_UID = "employee-auth-a";
const EMPLOYEE_ID = "employee-doc-a";
const OTHER_UID = "other-user-a";
const MANAGER_UID = "manager-auth-a";
const MANAGER_ID = "manager-doc-a";
const TARGET_ID = "target-doc-a";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test("Firestore notification rules require the emulator", { skip: true }, () => {});
} else {
  let environment;

  test.before(async () => {
    environment = await initializeTestEnvironment({
      projectId: "demo-sharo",
      firestore: {
        rules: fs.readFileSync(path.join(__dirname, "../../firestore.rules"), "utf8"),
      },
    });
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "Companies", COMPANY_A), { ownerUid: OWNER_UID });
      await setDoc(doc(db, "Companies", "company-b"), { ownerUid: "owner-b" });
      await setDoc(doc(db, "Companies", COMPANY_A, "Usermanagement", EMPLOYEE_ID), {
        companyId: COMPANY_A,
        firestoreId: EMPLOYEE_ID,
        employeeId: "00000001",
        login: { employeeId: "00000001" },
        access: { authUid: EMPLOYEE_UID, roleId: "employee", loginEnabled: true, status: "active", effectivePermissions: ["notifications.view", "expense.view", "expense.create"] },
      });
      await setDoc(doc(db, "Companies", COMPANY_A, "Usermanagement", MANAGER_ID), {
        companyId: COMPANY_A,
        firestoreId: MANAGER_ID,
        employeeId: "00000002",
        login: { employeeId: "00000002" },
        access: { authUid: MANAGER_UID, roleId: "manager", loginEnabled: true, status: "active", effectivePermissions: ["employee.view", "employee.edit", "expense.view"] },
      });
      await setDoc(doc(db, "Companies", COMPANY_A, "Usermanagement", TARGET_ID), {
        companyId: COMPANY_A,
        firestoreId: TARGET_ID,
        employeeId: "00000003",
        personalInfo: { fullName: "Target Employee" },
        login: { employeeId: "00000003", loginEmail: "protected@auth.sharo.in" },
        access: { authUid: "target-auth-a", loginEnabled: true, status: "active", effectivePermissions: [] },
      });
      await setDoc(doc(db, "Companies", "company-b", "Usermanagement", "employee-b"), {
        companyId: "company-b",
        firestoreId: "employee-b",
        employeeId: "00000001",
        login: { employeeId: "00000001" },
        access: { authUid: "employee-auth-b", loginEnabled: true, status: "active", effectivePermissions: [] },
      });
      await setDoc(doc(db, "Companies", COMPANY_A, "Expenses", "expense-a"), { employeeId: "00000001", amount: 100, status: "pending" });
      await setDoc(doc(db, "Companies", COMPANY_A, "Expenses", "expense-other"), { employeeId: "00000003", amount: 200, status: "pending" });
      await setDoc(doc(db, "Companies", "company-b", "Expenses", "expense-b"), { employeeId: "00000001", amount: 300, status: "pending" });
      await setDoc(doc(db, "Companies", COMPANY_A, "UserNotifications", OWNER_UID, "Items", "notice-1"), { isRead: false, title: "legacy state title" });
      await setDoc(doc(db, "Companies", COMPANY_A, "UserNotifications", EMPLOYEE_UID, "Items", "notice-1"), { isRead: false, message: "legacy state message" });
      await setDoc(doc(db, "Companies", COMPANY_A, "UserNotifications", OTHER_UID, "Items", "notice-1"), { isRead: false });
      await setDoc(doc(db, "Companies", "company-b", "UserNotifications", EMPLOYEE_UID, "Items", "notice-1"), { isRead: false });
    });
  });

  test.after(async () => environment?.cleanup());

  const states = (db, companyId, userId) => collection(db, "Companies", companyId, "UserNotifications", userId, "Items");
  const employeeDb = () => environment.authenticatedContext(EMPLOYEE_UID, { companyId: COMPANY_A, companyEmployeeId: EMPLOYEE_ID }).firestore();

  test("exact production owner UID can read only its own notification Items", async () => {
    const db = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(getDocs(states(db, COMPANY_A, OWNER_UID)));
    await assertFails(getDocs(states(db, COMPANY_A, OTHER_UID)));
  });

  test("employee can read own Firebase UID namespace but not another employee namespace", async () => {
    const db = employeeDb();
    await assertSucceeds(getDocs(states(db, COMPANY_A, EMPLOYEE_UID)));
    await assertFails(getDocs(states(db, COMPANY_A, OTHER_UID)));
    await assertFails(getDocs(states(db, COMPANY_A, OWNER_UID)));
  });

  test("cross-company and unauthenticated notification reads are denied", async () => {
    await assertFails(getDocs(states(employeeDb(), "company-b", EMPLOYEE_UID)));
    await assertFails(getDocs(states(environment.unauthenticatedContext().firestore(), COMPANY_A, OWNER_UID)));
  });

  test("users may update only safe state in their own notification Items", async () => {
    const employee = employeeDb();
    const owner = environment.authenticatedContext(OWNER_UID).firestore();
    const ownEmployeeItem = doc(states(employee, COMPANY_A, EMPLOYEE_UID), "notice-1");
    const ownOwnerItem = doc(states(owner, COMPANY_A, OWNER_UID), "notice-1");
    await assertSucceeds(setDoc(ownOwnerItem, { isRead: true, readAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }));
    await assertSucceeds(setDoc(ownEmployeeItem, { isRead: true, readAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(ownEmployeeItem, { message: "client rewrite denied", updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(ownEmployeeItem, { title: "client rewrite denied", updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(doc(states(employee, COMPANY_A, OTHER_UID), "notice-1"), { isRead: true, updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(setDoc(doc(states(employee, "company-b", EMPLOYEE_UID), "notice-1"), { isRead: true, updatedAt: serverTimestamp() }, { merge: true }));
    const unauthenticated = environment.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(states(unauthenticated, COMPANY_A, EMPLOYEE_UID), "notice-1"), { isRead: true, updatedAt: serverTimestamp() }, { merge: true }));
  });

  test("client session audit cannot spoof another actor", async () => {
    const db = employeeDb();
    const logs = collection(db, "Companies", COMPANY_A, "ActivityLogs");
    await assertSucceeds(setDoc(doc(logs, "self-audit"), { actorId: EMPLOYEE_UID, createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(logs, "spoofed-audit"), { actorId: OTHER_UID, createdAt: serverTimestamp() }));
  });

  test("owner can list and read only company employees", async () => {
    const db = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(getDocs(collection(db, "Companies", COMPANY_A, "Usermanagement")));
    await assertSucceeds(getDoc(doc(db, "Companies", COMPANY_A, "Usermanagement", TARGET_ID)));
    await assertFails(getDoc(doc(db, "Companies", "company-b", "Usermanagement", "employee-b")));
  });

  test("authorized manager can read and edit profile fields but not protected identity", async () => {
    const db = environment.authenticatedContext(MANAGER_UID, { companyId: COMPANY_A, companyEmployeeId: MANAGER_ID }).firestore();
    const target = doc(db, "Companies", COMPANY_A, "Usermanagement", TARGET_ID);
    await assertSucceeds(getDocs(collection(db, "Companies", COMPANY_A, "Usermanagement")));
    await assertSucceeds(updateDoc(target, { "personalInfo.fullName": "Updated Target" }));
    await assertFails(updateDoc(target, { "access.authUid": "attacker-uid" }));
    await assertFails(updateDoc(target, { "login.loginEmail": "attacker@auth.sharo.in" }));
    await assertFails(updateDoc(target, { employeeId: "00000099" }));
  });

  test("ordinary employee reads only own profile and cannot change credential state", async () => {
    const db = employeeDb();
    await assertSucceeds(getDoc(doc(db, "Companies", COMPANY_A, "Usermanagement", EMPLOYEE_ID)));
    await assertFails(getDoc(doc(db, "Companies", COMPANY_A, "Usermanagement", TARGET_ID)));
    await assertFails(updateDoc(doc(db, "Companies", COMPANY_A, "Usermanagement", EMPLOYEE_ID), { "access.requirePasswordChange": false }));
  });

  test("client employee creation and cross-company access remain denied", async () => {
    const manager = environment.authenticatedContext(MANAGER_UID, { companyId: COMPANY_A, companyEmployeeId: MANAGER_ID }).firestore();
    await assertFails(setDoc(doc(manager, "Companies", COMPANY_A, "Usermanagement", "client-created"), {
      companyId: COMPANY_A,
      employeeId: "00000004",
      access: { authUid: null, effectivePermissions: [] },
      login: { employeeId: "00000004" },
    }));
    await assertFails(getDoc(doc(manager, "Companies", "company-b", "Usermanagement", "employee-b")));
    await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), "Companies", COMPANY_A, "Usermanagement", TARGET_ID)));
  });

  test("owner and authorized manager may list company expenses", async () => {
    const owner = environment.authenticatedContext(OWNER_UID).firestore();
    const manager = environment.authenticatedContext(MANAGER_UID, { companyId: COMPANY_A, companyEmployeeId: MANAGER_ID }).firestore();
    await assertSucceeds(getDocs(collection(owner, "Companies", COMPANY_A, "Expenses")));
    await assertSucceeds(getDocs(collection(manager, "Companies", COMPANY_A, "Expenses")));
  });

  test("employee expenses require own scoped query", async () => {
    const db = employeeDb();
    const expenses = collection(db, "Companies", COMPANY_A, "Expenses");
    await assertSucceeds(getDocs(query(expenses, where("employeeId", "==", "00000001"))));
    await assertFails(getDocs(expenses));
    await assertFails(getDoc(doc(expenses, "expense-other")));
    await assertFails(getDocs(query(collection(db, "Companies", "company-b", "Expenses"), where("employeeId", "==", "00000001"))));
  });
}
