import {
  doc,
  getDoc,
} from "firebase/firestore";

import employeeRepository from "./employeeRepository";

import { validateEmployee } from "./employeeValidator";

import {
  deleteEmployeeFiles,
  uploadEmployeeFile,
} from "./employee.storage";

import { mapEmployee } from "./employeeMapper";

import {
  employeeCollection,
  employeeDoc,
} from "@/lib/firestore-firebase";

import notificationService from "../notification/notificationService";

import {
  auth,
  db,
} from "@/lib/firebase";

class EmployeeService {
  constructor() {
    this.repository =
      employeeRepository;
  }

  /* ==========================================
      Create Employee
  ========================================== */

  async create(companyId, form) {
    try {
      if (!companyId) {
        return {
          success: false,
          message:
            "Company is required.",
        };
      }

      /* ==============================
          Validate
      ============================== */

      const errors =
        validateEmployee(form);

      if (
        Object.keys(errors).length
      ) {
        return {
          success: false,
          message:
            "Validation failed.",
          errors,
        };
      }

      /* ==============================
          Duplicate Email
      ============================== */

      if (
        form.email &&
        (await this.repository.emailExists(
          companyId,
          form.email
        ))
      ) {
        return {
          success: false,
          message:
            "Email already exists.",
        };
      }

      /* ==============================
          Duplicate Phone
      ============================== */

      if (
        form.phone &&
        (await this.repository.phoneExists(
          companyId,
          form.phone
        ))
      ) {
        return {
          success: false,
          message:
            "Phone number already exists.",
        };
      }

      /* ==============================
          Firestore Document ID

          Employee ID / plan limit are
          handled authoritatively by
          /api/rbac/users.
      ============================== */

      const employeeRef =
        form.firestoreId
          ? employeeDoc(
              companyId,
              form.firestoreId
            )
          : doc(
              employeeCollection(
                companyId
              )
            );

      const firestoreId =
        employeeRef.id;

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

          employeeId: "pending",

          firestoreId,

          fileName: "photo",

          file:
            form.documents
              ?.photo,
        }),

        uploadEmployeeFile({
          companyId,

          employeeId: "pending",

          firestoreId,

          fileName: "resume",

          file:
            form.documents
              ?.resume,
        }),

        uploadEmployeeFile({
          companyId,

          employeeId: "pending",

          firestoreId,

          fileName:
            "government-id",

          file:
            form.documents
              ?.governmentId
              ?.file,
        }),
      ]);

      if (
        ![
          photo,
          resume,
          governmentId,
        ].every(
          (upload) =>
            upload?.success
        )
      ) {
        await deleteEmployeeFiles(
          [
            photo?.path,
            resume?.path,
            governmentId?.path,
          ].filter(Boolean)
        );

        throw new Error(
          "One or more employee files could not be uploaded. Please try again."
        );
      }

      /* ==============================
          Map Employee
      ============================== */

      const employee =
        mapEmployee({
          companyId,

          firestoreId,

          employeeId:
            "pending",

          form,

          photoUrl:
            photo.url,

          resumeUrl:
            resume.url,

          governmentIdUrl:
            governmentId.url,
        });

      /* ==============================
          Save Through Authoritative
          RBAC API
      ============================== */

      try {
        const token =
          await auth.currentUser?.getIdToken();

        if (!token) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        const response =
          await fetch(
            "/api/rbac/users",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify(
                {
                  employeeFirestoreId:
                    firestoreId,

                  profile: {
                    personalInfo:
                      employee.personalInfo,

                    employment:
                      employee.employment,

                    reporting:
                      employee.reporting,

                    salaryStructure:
                      employee.salaryStructure,

                    statutoryDetails:
                      employee.statutoryDetails,

                    bankDetails:
                      employee.bankDetails,

                    address:
                      employee.address,

                    documents:
                      employee.documents,
                  },

                  access: {
                    roleId:
                      employee.access
                        .roleId,

                    permissionOverrides:
                      employee.access
                        .permissionOverrides,
                  },

                  loginEnabled:
                    form.loginEnabled !==
                    false,

                  password:
                    form.password,

                  displayName:
                    employee.personalInfo
                      ?.fullName,

                  phoneNumber:
                    form.phone,

                  requirePasswordChange:
                    form.requirePasswordChange !==
                    false,
                }
              ),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          if (
            result.error ===
            "LIMIT_REACHED"
          ) {
            throw new Error(
              "Subscription employee limit reached."
            );
          }

          throw new Error(
            result.error ||
              "Employee creation failed."
          );
        }

        employee.employeeId =
          result.employeeId;

        if (
          employee.login
        ) {
          employee.login.employeeId =
            result.employeeId;
        }

        /* ==============================
            Account Created Notification
        ============================== */

        if (
          form.loginEnabled !==
          false
        ) {
          await notificationService
            .create({
              companyId,

              type:
                "account.created",

              module:
                "user-management",

              title:
                "ERP account created",

              message:
                "Your employee login account is ready. Sign in using your temporary password.",

              priority: "high",

              targetUsers: [
                firestoreId,
              ],

              actionRoute:
                "/manager",

              actionId:
                firestoreId,

              metadata: {
                employeeId:
                  employee.employeeId,

                requirePasswordChange:
                  form.requirePasswordChange !==
                  false,
              },
            })
            .catch(
              (error) =>
                console.warn(
                  "Account notification unavailable:",
                  error
                )
            );
        }
      } catch (
        accountError
      ) {
        await deleteEmployeeFiles(
          [
            photo?.path,
            resume?.path,
            governmentId?.path,
          ].filter(Boolean)
        );

        throw accountError;
      }

      /* ==============================
          Manager Notification
      ============================== */

      await notificationService.emitSafe(
        "employee.created",
        {
          companyId,

          employeeName:
            employee.personalInfo
              ?.fullName,

          targetRole:
            "manager",

          actionId:
            firestoreId,

          actionRoute:
            `/manager/userManagement/${firestoreId}`,

          metadata: {
            employeeId:
              employee.employeeId,

            employeeName:
              employee.personalInfo
                ?.fullName,
          },
        }
      );

      /* ==============================
          Invalidate Employee Cache

          The server created the record,
          therefore cached directory and
          cached employee detail may now
          be stale.
      ============================== */

      this.repository.removeCache(
        employeeDoc(
          companyId,
          firestoreId
        ).path
      );

      this.repository.invalidateCompany(
        companyId
      );

      return {
        success: true,

        message:
          "Employee created successfully.",

        data: employee,
      };
    } catch (error) {
      console.error(
        "[EmployeeService] Employee creation failed",
        {
          operation:
            "POST /api/rbac/users",

          companyId,

          code:
            error?.code ||
            error?.message ||
            "unknown",
        }
      );

      return {
        success: false,

        message:
          error?.message ||
          "Unable to create employee.",
      };
    }
  }

  /* ==========================================
      Update Employee
  ========================================== */

  async update(
    companyId,
    firestoreId,
    form
  ) {
    try {
      if (
        !companyId ||
        !firestoreId
      ) {
        return {
          success: false,

          message:
            "Employee information is incomplete.",
        };
      }

      /* ==============================
          Validate
      ============================== */

      const errors =
        validateEmployee(form);

      if (
        Object.keys(errors).length
      ) {
        return {
          success: false,

          message:
            "Validation failed.",

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

          employeeId:
            form.employeeId,

          firestoreId,

          fileName: "photo",

          file:
            form.documents
              ?.photo,

          existingUrl:
            form.documents
              ?.photoUrl,
        }),

        uploadEmployeeFile({
          companyId,

          employeeId:
            form.employeeId,

          firestoreId,

          fileName: "resume",

          file:
            form.documents
              ?.resume,

          existingUrl:
            form.documents
              ?.resumeUrl,
        }),

        uploadEmployeeFile({
          companyId,

          employeeId:
            form.employeeId,

          firestoreId,

          fileName:
            "government-id",

          file:
            form.documents
              ?.governmentId
              ?.file,

          existingUrl:
            form.documents
              ?.governmentIdUrl,
        }),
      ]);

      if (
        ![
          photo,
          resume,
          governmentId,
        ].every(
          (upload) =>
            upload?.success
        )
      ) {
        throw new Error(
          "One or more employee files could not be processed."
        );
      }

      /* ==============================
          Map Employee
      ============================== */

      const employee =
        mapEmployee({
          companyId,

          firestoreId,

          employeeId:
            form.employeeId,

          form,

          photoUrl:
            photo.url,

          resumeUrl:
            resume.url,

          governmentIdUrl:
            governmentId.url,

          isUpdate: true,
        });

      /* ==============================
          Update Authoritative Profile
      ============================== */

      const token =
        await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const profileResponse =
        await fetch(
          "/api/rbac/users",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify(
              {
                employeeFirestoreId:
                  firestoreId,

                profile: {
                  personalInfo:
                    employee.personalInfo,

                  employment:
                    employee.employment,

                  reporting:
                    employee.reporting,

                  salaryStructure:
                    employee.salaryStructure,

                  statutoryDetails:
                    employee.statutoryDetails,

                  bankDetails:
                    employee.bankDetails,

                  address:
                    employee.address,

                  documents:
                    employee.documents,
                },

                access: {
                  roleId:
                    employee.access
                      .roleId,

                  loginEnabled:
                    form.authUid
                      ? form.loginEnabled
                      : false,

                  permissionOverrides:
                    employee.access
                      .permissionOverrides,
                },
              }
            ),
          }
        );

      const profileResult =
        await profileResponse.json();

      if (
        !profileResponse.ok
      ) {
        throw new Error(
          profileResult.error ||
            "Employee profile update failed."
        );
      }

      /* ==============================
          Create Login If Needed
      ============================== */

      if (
        !form.authUid &&
        form.loginEnabled
      ) {
        if (!form.password) {
          throw new Error(
            "A temporary password is required when enabling login."
          );
        }

        const response =
          await fetch(
            "/api/rbac/users",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify(
                {
                  employeeFirestoreId:
                    firestoreId,

                  password:
                    form.password,

                  displayName:
                    employee.personalInfo
                      ?.fullName,

                  phoneNumber:
                    form.phone,

                  requirePasswordChange:
                    form.requirePasswordChange !==
                    false,
                }
              ),
            }
          );

        const result =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Employee profile saved, but the login account could not be created."
          );
        }
      } else if (
        form.authUid
      ) {
        await notificationService
          .create({
            companyId,

            type:
              "employee.role-changed",

            module:
              "user-management",

            title:
              "Your ERP role changed",

            message:
              `Your role is now ${form.role}. Your menu and permissions were updated.`,

            priority: "high",

            targetUsers: [
              firestoreId,
            ],

            actionRoute:
              "/manager",

            actionId:
              firestoreId,

            metadata: {
              employeeId:
                form.employeeId,

              roleId:
                employee.access
                  .roleId,
            },
          })
          .catch(
            (error) =>
              console.warn(
                "Role notification unavailable:",
                error
              )
          );
      }

      /* ==============================
          Clear Stale Cache
      ============================== */

      this.repository.removeCache(
        employeeDoc(
          companyId,
          firestoreId
        ).path
      );

      this.repository.invalidateCompany(
        companyId
      );

      return {
        success: true,

        message:
          "Employee updated successfully.",
      };
    } catch (error) {
      console.error(
        "[EmployeeService] Employee update failed",
        {
          operation:
            "PUT",

          path:
            `Companies/${companyId}/Usermanagement/${firestoreId}`,

          code:
            error?.code ||
            error?.message ||
            "unknown",
        }
      );

      return {
        success: false,

        message:
          error?.message ||
          "Unable to update employee.",
      };
    }
  }

  /* ==========================================
      Get Employees
  ========================================== */

  async getEmployees(
    companyId,
    {
      force = false,
    } = {}
  ) {
    if (!companyId) {
      return [];
    }

    const employees =
      await this.repository.getAll(
        companyId,
        {
          force,
        }
      );

    return employees.map(
      (employee) => ({
        ...employee,

        fullName:
          employee.personalInfo
            ?.fullName || "",

        email:
          employee.personalInfo
            ?.email || "",

        phone:
          employee.personalInfo
            ?.phone || "",

        department:
          employee.employment
            ?.department || "",

        designation:
          employee.employment
            ?.designation || "",

        role:
          employee.employment
            ?.role || "",

        status:
          employee.access?.status
            ? `${employee.access.status
                .charAt(0)
                .toUpperCase()}${employee.access.status.slice(
                1
              )}`
            : employee.employment
                ?.status || "",

        photoUrl:
          employee.documents
            ?.photoUrl || "",
      })
    );
  }

  /* ==========================================
      Force Refresh Employee Directory
  ========================================== */

  async refreshEmployees(
    companyId
  ) {
    return this.getEmployees(
      companyId,
      {
        force: true,
      }
    );
  }

  /* ==========================================
      Get Employee
  ========================================== */

  async getEmployee(
    companyId,
    firestoreId
  ) {
    if (
      !companyId ||
      !firestoreId
    ) {
      return null;
    }

    const employee =
      await this.repository.get(
        companyId,
        firestoreId
      );

    if (!employee) {
      return null;
    }

    return {
      ...employee,

      fullName:
        employee.personalInfo
          ?.fullName || "",

      firstName:
        employee.personalInfo
          ?.firstName || "",

      lastName:
        employee.personalInfo
          ?.lastName || "",

      email:
        employee.personalInfo
          ?.email || "",

      phone:
        employee.personalInfo
          ?.phone || "",

      gender:
        employee.personalInfo
          ?.gender || "",

      dob:
        employee.personalInfo
          ?.dob || "",

      department:
        employee.employment
          ?.department || "",

      designation:
        employee.employment
          ?.designation || "",

      role:
        employee.employment
          ?.role || "",

      employeeType:
        employee.employment
          ?.employeeType || "",

      joiningDate:
        employee.employment
          ?.joiningDate || "",

      shift:
        employee.employment
          ?.shift || "",

      status:
        employee.access?.status
          ? `${employee.access.status
              .charAt(0)
              .toUpperCase()}${employee.access.status.slice(
              1
            )}`
          : employee.employment
              ?.status || "",

      photoUrl:
        employee.documents
          ?.photoUrl || "",

      resumeUrl:
        employee.documents
          ?.resumeUrl || "",

      governmentId:
        employee.documents
          ?.governmentId || {},
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
      if (
        !companyId ||
        !firestoreId
      ) {
        throw new Error(
          "Employee information is incomplete."
        );
      }

      /*
       * This normally comes from BaseService's
       * document cache when the profile was
       * already opened, avoiding another read.
       */
      const employeeBefore =
        await this.getEmployee(
          companyId,
          firestoreId
        );

      if (!employeeBefore) {
        throw new Error(
          "Employee not found."
        );
      }

      /*
       * Keep this company-document check.
       * Deactivation is rare and protecting
       * the owner account is more important
       * than saving this single read.
       */
      const companySnapshot =
        await getDoc(
          doc(
            db,
            "Companies",
            companyId
          )
        );

      const ownerUid =
        companySnapshot.data()
          ?.ownerUid;

      if (
        employeeBefore?.access
          ?.authUid &&
        employeeBefore.access
          .authUid === ownerUid
      ) {
        throw new Error(
          "The Company Owner cannot be deactivated."
        );
      }

      if (
        employeeBefore?.access
          ?.authUid &&
        employeeBefore.access
          .authUid ===
          currentUser?.uid
      ) {
        throw new Error(
          "You cannot deactivate your own account."
        );
      }

      const token =
        await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response =
        await fetch(
          "/api/rbac/users",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify(
              {
                action:
                  "deactivate",

                targetUid:
                  employeeBefore
                    ?.access
                    ?.authUid,

                employeeFirestoreId:
                  firestoreId,
              }
            ),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Employee deactivation failed."
        );
      }

      /*
       * Do not immediately re-read the
       * employee from Firestore.
       *
       * We already have employeeBefore for
       * notification information.
       */

      this.repository.removeCache(
        employeeDoc(
          companyId,
          firestoreId
        ).path
      );

      this.repository.invalidateCompany(
        companyId
      );

      await notificationService.emitSafe(
        "employee.deactivated",
        {
          companyId,

          employeeName:
            employeeBefore.fullName ||
            "Employee",

          targetRole:
            "manager",

          sender: currentUser
            ? {
                id:
                  currentUser.id,

                uid:
                  currentUser.uid,

                name:
                  currentUser.name ||
                  currentUser.displayName,

                role:
                  currentUser.role,
              }
            : null,

          actionId:
            firestoreId,

          actionRoute:
            `/manager/userManagement/${firestoreId}`,

          metadata: {
            employeeId:
              employeeBefore.employeeId ||
              firestoreId,

            employeeName:
              employeeBefore.fullName ||
              "Employee",
          },
        }
      );

      return {
        success: true,

        message:
          "Employee deactivated successfully.",
      };
    } catch (error) {
      console.error(
        "[EmployeeService] Employee deactivation failed",
        {
          companyId,

          firestoreId,

          code:
            error?.code ||
            error?.message ||
            "unknown",
        }
      );

      return {
        success: false,

        message:
          error?.message ||
          "Unable to deactivate employee.",
      };
    }
  }

  /* ==========================================
      Get Managers
  ========================================== */

  async getManagers(
    companyId,
    {
      force = false,
    } = {}
  ) {
    const employees =
      await this.getEmployees(
        companyId,
        {
          force,
        }
      );

    return employees.filter(
      (employee) => {
        const role = String(
          employee.role || ""
        ).toLowerCase();

        const status = String(
          employee.status || ""
        ).toLowerCase();

        return (
          role === "manager" &&
          status === "active"
        );
      }
    );
  }
}

export default new EmployeeService();