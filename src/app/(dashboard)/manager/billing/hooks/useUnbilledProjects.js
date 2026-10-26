"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import UnbilledProjectService from "../services/UnbilledProjectService";


const CACHE_TTL = 60_000;

const cache = {
  projects: [],
  nextCursor: null,
  hasMore: false,
  timestamp: 0,
};

let inflight = null;


export default function useUnbilledProjects(
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
    loadingMore,
    setLoadingMore,
  ] = useState(false);

  const [
    hasMore,
    setHasMore,
  ] = useState(
    Boolean(cache.hasMore)
  );

  const [
    nextCursor,
    setNextCursor,
  ] = useState(
    cache.nextCursor || null
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

          setHasMore(
            cache.hasMore
          );

          setNextCursor(
            cache.nextCursor
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
            result.projects
          );

          setHasMore(
            result.hasMore
          );

          setNextCursor(
            result.nextCursor
          );

          setLoading(
            false
          );

          return result.projects;
        }

        setLoading(true);
        setError("");

        inflight =
          UnbilledProjectService
            .getProjects()
            .then(
              (result) => {
                const list =
                  Array.isArray(
                    result?.projects
                  )
                    ? result.projects
                    : [];

                const normalized = {
                  projects:
                    list,

                  hasMore:
                    Boolean(
                      result?.hasMore
                    ),

                  nextCursor:
                    result?.nextCursor ||
                    null,
                };

                cache.projects =
                  normalized.projects;

                cache.hasMore =
                  normalized.hasMore;

                cache.nextCursor =
                  normalized.nextCursor;

                cache.timestamp =
                  Date.now();

                return normalized;
              }
            )
            .finally(() => {
              inflight = null;
            });

        try {
          const result =
            await inflight;

          setProjects(
            result.projects
          );

          setHasMore(
            result.hasMore
          );

          setNextCursor(
            result.nextCursor
          );

          return result.projects;
        } catch (
          loadError
        ) {
          console.error(
            "Unbilled projects load failed",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load unbilled projects."
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


  const loadMore =
    useCallback(
      async () => {
        if (
          !enabled ||
          !hasMore ||
          !nextCursor ||
          loadingMore
        ) {
          return;
        }

        setLoadingMore(true);
        setError("");

        try {
          const result =
            await UnbilledProjectService
              .getProjects({
                cursor:
                  nextCursor,
              });

          const nextProjects =
            Array.isArray(
              result?.projects
            )
              ? result.projects
              : [];

          setProjects(
            (current) => {
              const seen =
                new Set(
                  current.map(
                    (project) =>
                      project.id
                  )
                );

              const merged = [
                ...current,

                ...nextProjects.filter(
                  (project) =>
                    !seen.has(
                      project.id
                    )
                ),
              ];

              cache.projects =
                merged;

              return merged;
            }
          );

          const more =
            Boolean(
              result?.hasMore
            );

          const cursor =
            result?.nextCursor ||
            null;

          setHasMore(
            more
          );

          setNextCursor(
            cursor
          );

          cache.hasMore =
            more;

          cache.nextCursor =
            cursor;

          cache.timestamp =
            Date.now();
        } catch (
          loadError
        ) {
          console.error(
            "Load more unbilled projects failed",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load more projects."
          );
        } finally {
          setLoadingMore(false);
        }
      },
      [
        enabled,
        hasMore,
        nextCursor,
        loadingMore,
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
        cache.nextCursor = null;
        cache.hasMore = false;
        cache.timestamp = 0;

        setProjects([]);
        setHasMore(false);
        setNextCursor(null);

        return load(true);
      },
      [
        load,
      ]
    );


  return {
    projects,
    loading,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
  };
}