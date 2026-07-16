"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import AttendanceHeader from "./components/AttendanceHeader";
import AttendanceFilters from "./components/AttendanceFilters";
import EmployeeSelector from "./components/EmployeeSelector";
import AttendanceTable from "./components/AttendanceTable";
import AttendanceService from "./services/AttendanceService";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import AttendanceCorrection from "./components/AttendanceCorrection";


export default function AttendancePage() {

    const { company, loading: authLoading } = useAuth();

    const COMPANY_ID = company?.id;

    //////////////////////////////////////////////////////

    const [loading, setLoading] =
        useState(true);
    const [exporting, setExporting] = useState(false);

    const [employees, setEmployees] =
        useState([]);

    const [holidays, setHolidays] =
        useState([]);

    const [report, setReport] =
        useState([]);

    const [days, setDays] =
        useState([]);

    const [selectedEmployees, setSelectedEmployees] =
        useState([]);

    //////////////////////////////////////////////////////

    const today = new Date();

    const firstDay = new Date(

        today.getFullYear(),

        today.getMonth(),

        1

    );

    const lastDay = new Date(

        today.getFullYear(),

        today.getMonth() + 1,

        0

    );

    //////////////////////////////////////////////////////

    const [filters, setFilters] =
        useState({

            fromDate:
                firstDay
                    .toISOString()
                    .split("T")[0],

            toDate:
                lastDay
                    .toISOString()
                    .split("T")[0],

            search: "",

            department: "",

            shift: "",

            view: "summary",

        });

    //////////////////////////////////////////////////////

    async function loadInitialData() {

        console.log("loadInitialData() started");

        try {

            setLoading(true);

            const {

                employees: employeeList,

                holidays: holidayList,

            } = await AttendanceService.getAll(
                COMPANY_ID
            );

            console.log("Company Object:", company);
            console.log("Company ID:", company.id);
            console.log("Employee List:", employeeList);
            console.log("Holiday List:", holidayList);

            setEmployees(employeeList);

            setHolidays(holidayList);

        } catch (e) {

            console.error(e);

            alert(e.message);

        } finally {

            setLoading(false);

        }

    }

    //////////////////////////////////////////////////////

    useEffect(() => {

        if (!COMPANY_ID) return;

        loadInitialData();

    }, [COMPANY_ID]);

    //////////////////////////////////////////////////////

    const filteredEmployees =
        useMemo(() => {

            console.log("Employees from Firestore:", employees);
            return employees.filter(

                (emp) => {

                    if (

                        filters.search &&

                        !emp.name

                            .toLowerCase()

                            .includes(

                                filters.search.toLowerCase()

                            )

                    )

                        return false;

                    if (

                        filters.department &&

                        emp.department !==

                        filters.department

                    )

                        return false;

                    if (

                        filters.shift &&

                        emp.shift !==

                        filters.shift

                    )

                        return false;

                    return true;

                }

            );

        }, [

            employees,

            filters,

        ]);

    //////////////////////////////////////////////////////
    useEffect(() => {

        if (!COMPANY_ID) return;

        if (employees.length === 0) {

            setReport([]);
            setDays([]);
            return;


        }

        async function generate() {

            try {

                setLoading(true);

                const result =
                    await AttendanceService.generateAttendanceReport({

                        companyId: COMPANY_ID,

                        employees: filteredEmployees,

                        holidays,

                        fromDate: filters.fromDate,

                        toDate: filters.toDate,

                        selectedEmployees,

                    });

                setReport(result.report);

                setDays(result.days);

            } catch (e) {

                console.error(e);

            } finally {

                setLoading(false);

            }

        }

        generate();

    }, [

        company,

        employees,

        holidays,

        filteredEmployees,

        selectedEmployees,

        filters.fromDate,

        filters.toDate,

    ]);

    //////////////////////////////////////////////////////

    const departments = useMemo(() => {

        return [

            ...new Set(

                employees

                    .map((e) => e.department)

                    .filter(Boolean)

            ),

        ].sort();

    }, [employees]);

    //////////////////////////////////////////////////////

    const shifts = useMemo(() => {

        return [

            ...new Set(

                employees

                    .map((e) => e.shift)

                    .filter(Boolean)

            ),

        ].sort();

    }, [employees]);

    //////////////////////////////////////////////////////

    async function refreshAttendance() {

        try {

            const result =
                await AttendanceService.generateAttendanceReport({

                    companyId: COMPANY_ID,

                    employees: filteredEmployees,

                    holidays,

                    fromDate: filters.fromDate,

                    toDate: filters.toDate,

                    selectedEmployees,

                });

            setReport(result.report);

            setDays(result.days);

        } catch (e) {

            console.error(e);

        }

    }

    //////////////////////////////////////////////////////

    function handleExport() {

        if (report.length === 0) {

            alert("No attendance data found.");

            return;

        }

        const data =
            AttendanceService.prepareExcelData(
                report,
                days
            );

        const workbook =
            XLSX.utils.book_new();

        const worksheet =
            XLSX.utils.json_to_sheet(data);

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Attendance"
        );

        XLSX.writeFile(
            workbook,
            `Attendance_Report_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );

    }

    if (authLoading || !COMPANY_ID) {

        return (

            <div className="flex h-[70vh] items-center justify-center">

                Loading Attendance...

            </div>

        );

    }

    return (

        <div className="space-y-6">

            {/* Header */}

            <AttendanceHeader
                onExport={handleExport}

                loading={exporting}
            />

            {/* Filters */}

            <AttendanceFilters

                filters={filters}

                setFilters={setFilters}

                departments={departments}

                shifts={shifts}

            />

            {/* Employee Selector */}

            <EmployeeSelector

                employees={filteredEmployees}

                selectedEmployees={selectedEmployees}

                setSelectedEmployees={setSelectedEmployees}

            />

            {/* Attendance Table */}

            <AttendanceTable

                days={days}

                report={report}

                view={filters.view}

            />

            <AttendanceCorrection

                companyId={COMPANY_ID}

                employees={filteredEmployees}

                onSaved={refreshAttendance}

            />

        </div>

    );

}