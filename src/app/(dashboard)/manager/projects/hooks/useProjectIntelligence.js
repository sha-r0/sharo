"use client";

import { useCallback, useEffect, useState } from "react";
import ProjectDashboardService from "../services/ProjectDashboardService";

export default function useProjectIntelligence(companyId, projectId) {
    const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState(null);
    const load = useCallback(async (force = false) => {
        if (!companyId || !projectId) return;
        force ? setRefreshing(true) : setLoading(true); setError(null);
        try { setData(await ProjectDashboardService.load(companyId, projectId, force)); }
        catch (loadError) { console.error(loadError); setError("Project intelligence could not be loaded."); }
        finally { setLoading(false); setRefreshing(false); }
    }, [companyId, projectId]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!companyId || !projectId) return undefined;
        return ProjectDashboardService.subscribe(companyId, projectId, setData, (listenerError) => { console.error(listenerError); setError("Realtime project updates are temporarily unavailable."); });
    }, [companyId, projectId]);
    return { data, loading, refreshing, error, refresh: () => load(true) };
}
