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

export function generateProjectIdFromProjects(projects = []) {
    let max = 0;

    projects.forEach((project) => {
        const id = project?.projectId;
        if (!id) return;

        const number = Number(String(id).replace("PRJ", ""));
        if (Number.isFinite(number) && number > max) {
            max = number;
        }
    });

    const next = max + 1;
    return `PRJ${String(next).padStart(5, "0")}`;
}

export async function generateProjectId(companyId) {

    const snapshot = await getDocs(

        collection(

            db,

            "Companies",

            companyId,

            "Projectmanagement"

        )

    );

    return generateProjectIdFromProjects(
        snapshot.docs.map((item) => item.data())
    );

}
