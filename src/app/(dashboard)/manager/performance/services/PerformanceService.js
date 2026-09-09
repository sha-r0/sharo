"use client";

import { auth } from "@/lib/firebase";

async function authHeaders(user = null) {
  const firebaseUser = user || auth.currentUser;
  if (!firebaseUser) throw new Error("UNAUTHENTICATED");
  const token = await firebaseUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function requestJson(url, user = null) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders(user)),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "PERFORMANCE_REQUEST_FAILED");
  return payload;
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.period) params.set("period", filters.period);
  if (filters.year) params.set("year", String(filters.year));
  if (filters.month) params.set("month", String(filters.month));
  if (filters.quarter) params.set("quarter", String(filters.quarter));
  return params.toString() ? `?${params.toString()}` : "";
}

export default class PerformanceService {
  static async getDashboard(user, filters = {}) {
    return requestJson(`/api/performance${buildQuery(filters)}`, user);
  }

  static async getEmployee(user, employeeId, filters = {}) {
    return requestJson(`/api/performance/${encodeURIComponent(employeeId)}${buildQuery(filters)}`, user);
  }
}

