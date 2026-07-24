import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    limit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import notificationService from "@/app/allservice/notification/notificationService";

export default class QuotationService {

    //////////////////////////////////////////////////////
    // Validation
    //////////////////////////////////////////////////////

    static validateCompanyId(companyId) {
        if (!companyId || typeof companyId !== "string") {
            throw new Error("Company ID is required.");
        }
    }

    static validateQuotationId(quotationId) {
        if (!quotationId || typeof quotationId !== "string") {
            throw new Error("Quotation ID is required.");
        }
    }

    //////////////////////////////////////////////////////
    // References
    //////////////////////////////////////////////////////

    static companyRef(companyId) {
        this.validateCompanyId(companyId);

        return doc(
            db,
            "Companies",
            companyId
        );
    }

    static settingsRef(companyId) {
        this.validateCompanyId(companyId);

        return doc(
            db,
            "Companies",
            companyId,
            "QuotationSettings",
            "default"
        );
    }

    static quotationsRef(companyId) {
        this.validateCompanyId(companyId);

        return collection(
            db,
            "Companies",
            companyId,
            "Quotations"
        );
    }

    static quotationRef(companyId, quotationId) {
        this.validateCompanyId(companyId);
        this.validateQuotationId(quotationId);

        return doc(
            db,
            "Companies",
            companyId,
            "Quotations",
            quotationId
        );
    }

    static clientsRef(companyId) {
        this.validateCompanyId(companyId);

        return collection(
            db,
            "Companies",
            companyId,
            "Clients"
        );
    }

    //////////////////////////////////////////////////////
    // Company
    //////////////////////////////////////////////////////

    static async getCompany(companyId) {
        const snapshot = await getDoc(
            this.companyRef(companyId)
        );

        if (!snapshot.exists()) {
            return null;
        }

        return {
            id: snapshot.id,
            ...snapshot.data(),
        };
    }

    //////////////////////////////////////////////////////
    // Quotation Settings
    //////////////////////////////////////////////////////

    static async getSettings(companyId) {
        const snapshot = await getDoc(
            this.settingsRef(companyId)
        );

        if (!snapshot.exists()) {
            return null;
        }

        return {
            id: snapshot.id,
            ...snapshot.data(),
        };
    }

    /**
     * Creates quotation settings for first-time setup
     * or updates existing template settings.
     *
     * merge: true preserves:
     * - nextQuotationNumber
     * - quotationPrefix
     * - createdAt
     * - any future fields not included in the form
     */
    static async saveSettings(companyId, settingsData) {
        this.validateCompanyId(companyId);

        if (!settingsData || typeof settingsData !== "object") {
            throw new Error("Quotation settings are required.");
        }

        const settingsReference =
            this.settingsRef(companyId);

        const existingSnapshot =
            await getDoc(settingsReference);

        const payload = {
            ...settingsData,
            updatedAt: serverTimestamp(),
        };

        if (!existingSnapshot.exists()) {
            payload.createdAt = serverTimestamp();

            payload.quotationPrefix =
                settingsData.quotationPrefix || "QT";

            payload.nextQuotationNumber =
                Number(
                    settingsData.nextQuotationNumber || 1
                );
        }

        await setDoc(
            settingsReference,
            payload,
            {
                merge: true,
            }
        );

        return {
            success: true,
        };
    }

    //////////////////////////////////////////////////////
    // Dashboard
    //////////////////////////////////////////////////////

    static async getDashboard(companyId) {
        this.validateCompanyId(companyId);

        try {
            const [
                companySnapshot,
                settingsSnapshot,
                quotationSnapshot,
                clientSnapshot,
            ] = await Promise.all([
                getDoc(
                    this.companyRef(companyId)
                ),

                getDoc(
                    this.settingsRef(companyId)
                ),

                getDocs(
                    query(
                        this.quotationsRef(companyId),
                        orderBy("createdAt", "desc"),
                        limit(50)
                    )
                ),

                getDocs(
                    query(
                        this.clientsRef(companyId),
                        orderBy("companyName")
                    )
                ),
            ]);

            const company = companySnapshot.exists()
                ? {
                    id: companySnapshot.id,
                    ...companySnapshot.data(),
                }
                : null;

            const settings = settingsSnapshot.exists()
                ? {
                    id: settingsSnapshot.id,
                    ...settingsSnapshot.data(),
                }
                : null;

            const quotations =
                quotationSnapshot.docs.map(
                    (quotationDocument) => ({
                        id: quotationDocument.id,
                        ...quotationDocument.data(),
                    })
                );

            const clients =
                clientSnapshot.docs.map(
                    (clientDocument) => ({
                        id: clientDocument.id,
                        ...clientDocument.data(),
                    })
                );

            const summary = quotations.reduce(
                (result, quotation) => {
                    result.total += 1;

                    const normalizedStatus = String(
                        quotation.status || "Draft"
                    )
                        .trim()
                        .toLowerCase();

                    if (normalizedStatus === "draft") {
                        result.draft += 1;
                    }

                    if (normalizedStatus === "sent") {
                        result.sent += 1;
                    }

                    if (normalizedStatus === "approved") {
                        result.approved += 1;
                    }

                    if (normalizedStatus === "rejected") {
                        result.rejected += 1;
                    }

                    return result;
                },
                {
                    total: 0,
                    draft: 0,
                    sent: 0,
                    approved: 0,
                    rejected: 0,
                }
            );

            return {
                company,
                settings,
                settingsExists: Boolean(settings),
                quotations,
                clients,
                summary,
            };
        } catch (error) {
            console.error(
                "Failed to load quotation dashboard:",
                error
            );

            throw error;
        }
    }

    //////////////////////////////////////////////////////
    // Get One Quotation
    //////////////////////////////////////////////////////

    static async getQuotation(
        companyId,
        quotationId
    ) {
        const snapshot = await getDoc(
            this.quotationRef(
                companyId,
                quotationId
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

    //////////////////////////////////////////////////////
    // Generate Quotation Number
    //////////////////////////////////////////////////////

    static async generateQuotationNumber(companyId) {
        const settings = await this.getSettings(
            companyId
        );

        if (!settings) {
            return "QT-0001";
        }

        const prefix = String(
            settings.quotationPrefix || "QT"
        )
            .trim()
            .toUpperCase();

        const nextNumber = Number(
            settings.nextQuotationNumber || 1
        );

        const year = new Date()
            .getFullYear()
            .toString()
            .slice(-2);

        return `${prefix}-${year}-${String(
            nextNumber
        ).padStart(4, "0")}`;
    }

    //////////////////////////////////////////////////////
    // Create Quotation
    //////////////////////////////////////////////////////

    static async createQuotation(
        companyId,
        data
    ) {
        this.validateCompanyId(companyId);

        if (!data || typeof data !== "object") {
            throw new Error(
                "Quotation data is required."
            );
        }

        if (!data.quotationNumber) {
            throw new Error(
                "Quotation number is required."
            );
        }

        if (!data.clientName) {
            throw new Error(
                "Client name is required."
            );
        }

        const quotationReference = doc(
            this.quotationsRef(companyId)
        );

        const settingsReference =
            this.settingsRef(companyId);

        await runTransaction(
            db,
            async (transaction) => {
                const settingsSnapshot =
                    await transaction.get(
                        settingsReference
                    );

                if (!settingsSnapshot.exists()) {
                    throw new Error(
                        "Quotation setup is incomplete."
                    );
                }

                transaction.set(
                    quotationReference,
                    {
                        id: quotationReference.id,
                        ...data,

                        status:
                            data.status || "Draft",

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp(),
                    }
                );

                transaction.update(
                    settingsReference,
                    {
                        nextQuotationNumber:
                            increment(1),

                        updatedAt:
                            serverTimestamp(),
                    }
                );
            }
        );

        try {
            await notificationService.emitSafe(
                "quotation.created",
                {
                    companyId,

                    quotationNumber:
                        data.quotationNumber,

                    targetRole: "manager",

                    actionId:
                        quotationReference.id,

                    actionRoute:
                        "/manager/quotation-builder",

                    metadata: {
                        quotationId:
                            quotationReference.id,

                        quotationNumber:
                            data.quotationNumber || null,

                        clientName:
                            data.clientName || null,
                    },
                }
            );
        } catch (notificationError) {
            console.error(
                "Quotation created, but notification failed:",
                notificationError
            );
        }

        return quotationReference.id;
    }

    //////////////////////////////////////////////////////
    // Update Quotation
    //////////////////////////////////////////////////////

    static async updateQuotation(
        companyId,
        quotationId,
        data
    ) {
        this.validateCompanyId(companyId);
        this.validateQuotationId(quotationId);

        if (!data || typeof data !== "object") {
            throw new Error(
                "Quotation update data is required."
            );
        }

        const previousQuotation =
            await this.getQuotation(
                companyId,
                quotationId
            );

        if (!previousQuotation) {
            throw new Error(
                "Quotation not found."
            );
        }

        const quotationReference =
            this.quotationRef(
                companyId,
                quotationId
            );

        await updateDoc(
            quotationReference,
            {
                ...data,
                updatedAt: serverTimestamp(),
            }
        );

        const previousStatus = String(
            previousQuotation.status || ""
        )
            .trim()
            .toLowerCase();

        const nextStatus = String(
            data.status ??
            previousQuotation.status ??
            ""
        )
            .trim()
            .toLowerCase();

        const decisionChanged =
            ["approved", "rejected"].includes(
                nextStatus
            ) &&
            nextStatus !== previousStatus;

        if (decisionChanged) {
            try {
                await notificationService.emitSafe(
                    `quotation.${nextStatus}`,
                    {
                        companyId,

                        quotationNumber:
                            data.quotationNumber ||
                            previousQuotation.quotationNumber,

                        targetRole: "manager",

                        actionId: quotationId,

                        actionRoute:
                            "/manager/quotation-builder",

                        metadata: {
                            quotationId,

                            quotationNumber:
                                data.quotationNumber ||
                                previousQuotation.quotationNumber ||
                                null,

                            clientName:
                                data.clientName ||
                                previousQuotation.clientName ||
                                null,

                            status: nextStatus,
                        },
                    }
                );
            } catch (notificationError) {
                console.error(
                    "Quotation updated, but notification failed:",
                    notificationError
                );
            }
        }

        return {
            success: true,
        };
    }

    //////////////////////////////////////////////////////
    // Update Quotation Status
    //////////////////////////////////////////////////////

    static async updateQuotationStatus(
        companyId,
        quotationId,
        status
    ) {
        const allowedStatuses = [
            "Draft",
            "Sent",
            "Approved",
            "Rejected",
        ];

        const normalizedStatus =
            allowedStatuses.find(
                (item) =>
                    item.toLowerCase() ===
                    String(status)
                        .trim()
                        .toLowerCase()
            );

        if (!normalizedStatus) {
            throw new Error(
                "Invalid quotation status."
            );
        }

        return this.updateQuotation(
            companyId,
            quotationId,
            {
                status: normalizedStatus,
            }
        );
    }

    //////////////////////////////////////////////////////
    // Delete Quotation
    //////////////////////////////////////////////////////

    static async deleteQuotation(
        companyId,
        quotationId
    ) {
        const quotation =
            await this.getQuotation(
                companyId,
                quotationId
            );

        if (!quotation) {
            throw new Error(
                "Quotation not found."
            );
        }

        await deleteDoc(
            this.quotationRef(
                companyId,
                quotationId
            )
        );

        return {
            success: true,
        };
    }
}