/* ==========================================================
   Validate Employee
========================================================== */

export function validateEmployee(form) {

  const errors = {};

  /* ==========================================
     Basic Information
  ========================================== */

  if (!form.firstName?.trim()) {
    errors.firstName = "First name is required.";
  }

  if (!form.lastName?.trim()) {
    errors.lastName = "Last name is required.";
  }

  if (!form.email?.trim()) {
    errors.email = "Email is required.";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  ) {
    errors.email = "Invalid email address.";
  }

  if (!form.phone?.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!/^[6-9]\d{9}$/.test(form.phone)) {
    errors.phone = "Invalid phone number.";
  }

  if (!form.gender) {
    errors.gender = "Gender is required.";
  }

  if (!form.dob) {
    errors.dob = "Date of birth is required.";
  }

  if (form.loginEnabled !== false && !form.authUid && !form.password) {
    errors.password = "Password is required.";
  }

  if (form.loginEnabled !== false && !form.authUid && form.password.length < 8) {
    errors.password =
      "Temporary password must contain at least 8 characters.";
  }

  if (form.loginEnabled !== false && !form.authUid && form.password !== form.confirmPassword) {
    errors.confirmPassword =
      "Passwords do not match.";
  }

  /* ==========================================
     Employment
  ========================================== */

  if (!form.department?.trim()) {
    errors.department = "Department is required.";
  }

  if (!form.designation?.trim()) {
    errors.designation = "Designation is required.";
  }

  if (!form.joiningDate) {
    errors.joiningDate = "Joining date is required.";
  }

  if (!form.role?.trim()) errors.role = "Role is required.";
  if (!form.employeeType?.trim()) errors.employeeType = "Employment type is required.";
  if (!form.accountStatus?.trim()) errors.accountStatus = "Account status is required.";

  /* ==========================================
     Salary
  ========================================== */

  if (
    !form.salaryStructure.ctc ||
    Number(form.salaryStructure.ctc) <= 0
  ) {
    errors.ctc = "CTC is required.";
  }

  /* ==========================================
     Bank
  ========================================== */

  if (
    form.bankDetails.accountNumber &&
    form.bankDetails.accountNumber.length < 8
  ) {
    errors.accountNumber =
      "Invalid account number.";
  }

  if (
    form.bankDetails.ifsc &&
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
      form.bankDetails.ifsc
    )
  ) {
    errors.ifsc = "Invalid IFSC Code.";
  }

  /* ==========================================
     Address
  ========================================== */

  if (!form.address.addressLine?.trim()) {
    errors.address = "Address is required.";
  }

  if (!form.address.city?.trim()) {
    errors.city = "City is required.";
  }

  if (!form.address.state?.trim()) {
    errors.state = "State is required.";
  }

  if (!form.address.pincode?.trim()) {
    errors.pincode = "Pincode is required.";
  }

  /* ==========================================
     Documents
  ========================================== */

  if (!form.documents.photo) {
    errors.photo = "Profile photo is required.";
  }

  if (
    !form.documents.governmentId.number?.trim()
  ) {
    errors.documentNumber =
      "Government ID Number is required.";
  }

  if (
    !form.documents.governmentId.file
  ) {
    errors.documentFile =
      "Government ID upload is required.";
  }

  return errors;

}
