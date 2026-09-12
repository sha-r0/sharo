"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ExpenseSkeleton from "./components/ExpenseSkeleton";
import { expensePageCache, fetchExpensePage, fetchExpense, fetchExpenseMatches, clearExpenseFilterCache } from "@/app/allservice/expense/expensePageClient";
import ExpenseHeader from "./components/ExpenseHeader";
import ExpenseFilters from "./components/ExpenseFilters";
import ExpenseSummaryCards from "./components/ExpenseSummaryCards";
import ExpenseTable from "./components/ExpenseTable";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import expenseService from "@/app/allservice/expense/expenseService";
import { expenseOptions, filterExpenses, summarizeExpenses } from "@/lib/expenses/dashboard";
import { createReceiptSubmission } from "@/lib/expenses/receipt";
import { uploadReceipt } from "@/app/allservice/expense/receiptService";
import EditAmountModal from "./components/EditAmountModal";
import { exportExpenseExcel } from "./utils/exportExpenseExcel";
import BillPreviewModal from "./components/BillPreviewModal";
import { firestoreUserMessage, logFirestoreFailure } from "@/lib/firestoreDiagnostics";
import toast from "react-hot-toast";
import { getExpensePeriod } from "@/app/allservice/expense/periodService";

export default function ExpenseApprovalPage() {
    const session = useAuth();
    const now = new Date();
    const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    const uid = session.firebaseUser?.uid || session.currentUser?.uid;
    const scope = JSON.stringify([session.company?.id, uid, session.isOwner, session.roleId, session.companyEmployee?.id, session.companyEmployee?.access?.effectivePermissions]);
    if (!session.company?.id || !uid) return <div className="px-4"><ExpenseSkeleton /></div>;
    if (!session.can("expense.view")) return <p className="p-6">You do not have permission to view expenses.</p>;
    return <div className="space-y-5"><label className="mx-6 block max-w-xs text-sm font-medium text-slate-600">Expense month<input aria-label="Expense month" type="month" value={month} onChange={(event) => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) setMonth(event.target.value); }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2.5" /></label><ExpensePeriodPage key={`${scope}:${month}`} scope={scope} month={month} /></div>;
}

function ExpensePeriodPage({ scope, month }) {

    const { company, companyEmployee, can, isOwner, roleId } = useAuth();

    const canEditExpense = can("expense.edit") || can("expense.manage");
    const canApproveExpense = (isOwner || roleId !== "employee") && (can("expense.approve") || can("expense.manage"));
    const canDeleteExpense = can("expense.delete") || can("expense.manage") || (roleId === "employee" && can("expense.create"));
    const canExportExpense = can("expense.export");
    const companyExpenseScope = isOwner || roleId !== "employee";

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    const today = new Date(`${month}-01T12:00:00`);

    const firstDay = formatDate(
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        )
    );

    const lastDay = formatDate(
        new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
        )
    );

    const [fromDate, setFromDate] = useState(firstDay);
    const [toDate, setToDate] = useState(lastDay);

    const [employeeFilter, setEmployeeFilter] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [busyId, setBusyId] = useState(null);
    const receiptSubmit = useRef(createReceiptSubmission(uploadReceipt));
    const [receiptStage, setReceiptStage] = useState("");
    const mutationBusy = useRef(false);
    const ownPendingOnly = !isOwner && roleId === "employee";
    const ownPending = (expense) => expense.status === "pending" && (expense.employeeFirestoreId ? expense.employeeFirestoreId === companyEmployee?.id : expense.employeeId === companyEmployee?.employeeId);

    const cached = useRef(expensePageCache.peek(scope, month)).current;
    const [loading, setLoading] = useState(!cached);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pageData, setPageData] = useState(cached);
    const [remoteData, setRemoteData] = useState(null);
    const [filterLoading, setFilterLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const requestSequence = useRef(0);
    const mounted = useRef(true);
    const rowRequests = useRef(new Map());
    const [loadError, setLoadError] = useState("");
    const [periodState, setPeriodState] = useState(null);

    const expenses = remoteData?.expenses || pageData?.expenses || [];
    const [search, setSearch] = useState("");
    const activeRemoteFilters = useMemo(() => ({ search: search.trim(), status: statusFilter, category: categoryFilter, project: projectFilter, employee: employeeFilter, fromDate, toDate }), [search, statusFilter, categoryFilter, projectFilter, employeeFilter, fromDate, toDate]);
    const hasRemoteFilters = Object.entries(activeRemoteFilters).some(([key, value]) => key === "fromDate" ? value !== firstDay : key === "toDate" ? value !== lastDay : Boolean(value));
    const filteredExpenses = useMemo(() => hasRemoteFilters ? expenses.filter((expense) => (!fromDate || expense.date >= fromDate) && (!toDate || expense.date <= toDate)) : filterExpenses(expenses, { fromDate, toDate, employee: employeeFilter, project: projectFilter, category: categoryFilter, status: statusFilter, search }), [expenses, fromDate, toDate, employeeFilter, projectFilter, categoryFilter, statusFilter, search, hasRemoteFilters]);
    const hasFilters = Boolean(hasRemoteFilters || employeeFilter || fromDate !== firstDay || toDate !== lastDay);
    const filteredSummary = useMemo(() => summarizeExpenses(filteredExpenses), [filteredExpenses]);
    const summary = hasFilters ? filteredSummary : pageData?.summary || filteredSummary;
    const employees = useMemo(() => pageData?.options?.employees || expenseOptions(expenses, "employee"), [pageData?.options?.employees, expenses]);
    const projects = useMemo(() => pageData?.options?.projects || expenseOptions(expenses, "project"), [pageData?.options?.projects, expenses]);
    const categories = useMemo(() => pageData?.options?.categories || expenseOptions(expenses, "category"), [pageData?.options?.categories, expenses]);

    const [editOpen, setEditOpen] = useState(false);

    const [selectedExpense, setSelectedExpense] = useState(null);

    const [updatingAmount, setUpdatingAmount] = useState(false);

    const [billOpen, setBillOpen] = useState(false);

    const [billUrl, setBillUrl] = useState("");

    useEffect(() => {
        mounted.current = true;
        loadData();
        getExpensePeriod(month).then((value) => mounted.current && setPeriodState(value)).catch(() => {});
        return () => { mounted.current = false; requestSequence.current++; };
    }, []);

    useEffect(() => {
        let active = true;
        const timer = setTimeout(async () => {
            if (!hasRemoteFilters) { setRemoteData(null); setFilterLoading(false); return; }
            setFilterLoading(true);
            try {
                const result = await fetchExpenseMatches(month, activeRemoteFilters);
                if (active) setRemoteData(result);
            } catch (error) { if (active) setLoadError(error.message || "Unable to filter expenses."); }
            finally { if (active) setFilterLoading(false); }
        }, search.trim() ? 280 : 0);
        return () => { active = false; clearTimeout(timer); };
    }, [month, activeRemoteFilters, hasRemoteFilters]);

    async function loadData(force = false, cursor = null) {
        const sequence = ++requestSequence.current;
        if (force && !cursor) clearExpenseFilterCache();
        if (cursor) setLoadingMore(true); else if (pageData) setRefreshing(true);
        setLoadError("");
        try {
            const result = await expensePageCache.load(scope, month, cursor, force, fetchExpensePage);
            if (mounted.current && sequence === requestSequence.current) setPageData(result);
        } catch (error) {
            if (!mounted.current || sequence !== requestSequence.current) return;
            if (error.message === "STALE_EXPENSE_REQUEST") { void loadData(true, cursor); return; }
            logFirestoreFailure({ feature: "expenses", operation: "GET", path: "/api/expenses", companyId: company?.id, isOwner, error });
            setLoadError(firestoreUserMessage(error, "Unable to load expenses. Please retry."));
        } finally {
            if (mounted.current && sequence === requestSequence.current) { setLoading(false); setRefreshing(false); setLoadingMore(false); }
        }
    }
    function replaceExpense(id, expense) {
        if (!mounted.current) { expensePageCache.invalidate(scope, month); return; }
        setRemoteData((current) => current ? { ...current, expenses: current.expenses.flatMap((row) => row.id !== id ? [row] : expense ? [expense] : []) } : current);
        const result = expensePageCache.replace(scope, month, id, expense);
        if (result) setPageData(result);
    }
    async function reconcileExpense(id) {
        const sequence = (rowRequests.current.get(id) || 0) + 1;
        rowRequests.current.set(id, sequence);
        try {
            const expense = await fetchExpense(id);
            if (rowRequests.current.get(id) === sequence) replaceExpense(id, expense);
        } catch (error) {
            expensePageCache.invalidate(scope, month);
            if (mounted.current) setLoadError("The change was saved, but this row could not be refreshed. Use Refresh to reconcile it.");
        }
    }

    function handleEdit(expense) {

        if (process.env.NODE_ENV === "development") {
            console.info(`[ManagerExpenseWeb] editPressed expenseId=${expense?.id || "missing"}`);
        }

        setSelectedExpense(expense);

        setEditOpen(true);

    }

    function handleViewBill(expense) {

        setBillUrl(expense.billUrl);

        setBillOpen(true);

    }

    async function updateExpenseAmount(amount, receipt = {}, route = {}) {
        if (!company?.id || !selectedExpense?.id) {
            alert("Expense information is unavailable.");
            return;
        }

        if (mutationBusy.current) return;
        mutationBusy.current = true;
        try {
            setUpdatingAmount(true);

            if (process.env.NODE_ENV === "development") {
                console.info(`[ManagerExpenseWeb] submitting oldAmount=${Number(selectedExpense.amount || 0)} newAmount=${Number(amount)}`);
            }

            if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a positive expense amount.");
            await receiptSubmit.current({
                input: { amount, ...route }, file: receipt.file, removed: receipt.removed,
                expenseId: selectedExpense.id, onStage: setReceiptStage,
                save: (fields) => (Object.hasOwn(fields, "billUrl") || Object.hasOwn(fields, "travelFrom") || Object.hasOwn(fields, "travelTo"))
                    ? expenseService.updateContent(selectedExpense.id, fields)
                    : expenseService.updateAmount(selectedExpense.id, fields.amount),
            });

            setEditOpen(false);
            setSelectedExpense(null);

            void reconcileExpense(selectedExpense.id);
            toast.success("Expense updated successfully.");
        } catch (error) {
            console.error("Failed to update expense amount", { message: error?.message });
            toast.error(error?.message || "Unable to update expense. Please try again.");
        } finally {
            setUpdatingAmount(false);
            mutationBusy.current = false;
        }
    }

    async function runMutation(expense, action, reason) {
        if (mutationBusy.current || updatingAmount) return;
        mutationBusy.current = true;
        setBusyId(expense.id);
        try {
            if (action === "approve") await expenseService.approveExpense(expense.id);
            else if (action === "reject") await expenseService.rejectExpense(expense.id, reason);
            else await expenseService.deleteExpense(expense.id);
            replaceExpense(expense.id, action === "delete" ? null : { ...expense, reimbursement: null, status: action === "approve" ? "approved" : "rejected" });
            if (action !== "delete") void reconcileExpense(expense.id);
            toast.success(action === "delete" ? "Expense deleted." : action === "approve" ? "Expense approved." : "Expense rejected.");
        } catch (error) {
            toast.error(error.message || "Unable to update expense.");
        } finally {
            setBusyId(null);
            mutationBusy.current = false;
        }
    }
    async function handleApprove(expense) { await runMutation(expense, "approve"); }
    async function handleReject(expense) {
        if (mutationBusy.current) return;
        const reason = window.prompt("Reason for rejecting this expense (required):");
        if (reason === null) return;
        if (!reason.trim() || reason.length > 2000) { toast.error("Enter a rejection reason (maximum 2000 characters)."); return; }
        await runMutation(expense, "reject", reason.trim());
    }
    async function handleDelete(expense) {
        if (mutationBusy.current) return;
        if (window.confirm("Delete this expense? This also deletes its employee copy.")) await runMutation(expense, "delete");
    }

    async function handleExport() {
        if (exporting) return;
        setExporting(true);
        try {
            const result = await fetchExpenseMatches(month, activeRemoteFilters, true);
            exportExpenseExcel(result.expenses, fromDate, toDate);
        } catch (error) { toast.error(error.message || "Unable to export expenses."); }
        finally { setExporting(false); }
    }

    return (
        <div className="min-h-screen  px-6">

            {loadError && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {loadError}<button type="button" onClick={() => loadData(true)} className="ml-3 font-semibold underline">Retry</button>
                </div>
            )}

            <ExpenseHeader
                loading={loading || refreshing || loadingMore || filterLoading}
                onRefresh={() => loadData(true)}
            />

            {loading && !pageData ? <ExpenseSkeleton /> : !pageData ? <p className="rounded-2xl bg-white p-8 text-center text-slate-500">Expense data is unavailable. Retry to load this month.</p> : <>
            <ExpenseFilters
                periodStart={firstDay}
                periodEnd={lastDay}
                fromDate={fromDate}
                toDate={toDate}
                setFromDate={setFromDate}
                setToDate={setToDate}

                employeeFilter={employeeFilter}
                setEmployeeFilter={setEmployeeFilter}

                projectFilter={projectFilter}
                setProjectFilter={setProjectFilter}

                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}

                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                search={search}
                setSearch={setSearch}
                employees={employees}
                projects={projects}
                categories={categories}

                onExport={canExportExpense ? handleExport : null}
                exporting={exporting}
            />

            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span>{hasFilters ? `${expenses.length.toLocaleString()} matching expenses` : `Full-month totals · ${expenses.length} of ${pageData?.totalCount || 0} expenses loaded`}</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${periodState?.status === "locked" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{periodState?.status === "locked" ? "🔒 Locked" : "Open"}</span></div>
            <ExpenseSummaryCards {...summary} />

            <ExpenseTable
                expenses={filteredExpenses}
                onRecorded={(id, result) => { const row = expenses.find((item) => item.id === id); if (row) replaceExpense(id, { ...row, reimbursement: result.reimbursement }); void reconcileExpense(id); toast.success("Reimbursement recorded."); }}
                busy={Boolean(busyId) || updatingAmount}
                ownPendingOnly={ownPendingOnly}
                ownPending={ownPending}
                onDelete={canDeleteExpense ? handleDelete : null}
                onEdit={canEditExpense ? handleEdit : null}
                periodLocked={periodState?.status === "locked"}
                onApprove={canApproveExpense ? handleApprove : null}
                onReject={canApproveExpense ? handleReject : null}
                onViewBill={handleViewBill}
            />

            {pageData?.cursor && <div className="my-6 flex justify-center"><button disabled={loadingMore || refreshing || Boolean(busyId) || updatingAmount} className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-3 font-semibold text-blue-700 disabled:opacity-50" onClick={() => loadData(false, pageData.cursor)}>{loadingMore ? "Loading more…" : "Load More"}</button></div>}
            </>}

            <EditAmountModal

                open={editOpen}

                expense={selectedExpense}

                loading={updatingAmount}
                stage={receiptStage}

                onClose={() => {

                    setEditOpen(false);

                    setSelectedExpense(null);

                }}

                onUpdate={updateExpenseAmount}

            />

            <BillPreviewModal

                open={billOpen}

                billUrl={billUrl}

                onClose={() => {

                    setBillOpen(false);

                    setBillUrl("");

                }}

            />

        </div>
    );
}
