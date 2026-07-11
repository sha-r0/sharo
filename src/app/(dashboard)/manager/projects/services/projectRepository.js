import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    collection,
    query,
    orderBy,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

class ProjectRepository {

    /* ==========================================
        Collection
    ========================================== */

    collection(companyId) {

        return collection(

            db,

            "Companies",

            companyId,

            "Projectmanagement"

        );

    }

    /* ==========================================
        Create
    ========================================== */

    async create(

        companyId,

        firestoreId,

        project

    ) {

        await setDoc(

            doc(

                this.collection(companyId),

                firestoreId

            ),

            project

        );

    }

    /* ==========================================
        Update
    ========================================== */

    async update(

        companyId,

        firestoreId,

        data

    ) {

        await updateDoc(

            doc(

                this.collection(companyId),

                firestoreId

            ),

            data

        );

    }

    /* ==========================================
        Delete
    ========================================== */

    async remove(

        companyId,

        firestoreId

    ) {

        await deleteDoc(

            doc(

                this.collection(companyId),

                firestoreId

            )

        );

    }

    /* ==========================================
        Get One
    ========================================== */

    async get(

        companyId,

        firestoreId

    ) {

        const snapshot = await getDoc(

            doc(

                this.collection(companyId),

                firestoreId

            )

        );

        if (!snapshot.exists()) {

            return null;

        }

        return {

            id: snapshot.id,

            ...snapshot.data(),

        };

    }

    /* ==========================================
        Get All
    ========================================== */

    async getAll(companyId) {

        const q = query(

            this.collection(companyId),

            orderBy("createdAt", "desc")

        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({

            id: doc.id,

            ...doc.data(),

        }));

    }

}

export default new ProjectRepository();