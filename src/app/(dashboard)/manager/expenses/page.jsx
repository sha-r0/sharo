"use client";

import { useEffect, useState } from "react";
import ExpenseHeader from "./components/ExpenseHeader";
import ExpenseFilters from "./components/ExpenseFilters";
import ExpenseSummaryCards from "./components/ExpenseSummaryCards";
import ExpenseTable from "./components/ExpenseTable";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import expenseService from "@/app/allservice/expense/expenseService";
import employeeService from "@/app/allservice/employee/employeeService";
import EditAmountModal from "./components/EditAmountModal";
import { exportExpenseExcel } from "./utils/exportExpenseExcel";
import BillPreviewModal from "./components/BillPreviewModal";
import { firestoreUserMessage, logFirestoreFailure } from "@/lib/firestoreDiagnostics";
import toast from "react-hot-toast";

export default function ExpenseApprovalPage() {

    const { company, companyEmployee, can, isOwner, roleId } = useAuth();
    const canViewEmployees = can("employee.view");
    const canEditExpense = can("expense.edit");
    const canApproveExpense = can("expense.approve");
    const canExportExpense = can("expense.export");
    const companyExpenseScope = isOwner || roleId !== "employee";

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    const today = new Date();

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

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [expenses, setExpenses] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);

    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [categories, setCategories] = useState([]);

    const [totalExpense, setTotalExpense] = useState(0);
    const [approvedExpense, setApprovedExpense] = useState(0);
    const [pendingExpense, setPendingExpense] = useState(0);
    const [totalAdvance, setTotalAdvance] = useState(0);
    const [remainingAmount, setRemainingAmount] = useState(0);

    const [editOpen, setEditOpen] = useState(false);

    const [selectedExpense, setSelectedExpense] = useState(null);

    const [updatingAmount, setUpdatingAmount] = useState(false);

    const [billOpen, setBillOpen] = useState(false);

    const [billUrl, setBillUrl] = useState("");

    useEffect(() => {

        if (!company?.id || (!companyExpenseScope && !companyEmployee?.employeeId)) return;

        loadData();

    }, [company?.id, companyEmployee?.employeeId, companyExpenseScope, canViewEmployees]);

    async function loadData() {

        try {

            setLoading(true);
            setLoadError("");

            const [

                expenseData,
                employeeData

            ] = await Promise.all([

                expenseService.getExpenses(
                    company.id,
                    companyExpenseScope ? null : companyEmployee.employeeId,
                ),

                canViewEmployees
                    ? employeeService.getEmployees(company.id)
                    : Promise.resolve(companyEmployee ? [{
                        ...companyEmployee,
                        firestoreId: companyEmployee.id,
                        fullName: companyEmployee.personalInfo?.fullName || "",
                        employeeId: companyEmployee.employeeId || companyEmployee.login?.employeeId || "",
                    }] : [])

            ]);

            setExpenses(expenseData);

            setEmployees(employeeData);

        } catch (error) {

            logFirestoreFailure({
                feature: "expenses",
                operation: "list",
                path: `Companies/${company.id}/Expenses`,
                query: companyExpenseScope ? "company" : "employeeId == currentEmployee",
                error,
            });

            setLoadError(firestoreUserMessage(error, "Unable to load expenses. Please try again."));

        }

        finally {

            setLoading(false);

        }

    }

    useEffect(() => {

        let approved = 0;
        let pending = 0;

        filteredExpenses.forEach((expense) => {

            const amount = Number(expense.amount || 0);

            if (expense.status === "approved") {
                approved += amount;
            }

            if (expense.status === "pending") {
                pending += amount;
            }

        });

        setApprovedExpense(approved);

        setPendingExpense(pending);

        setTotalExpense(approved + pending);

        setRemainingAmount(totalAdvance - approved);

    }, [filteredExpenses, totalAdvance]);

    useEffect(() => {

        let data = [...expenses];

        // Date
        data = data.filter((expense) => {

            return (
                expense.date >= fromDate &&
                expense.date <= toDate
            );

        });

        // Employee
        if (employeeFilter) {

            data = data.filter(

                (expense) =>
                    expense.employeeId === employeeFilter

            );

        }

        // Project
        if (projectFilter) {

            data = data.filter(

                (expense) =>
                    expense.projectName === projectFilter

            );

        }

        // Category
        if (categoryFilter) {

            data = data.filter(

                (expense) =>
                    expense.category === categoryFilter

            );

        }

        setFilteredExpenses(data);

    }, [

        expenses,

        fromDate,
        toDate,

        employeeFilter,

        projectFilter,

        categoryFilter,

    ]);

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

    async function updateExpenseAmount(amount) {
        if (!company?.id || !selectedExpense?.id) {
            alert("Expense information is unavailable.");
            return;
        }

        try {
            setUpdatingAmount(true);

            if (process.env.NODE_ENV === "development") {
                console.info(`[ManagerExpenseWeb] submitting oldAmount=${Number(selectedExpense.amount || 0)} newAmount=${Number(amount)}`);
            }

            await expenseService.updateAmount(
                selectedExpense.id,
                amount,
            );

            setEditOpen(false);
            setSelectedExpense(null);

            await loadData();
            toast.success("Expense updated successfully.");
        } catch (error) {
            console.error("Failed to update expense amount", { message: error?.message });
            toast.error(error?.message || "Unable to update expense. Please try again.");
        } finally {
            setUpdatingAmount(false);
        }
    }

    async function handleApprove(expense) {
        try {

            await expenseService.approveExpense(expense.id);

            await loadData();

        } catch (error) {

            console.error(error);

            alert("Failed to approve expense.");

        }
    }

    async function handleReject(expense) {
        try {

            await expenseService.rejectExpense(expense.id);

            await loadData();

        } catch (error) {

            console.error(error);

            alert("Failed to reject expense.");

        }
    }

    function handleExport() {

        exportExpenseExcel(
            filteredExpenses,
            fromDate,
            toDate
        );

    }

    return (
        <div className="min-h-screen  px-6">

            {loadError && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {loadError}
                </div>
            )}

            <ExpenseHeader
                loading={loading}
                onRefresh={loadData}
            />

            <ExpenseFilters
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

                employees={employees}
                projects={projects}
                categories={categories}

                onExport={canExportExpense ? handleExport : null}
            />

            <ExpenseSummaryCards
                totalExpense={totalExpense}
                approvedExpense={approvedExpense}
                pendingExpense={pendingExpense}
                totalAdvance={totalAdvance}
                remainingAmount={remainingAmount}
            />

            <ExpenseTable
                expenses={filteredExpenses}
                onEdit={canEditExpense ? handleEdit : null}
                onApprove={canApproveExpense ? handleApprove : null}
                onReject={canApproveExpense ? handleReject : null}
                onViewBill={handleViewBill}
            />

            <EditAmountModal

                open={editOpen}

                expense={selectedExpense}

                loading={updatingAmount}

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
