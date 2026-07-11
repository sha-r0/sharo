"use client";

import { useCallback, useEffect, useState } from "react";
import { onSnapshot, query, orderBy } from "firebase/firestore";

import { projectCollection } from "@/lib/firestore-firebase";

import projectService from "../services/projectService";
import { useAuth } from "@/app/(auth)/context/AuthContext";

export default function useProjects() {

    const { company, currentUser } = useAuth();

    const companyId = company?.id;

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [projects, setProjects] = useState([]);

    const [error, setError] = useState(null);

    /* =======================================================
        Subscribe
    ======================================================= */

    useEffect(() => {

        if (!companyId) return;

        const q = query(

            projectCollection(companyId),

            orderBy("createdAt", "desc")

        );

        const unsubscribe = onSnapshot(

            q,

            (snapshot) => {

                const data = snapshot.docs.map(doc => ({

                    id: doc.id,

                    ...doc.data(),

                }));

                setProjects(data);

                setLoading(false);

            },

            (err) => {

                console.error(err);

                setError(err.message);

                setLoading(false);

            }

        );

        return unsubscribe;

    }, [companyId]);

    /* =======================================================
        Create
    ======================================================= */

    const createProject = useCallback(async (form) => {

        if (!companyId) return;

        try {

            setSaving(true);

            const result = await projectService.create(

                companyId,

                form,

                currentUser

            );

            return result;

        }

        finally {

            setSaving(false);

        }

    }, [companyId, currentUser]);

    /* =======================================================
        Update
    ======================================================= */

    const updateProject = useCallback(

        async (firestoreId, data) => {

            return await projectService.updateProject(

                companyId,

                firestoreId,

                data

            );

        },

        [companyId]

    );

    /* =======================================================
        Delete
    ======================================================= */

    const deleteProject = useCallback(

        async (firestoreId) => {

            return await projectService.deleteProject(

                companyId,

                firestoreId

            );

        },

        [companyId]

    );

    /* =======================================================
        Refresh
    ======================================================= */

    const refresh = useCallback(async () => {

        if (!companyId) return;

        const data = await projectService.getProjects(companyId);

        setProjects(data);

    }, [companyId]);

    return {

        loading,

        saving,

        error,

        projects,

        refresh,

        createProject,

        updateProject,

        deleteProject,

    };

}