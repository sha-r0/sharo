import {
  doc,
  runTransaction,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export async function generateEmployeeId(companyId) {

  const companyRef = doc(
    db,
    "Companies",
    companyId
  );

  return await runTransaction(db, async (transaction) => {

    const companySnap = await transaction.get(companyRef);

    if (!companySnap.exists()) {
      throw new Error("Company not found.");
    }

    const data = companySnap.data();

    const current =
      data.nextEmployeeNumber || 1;

    transaction.update(companyRef, {
      nextEmployeeNumber: current + 1,
    });

    return current
      .toString()
      .padStart(8, "0");

  });

}