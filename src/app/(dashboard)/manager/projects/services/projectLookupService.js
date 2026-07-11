"use client";

import {
    collection,
    getDocs,
    query,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* -------------------------------- */
/* Clients */
/* -------------------------------- */

export async function getClients(companyId) {

    const snapshot = await getDocs(

        collection(
            db,
            "Companies",
            companyId,
            "Clients"
        )

    );

    return snapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data(),

    }));

}

/* -------------------------------- */
/* Managers */
/* -------------------------------- */

export async function getManagers(companyId) {

    const q = query(

        collection(
            db,
            "Companies",
            companyId,
            "Usermanagement"
        ),

        where("status", "==", "Active"),

        where("role", "==", "Manager")

    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data(),

    }));

}

/* -------------------------------- */
/* Employees */
/* -------------------------------- */

export async function getEmployees(companyId) {

    const q = query(

        collection(
            db,
            "Companies",
            companyId,
            "Usermanagement"
        ),

        where("status", "==", "Active")

    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data(),

    }));

}