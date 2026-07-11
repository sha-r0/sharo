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

export default function ExpenseApprovalPage() {

    const { company } = useAuth();

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

        if (!company) return;

        loadData();

    }, [company]);

    async function loadData() {

        const [
            expenseData,
            employeeData
        ] = await Promise.all([
            expenseService.getExpenses(company.id),
            employeeService.getEmployees(company.id)
        ]);

        console.log("Expenses", expenseData);
        console.log("Employees", employeeData);

        setExpenses(expenseData);
        setEmployees(employeeData);

        try {

            setLoading(true);

            const [

                expenseData,
                employeeData

            ] = await Promise.all([

                expenseService.getExpenses(company.id),

                employeeService.getEmployees(company.id)

            ]);

            setExpenses(expenseData);

            setEmployees(employeeData);

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

        setSelectedExpense(expense);

        setEditOpen(true);

    }

    function handleViewBill(expense) {

        setBillUrl(expense.billUrl);

        setBillOpen(true);

    }

    async function updateExpenseAmount(amount) {

        try {

            setUpdatingAmount(true);

            await expenseService.updateAmount(

                company.id,

                selectedExpense,

                amount

            );

            setEditOpen(false);

            setSelectedExpense(null);

            await loadData();

        }

        catch (error) {

            console.error(error);

            alert("Failed to update amount.");

        }

        finally {

            setUpdatingAmount(false);

        }

    }

    async function handleApprove(expense) {
        try {

            await expenseService.approveExpense(
                company.id,
                expense
            );

            await loadData();

        } catch (error) {

            console.error(error);

            alert("Failed to approve expense.");

        }
    }

    async function handleReject(expense) {
        try {

            await expenseService.rejectExpense(
                company.id,
                expense
            );

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

                onExport={handleExport}
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
                onEdit={handleEdit}
                onApprove={handleApprove}
                onReject={handleReject}
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