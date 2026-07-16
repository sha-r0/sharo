import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    orderBy,
    limit,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    setDoc,
    increment,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import notificationService from "@/app/allservice/notification/notificationService";

export default class QuotationService {

    //////////////////////////////////////////////////////
    // References
    //////////////////////////////////////////////////////

    static settingsRef(companyId) {

        return doc(
            db,
            "Companies",
            companyId,
            "QuotationSettings",
            "default"
        );

    }

    static quotationsRef(companyId) {

        return collection(
            db,
            "Companies",
            companyId,
            "Quotations"
        );

    }

    //////////////////////////////////////////////////////
    // Clients
    //////////////////////////////////////////////////////

    static clientsRef(companyId) {

        return collection(

            db,

            "Companies",

            companyId,

            "Clients"

        );

    }

    //////////////////////////////////////////////////////
    // Dashboard
    //////////////////////////////////////////////////////

    static async getDashboard(companyId) {

        try {

            //////////////////////////////////////////////////////
            // Company
            //////////////////////////////////////////////////////

            const companyRef = doc(

                db,

                "Companies",

                companyId

            );

            const companySnap = await getDoc(companyRef);

            //////////////////////////////////////////////////////
            // Settings
            //////////////////////////////////////////////////////

            const settingsSnap = await getDoc(

                this.settingsRef(companyId)

            );

            //////////////////////////////////////////////////////
            // Quotations
            //////////////////////////////////////////////////////

            const quotationSnap = await getDocs(

                query(

                    this.quotationsRef(companyId),

                    orderBy("createdAt", "desc"),

                    limit(50)

                )

            );

            const quotations = quotationSnap.docs.map((doc) => ({

                id: doc.id,

                ...doc.data(),

            }));

            //////////////////////////////////////////////////////
            // Clients
            //////////////////////////////////////////////////////

            const clientSnap = await getDocs(

                query(

                    this.clientsRef(companyId),

                    orderBy("companyName")

                )

            );

            const clients = clientSnap.docs.map((doc) => ({

                id: doc.id,

                ...doc.data(),

            }));

            //////////////////////////////////////////////////////
            // Summary
            //////////////////////////////////////////////////////

            const summary = {

                total: quotations.length,

                draft: quotations.filter(

                    x => x.status === "Draft"

                ).length,

                sent: quotations.filter(

                    x => x.status === "Sent"

                ).length,

                approved: quotations.filter(

                    x => x.status === "Approved"

                ).length,

                rejected: quotations.filter(

                    x => x.status === "Rejected"

                ).length,

            };

            //////////////////////////////////////////////////////

            return {

                company: companySnap.exists()

                    ? {

                        id: companySnap.id,

                        ...companySnap.data(),

                    }

                    : null,

                settings: settingsSnap.exists()

                    ? settingsSnap.data()

                    : null,

                settingsExists: settingsSnap.exists(),

                quotations,

                clients,

                summary,

            };

        }

        catch (error) {

            console.error(error);

            return {

                company: null,

                settings: null,

                settingsExists: false,

                quotations: [],

                clients: [],

                summary: {

                    total: 0,

                    draft: 0,

                    sent: 0,

                    approved: 0,

                    rejected: 0,

                },

            };

        }

    }

    //////////////////////////////////////////////////////
    // Get One Quotation
    //////////////////////////////////////////////////////

    static async getQuotation(companyId, quotationId) {

        const ref = doc(

            db,

            "Companies",

            companyId,

            "Quotations",

            quotationId

        );

        const snap = await getDoc(ref);

        if (!snap.exists()) return null;

        return {

            id: snap.id,

            ...snap.data(),

        };

    }

    //////////////////////////////////////////////////////
    // Generate Quotation Number
    //////////////////////////////////////////////////////

    static async generateQuotationNumber(companyId) {

        const snap = await getDoc(

            this.settingsRef(companyId)

        );

        if (!snap.exists()) {

            return "QT-0001";

        }

        const settings = snap.data();

        const prefix =

            settings.quotationPrefix || "QT";

        const number =

            settings.nextQuotationNumber || 1;

        const year =

            new Date()

                .getFullYear()

                .toString()

                .slice(-2);

        return `${prefix}-${year}-${String(number).padStart(4, "0")}`;

    }

    //////////////////////////////////////////////////////
    // Create
    //////////////////////////////////////////////////////

    static async createQuotation(

        companyId,

        data

    ) {

        const quotationRef = doc(

            this.quotationsRef(companyId)

        );

        await setDoc(

            quotationRef,

            {

                id: quotationRef.id,

                ...data,

                createdAt: serverTimestamp(),

                updatedAt: serverTimestamp(),

            }

        );

        await updateDoc(

            this.settingsRef(companyId),

            {

                nextQuotationNumber: increment(1),

            }

        );

        await notificationService.emitSafe("quotation.created", {
            companyId,
            quotationNumber: data.quotationNumber,
            targetRole: "manager",
            actionId: quotationRef.id,
            actionRoute: "/manager/quotation-builder",
            metadata: { quotationId: quotationRef.id, quotationNumber: data.quotationNumber || null, clientName: data.clientName || null },
        });

        return quotationRef.id;

    }

    //////////////////////////////////////////////////////
    // Update
    //////////////////////////////////////////////////////

    static async updateQuotation(

        companyId,

        quotationId,

        data

    ) {

        const previous = await this.getQuotation(companyId, quotationId);

        await updateDoc(

            doc(

                db,

                "Companies",

                companyId,

                "Quotations",

                quotationId

            ),

            {

                ...data,

                updatedAt: serverTimestamp(),

            }

        );

        const nextStatus = String(data.status || "").toLowerCase();
        if (["approved", "rejected"].includes(nextStatus) && nextStatus !== String(previous?.status || "").toLowerCase()) {
            await notificationService.emitSafe(`quotation.${nextStatus}`, {
                companyId,
                quotationNumber: data.quotationNumber || previous?.quotationNumber,
                targetRole: "manager",
                actionId: quotationId,
                actionRoute: "/manager/quotation-builder",
                metadata: { quotationId, quotationNumber: data.quotationNumber || previous?.quotationNumber || null },
            });
        }

    }

    //////////////////////////////////////////////////////
    // Delete
    //////////////////////////////////////////////////////

    static async deleteQuotation(

        companyId,

        quotationId

    ) {

        await deleteDoc(

            doc(

                db,

                "Companies",

                companyId,

                "Quotations",

                quotationId

            )

        );

    }

}
