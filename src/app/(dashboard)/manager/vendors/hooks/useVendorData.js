"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import vendorRepository from "../services/VendorRepository";
import VendorAnalyticsService from "../services/VendorAnalyticsService";
import { firestoreUserMessage, logFirestoreFailure } from "@/lib/firestoreDiagnostics";

export default function useVendorData(companyId, canViewProjects = false) {
  const [source, setSource] = useState({ vendors: [], payments: [] });
  const [projects, setProjects] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  useEffect(() => {
    if (!companyId) { setLoading(false); return undefined; }
    setLoading(true); setError(null); let vendorReady = false; let projectReady = !canViewProjects;
    const ready = () => { if (vendorReady && projectReady) setLoading(false); };
    const fail = (path, eventError) => { logFirestoreFailure({ feature: "vendors", operation: "listen", path, error: eventError }); setError(firestoreUserMessage(eventError, "Unable to load vendor data.")); setLoading(false); };
    const stopVendors = vendorRepository.subscribe(companyId, (value) => { setSource(value); vendorReady = true; ready(); }, (eventError) => fail(`Companies/${companyId}/Vendors`, eventError));
    const stopProjects = canViewProjects ? onSnapshot(query(collection(db, "Companies", companyId, "Projectmanagement"), orderBy("createdAt", "desc")), (snapshot) => {
      setProjects(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))); projectReady = true; ready();
    }, (eventError) => fail(`Companies/${companyId}/Projectmanagement`, eventError)) : () => {};
    ready();
    return () => { stopVendors(); stopProjects(); };
  }, [companyId, canViewProjects]);
  const analytics = useMemo(() => VendorAnalyticsService.analyze(source.vendors, source.payments, projects), [source, projects]);
  return { ...source, projects, analytics, loading, error };
}
