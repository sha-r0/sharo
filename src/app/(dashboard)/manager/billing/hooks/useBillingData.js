"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import billingRepository from "../services/BillingRepository";
import BillingAnalyticsService from "../services/BillingAnalyticsService";

const EMPTY_SOURCE = {
  company: null,
  settings: null,
  projects: [],
  clients: [],
  invoices: [],
  payments: [],
  expenses: [],
  workLogs: [],
  vendorPayments: [],
};

export default function useBillingData(
  companyId,
  options = {}
) {
  const includeSettings =
    options.includeSettings ??
    true;

  const enabled =
    options.enabled ??
    true;

  const [
    source,
    setSource,
  ] = useState(
    EMPTY_SOURCE
  );

  const [
    loading,
    setLoading,
  ] = useState(
    enabled
  );

  const [
    error,
    setError,
  ] = useState(null);

  useEffect(() => {
    if (
      !companyId ||
      !enabled
    ) {
      setSource(
        EMPTY_SOURCE
      );

      setLoading(false);

      setError(null);

      return undefined;
    }

    setLoading(true);

    setError(null);

    return billingRepository.subscribe(
      companyId,

      (data) => {
        setSource(data);

        setLoading(false);
      },

      (eventError) => {
        console.error(
          eventError
        );

        setError(
          eventError.message
        );

        setLoading(false);
      },

      {
        includeSettings,
      }
    );
  }, [
    companyId,
    includeSettings,
    enabled,
  ]);

  const analytics =
    useMemo(
      () =>
        BillingAnalyticsService.analyze(
          source
        ),
      [source]
    );

  return {
    ...source,
    analytics,
    loading,
    error,
  };
}