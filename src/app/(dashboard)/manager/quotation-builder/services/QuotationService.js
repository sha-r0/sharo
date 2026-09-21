import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import notificationService from "@/app/allservice/notification/notificationService";
import { normalizeQuotationRecord } from "./quotationCompatibility.js";

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
        this.validateCompanyId(companyId);
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch("/api/quotations", { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load quotation settings.");
        return result.settings || null;
    }

    static async getNewQuotationData(companyId, quotationId = "") {
        this.validateCompanyId(companyId);
        const token = await auth.currentUser?.getIdToken();
        const suffix = quotationId ? `?quotationId=${encodeURIComponent(quotationId)}` : "";
        const response = await fetch(`/api/quotations${suffix}`, { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to initialize new quotation.");
        return result;
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

        const token = await auth.currentUser?.getIdToken();
        const response = await fetch("/api/quotations", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(settingsData) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to save quotation settings.");
        return result;
    }

    //////////////////////////////////////////////////////
    // Dashboard
    //////////////////////////////////////////////////////

    static async getDashboard(companyId, options = {}) {
        this.validateCompanyId(companyId);
        const token = await auth.currentUser?.getIdToken();
        const params = new URLSearchParams({
            viewMode: options.viewMode || "all", month: options.month || "",
            search: options.search || "", status: options.status || "All",
            page: String(options.page || 1), pageSize: String(options.pageSize || 10),
        });
        const response = await fetch(`/api/quotations/list?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load quotations.");
        const [companyResult, settingsResult, clientResult] = await Promise.allSettled([
            getDoc(this.companyRef(companyId)), this.getSettings(companyId),
            getDocs(query(this.clientsRef(companyId), orderBy("companyName"))),
        ]);
        const companySnapshot = companyResult.status === "fulfilled" ? companyResult.value : null;
        const settings = settingsResult.status === "fulfilled" ? settingsResult.value : null;
        return {
            ...result,
            company: companySnapshot?.exists() ? { id: companySnapshot.id, ...companySnapshot.data() } : null,
            settings, settingsExists: Boolean(settings),
            clients: clientResult.status === "fulfilled" ? clientResult.value.docs.map((doc) => ({ ...doc.data(), id: doc.id })) : [],
        };
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

        const token = await auth.currentUser?.getIdToken();
        const response = await fetch("/api/quotations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to create quotation.");
        const quotationId = result.id;

        try {
            await notificationService.emitSafe(
                "quotation.created",
                {
                    companyId,

                    quotationNumber:
                        data.quotationNumber,

                    targetRole: "manager",

                    actionId:
                        quotationId,

                    actionRoute:
                        "/manager/quotation-builder",

                    metadata: {
                        quotationId:
                            quotationId,

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

        return quotationId;
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
