import {
    collection,
    getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/*
    Project ID Format

    PRJ00001
    PRJ00002
    PRJ00003
*/

export async function generateProjectId(companyId) {

    const snapshot = await getDocs(

        collection(

            db,

            "Companies",

            companyId,

            "Projectmanagement"

        )

    );

    let max = 0;

    snapshot.forEach(doc => {

        const id = doc.data().projectId;

        if (!id) return;

        const number = Number(

            id.replace("PRJ", "")

        );

        if (number > max) {

            max = number;

        }

    });

    const next = max + 1;

    return `PRJ${String(next).padStart(5, "0")}`;

}