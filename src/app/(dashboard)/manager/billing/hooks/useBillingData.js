"use client";

import { useEffect, useMemo, useState } from "react";

import billingRepository from "../services/BillingRepository";
import BillingAnalyticsService from "../services/BillingAnalyticsService";

export default function useBillingData(companyId, options = {}) {
  const includeSettings = options.includeSettings ?? true;
  const [source, setSource] = useState({
    company: null,
    settings: null,
    projects: [],
    clients: [],
    invoices: [],
    payments: [],
    expenses: [],
    workLogs: [],
    vendorPayments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return billingRepository.subscribe(
      companyId,
      (data) => {
        setSource(data);
        setLoading(false);
      },
      (eventError) => {
        console.error(eventError);
        setError(eventError.message);
        setLoading(false);
      },
      { includeSettings },
    );
  }, [companyId, includeSettings]);

  const analytics = useMemo(() => BillingAnalyticsService.analyze(source), [source]);

  return { ...source, analytics, loading, error };
}
