"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    BanknoteArrowDown,
    Building2,
    CheckCircle2,
    Download,
    Plus,
    RefreshCw,
    Search,
    UserRound,
    WalletCards,
    X,
} from "lucide-react";

import toast from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import {
    StatCard,
    neo,
} from "../dashboard/DashboardWidgets";

import AddAdvanceModal from "./components/AddAdvanceModal";
import AdvanceService from "./services/AdvanceService";

const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

const asDate = (value) => {
    if (!value) return null;

    if (typeof value?.toDate === "function") {
        return value.toDate();
    }

    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime())
        ? null
        : parsedDate;
};

const date = (value) =>
    asDate(value)?.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }) || "—";

const lower = (value) =>
    String(value || "").toLowerCase();

export default function AdvancePage() {
    const {
        company,
        currentUser,
    } = useAuth();

    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modal, setModal] = useState(null);

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [type, setType] = useState("all");

    const [
        statusDialog,
        setStatusDialog,
    ] = useState(null);

    const [
        statusRemarks,
        setStatusRemarks,
    ] = useState("");

    const [
        updatingStatus,
        setUpdatingStatus,
    ] = useState(false);

    useEffect(() => {
        if (!company?.id) return;

        AdvanceService.getReferenceData(
            company.id
        )
            .then(
                ({
                    employees: people,
                    projects: work,
                }) => {
                    setEmployees(people);
                    setProjects(work);
                }
            )
            .catch(() => {
                setError(
                    "Unable to load employees and projects."
                );
            });

        const unsubscribe =
            AdvanceService.subscribe(
                company.id,
                (items) => {
                    setRecords(items);
                    setLoading(false);
                    setError("");
                },
                () => {
                    setError(
                        "Unable to load advance requests."
                    );

                    setLoading(false);
                }
            );

        return unsubscribe;
    }, [company?.id]);

    const filtered = useMemo(() => {
        return records.filter((item) => {
            const text =
                search.trim().toLowerCase();

            const searchableText = `
                ${item.employeeName || ""}
                ${item.employeeId || ""}
                ${item.projectName || ""}
                ${item.reason || ""}
                ${item.purpose || ""}
            `.toLowerCase();

            const matchesSearch =
                !text ||
                searchableText.includes(text);

            const matchesStatus =
                status === "all" ||
                lower(item.status) === status;

            const matchesType =
                type === "all" ||
                lower(item.advanceType) === type;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesType
            );
        });
    }, [
        records,
        search,
        status,
        type,
    ]);

    const summary = useMemo(() => {
        const total = records.reduce(
            (sum, item) =>
                sum +
                Number(item.amount || 0),
            0
        );

        const pending = records.filter(
            (item) =>
                lower(item.status) ===
                "pending"
        ).length;

        const personal = records
            .filter(
                (item) =>
                    lower(
                        item.advanceType
                    ) === "personal"
            )
            .reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.remainingAmount ??
                            item.amount ??
                            0
                    ),
                0
            );

        const companyAdvance = records
            .filter(
                (item) =>
                    lower(
                        item.advanceType
                    ) === "company"
            )
            .reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.remainingAmount ??
                            item.amount ??
                            0
                    ),
                0
            );

        const settled = records.filter(
            (item) =>
                lower(item.status) ===
                "settled"
        ).length;

        return {
            total,
            pending,
            personal,
            company: companyAdvance,
            settled,
        };
    }, [records]);

    function openStatusDialog(
        item,
        nextStatus
    ) {
        setStatusDialog({
            item,
            nextStatus,
        });

        setStatusRemarks("");
    }

    function closeStatusDialog() {
        if (updatingStatus) return;

        setStatusDialog(null);
        setStatusRemarks("");
    }

    async function confirmStatusChange() {
        if (
            !statusDialog?.item ||
            !statusDialog?.nextStatus
        ) {
            return;
        }

        try {
            setUpdatingStatus(true);

            await AdvanceService.setStatus(
                company.id,
                statusDialog.item,
                statusDialog.nextStatus,
                statusRemarks.trim(),
                currentUser
            );

            toast.success(
                `Advance ${statusDialog.nextStatus.toLowerCase()}.`
            );

            setStatusDialog(null);
            setStatusRemarks("");
        } catch (statusError) {
            console.error(statusError);

            toast.error(
                "Unable to update request."
            );
        } finally {
            setUpdatingStatus(false);
        }
    }

    async function settle(item) {
        const value = prompt(
            `Settlement amount (remaining ${money(
                item.remainingAmount ??
                    item.amount
            )}):`
        );

        if (
            !value ||
            Number(value) <= 0
        ) {
            return;
        }

        try {
            await AdvanceService.recordSettlement(
                company.id,
                item,
                Number(value)
            );

            toast.success(
                "Settlement recorded."
            );
        } catch {
            toast.error(
                "Unable to record settlement."
            );
        }
    }

    async function remove(item) {
        const confirmed = confirm(
            `Delete ${item.employeeName}'s advance?`
        );

        if (!confirmed) return;

        try {
            await AdvanceService.delete(
                company.id,
                item.id
            );

            toast.success(
                "Advance deleted."
            );
        } catch {
            toast.error(
                "Unable to delete advance."
            );
        }
    }

    async function exportExcel() {
        const XLSX = await import("xlsx");

        const rows = filtered.map(
            (item) => ({
                Request_ID:
                    item.requestId ||
                    item.id,

                Employee:
                    item.employeeName,

                Employee_ID:
                    item.employeeId,

                Type:
                    item.advanceType,

                Amount:
                    item.amount,

                Monthly_Deduction:
                    item.monthlyDeduction,

                Remaining:
                    item.remainingAmount,

                Settled:
                    item.settledAmount,

                Project:
                    item.projectName,

                Status:
                    item.status,

                Requested:
                    date(
                        item.requestedAt ||
                            item.createdAt
                    ),
            })
        );

        const sheet =
            XLSX.utils.json_to_sheet(rows);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            sheet,
            "Advance Requests"
        );

        XLSX.writeFile(
            workbook,
            `advance-requests-${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );
    }

    function getStatusClass(itemStatus) {
        const normalizedStatus =
            lower(itemStatus);

        if (
            normalizedStatus ===
            "approved"
        ) {
            return "bg-green-50 text-green-700";
        }

        if (
            normalizedStatus ===
            "rejected"
        ) {
            return "bg-red-50 text-red-700";
        }

        if (
            normalizedStatus ===
            "settled"
        ) {
            return "bg-blue-50 text-blue-700";
        }

        return "bg-amber-50 text-amber-700";
    }

    return (
        <div className="space-y-6 px-2 py-2 sm:px-5">
            <header
                className={`${neo} flex flex-col gap-5 rounded-3xl bg-white p-5 lg:flex-row lg:items-center lg:justify-between`}
            >
                <div className="flex items-center gap-4">
                    <span className="grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                        <BanknoteArrowDown />
                    </span>

                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
                            Advance Management
                        </h1>

                        <p className="text-sm text-slate-500">
                            Personal salary advances and company work funds
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={exportExcel}
                        disabled={
                            !filtered.length
                        }
                        className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-40"
                    >
                        <Download size={17} />
                        Export
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            window.location.reload()
                        }
                        className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"
                    >
                        <RefreshCw size={17} />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setModal({})
                        }
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
                    >
                        <Plus size={17} />
                        Add Advance
                    </button>
                </div>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    title="Total Advanced"
                    value={summary.total}
                    icon={WalletCards}
                    format="currency"
                />

                <StatCard
                    title="Pending Requests"
                    value={summary.pending}
                    icon={BanknoteArrowDown}
                    tone="amber"
                />

                <StatCard
                    title="Personal Outstanding"
                    value={summary.personal}
                    icon={UserRound}
                    tone="violet"
                    format="currency"
                />

                <StatCard
                    title="Company Outstanding"
                    value={summary.company}
                    icon={Building2}
                    tone="blue"
                    format="currency"
                />

                <StatCard
                    title="Settled"
                    value={summary.settled}
                    icon={CheckCircle2}
                    tone="green"
                />
            </section>

            <section
                className={`${neo} grid gap-3 rounded-3xl p-4 sm:grid-cols-3`}
            >
                <label className="relative sm:col-span-1">
                    <Search
                        className="absolute left-3 top-3 text-slate-400"
                        size={17}
                    />

                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search employee, project, purpose..."
                        className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm"
                    />
                </label>

                <select
                    value={type}
                    onChange={(event) =>
                        setType(
                            event.target.value
                        )
                    }
                    className="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm"
                >
                    <option value="all">
                        All advance types
                    </option>

                    <option value="personal">
                        Personal
                    </option>

                    <option value="company">
                        Company work
                    </option>
                </select>

                <select
                    value={status}
                    onChange={(event) =>
                        setStatus(
                            event.target.value
                        )
                    }
                    className="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm"
                >
                    <option value="all">
                        All statuses
                    </option>

                    {[
                        "pending",
                        "approved",
                        "rejected",
                        "settled",
                    ].map((item) => (
                        <option
                            key={item}
                            value={item}
                        >
                            {item}
                        </option>
                    ))}
                </select>
            </section>

            <section
                className={`${neo} overflow-hidden rounded-3xl`}
            >
                {loading ? (
                    <div className="space-y-3 p-6">
                        {Array.from(
                            {
                                length: 5,
                            },
                            (_, index) => (
                                <div
                                    key={index}
                                    className="h-16 animate-pulse rounded-2xl bg-slate-200"
                                />
                            )
                        )}
                    </div>
                ) : !filtered.length ? (
                    <div className="py-20 text-center text-slate-500">
                        No advance requests found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px] text-sm">
                            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="p-4">
                                        Employee
                                    </th>

                                    <th>
                                        Type / Purpose
                                    </th>

                                    <th>
                                        Amount
                                    </th>

                                    <th>
                                        Repayment
                                    </th>

                                    <th>
                                        Remaining
                                    </th>

                                    <th>
                                        Requested
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th className="pr-4 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filtered.map(
                                    (item) => (
                                        <tr
                                            key={
                                                item.id
                                            }
                                            className="border-t border-slate-100 bg-white hover:bg-slate-50"
                                        >
                                            <td className="p-4">
                                                <p className="font-bold text-slate-800">
                                                    {
                                                        item.employeeName
                                                    }
                                                </p>

                                                <p className="text-xs text-slate-400">
                                                    {
                                                        item.employeeId
                                                    }{" "}
                                                    •{" "}
                                                    {item.department ||
                                                        "No department"}
                                                </p>
                                            </td>

                                            <td>
                                                <p className="font-semibold capitalize">
                                                    {item.advanceType ||
                                                        "Personal"}
                                                </p>

                                                <p className="max-w-48 truncate text-xs text-slate-400">
                                                    {item.projectName ||
                                                        item.reason ||
                                                        item.purpose ||
                                                        "—"}
                                                </p>
                                            </td>

                                            <td className="font-bold">
                                                {money(
                                                    item.amount
                                                )}
                                            </td>

                                            <td>
                                                {lower(
                                                    item.advanceType
                                                ) ===
                                                "personal" ? (
                                                    <>
                                                        <p>
                                                            {money(
                                                                item.monthlyDeduction
                                                            )}
                                                            /month
                                                        </p>

                                                        <p className="text-xs text-slate-400">
                                                            {item.months ||
                                                                0}{" "}
                                                            months
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span>
                                                        Expense settlement
                                                    </span>
                                                )}
                                            </td>

                                            <td className="font-bold text-red-600">
                                                {money(
                                                    item.remainingAmount ??
                                                        item.amount
                                                )}
                                            </td>

                                            <td>
                                                {date(
                                                    item.requestedAt ||
                                                        item.createdAt
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${getStatusClass(
                                                        item.status
                                                    )}`}
                                                >
                                                    {item.status ||
                                                        "Pending"}
                                                </span>
                                            </td>

                                            <td className="pr-4">
                                                <div className="flex justify-end gap-2">
                                                    {lower(
                                                        item.status
                                                    ) ===
                                                        "pending" && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openStatusDialog(
                                                                        item,
                                                                        "Approved"
                                                                    )
                                                                }
                                                                className="rounded-lg bg-green-50 px-3 py-2 font-bold text-green-700 transition hover:bg-green-100"
                                                            >
                                                                Approve
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openStatusDialog(
                                                                        item,
                                                                        "Rejected"
                                                                    )
                                                                }
                                                                className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700 transition hover:bg-red-100"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    {lower(
                                                        item.status
                                                    ) ===
                                                        "approved" &&
                                                        Number(
                                                            item.remainingAmount ??
                                                                item.amount
                                                        ) >
                                                            0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    settle(
                                                                        item
                                                                    )
                                                                }
                                                                className="rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-700"
                                                            >
                                                                Settle
                                                            </button>
                                                        )}

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setModal(
                                                                item
                                                            )
                                                        }
                                                        className="rounded-lg bg-slate-100 px-3 py-2 font-bold"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            remove(
                                                                item
                                                            )
                                                        }
                                                        className="rounded-lg px-3 py-2 font-bold text-red-600"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {modal && (
                <AddAdvanceModal
                    companyId={company.id}
                    employees={employees}
                    projects={projects}
                    existing={
                        modal.id
                            ? modal
                            : null
                    }
                    onClose={() =>
                        setModal(null)
                    }
                />
            )}

            {statusDialog && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeStatusDialog();
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="advance-status-dialog-title"
                        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="advance-status-dialog-title"
                                    className="text-xl font-bold text-slate-900"
                                >
                                    {statusDialog.nextStatus ===
                                    "Approved"
                                        ? "Approve Advance"
                                        : "Reject Advance"}
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Review the request before confirming.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeStatusDialog
                                }
                                disabled={
                                    updatingStatus
                                }
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                                aria-label="Close dialog"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-slate-500">
                                    Employee
                                </span>

                                <span className="text-right text-sm font-bold text-slate-800">
                                    {statusDialog
                                        .item
                                        .employeeName ||
                                        "Employee"}
                                </span>
                            </div>

                            <div className="mt-3 flex justify-between gap-4">
                                <span className="text-sm text-slate-500">
                                    Advance type
                                </span>

                                <span className="text-right text-sm font-semibold capitalize text-slate-700">
                                    {statusDialog
                                        .item
                                        .advanceType ||
                                        "Personal"}
                                </span>
                            </div>

                            <div className="mt-3 flex justify-between gap-4">
                                <span className="text-sm text-slate-500">
                                    Amount
                                </span>

                                <span className="text-right text-lg font-bold text-slate-900">
                                    {money(
                                        statusDialog
                                            .item
                                            .amount
                                    )}
                                </span>
                            </div>

                            {(statusDialog.item
                                .projectName ||
                                statusDialog.item
                                    .reason ||
                                statusDialog.item
                                    .purpose) && (
                                <div className="mt-3 border-t border-slate-200 pt-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Purpose
                                    </p>

                                    <p className="mt-1 text-sm text-slate-700">
                                        {statusDialog
                                            .item
                                            .projectName ||
                                            statusDialog
                                                .item
                                                .reason ||
                                            statusDialog
                                                .item
                                                .purpose}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-5">
                            <label className="text-sm font-bold text-slate-700">
                                Remarks

                                <span className="ml-1 font-normal text-slate-400">
                                    (optional)
                                </span>
                            </label>

                            <textarea
                                value={
                                    statusRemarks
                                }
                                onChange={(
                                    event
                                ) =>
                                    setStatusRemarks(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                rows={4}
                                maxLength={500}
                                disabled={
                                    updatingStatus
                                }
                                placeholder={
                                    statusDialog.nextStatus ===
                                    "Approved"
                                        ? "Add approval remarks..."
                                        : "Add rejection reason..."
                                }
                                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                            />

                            <p className="mt-1 text-right text-xs text-slate-400">
                                {
                                    statusRemarks.length
                                }
                                /500
                            </p>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={
                                    closeStatusDialog
                                }
                                disabled={
                                    updatingStatus
                                }
                                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={
                                    confirmStatusChange
                                }
                                disabled={
                                    updatingStatus
                                }
                                className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                    statusDialog.nextStatus ===
                                    "Approved"
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "bg-red-600 hover:bg-red-700"
                                }`}
                            >
                                {updatingStatus
                                    ? "Updating..."
                                    : statusDialog.nextStatus ===
                                        "Approved"
                                      ? "Confirm Approval"
                                      : "Confirm Rejection"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}