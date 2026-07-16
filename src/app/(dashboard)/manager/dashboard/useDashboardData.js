"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import employeeService from "@/app/allservice/employee/employeeService";
import { getProjects } from "@/app/allservice/projectService";
import expenseService from "@/app/allservice/expense/expenseService";
import { can } from "@/app/allservice/rbac/AuthorizationService";

const dashboardCache = new Map();
const CACHE_TTL = 60_000;
const cacheKey = (companyId, access) => `${companyId}:${access?.isOwner ? "owner" : [...(access?.permissions || [])].sort().join(",")}`;

const emptyData = {
  employees: [],
  projects: [],
  expenses: [],
  attendance: [],
  workLogs: [],
  leaves: [],
  advances: [],
  gpsPunches: [],
  clients: [],
  holidays: [],
};

async function readCollection(companyId, name) {
  try {
    const snapshot = await getDocs(
      collection(db, "Companies", companyId, name),
    );
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (error) {
    console.warn(`Dashboard could not read ${name}:`, error);
    return [];
  }
}

async function loadDashboardData(companyId, access) {
  const allowed = (permission) => can(access, permission);
  const safe = (enabled, loader) => enabled ? loader() : Promise.resolve([]);
  const [
    employees,
    projects,
    expenses,
    attendance,
    workLogs,
    legacyWorkLogs,
    leaveRequests,
    legacyLeaves,
    advanceRequests,
    legacyAdvances,
    employeeAdvanceRequests,
    gpsPunches,
    clients,
    holidays,
  ] = await Promise.all([
    safe(allowed("employee.view") || allowed("attendance.view"), () => employeeService.getEmployees(companyId)),
    safe(allowed("projects.view"), () => getProjects(companyId)),
    safe(allowed("expense.view"), () => expenseService.getExpenses(companyId)),
    safe(allowed("attendance.view"), () => readCollection(companyId, "Attendance")),
    safe(allowed("projects.view"), () => readCollection(companyId, "WorkLogs")),
    safe(allowed("projects.view"), () => readCollection(companyId, "WorkDetails")),
    safe(allowed("leave.view"), () => readCollection(companyId, "LeaveRequests")),
    safe(allowed("leave.view"), () => readCollection(companyId, "Leaves")),
    safe(allowed("advance.view"), () => readCollection(companyId, "AdvanceRequests")),
    safe(allowed("advance.view"), () => readCollection(companyId, "Advances")),
    safe(allowed("advance.view"), () => readCollection(companyId, "advance_requests")),
    safe(allowed("gps.view"), () => readCollection(companyId, "GPSPunches")),
    safe(allowed("clients.view"), () => readCollection(companyId, "Clients")),
    safe(allowed("leave.view"), () => readCollection(companyId, "Holidays")),
  ]);

  return {
    employees,
    projects,
    expenses,
    attendance,
    workLogs: [...workLogs, ...legacyWorkLogs],
    leaves: [...leaveRequests, ...legacyLeaves],
    advances: [...employeeAdvanceRequests, ...advanceRequests, ...legacyAdvances],
    gpsPunches,
    clients,
    holidays,
  };
}

export default function useDashboardData(companyId, access) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!companyId) return;

      const key = cacheKey(companyId, access);
      const cached = dashboardCache.get(key);
      if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL) {
        setData(cached.data);
        setLoading(false);
        return;
      }

      force ? setRefreshing(true) : setLoading(true);
      setError(null);

      try {
        const nextData = await loadDashboardData(companyId, access);
        if (!mounted.current) return;
        dashboardCache.set(key, { data: nextData, savedAt: Date.now() });
        setData(nextData);
      } catch (loadError) {
        console.error("Dashboard load failed:", loadError);
        if (mounted.current) {
          setError("We could not load the dashboard. Check your connection and retry.");
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [companyId, access],
  );

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!companyId) return undefined;

    const realtimeCollections = [
      ["Attendance", "attendance", "attendance.view"], ["Expenses", "expenses", "expense.view"],
      ["Projectmanagement", "projects", "projects.view"], ["WorkLogs", "workLogs", "projects.view"],
      ["LeaveRequests", "leaves", "leave.view"], ["AdvanceRequests", "advances", "advance.view"],
      ["advance_requests", "advances", "advance.view"],
      ["GPSPunches", "gpsPunches", "gps.view"], ["Holidays", "holidays", "leave.view"],
    ].filter(([, , permission]) => can(access, permission));
    const unsubscribes = realtimeCollections.map(([collectionName, dataKey]) =>
      onSnapshot(
        collection(db, "Companies", companyId, collectionName),
        (snapshot) => {
          const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
          setData((current) => {
            const next = { ...current, [dataKey]: records };
            dashboardCache.set(cacheKey(companyId, access), { data: next, savedAt: Date.now() });
            return next;
          });
        },
        (snapshotError) => console.warn(`Realtime ${collectionName} unavailable:`, snapshotError),
      ),
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [companyId, access]);

  const refresh = useCallback(() => load({ force: true }), [load]);

  return { data, loading, refreshing, error, refresh };
}
