"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import PendingProjectService from "../services/PendingProjectService";


const CACHE_TTL = 60_000;

const cache = {
  projects: [],
  timestamp: 0,
};

let inflight = null;


export default function usePendingProjects(
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
          cache.projects.length >
            0 &&
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
          PendingProjectService
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
            "Pending projects load failed",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load pending billing projects."
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
      () => {}
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