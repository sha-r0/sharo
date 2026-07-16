"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/(auth)/context/AuthContext";

import GPSReportService from "./gpsapprovalservice/GPSReportService";

import GPSHeader from "./components/GPSHeader";
import GPSFilters from "./components/GPSFilters";
import GPSSummaryCards from "./components/GPSSummaryCards";
import GPSTable from "./components/GPSTable";

export default function GPSReportPage() {

    const { company } = useAuth();

    const COMPANY_ID = company?.id;

    const [loading, setLoading] = useState(true);

    const [employees, setEmployees] = useState([]);

    const [rows, setRows] = useState([]);

    const [summary, setSummary] = useState({});

    const [error, setError] = useState("");

    const currentMonth =
        new Date().toISOString().slice(0, 7);

    const [filters, setFilters] = useState({

        employee: "",

        month: currentMonth,

        gpsStatus: "all",

    });

    ////////////////////////////////////////

    async function loadData(nextFilters = filters) {

        if (!COMPANY_ID) return;

        try {

            setLoading(true);
            setError("");

            const result =
                await GPSReportService.getReport({

                    companyId: COMPANY_ID,

                    filters: nextFilters,

                });

            setEmployees(result.employees);

            setRows(result.rows);

            setSummary(result.summary);

        }

        catch (e) {

            console.error(e);
            setError(e?.message || "Unable to load the GPS report.");

        }

        finally {

            setLoading(false);

        }

    }

    async function exportReport() {
        if (!rows.length) return;

        const XLSX = await import("xlsx");
        const sheet = XLSX.utils.json_to_sheet(
            GPSReportService.toExportRows(rows)
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "GPS Report");
        XLSX.writeFile(workbook, `gps-report-${filters.month || "all"}.xlsx`);
    }

    ////////////////////////////////////////

    useEffect(() => {

        loadData();

    }, [COMPANY_ID]);

    ////////////////////////////////////////

    return (

        <div className="space-y-6">

            <GPSHeader

                onRefresh={loadData}

                onExport={exportReport}

                loading={loading}

            />

            <GPSFilters

                filters={filters}

                setFilters={setFilters}

                employees={employees}

                onApply={loadData}
                onReset={loadData}

            />

            {error && (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            <GPSSummaryCards

                summary={summary}

            />

            <GPSTable

                rows={rows}

                loading={loading}

            />

        </div>

    );

}
