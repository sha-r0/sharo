"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProjectCostService from "../services/ProjectCostService";
import { matchesProjectExpense } from "../services/projectExpenseMatcher";

export default function useProjectPortfolioCosts(companyId, projects) {
  const [data, setData] = useState({ expenses: [], workLogs: [], vendorPayments: [] });
  useEffect(() => {
    if (!companyId) return undefined;
    const stops = [["Expenses", "expenses"], ["WorkLogs", "workLogs"], ["VendorPayments", "vendorPayments"]].map(([name, stateKey]) =>
      onSnapshot(
        collection(db, "Companies", companyId, name),
        (snapshot) => setData((current) => ({ ...current, [stateKey]: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) })),
        (error) => console.warn(`Portfolio cost listener failed for ${name}:`, error),
      ));
    return () => stops.forEach((stop) => stop());
  }, [companyId]);
  return useMemo(() => projects.map((project) => {
    const ids = new Set([project.id, project.projectId].filter(Boolean).map(String));
    const matches = (item) => [item.projectId, item.projectFirestoreId, item.project?.id].filter(Boolean).some((id) => ids.has(String(id)));
    const costs = ProjectCostService.calculate({ project, expenses: data.expenses.filter((item) => matchesProjectExpense(item, project)), workLogs: data.workLogs.filter(matches), vendorPayments: data.vendorPayments.filter(matches) });
    return { ...project, totalExpense: costs.actualCost, actualCost: costs.actualCost, employeeCost: costs.employeeCost, vendorCost: costs.vendorCost, expenseCost: costs.expenseCost, totalProfit: costs.expectedProfit, budgetUsed: costs.budgetUsed };
  }), [projects, data]);
}
