import { serverTimestamp } from "firebase/firestore";

import { auth } from "@/lib/firebase";

import projectRepository from "./projectRepository";

class ProjectService {

    /* ==========================================
        Create Project
    ========================================== */

    async create(
        companyId,
        form,
        currentUser,
        context = {}
        ) {

        try {
            const firebaseUser = auth.currentUser || (currentUser && typeof currentUser.getIdToken === "function" ? currentUser : null);
            if (!firebaseUser) throw new Error("UNAUTHENTICATED");

            const token = await firebaseUser.getIdToken();

            const response = await fetch("/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    form,
                }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (
                    process.env.NODE_ENV === "development" &&
                    (response.status === 403 ||
                        String(result?.error || "").toLowerCase().includes("permission"))
                ) {
                    console.error("PROJECT CREATE FIRESTORE DENIED", {
                        operation: "setDoc",
                        path: `Companies/${companyId}/Projectmanagement/{firestoreId}`,
                        companyId,
                        authUid: currentUser?.uid || null,
                        companyOwnerUid: context.ownerUid || null,
                        source: "src/app/(dashboard)/manager/projects/services/projectService.js:create",
                    });
                }
                throw new Error(result?.error || "Unable to create project.");
            }

            return {
                success: true,
                message: "Project created successfully.",
                data: result.project || result.data || null,
            };

        }

        catch (error) {

            console.error("Create Project Error:", error);

            return {

                success: false,

                message: error.message || "Unable to create project.",

            };

        }

    }

    /* ==========================================
        Get Projects
    ========================================== */

    async getProjects(companyId) {

        return await projectRepository.getAll(

            companyId

        );

    }

    /* ==========================================
        Get Project
    ========================================== */

    async getProject(

        companyId,

        firestoreId

    ) {

        return await projectRepository.get(

            companyId,

            firestoreId

        );

    }

    /* ==========================================
        Update Project
    ========================================== */

    async updateProject(

        companyId,

        firestoreId,

        data

    ) {

        await projectRepository.update(

            companyId,

            firestoreId,

            { ...data, updatedAt: serverTimestamp() }

        );

        return {

            success: true,

            message: "Project updated successfully.",

        };

    }

    /* ==========================================
        Delete Project
    ========================================== */

    async deleteProject(

        companyId,

        firestoreId,
        context = {}

    ) {

        try {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) throw new Error("UNAUTHENTICATED");

            const token = await firebaseUser.getIdToken();
            const response = await fetch(`/api/projects/${encodeURIComponent(firestoreId)}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (
                    process.env.NODE_ENV === "development" &&
                    (response.status === 403 ||
                        String(result?.error || "").toLowerCase().includes("permission"))
                ) {
                    console.error("PROJECT DELETE FIRESTORE DENIED", {
                        operation: "deleteDoc",
                        path: `Companies/${companyId}/Projectmanagement/${firestoreId}`,
                        companyId,
                        projectFirestoreId: firestoreId,
                        authUid: context.authUid || firebaseUser.uid || null,
                        companyOwnerUid: context.ownerUid || null,
                        source: "src/app/(dashboard)/manager/projects/services/projectService.js:deleteProject",
                    });
                }
                throw new Error(result?.error || "Unable to delete project.");
            }
        } catch (error) {
            console.error("Delete Project Error:", error);
            throw error;
        }

        return {

            success: true,

            message: "Project deleted successfully.",

        };

    }

}

export default new ProjectService();
