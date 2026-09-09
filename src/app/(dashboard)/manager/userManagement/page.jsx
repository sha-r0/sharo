"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import employeeService from "@/app/allservice/employee/employeeService";

import EmployeeStats from "./components/EmployeeStats";
import EmployeeToolbar from "./components/EmployeeToolbar";
import EmployeeList from "./components/EmployeeList";
import RoleManagement from "./components/RoleManagement";

export default function EmployeePage() {

    const router = useRouter();

    const { company } = useAuth();

    const [loading, setLoading] = useState(true);

    const [employees, setEmployees] = useState([]);

    const [search, setSearch] = useState("");

    const [role, setRole] = useState("All");

    const [status, setStatus] = useState("All");

    const [view, setView] = useState("employees");

    useEffect(() => {

        if (!company?.id) return;

        loadEmployees();

    }, [company?.id]);

    async function loadEmployees() {

        try {

            setLoading(true);

            const data = await employeeService.getEmployees(

                company.id

            );

            setEmployees(data);

        } catch (error) {

            console.error("[EmployeeDirectory] Unable to load employees", {
                operation: "getDocs",
                path: `Companies/${company.id}/Usermanagement`,
                code: error?.code || "unknown",
            });

            toast.error("Unable to load employees.");

        }

        finally {

            setLoading(false);

        }

    }

    const roles = useMemo(() => {

        return [

            ...new Set(

                employees.map(

                    (e) => e.role

                )

            ),

        ];

    }, [employees]);

    const filteredEmployees = useMemo(() => {

        return employees.filter((employee) => {

            const keyword = search.toLowerCase();

            const matchesSearch =

                employee.fullName

                    ?.toLowerCase()

                    .includes(keyword)

                ||

                employee.employeeId

                    ?.toLowerCase()

                    .includes(keyword)

                ||

                employee.email

                    ?.toLowerCase()

                    .includes(keyword)

                ||

                employee.phone

                    ?.includes(keyword);

            const matchesRole =

                role === "All"

                ||

                employee.role === role;

            const matchesStatus =

                status === "All"

                ||

                employee.status === status;

            return (

                matchesSearch &&

                matchesRole &&

                matchesStatus

            );

        }).sort((a, b) => {

            const aEmployeeId = String(a.employeeId ?? "").trim();

            const bEmployeeId = String(b.employeeId ?? "").trim();

            const aIsValid = /^\d+$/.test(aEmployeeId);

            const bIsValid = /^\d+$/.test(bEmployeeId);

            if (!aIsValid && !bIsValid) return 0;

            if (!aIsValid) return 1;

            if (!bIsValid) return -1;

            return Number(aEmployeeId) - Number(bEmployeeId);

        });

    }, [

        employees,

        search,

        role,

        status,

    ]);

    return (

        <div className="space-y-6">

            {/* Header */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                <h1 className="text-3xl font-bold">

                    Employees

                </h1>

                <p className="text-slate-500 mt-1">

                    Manage your company's workforce

                </p>

                <div className="flex gap-2 rounded-2xl bg-white p-1.5"><button onClick={() => setView("employees")} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === "employees" ? "bg-blue-600 text-white" : "text-slate-500"}`}>Employees</button><button onClick={() => setView("roles")} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === "roles" ? "bg-blue-600 text-white" : "text-slate-500"}`}>Roles & Permissions</button></div>
            </div>

            {view === "roles" ? <RoleManagement /> : <>

            {/* Stats */}

            <EmployeeStats

                employees={employees}

            />

            {/* Toolbar */}

            <EmployeeToolbar

                search={search}
                setSearch={setSearch}

                role={role}
                setRole={setRole}

                status={status}
                setStatus={setStatus}

                roles={roles}

            />

            {/* Employee List */}

            <EmployeeList

                loading={loading}

                employees={filteredEmployees}

            />

            </>}

        </div>

    );

}
