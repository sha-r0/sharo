import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const syncEmployeePayoutBeneficiary = httpsCallable(functions, "syncEmployeePayoutBeneficiary");

export const payoutBeneficiaryService = {
  async sync(employeeFirestoreId) {
    const result = await syncEmployeePayoutBeneficiary({ employeeFirestoreId });
    return result.data;
  },
};
