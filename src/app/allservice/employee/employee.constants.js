/* ==========================================
   Employee Status
========================================== */

export const EMPLOYEE_STATUS = {

    ACTIVE: "Active",
  
    INACTIVE: "Inactive",
  
    NOTICE: "Notice Period",
  
    TERMINATED: "Terminated",
  
  };
  
  
  /* ==========================================
     Employee Role
  ========================================== */
  
  export const EMPLOYEE_ROLES = [
  
    "Employee",
  
    "Manager",
  
    "HR",
  
    "Admin",
  
  ];
  
  
  /* ==========================================
     Employee Type
  ========================================== */
  
  export const EMPLOYEE_TYPES = [
  
    "Permanent",
  
    "Contract",
  
    "Intern",
  
    "Consultant",
  
  ];
  
  
  /* ==========================================
     Government ID
  ========================================== */
  
  export const GOVERNMENT_ID_TYPES = [
  
    "Aadhaar Card",
  
    "PAN Card",
  
    "Passport",
  
    "Driving Licence",
  
    "Voter ID",
  
  ];
  
  
  /* ==========================================
     Default Salary Structure
  ========================================== */
  
  export const DEFAULT_SALARY_STRUCTURE = {
  
    ctc: "",
  
    grossSalary: "",
  
    basicSalary: "",
  
    hra: "",
  
    otherAllowance: "",
  
    includePf: true,
  
    employeePfPercent: 12,
  
    employerPfPercent: 12,
  
    includeEsi: false,
  
    employeeEsiPercent: 0.75,
  
    employerEsiPercent: 3.25,
  
  };
  
  
  /* ==========================================
     Default Bank Details
  ========================================== */
  
  export const DEFAULT_BANK_DETAILS = {
  
    bankName: "",
  
    accountHolderName: "",
  
    accountNumber: "",
  
    ifsc: "",
  
    branch: "",
  
    upi: "",
  
  };
  
  
  /* ==========================================
     Default Address
  ========================================== */
  
  export const DEFAULT_ADDRESS = {
  
    addressLine: "",
  
    city: "",
  
    state: "",
  
    country: "India",
  
    pincode: "",
  
  };
  
  
  /* ==========================================
     Default Documents
  ========================================== */
  
  export const DEFAULT_DOCUMENTS = {
  
    photo: null,
  
    resume: null,
  
    governmentId: {
  
      type: "Aadhaar Card",
  
      number: "",
  
      file: null,
  
    },
  
  };