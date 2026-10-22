"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

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

    const [loading, setLoading] =
        useState(true);

    const [loaded, setLoaded] =
        useState(false);

    const [error, setError] =
        useState("");

    const loadRequest =
        useRef(0);

    //////////////////////////////////////////////////////
    // Dashboard Data
    //////////////////////////////////////////////////////

    const [
        dashboard,
        setDashboard,
    ] =
        useState({
            quotations: [],

            summary: {
                total: 0,
                draft: 0,
                sent: 0,
                approved: 0,
                rejected: 0,
            },

            total: 0,
            totalPages: 1,

            startCursor: null,
            endCursor: null,
        });

    //////////////////////////////////////////////////////
    // Filters
    //////////////////////////////////////////////////////

    const [
        search,
        setSearch,
    ] =
        useState("");

    const [
        debouncedSearch,
        setDebouncedSearch,
    ] =
        useState("");

    const [
        status,
        setStatus,
    ] =
        useState("All");

    const [
        page,
        setPage,
    ] =
        useState(1);

    const [
        pageSize,
        setPageSize,
    ] =
        useState(10);

    const [
        viewMode,
        setViewMode,
    ] =
        useState("all");

    const [
        month,
        setMonth,
    ] =
        useState(
            `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, "0")}`
        );

    //////////////////////////////////////////////////////
    // Cursor Pagination
    //////////////////////////////////////////////////////

    const [
        pagination,
        setPagination,
    ] =
        useState({
            cursor: "",
            direction: "",
        });

    function resetCursor() {
        setPagination({
            cursor: "",
            direction: "",
        });
    }

    //////////////////////////////////////////////////////
    // Search Debounce
    //////////////////////////////////////////////////////

    useEffect(() => {

        const timer =
            setTimeout(() => {

                /*
                 * Reset pagination only after the
                 * user stops typing.
                 *
                 * This avoids one API request for
                 * every search character.
                 */
                resetCursor();

                setPage(1);

                setDebouncedSearch(
                    search.trim()
                );

            }, 350);

        return () =>
            clearTimeout(timer);

    }, [search]);

    //////////////////////////////////////////////////////
    // Load Dashboard
    //////////////////////////////////////////////////////

    useEffect(() => {

        if (!company?.id) {
            return;
        }

        loadDashboard();

    }, [
        company?.id,
        viewMode,
        month,
        debouncedSearch,
        status,
        page,
        pageSize,
        pagination.cursor,
        pagination.direction,
    ]);

    async function loadDashboard() {

        const request =
            ++loadRequest.current;

        try {

            setLoading(true);
            setError("");

            const data =
                await QuotationService.getDashboard(
                    company.id,
                    {
                        viewMode,

                        month,

                        search:
                            debouncedSearch,

                        status,

                        page,

                        pageSize,

                        cursor:
                            pagination.cursor,

                        direction:
                            pagination.direction,
                    }
                );

            if (
                request !==
                loadRequest.current
            ) {
                return;
            }

            setDashboard({
                ...data,

                quotations:
                    Array.isArray(
                        data.quotations
                    )
                        ? data.quotations
                        : [],

                summary:
                    data.summary || {
                        total: 0,
                        draft: 0,
                        sent: 0,
                        approved: 0,
                        rejected: 0,
                    },

                startCursor:
                    data.startCursor ||
                    null,

                endCursor:
                    data.endCursor ||
                    null,
            });

            setLoaded(true);

        } catch (loadError) {

            console.error(
                loadError
            );

            if (
                request ===
                loadRequest.current
            ) {
                setError(
                    loadError.message ||
                    "Unable to load quotations."
                );
            }

        } finally {

            if (
                request ===
                loadRequest.current
            ) {
                setLoading(false);
            }
        }
    }

    //////////////////////////////////////////////////////
    // Pagination
    //////////////////////////////////////////////////////

    function handlePageChange(
        requestedPage
    ) {

        const totalPages =
            dashboard.totalPages ||
            1;

        const targetPage =
            Math.min(
                totalPages,
                Math.max(
                    1,
                    Number(
                        requestedPage ||
                        1
                    )
                )
            );

        if (
            targetPage === page
        ) {
            return;
        }

        /*
         * Cursor pagination is used only for
         * the normal All view without search.
         *
         * Search/month mode uses its existing
         * safe pagination implementation.
         */
        const canUseCursor =
            viewMode === "all" &&
            !debouncedSearch;

        /*
         * Sequential Next:
         *
         * Start immediately after the last
         * quotation on the current page.
         */
        if (
            canUseCursor &&
            targetPage ===
                page + 1 &&
            dashboard.endCursor
        ) {
            setPagination({
                cursor:
                    dashboard.endCursor,

                direction:
                    "next",
            });

            setPage(
                targetPage
            );

            return;
        }

        /*
         * Sequential Previous:
         *
         * Fetch the page immediately before
         * the first quotation currently shown.
         */
        if (
            canUseCursor &&
            targetPage ===
                page - 1 &&
            dashboard.startCursor
        ) {
            setPagination({
                cursor:
                    dashboard.startCursor,

                direction:
                    "previous",
            });

            setPage(
                targetPage
            );

            return;
        }

        /*
         * Direct numbered jump:
         *
         * Example:
         * Page 1 → Page 8
         *
         * Keep existing page-number fallback.
         */
        resetCursor();

        setPage(
            targetPage
        );
    }

    function handlePageSizeChange(
        value
    ) {
        resetCursor();

        setPageSize(
            value
        );

        setPage(1);
    }

    //////////////////////////////////////////////////////
    // Filter Handlers
    //////////////////////////////////////////////////////

    function handleStatusChange(
        value
    ) {
        resetCursor();
        setPage(1);
        setStatus(value);
    }

    function handleViewModeChange(
        value
    ) {
        resetCursor();
        setPage(1);
        setViewMode(value);
    }

    function handleMonthChange(
        value
    ) {
        resetCursor();
        setPage(1);
        setMonth(value);
    }

    //////////////////////////////////////////////////////
    // Delete Quotation
    //////////////////////////////////////////////////////

    async function deleteQuotation(
        row
    ) {

        if (
            !confirm(
                `Delete quotation ${row.quotationNumber}? This cannot be undone.`
            )
        ) {
            return;
        }

        try {

            const result =
                await QuotationService.deleteQuotation(
                    company.id,
                    row.id
                );

            const deleted =
                result
                    ?.deletedQuotation;

            setDashboard(
                (current) => {

                    const nextQuotations =
                        current
                            .quotations
                            .filter(
                                (
                                    item
                                ) =>
                                    item.id !==
                                    row.id
                            );

                    const deletedStatus =
                        String(
                            deleted
                                ?.status ||
                            row.status ||
                            ""
                        )
                            .trim()
                            .toLowerCase();

                    const nextSummary = {
                        ...current.summary,

                        total:
                            Math.max(
                                0,

                                Number(
                                    current
                                        .summary
                                        ?.total ||
                                    0
                                ) - 1
                            ),
                    };

                    if (
                        [
                            "draft",
                            "sent",
                            "approved",
                            "rejected",
                        ].includes(
                            deletedStatus
                        )
                    ) {
                        nextSummary[
                            deletedStatus
                        ] =
                            Math.max(
                                0,

                                Number(
                                    current
                                        .summary?.[
                                            deletedStatus
                                        ] ||
                                    0
                                ) - 1
                            );
                    }

                    const nextTotal =
                        Math.max(
                            0,

                            Number(
                                current.total ||
                                0
                            ) - 1
                        );

                    const nextTotalPages =
                        Math.max(
                            1,

                            Math.ceil(
                                nextTotal /
                                Number(
                                    current.pageSize ||
                                    pageSize ||
                                    10
                                )
                            )
                        );

                    return {
                        ...current,

                        quotations:
                            nextQuotations,

                        summary:
                            nextSummary,

                        total:
                            nextTotal,

                        totalPages:
                            nextTotalPages,
                    };
                }
            );

            /*
             * If the last row of page 2+
             * was deleted, move to the
             * previous page.
             */
            if (
                dashboard
                    .quotations
                    .length === 1 &&
                page > 1
            ) {
                resetCursor();

                setPage(
                    (current) =>
                        Math.max(
                            1,
                            current - 1
                        )
                );
            }

        } catch (
            deleteError
        ) {

            console.error(
                "Unable to delete quotation",
                deleteError
            );

            alert(
                deleteError.message ||
                "Unable to delete quotation."
            );
        }
    }

    //////////////////////////////////////////////////////
    // Derived Data
    //////////////////////////////////////////////////////

    const paginatedQuotations =
        dashboard.quotations ||
        [];

    const totalPages =
        dashboard.totalPages ||
        1;

    /*
     * Protect against a page becoming invalid
     * after deleting/filtering records.
     */
    useEffect(() => {

        if (
            page >
            totalPages
        ) {
            resetCursor();

            setPage(
                totalPages
            );
        }

    }, [
        page,
        totalPages,
    ]);

    //////////////////////////////////////////////////////
    // Initial Loading
    //////////////////////////////////////////////////////

    if (
        loading &&
        !loaded
    ) {
        return (
            <div className="flex h-[70vh] items-center justify-center">

                <div className="text-center">

                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />

                    <p className="mt-4 text-slate-500">
                        Loading Dashboard...
                    </p>

                </div>

            </div>
        );
    }

    //////////////////////////////////////////////////////
    // UI
    //////////////////////////////////////////////////////

    return (

        <div className="space-y-8">

            <DashboardHeader

                onNew={() =>
                    router.push(
                        "/manager/quotation-builder/new"
                    )
                }

                onEditTemplate={() =>
                    router.push(
                        "/manager/quotation-builder/setup?mode=edit"
                    )
                }

            />

            <DashboardFilters

                search={
                    search
                }

                setSearch={
                    setSearch
                }

                viewMode={
                    viewMode
                }

                setViewMode={
                    handleViewModeChange
                }

                month={
                    month
                }

                setMonth={
                    handleMonthChange
                }

                status={
                    status
                }

                setStatus={
                    handleStatusChange
                }

            />

            <SummaryCards
                summary={
                    dashboard.summary
                }
            />

            {error && (
                <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            {loading && (
                <p
                    role="status"
                    className="text-sm text-slate-500"
                >
                    Updating quotations…
                </p>
            )}

            <RecentQuotationTable

                quotations={
                    paginatedQuotations
                }

                totalQuotations={
                    dashboard.total ||
                    0
                }

                page={
                    page
                }

                pageSize={
                    pageSize
                }

                onPageChange={
                    handlePageChange
                }

                onPageSizeChange={
                    handlePageSizeChange
                }

                onView={
                    (row) =>
                        router.push(
                            `/manager/quotation-builder/new?id=${row.id}&mode=view`
                        )
                }

                onEdit={
                    (row) =>
                        router.push(
                            `/manager/quotation-builder/new?id=${row.id}`
                        )
                }

                onDownload={
                    (row) =>
                        router.push(
                            `/manager/quotation-builder/new?id=${row.id}&mode=view&download=1`
                        )
                }

                onDelete={
                    deleteQuotation
                }

                emptyMessage={
                    viewMode ===
                    "month"
                        ? `No quotations found for ${new Date(
                            `${month}-01T00:00:00`
                        ).toLocaleDateString(
                            "en-IN",
                            {
                                month:
                                    "long",
                                year:
                                    "numeric",
                            }
                        )}.`
                        : "No quotations yet."
                }

            />

        </div>
    );
}