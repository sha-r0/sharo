import { doc } from "firebase/firestore";

import employeeRepository from "./employeeRepository";

import { validateEmployee } from "./employeeValidator";

import { generateEmployeeId } from "./employeeIdGenerator";

import { uploadEmployeeFile } from "./employee.storage";

import { mapEmployee } from "./employeeMapper";
import { employeeCollection } from "@/lib/firestore-firebase";

class EmployeeService {

  constructor() {

    this.repository = employeeRepository;

  }

  /* ==========================================
      Create Employee
  ========================================== */

  async create(companyId, form) {

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
        employee.employment?.status || "",

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

      await this.repository.deactivate(

        companyId,

        firestoreId,

        currentUser

      );

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

}

export default new EmployeeService();