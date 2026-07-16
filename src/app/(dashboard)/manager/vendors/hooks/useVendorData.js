"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import vendorRepository from "../services/VendorRepository";
import VendorAnalyticsService from "../services/VendorAnalyticsService";

export default function useVendorData(companyId) {
  const [source, setSource] = useState({ vendors: [], payments: [] });
  const [projects, setProjects] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  useEffect(() => {
    if (!companyId) { setLoading(false); return undefined; }
    setLoading(true); setError(null); let vendorReady = false; let projectReady = false;
    const ready = () => { if (vendorReady && projectReady) setLoading(false); };
    const stopVendors = vendorRepository.subscribe(companyId, (value) => { setSource(value); vendorReady = true; ready(); }, (eventError) => { setError(eventError.message); setLoading(false); });
    const stopProjects = onSnapshot(query(collection(db, "Companies", companyId, "Projectmanagement"), orderBy("createdAt", "desc")), (snapshot) => {
      setProjects(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))); projectReady = true; ready();
    }, (eventError) => { setError(eventError.message); setLoading(false); });
    return () => { stopVendors(); stopProjects(); };
  }, [companyId]);
  const analytics = useMemo(() => VendorAnalyticsService.analyze(source.vendors, source.payments, projects), [source, projects]);
  return { ...source, projects, analytics, loading, error };
}
