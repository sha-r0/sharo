import {
    collection,
    getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export async function generateClientId(companyId) {

    const snap = await getDocs(

        collection(
            db,
            "Companies",
            companyId,
            "Clients"
        )

    );

    const next = snap.size + 1;

    return `CL${String(next).padStart(5, "0")}`;

}