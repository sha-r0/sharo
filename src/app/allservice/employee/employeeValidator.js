import { validateEmployeeStatutory } from "./employeeStatutory.js";

/* ==========================================================
   Helpers
========================================================== */

function value(value) {
  return String(value ?? "").trim();
}

function hasExistingPhoto(form) {
  return Boolean(
    form?.documents?.photo ||
    value(form?.documents?.photoUrl)
  );
}

function hasExistingGovernmentIdFile(form) {
  return Boolean(
    form?.documents?.governmentId?.file ||
    value(form?.documents?.governmentIdUrl) ||
    value(
      form?.documents?.governmentId?.fileUrl
    )
  );
}

/* ==========================================================
   Validate Employee
========================================================== */

export function validateEmployee(form = {}) {
  const errors =
    validateEmployeeStatutory(form) || {};

  const salaryStructure =
    form?.salaryStructure || {};

  const bankDetails =
    form?.bankDetails || {};

  const address =
    form?.address || {};

  const documents =
    form?.documents || {};

  const governmentId =
    documents?.governmentId || {};

  /* ==========================================
     Basic Information
  ========================================== */

  if (!value(form.firstName)) {
    errors.firstName =
      "First name is required.";
  }

  if (!value(form.lastName)) {
    errors.lastName =
      "Last name is required.";
  }

  if (!value(form.email)) {
    errors.email =
      "Email is required.";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value(form.email)
    )
  ) {
    errors.email =
      "Invalid email address.";
  }

  if (!value(form.phone)) {
    errors.phone =
      "Phone number is required.";
  } else if (
    !/^[6-9]\d{9}$/.test(
      value(form.phone)
    )
  ) {
    errors.phone =
      "Invalid phone number.";
  }

  if (!value(form.gender)) {
    errors.gender =
      "Gender is required.";
  }

  if (!value(form.dob)) {
    errors.dob =
      "Date of birth is required.";
  }

  /* ==========================================
     Login
  ========================================== */

  const needsNewLogin =
    form.loginEnabled !== false &&
    !form.authUid;

  if (
    needsNewLogin &&
    !value(form.password)
  ) {
    errors.password =
      "Password is required.";
  }

  if (
    needsNewLogin &&
    value(form.password) &&
    value(form.password).length < 8
  ) {
    errors.password =
      "Temporary password must contain at least 8 characters.";
  }

  if (
    needsNewLogin &&
    value(form.password) !==
      value(form.confirmPassword)
  ) {
    errors.confirmPassword =
      "Passwords do not match.";
  }

  /* ==========================================
     Employment
  ========================================== */

  if (!value(form.department)) {
    errors.department =
      "Department is required.";
  }

  if (!value(form.designation)) {
    errors.designation =
      "Designation is required.";
  }

  if (!value(form.joiningDate)) {
    errors.joiningDate =
      "Joining date is required.";
  }

  if (!value(form.role)) {
    errors.role =
      "Role is required.";
  }

  if (!value(form.employeeType)) {
    errors.employeeType =
      "Employment type is required.";
  }

  if (!value(form.accountStatus)) {
    errors.accountStatus =
      "Account status is required.";
  }

  /* ==========================================
     Salary
  ========================================== */

  if (
    !salaryStructure.ctc ||
    Number(
      salaryStructure.ctc
    ) <= 0
  ) {
    errors.ctc =
      "CTC is required.";
  }

  /* ==========================================
     Bank
  ========================================== */

  const accountNumber =
    value(
      bankDetails.accountNumber
    );

  if (
    accountNumber &&
    accountNumber.length < 8
  ) {
    errors.accountNumber =
      "Invalid account number.";
  }

  const ifsc =
    value(
      bankDetails.ifsc
    ).toUpperCase();

  if (
    ifsc &&
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
      ifsc
    )
  ) {
    errors.ifsc =
      "Invalid IFSC Code.";
  }

  /* ==========================================
     Address
  ========================================== */

  if (
    !value(
      address.addressLine
    )
  ) {
    errors.address =
      "Address is required.";
  }

  if (
    !value(address.city)
  ) {
    errors.city =
      "City is required.";
  }

  if (
    !value(address.state)
  ) {
    errors.state =
      "State is required.";
  }

  if (
    !value(address.pincode)
  ) {
    errors.pincode =
      "Pincode is required.";
  }

  /* ==========================================
     Documents

     IMPORTANT:
     Existing uploaded files are valid.
     User should not be forced to upload them
     again while editing an employee.
  ========================================== */

  if (!hasExistingPhoto(form)) {
    errors.photo =
      "Profile photo is required.";
  }

  if (
    !value(
      governmentId.number
    )
  ) {
    errors.documentNumber =
      "Government ID Number is required.";
  }

  if (
    !hasExistingGovernmentIdFile(
      form
    )
  ) {
    errors.documentFile =
      "Government ID upload is required.";
  }

  return errors;
}