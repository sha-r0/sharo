const PAYROLL_COLLECTION = "Payrolls";

function payrollCollection(companyRef) {
  return companyRef.collection(PAYROLL_COLLECTION);
}

module.exports = { PAYROLL_COLLECTION, payrollCollection };
