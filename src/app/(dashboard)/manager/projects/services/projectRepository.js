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

    constructor() {
        this.intelligenceCache = new Map();
    }

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

        this.invalidateIntelligence(companyId, firestoreId);

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

        this.invalidateIntelligence(companyId, firestoreId);

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

    async getIntelligenceData(companyId, projectId, force = false) {
        const cacheKey = `${companyId}:${projectId}`;
        const cached = this.intelligenceCache.get(cacheKey);
        if (!force && cached && Date.now() - cached.savedAt < 60_000) return cached.data;

        const optionalCollection = async (name) => {
            try {
                const snapshot = await getDocs(collection(db, "Companies", companyId, name));
                return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
            } catch (error) {
                console.warn(`Project intelligence could not read ${name}:`, error);
                return [];
            }
        };

        const [project, expenses, workLogs, legacyWork, attendance, leaves, advances, clients, quotations, payments, invoices, vendorPayments, vendors, milestones, documents, tasks, gpsPunches, notifications] = await Promise.all([
            this.get(companyId, projectId),
            optionalCollection("Expenses"), optionalCollection("WorkLogs"), optionalCollection("WorkDetails"),
            optionalCollection("Attendance"), optionalCollection("Leaves"), optionalCollection("Advances"),
            optionalCollection("Clients"), optionalCollection("Quotations"), optionalCollection("Payments"),
            optionalCollection("Invoices"), optionalCollection("VendorPayments"), optionalCollection("Vendors"),
            optionalCollection("Milestones"), optionalCollection("ProjectDocuments"), optionalCollection("Tasks"),
            optionalCollection("GPSPunches"), optionalCollection("Notifications"),
        ]);
        if (!project) return null;
        const matches = (item) => {
            const ids = [project.id, project.projectId].filter(Boolean).map(String);
            const itemIds = [item.projectId, item.projectFirestoreId, item.project?.id].filter(Boolean).map(String);
            return itemIds.some((id) => ids.includes(id)) || (item.projectName && String(item.projectName).toLowerCase() === String(project.projectName || "").toLowerCase());
        };
        const assignedVendorIds = new Set((project.vendors || []).flatMap((item) => [item.firestoreId, item.vendorId]).filter(Boolean).map(String));
        const data = {
            project,
            expenses: expenses.filter(matches), workLogs: [...workLogs, ...legacyWork].filter(matches),
            attendance, leaves, advances: advances.filter(matches),
            client: clients.find((item) => item.id === project.clientId || item.clientId === project.clientId || item.clientName === project.clientName) || null,
            quotations: quotations.filter((item) => matches(item) || item.clientId === project.clientId),
            payments: payments.filter(matches), invoices: invoices.filter(matches), vendorPayments: vendorPayments.filter(matches),
            vendors: vendors.filter((item) => assignedVendorIds.has(String(item.id)) || assignedVendorIds.has(String(item.vendorId))), milestones: milestones.filter(matches), documents: documents.filter(matches), tasks: tasks.filter(matches),
            gpsPunches, notifications: notifications.filter((item) => item.metadata?.projectId === project.id || item.actionId === project.id),
        };
        this.intelligenceCache.set(cacheKey, { data, savedAt: Date.now() });
        return data;
    }

    invalidateIntelligence(companyId, projectId) {
        this.intelligenceCache.delete(`${companyId}:${projectId}`);
    }

}

export default new ProjectRepository();
