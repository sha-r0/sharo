"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import PaidProjectService from "../services/PaidProjectService";


const CACHE_TTL = 60_000;

const cache = {
    projects: [],
    timestamp: 0,
    loaded: false,
};

let inflight = null;


export default function usePaidProjects(
    enabled = true
) {
    const [
        projects,
        setProjects,
    ] = useState(
        cache.projects || []
    );

    const [
        loading,
        setLoading,
    ] = useState(
        enabled &&
        !cache.projects.length
    );

    const [
        error,
        setError,
    ] = useState("");


    const load =
        useCallback(
            async (
                force = false
            ) => {
                if (!enabled) {
                    return [];
                }

                const fresh =
                    cache.loaded &&
                    Date.now() -
                    cache.timestamp <
                    CACHE_TTL;

                if (
                    fresh &&
                    !force
                ) {
                    setProjects(
                        cache.projects
                    );

                    setLoading(
                        false
                    );

                    return cache.projects;
                }

                if (
                    inflight &&
                    !force
                ) {
                    const result =
                        await inflight;

                    setProjects(
                        result
                    );

                    setLoading(
                        false
                    );

                    return result;
                }

                setLoading(true);
                setError("");

                inflight =
                    PaidProjectService
                        .getProjects()
                        .then(
                            (result) => {
                                const list =
                                    Array.isArray(
                                        result?.projects
                                    )
                                        ? result.projects
                                        : [];

                                cache.projects =
                                    list;

                                cache.timestamp =
                                    Date.now();

                                cache.loaded =
                                    true;

                                return list;
                            }
                        )
                        .finally(() => {
                            inflight = null;
                        });

                try {
                    const result =
                        await inflight;

                    setProjects(
                        result
                    );

                    return result;
                } catch (
                loadError
                ) {
                    console.error(
                        "Paid projects load failed",
                        loadError
                    );

                    setError(
                        loadError?.message ||
                        "Unable to load fully paid projects."
                    );

                    throw loadError;
                } finally {
                    setLoading(false);
                }
            },
            [
                enabled,
            ]
        );


    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        load().catch(
            () => { }
        );
    }, [
        enabled,
        load,
    ]);


    const refresh =
        useCallback(
            async () => {
                cache.projects = [];
                cache.timestamp = 0;
                cache.loaded = false;

                setProjects([]);

                return load(true);
            },
            [
                load,
            ]
        );


    return {
        projects,
        loading,
        error,
        refresh,
    };
}