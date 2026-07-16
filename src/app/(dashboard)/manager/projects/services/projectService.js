import { doc, serverTimestamp } from "firebase/firestore";

import { projectCollection } from "@/lib/firestore-firebase";

import projectRepository from "./projectRepository";
import { generateProjectId } from "./projectIdGenerator";
import { mapProject } from "./projectMapper";

class ProjectService {

    /* ==========================================
        Create Project
    ========================================== */

    async create(
        companyId,
        form,
        currentUser
    ) {

        try {

            /* ---------------------------------- */
            /* Generate Business Project ID       */
            /* ---------------------------------- */

            const projectId =
                await generateProjectId(companyId);

            /* ---------------------------------- */
            /* Generate Firestore Document ID     */
            /* ---------------------------------- */

            const firestoreRef = doc(
                projectCollection(companyId)
            );

            const firestoreId = firestoreRef.id;

            /* ---------------------------------- */
            /* Map Project                        */
            /* ---------------------------------- */

            const project = mapProject({

                companyId,

                firestoreId,

                projectId,

                form,

                currentUser,

            });

            /* ---------------------------------- */
            /* Save                              */
            /* ---------------------------------- */

            await projectRepository.create(

                companyId,

                firestoreId,

                project

            );

            return {

                success: true,

                message: "Project created successfully.",

                data: project,

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

        firestoreId

    ) {

        await projectRepository.remove(

            companyId,

            firestoreId

        );

        return {

            success: true,

            message: "Project deleted successfully.",

        };

    }

}

export default new ProjectService();
