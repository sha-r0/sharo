import { doc, getDoc } from "firebase/firestore";

import employeeRepository from "./employeeRepository";

import { validateEmployee } from "./employeeValidator";

import { deleteEmployeeFiles, uploadEmployeeFile } from "./employee.storage";

import { mapEmployee } from "./employeeMapper";
import { employeeCollection, employeeDoc } from "@/lib/firestore-firebase";
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

      /* ==============================
          Firestore Doc
      ============================== */

      const employeeRef = form.firestoreId
        ? employeeDoc(companyId, form.firestoreId)
        : doc(employeeCollection(companyId));

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

          employeeId: "pending",

          firestoreId,

          fileName: "photo",

          file: form.documents.photo,

        }),

        uploadEmployeeFile({

          companyId,

          employeeId: "pending",

          firestoreId,

          fileName: "resume",

          file: form.documents.resume,

        }),

        uploadEmployeeFile({

          companyId,

          employeeId: "pending",

          firestoreId,

          fileName: "government-id",

          file: form.documents.governmentId.file,

        }),

      ]);

      if (![photo, resume, governmentId].every((upload) => upload.success)) {
        await deleteEmployeeFiles([photo.path, resume.path, governmentId.path]);
        throw new Error("One or more employee files could not be uploaded. Please try again.");
      }

      /* ==============================
          Map
      ============================== */

      const employee =

        mapEmployee({

          companyId,

          firestoreId,

          employeeId: "pending",

          form,

          photoUrl: photo.url,

          resumeUrl: resume.url,

          governmentIdUrl:

            governmentId.url,

        });

      /* ==============================
          Save
      ============================== */

      try {
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch("/api/rbac/users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ employeeFirestoreId: firestoreId, profile: { personalInfo: employee.personalInfo, employment: employee.employment, reporting: employee.reporting, salaryStructure: employee.salaryStructure, bankDetails: employee.bankDetails, address: employee.address, documents: employee.documents }, access: { roleId: employee.access.roleId, permissionOverrides: employee.access.permissionOverrides }, loginEnabled: form.loginEnabled !== false, password: form.password, displayName: employee.personalInfo?.fullName, phoneNumber: form.phone, requirePasswordChange: form.requirePasswordChange !== false }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error === "LIMIT_REACHED" ? "Subscription employee limit reached." : result.error || "Employee creation failed.");
          employee.employeeId = result.employeeId;
          employee.login.employeeId = result.employeeId;
          if (form.loginEnabled !== false) {
            await notificationService.create({ companyId, type: "account.created", module: "user-management", title: "ERP account created", message: "Your employee login account is ready. Sign in using your temporary password.", priority: "high", targetUsers: [firestoreId], actionRoute: "/manager", actionId: firestoreId, metadata: { employeeId: employee.employeeId, requirePasswordChange: form.requirePasswordChange !== false } }).catch((error) => console.warn("Account notification unavailable:", error));
          }
        } catch (accountError) {
          await deleteEmployeeFiles([photo.path, resume.path, governmentId.path]);
          throw accountError;
        }

      await notificationService.emitSafe("employee.created", {
        companyId,
        employeeName: employee.personalInfo?.fullName,
        receiver: "company",
        actionId: firestoreId,
        actionRoute: `/manager/userManagement/${firestoreId}`,
        metadata: { employeeId: employee.employeeId, employeeName: employee.personalInfo?.fullName },
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

      const token = await auth.currentUser?.getIdToken();
      const profileResponse = await fetch("/api/rbac/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          employeeFirestoreId: firestoreId,
          profile: {
            personalInfo: employee.personalInfo,
            employment: employee.employment,
            reporting: employee.reporting,
            salaryStructure: employee.salaryStructure,
            bankDetails: employee.bankDetails,
            address: employee.address,
            documents: employee.documents,
          },
          access: {
            roleId: employee.access.roleId,
            loginEnabled: form.authUid ? form.loginEnabled : false,
            permissionOverrides: employee.access.permissionOverrides,
          },
        }),
      });
      const profileResult = await profileResponse.json();
      if (!profileResponse.ok) throw new Error(profileResult.error || "Employee profile update failed.");

      if (!form.authUid && form.loginEnabled) {
        if (!form.password) throw new Error("A temporary password is required when enabling login.");
        const response = await fetch("/api/rbac/users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ employeeFirestoreId: firestoreId, password: form.password, displayName: employee.personalInfo?.fullName, phoneNumber: form.phone, requirePasswordChange: form.requirePasswordChange !== false }) });
        if (!response.ok) throw new Error("Employee profile saved, but the login account could not be created.");
      } else if (form.authUid) {
        await notificationService.create({ companyId, type: "employee.role-changed", module: "user-management", title: "Your ERP role changed", message: `Your role is now ${form.role}. Your menu and permissions were updated.`, priority: "high", targetUsers: [firestoreId], actionRoute: "/manager", actionId: firestoreId, metadata: { employeeId: form.employeeId, roleId: employee.access.roleId } }).catch((error) => console.warn("Role notification unavailable:", error));
      }

      this.repository.removeCache(employeeDoc(companyId, firestoreId).path);

      return {

        success: true,

        message: "Employee updated successfully.",

      };

    }

    catch (error) {

      console.error("[EmployeeService] Employee update failed", {
        operation: "PUT",
        path: `Companies/${companyId}/Usermanagement/${firestoreId}`,
        code: error?.code || error?.message || "unknown",
      });

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

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/rbac/users", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "deactivate", targetUid: employeeBefore?.access?.authUid, employeeFirestoreId: firestoreId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Employee deactivation failed.");
      this.repository.removeCache(employeeDoc(companyId, firestoreId).path);

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
