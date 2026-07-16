import { doc, getDoc } from "firebase/firestore";

import employeeRepository from "./employeeRepository";

import { validateEmployee } from "./employeeValidator";

import { generateEmployeeId } from "./employeeIdGenerator";

import { uploadEmployeeFile } from "./employee.storage";

import { mapEmployee } from "./employeeMapper";
import { employeeCollection } from "@/lib/firestore-firebase";
import notificationService from "../notification/notificationService";
import { auth, db } from "@/lib/firebase";

class EmployeeService {

  constructor() {

    this.repository = employeeRepository;

  }

  /* ==========================================
      Create Employee
  ========================================== */

  async create(companyId, form) {

    try {

      const companySnapshot = await getDoc(doc(db, "Companies", companyId));
      const company = companySnapshot.data() || {};
      const existingEmployees = await this.repository.getAll(companyId);
      const planLimits = { starter: 5, basic: 5, professional: 25, pro: 25, enterprise: Infinity };
      const planLimit = planLimits[String(company.plan || "").toLowerCase()] ?? Infinity;
      const configuredLimit = Number(company.employeeLimit || company.employeeCount || 0) || planLimit;
      const employeeLimit = String(company.plan).toLowerCase() === "enterprise" ? Infinity : Math.min(configuredLimit, planLimit);
      if (existingEmployees.filter((item) => String(item.employment?.status || "active").toLowerCase() !== "inactive").length >= employeeLimit) return { success: false, code: "EMPLOYEE_LIMIT_REACHED", message: `Your ${company.plan || "current"} plan employee limit has been reached. Upgrade the plan before adding another employee.` };

      /* ==============================
          Validate
      ============================== */

      const errors = validateEmployee(form);

      if (Object.keys(errors).length) {

        return {

          success: false,

          message: "Validation failed.",

          errors,

        };

      }

      /* ==============================
          Duplicate Email
      ============================== */

      if (

        await this.repository.emailExists(

          companyId,

          form.email

        )

      ) {

        return {

          success: false,

          message: "Email already exists.",

        };

      }

      /* ==============================
          Duplicate Phone
      ============================== */

      if (

        await this.repository.phoneExists(

          companyId,

          form.phone

        )

      ) {

        return {

          success: false,

          message: "Phone number already exists.",

        };

      }

      /* ==============================
          Generate Employee ID
      ============================== */

      const employeeId =

        await generateEmployeeId(companyId);

      /* ==============================
          Firestore Doc
      ============================== */

      const employeeRef = doc(
        employeeCollection(companyId)
      );

      const firestoreId = employeeRef.id;

      /* ==============================
          Upload Files
      ============================== */

      /* ==============================
          Upload Files (Parallel)
      ============================== */

      const [

        photo,

        resume,

        governmentId,

      ] = await Promise.all([

        uploadEmployeeFile({

          companyId,

          employeeId,

          firestoreId,

          fileName: "photo",

          file: form.documents.photo,

        }),

        uploadEmployeeFile({

          companyId,

          employeeId,

          firestoreId,

          fileName: "resume",

          file: form.documents.resume,

        }),

        uploadEmployeeFile({

          companyId,

          employeeId,

          firestoreId,

          fileName: "government-id",

          file: form.documents.governmentId.file,

        }),

      ]);

      /* ==============================
          Map
      ============================== */

      const employee =

        mapEmployee({

          companyId,

          firestoreId,

          employeeId,

          form,

          photoUrl: photo.url,

          resumeUrl: resume.url,

          governmentIdUrl:

            governmentId.url,

        });

      /* ==============================
          Save
      ============================== */

      await this.repository.create(

        companyId,

        firestoreId,

        employee

      );

      if (form.loginEnabled !== false) {
        try {
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch("/api/rbac/users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ employeeFirestoreId: firestoreId, email: form.email.trim().toLowerCase(), password: form.password, displayName: employee.personalInfo?.fullName, phoneNumber: form.phone, roleId: employee.access.roleId, permissions: employee.access.effectivePermissions, permissionOverrides: employee.access.permissionOverrides, requirePasswordChange: form.requirePasswordChange !== false }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error === "LIMIT_REACHED" ? "Subscription employee limit reached." : result.error || "Login account creation failed.");
          await notificationService.create({ companyId, type: "account.created", module: "user-management", title: "ERP account created", message: "Your employee login account is ready. Sign in using your temporary password.", priority: "high", targetUsers: [firestoreId], actionRoute: "/manager", actionId: firestoreId, metadata: { employeeId, requirePasswordChange: form.requirePasswordChange !== false } }).catch((error) => console.warn("Account notification unavailable:", error));
        } catch (accountError) {
          await this.repository.delete(companyId, firestoreId);
          throw accountError;
        }
      }

      await notificationService.emitSafe("employee.created", {
        companyId,
        employeeName: employee.personalInfo?.fullName,
        receiver: "company",
        actionId: firestoreId,
        actionRoute: `/manager/userManagement/${firestoreId}`,
        metadata: { employeeId, employeeName: employee.personalInfo?.fullName },
      });

      return {

        success: true,

        message:

          "Employee created successfully.",

        data: employee,

      };

    }

    catch (error) {

      console.error(error);

      return {

        success: false,

        message: error.message,

      };

    }

  }

  /* ==========================================
    Update Employee
========================================== */

  /* ==========================================
      Update Employee
  ========================================== */

  async update(

    companyId,

    firestoreId,

    form

  ) {

    try {

      /* ==============================
          Validate
      ============================== */

      const errors = validateEmployee(form);

      if (Object.keys(errors).length) {

        return {

          success: false,

          message: "Validation failed.",

          errors,

        };

      }

      /* ==============================
          Upload Files
      ============================== */

      const [

        photo,

        resume,

        governmentId,

      ] = await Promise.all([

        uploadEmployeeFile({

          companyId,

          employeeId: form.employeeId,

          firestoreId,

          fileName: "photo",

          file: form.documents.photo,

          existingUrl:

            form.documents.photoUrl,

        }),

        uploadEmployeeFile({

          companyId,

          employeeId: form.employeeId,

          firestoreId,

          fileName: "resume",

          file: form.documents.resume,

          existingUrl:

            form.documents.resumeUrl,

        }),

        uploadEmployeeFile({

          companyId,

          employeeId: form.employeeId,

          firestoreId,

          fileName: "government-id",

          file:

            form.documents.governmentId.file,

          existingUrl:

            form.documents.governmentIdUrl,

        }),

      ]);

      /* ==============================
          Map
      ============================== */

      const employee = mapEmployee({

        companyId,

        firestoreId,

        employeeId: form.employeeId,

        form,

        photoUrl: photo.url,

        resumeUrl: resume.url,

        governmentIdUrl: governmentId.url,

        isUpdate: true,

      });

      /* ==============================
          Update
      ============================== */

      await this.repository.update(

        companyId,

        firestoreId,

        employee

      );

      if (form.authUid) {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch("/api/rbac/users", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "role", targetUid: form.authUid, employeeFirestoreId: firestoreId, roleId: employee.access.roleId, permissions: employee.access.effectivePermissions, permissionOverrides: employee.access.permissionOverrides }) });
        if (!response.ok) throw new Error("Employee profile saved, but the login role could not be synchronized.");
        await notificationService.create({ companyId, type: "employee.role-changed", module: "user-management", title: "Your ERP role changed", message: `Your role is now ${form.role}. Your menu and permissions were updated.`, priority: "high", targetUsers: [firestoreId], actionRoute: "/manager", actionId: firestoreId, metadata: { employeeId: form.employeeId, roleId: employee.access.roleId } }).catch((error) => console.warn("Role notification unavailable:", error));
      }

      return {

        success: true,

        message: "Employee updated successfully.",

      };

    }

    catch (error) {

      console.error(error);

      return {

        success: false,

        message: error.message,

      };

    }

  }

  /* ==========================================
     Get Employees
 ========================================== */

  async getEmployees(companyId) {

    const employees = await this.repository.getAll(
      companyId
    );

    return employees.map((employee) => ({

      ...employee,

      fullName:
        employee.personalInfo?.fullName || "",

      email:
        employee.personalInfo?.email || "",

      phone:
        employee.personalInfo?.phone || "",

      department:
        employee.employment?.department || "",

      designation:
        employee.employment?.designation || "",

      role:
        employee.employment?.role || "",

      status:
        employee.access?.status ? `${employee.access.status.charAt(0).toUpperCase()}${employee.access.status.slice(1)}` : employee.employment?.status || "",

      photoUrl:
        employee.documents?.photoUrl || "",

    }));

  }

  /* ==========================================
      Get Employee
  ========================================== */

  async getEmployee(companyId, firestoreId) {

    const employee = await this.repository.get(

      companyId,

      firestoreId

    );

    if (!employee) {

      return null;

    }

    return {

      ...employee,

      fullName:
        employee.personalInfo?.fullName || "",

      firstName:
        employee.personalInfo?.firstName || "",

      lastName:
        employee.personalInfo?.lastName || "",

      email:
        employee.personalInfo?.email || "",

      phone:
        employee.personalInfo?.phone || "",

      gender:
        employee.personalInfo?.gender || "",

      dob:
        employee.personalInfo?.dob || "",

      department:
        employee.employment?.department || "",

      designation:
        employee.employment?.designation || "",

      role:
        employee.employment?.role || "",

      employeeType:
        employee.employment?.employeeType || "",

      joiningDate:
        employee.employment?.joiningDate || "",

      shift:
        employee.employment?.shift || "",

      status:
        employee.employment?.status || "",

      photoUrl:
        employee.documents?.photoUrl || "",

      resumeUrl:
        employee.documents?.resumeUrl || "",

      governmentId:
        employee.documents?.governmentId || {},

    };

  }

  /* ==========================================
      Deactivate Employee
  ========================================== */

  async deactivateEmployee(

    companyId,

    firestoreId,

    currentUser

  ) {

    try {

      const employeeBefore = await this.getEmployee(companyId, firestoreId);
      const companySnapshot = await getDoc(doc(db, "Companies", companyId));
      if (employeeBefore?.access?.authUid && employeeBefore.access.authUid === companySnapshot.data()?.ownerUid) throw new Error("The Company Owner cannot be deactivated.");
      if (employeeBefore?.access?.authUid && employeeBefore.access.authUid === currentUser?.uid) throw new Error("You cannot deactivate your own account.");

      await this.repository.deactivate(

        companyId,

        firestoreId,

        currentUser

      );

      if (employeeBefore?.access?.authUid) {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch("/api/rbac/users", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "disable", targetUid: employeeBefore.access.authUid, employeeFirestoreId: firestoreId }) });
        if (!response.ok) throw new Error("Employee was updated, but login deactivation failed.");
      }

      const employee = await this.getEmployee(companyId, firestoreId);
      await notificationService.emitSafe("employee.deactivated", {
        companyId,
        employeeName: employee?.fullName || "Employee",
        receiver: "company",
        sender: currentUser ? { id: currentUser.id, uid: currentUser.uid, name: currentUser.name || currentUser.displayName, role: currentUser.role } : null,
        actionId: firestoreId,
        actionRoute: `/manager/userManagement/${firestoreId}`,
        metadata: { employeeId: firestoreId, employeeName: employee?.fullName || "Employee" },
      });

      return {

        success: true,

        message: "Employee deactivated successfully."

      };

    }

    catch (error) {

      return {

        success: false,

        message: error.message

      };

    }

  }

  /* ==========================================
    Get Managers
========================================== */

async getManagers(companyId) {

  const employees = await this.getEmployees(companyId);

  return employees.filter(employee =>

      employee.role === "Manager" &&

      employee.status === "Active"

  );

}

}

export default new EmployeeService();
