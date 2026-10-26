"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import BillingDashboardService from "../services/BillingDashboardService";


const EMPTY_DASHBOARD = {
  period: {
    from: null,
    to: null,
  },

  summary: {
    totalInvoiced: 0,
    totalReceived: 0,
    outstanding: 0,
    overdue: 0,
    collectionRate: 0,
  },

  statusCounts: {
    draft: 0,
    running: 0,
    partial: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
  },

  invoices: [],

  totalCount: 0,

  hasMore: false,
};


/*
 * Small client cache.
 *
 * Prevents React development remounts and
 * quick tab/date-range returns from making
 * identical API calls repeatedly.
 */
const CACHE_TTL = 60_000;

const dashboardCache =
  new Map();

const inflightRequests =
  new Map();


function cacheKey(
  from,
  to
) {
  return `${from || "all"}:${to || "all"}`;
}


function normalizeDashboard(
  result
) {
  return {
    ...EMPTY_DASHBOARD,
    ...result,

    summary: {
      ...EMPTY_DASHBOARD.summary,
      ...result?.summary,
    },

    statusCounts: {
      ...EMPTY_DASHBOARD.statusCounts,
      ...result?.statusCounts,
    },

    invoices:
      Array.isArray(
        result?.invoices
      )
        ? result.invoices
        : [],
  };
}


async function loadDashboard({
  from,
  to,
  force = false,
}) {
  const key =
    cacheKey(
      from,
      to
    );

  const now =
    Date.now();

  const cached =
    dashboardCache.get(
      key
    );

  if (
    !force &&
    cached &&
    now -
      cached.timestamp <
      CACHE_TTL
  ) {
    return cached.data;
  }

  /*
   * If the exact same request is already
   * running, reuse its Promise instead of
   * starting another network request.
   */
  if (
    !force &&
    inflightRequests.has(
      key
    )
  ) {
    return inflightRequests.get(
      key
    );
  }

  const requestPromise =
    BillingDashboardService
      .getDashboard({
        from,
        to,
      })
      .then(
        (
          result
        ) => {
          const normalized =
            normalizeDashboard(
              result
            );

          dashboardCache.set(
            key,
            {
              data:
                normalized,

              timestamp:
                Date.now(),
            }
          );

          return normalized;
        }
      )
      .finally(() => {
        inflightRequests.delete(
          key
        );
      });

  inflightRequests.set(
    key,
    requestPromise
  );

  return requestPromise;
}


export default function useBillingDashboard(
  dateRange
) {
  const from =
    dateRange?.from || "";

  const to =
    dateRange?.to || "";

  const key =
    cacheKey(
      from,
      to
    );

  const cached =
    dashboardCache.get(
      key
    );

  const [
    data,
    setData,
  ] =
    useState(
      cached?.data ||
        EMPTY_DASHBOARD
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      !cached
    );

  const [
    error,
    setError,
  ] =
    useState("");


  const fetchDashboard =
    useCallback(
      async (
        force = false
      ) => {
        try {
          if (
            force ||
            !dashboardCache.has(
              key
            )
          ) {
            setLoading(
              true
            );
          }

          setError("");

          const result =
            await loadDashboard({
              from,
              to,
              force,
            });

          setData(
            result
          );

          return result;
        } catch (
          loadError
        ) {
          console.error(
            "Billing dashboard load failed",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load billing dashboard."
          );

          throw loadError;
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        from,
        to,
        key,
      ]
    );


  useEffect(() => {
    let active = true;

    const currentCached =
      dashboardCache.get(
        key
      );

    if (
      currentCached &&
      Date.now() -
        currentCached.timestamp <
        CACHE_TTL
    ) {
      setData(
        currentCached.data
      );

      setLoading(
        false
      );

      setError("");

      return () => {
        active = false;
      };
    }

    setLoading(
      true
    );

    setError("");

    loadDashboard({
      from,
      to,
    })
      .then(
        (
          result
        ) => {
          if (
            !active
          ) {
            return;
          }

          setData(
            result
          );
        }
      )
      .catch(
        (
          loadError
        ) => {
          if (
            !active
          ) {
            return;
          }

          console.error(
            "Billing dashboard load failed",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load billing dashboard."
          );
        }
      )
      .finally(
        () => {
          if (
            active
          ) {
            setLoading(
              false
            );
          }
        }
      );

    return () => {
      active = false;
    };
  }, [
    from,
    to,
    key,
  ]);


  /*
   * Use after:
   * - payment recorded
   * - invoice created
   * - invoice edited
   * - invoice issued/cancelled
   *
   * Force bypasses the 60 second cache.
   */
  const refresh =
    useCallback(
      async () => {
        dashboardCache.delete(
          key
        );

        return fetchDashboard(
          true
        );
      },
      [
        key,
        fetchDashboard,
      ]
    );


  return {
    ...data,

    loading,
    error,
    refresh,
  };
}