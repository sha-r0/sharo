"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import QuotationService from "../services/QuotationService";

import DashboardHeader from "./DashboardHeader";
import DashboardFilters from "./DashboardFilters";
import SummaryCards from "./SummaryCards";
import RecentQuotationTable from "./RecentQuotationTable";

export default function Dashboard() {

    const router = useRouter();

    const { company } = useAuth();

    const today = new Date();

    const [loading, setLoading] = useState(true);

    const [dashboard, setDashboard] = useState({

        company: null,

        settings: null,

        settingsExists: false,

        quotations: [],

        summary: {

            total: 0,

            draft: 0,

            sent: 0,

            approved: 0,

            rejected: 0,

        },

    });

    /////////////////////////////////////////////////
    // Filters
    /////////////////////////////////////////////////

    const [search, setSearch] = useState("");

    const [status, setStatus] = useState("All");

    const [month, setMonth] = useState(

        `${today.getFullYear()}-${String(

            today.getMonth() + 1

        ).padStart(2, "0")}`

    );

    /////////////////////////////////////////////////
    // Load Dashboard
    /////////////////////////////////////////////////

    useEffect(() => {

        if (!company?.id) return;

        loadDashboard();

    }, [company]);

    async function loadDashboard() {

        try {

            setLoading(true);

            const data = await QuotationService.getDashboard(

                company.id

            );

            setDashboard(data);

        }

        catch (error) {

            console.error(error);

        }

        finally {

            setLoading(false);

        }

    }

    async function deleteQuotation(row) {

        if (!confirm(`Delete quotation ${row.quotationNumber}? This cannot be undone.`)) return;

        try {

            await QuotationService.deleteQuotation(company.id, row.id);

            await loadDashboard();

        } catch (error) {

            console.error(error);

            alert("Unable to delete quotation.");

        }

    }

    /////////////////////////////////////////////////
    // Filtering
    /////////////////////////////////////////////////

    const filteredQuotations = dashboard.quotations.filter((item) => {

        ////////////////////////////////////////////
        // Search
        ////////////////////////////////////////////

        const searchText = search.toLowerCase();

        const matchSearch =

            !search ||

            item.quotationNumber

                ?.toLowerCase()

                .includes(searchText) ||

            item.clientName

                ?.toLowerCase()

                .includes(searchText);

        ////////////////////////////////////////////
        // Status
        ////////////////////////////////////////////

        const matchStatus =

            status === "All"

                ? true

                : item.status === status;

        ////////////////////////////////////////////
        // Month
        ////////////////////////////////////////////

        let matchMonth = true;

        if (item.createdAt?.toDate) {

            const d = item.createdAt.toDate();

            const value =

                `${d.getFullYear()}-${String(

                    d.getMonth() + 1

                ).padStart(2, "0")}`;

            matchMonth = value === month;

        }

        return (

            matchSearch &&

            matchStatus &&

            matchMonth

        );

    });

    /////////////////////////////////////////////////
    // Loading
    /////////////////////////////////////////////////

    if (loading) {

        return (

            <div className="flex h-[70vh] items-center justify-center">

                <div className="text-center">

                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>

                    <p className="mt-4 text-slate-500">

                        Loading Dashboard...

                    </p>

                </div>

            </div>

        );

    }

    /////////////////////////////////////////////////
    // UI
    /////////////////////////////////////////////////

    return (

        <div className="space-y-8">

            <DashboardHeader

                onNew={() =>

                    router.push(

                        "/manager/quotation-builder/new"

                    )

                }

            />

            <DashboardFilters

                search={search}

                setSearch={setSearch}

                month={month}

                setMonth={setMonth}

                status={status}

                setStatus={setStatus}

            />

            <SummaryCards

                summary={dashboard.summary}

            />

            <RecentQuotationTable

                quotations={filteredQuotations}

                onView={(row) => router.push(`/manager/quotation-builder/new?id=${row.id}&mode=view`)}

                onEdit={(row) => router.push(`/manager/quotation-builder/new?id=${row.id}`)}

                onDownload={(row) => router.push(`/manager/quotation-builder/new?id=${row.id}&mode=view&download=1`)}

                onDelete={deleteQuotation}

            />

        </div>

    );

}
