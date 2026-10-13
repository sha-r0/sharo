"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import ProjectService from "@/app/(dashboard)/manager/projects/services/projectService";

const initialForm = {
    employeeFirestoreId: "",
    projectId: "",

    siteName: "",
    siteAddress: "",

    latitude: "",
    longitude: "",
    radiusMeters: 100,

    startDate: "",
    endDate: "",

    reportingTime: "09:00",
    checkInFrom: "08:30",
    lateAfter: "09:15",
    absentAfter: "11:00",
    expectedCheckout: "18:00",

    notes: "",
};

export default function SiteAssignmentsPage() {
    const { company } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);

    const [form, setForm] = useState(initialForm);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    async function authFetch(url, options = {}) {
        const user = auth.currentUser;

        if (!user) {
            throw new Error("UNAUTHENTICATED");
        }

        const token = await user.getIdToken();

        return fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...(options.headers || {}),
            },
        });
    }

    async function loadAssignments() {
        const response = await authFetch(
            "/api/site-assignments",
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to load assignments.",
            );
        }

        setAssignments(data.assignments || []);
    }

    async function loadEmployees() {
        const companyId = company?.id;

        if (!companyId) {
            throw new Error("COMPANY_NOT_FOUND");
        }

        const response = await authFetch(
            `/api/employees/active?companyId=${encodeURIComponent(companyId)}`,
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to load employees.",
            );
        }

        setEmployees(data.employees || []);
    }

    async function loadProjects() {
        const companyId = company?.id;

        if (!companyId) {
            throw new Error("COMPANY_NOT_FOUND");
        }

        const rows =
            await ProjectService.getProjects(companyId);

        setProjects(
            Array.isArray(rows)
                ? rows
                : [],
        );
    }

    async function loadPage() {
        try {
            setLoading(true);
            setError("");

            await Promise.all([
                loadAssignments(),
                loadEmployees(),
                loadProjects(),
            ]);
        } catch (loadError) {
            console.error(loadError);

            setError(
                loadError.message ||
                "Unable to load site assignment data.",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!company?.id) return;

        loadPage();
    }, [company?.id]);

    function updateField(key, value) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const payload = {
                ...form,

                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
                radiusMeters: Number(form.radiusMeters),

                endDate:
                    form.endDate || form.startDate,
            };

            const response = await authFetch(
                "/api/site-assignments",
                {
                    method: "POST",
                    body: JSON.stringify(payload),
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to create assignment.",
                );
            }

            setSuccess(
                "Site assignment created successfully.",
            );

            setForm(initialForm);

            await loadAssignments();
        } catch (saveError) {
            console.error(saveError);

            setError(
                saveError.message ||
                "Unable to create assignment.",
            );
        } finally {
            setSaving(false);
        }
    }

    const activeCount = useMemo(
        () =>
            assignments.filter(
                (item) =>
                    String(item.status).toLowerCase() ===
                    "active",
            ).length,
        [assignments],
    );

    if (loading) {
        return (
            <div className="p-6 text-slate-600">
                Loading site assignments...
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Site Assignment
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Assign employees to field sites with
                        attendance location and timing rules.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3">
                    <div className="text-xs font-medium uppercase text-slate-500">
                        Active Assignments
                    </div>

                    <div className="mt-1 text-2xl font-bold text-slate-900">
                        {activeCount}
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {success}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h2 className="text-lg font-bold text-slate-900">
                    Create Site Assignment
                </h2>

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Employee">
                        <select
                            value={form.employeeFirestoreId}
                            onChange={(event) =>
                                updateField(
                                    "employeeFirestoreId",
                                    event.target.value,
                                )
                            }
                            required
                            className={inputClass}
                        >
                            <option value="">
                                Select employee
                            </option>

                            {employees.map((employee) => (
                                <option
                                    key={employee.employeeFirestoreId}
                                    value={employee.employeeFirestoreId}
                                >
                                    {employee.fullName}
                                    {employee.employeeId
                                        ? ` (${employee.employeeId})`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Project">
                        <select
                            value={form.projectId}
                            onChange={(event) =>
                                updateField(
                                    "projectId",
                                    event.target.value,
                                )
                            }
                            className={inputClass}
                        >
                            <option value="">
                                No project
                            </option>

                            {projects.map((project) => (
                                <option
                                    key={project.id}
                                    value={project.id}
                                >
                                    {project.projectName ||
                                        project.name ||
                                        project.title ||
                                        project.projectId}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Site Name">
                        <input
                            value={form.siteName}
                            onChange={(event) =>
                                updateField(
                                    "siteName",
                                    event.target.value,
                                )
                            }
                            required
                            placeholder="Sector 62 Noida"
                            className={inputClass}
                        />
                    </Field>

                    {/* <Field label="Site Address">
                        <input
                            value={form.siteAddress}
                            onChange={(event) =>
                                updateField(
                                    "siteAddress",
                                    event.target.value,
                                )
                            }
                            placeholder="Full site address"
                            className={inputClass}
                        />
                    </Field> */}

                    <Field label="Latitude">
                        <input
                            type="number"
                            step="any"
                            value={form.latitude}
                            onChange={(event) =>
                                updateField(
                                    "latitude",
                                    event.target.value,
                                )
                            }
                            required
                            placeholder="28.6139"
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Longitude">
                        <input
                            type="number"
                            step="any"
                            value={form.longitude}
                            onChange={(event) =>
                                updateField(
                                    "longitude",
                                    event.target.value,
                                )
                            }
                            required
                            placeholder="77.2090"
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Allowed Radius (metres)">
                        <input
                            type="number"
                            min="10"
                            max="5000"
                            value={form.radiusMeters}
                            onChange={(event) =>
                                updateField(
                                    "radiusMeters",
                                    event.target.value,
                                )
                            }
                            required
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Start Date">
                        <input
                            type="date"
                            value={form.startDate}
                            onChange={(event) =>
                                updateField(
                                    "startDate",
                                    event.target.value,
                                )
                            }
                            required
                            className={inputClass}
                        />
                    </Field>

                    <Field label="End Date">
                        <input
                            type="date"
                            value={form.endDate}
                            onChange={(event) =>
                                updateField(
                                    "endDate",
                                    event.target.value,
                                )
                            }
                            min={form.startDate || undefined}
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Reporting Time">
                        <input
                            type="time"
                            value={form.reportingTime}
                            onChange={(event) =>
                                updateField(
                                    "reportingTime",
                                    event.target.value,
                                )
                            }
                            required
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Check-in From">
                        <input
                            type="time"
                            value={form.checkInFrom}
                            onChange={(event) =>
                                updateField(
                                    "checkInFrom",
                                    event.target.value,
                                )
                            }
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Late After">
                        <input
                            type="time"
                            value={form.lateAfter}
                            onChange={(event) =>
                                updateField(
                                    "lateAfter",
                                    event.target.value,
                                )
                            }
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Absent After">
                        <input
                            type="time"
                            value={form.absentAfter}
                            onChange={(event) =>
                                updateField(
                                    "absentAfter",
                                    event.target.value,
                                )
                            }
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Expected Checkout">
                        <input
                            type="time"
                            value={form.expectedCheckout}
                            onChange={(event) =>
                                updateField(
                                    "expectedCheckout",
                                    event.target.value,
                                )
                            }
                            className={inputClass}
                        />
                    </Field>
                </div>

                <div className="mt-5">
                    <Field label="Notes / Instructions">
                        <textarea
                            value={form.notes}
                            onChange={(event) =>
                                updateField(
                                    "notes",
                                    event.target.value,
                                )
                            }
                            rows={3}
                            placeholder="Site contact, reporting instructions, work scope..."
                            className={`${inputClass} h-auto py-3`}
                        />
                    </Field>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving
                            ? "Creating..."
                            : "Assign Site"}
                    </button>
                </div>
            </form>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-5">
                    <h2 className="text-lg font-bold text-slate-900">
                        Site Assignments
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4">
                                    Employee
                                </th>

                                <th className="px-5 py-4">
                                    Site
                                </th>

                                <th className="px-5 py-4">
                                    Dates
                                </th>

                                <th className="px-5 py-4">
                                    Reporting
                                </th>

                                <th className="px-5 py-4">
                                    Radius
                                </th>

                                <th className="px-5 py-4">
                                    Status
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {assignments.map(
                                (assignment) => (
                                    <tr key={assignment.id}>
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-900">
                                                {assignment.employeeName ||
                                                    "Employee"}
                                            </div>

                                            <div className="text-xs text-slate-500">
                                                {assignment.employeeId ||
                                                    "—"}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="font-medium text-slate-800">
                                                {assignment.site?.name ||
                                                    "—"}
                                            </div>

                                            <div className="max-w-xs truncate text-xs text-slate-500">
                                                {assignment.site?.address ||
                                                    "—"}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-slate-700">
                                            {assignment.startDate}

                                            {assignment.endDate &&
                                                assignment.endDate !==
                                                assignment.startDate
                                                ? ` → ${assignment.endDate}`
                                                : ""}
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="font-medium text-slate-800">
                                                {assignment.reportingTime ||
                                                    "—"}
                                            </div>

                                            <div className="text-xs text-slate-500">
                                                Late:{" "}
                                                {assignment.lateAfter ||
                                                    "—"}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-slate-700">
                                            {assignment.site
                                                ?.radiusMeters ?? "—"}{" "}
                                            m
                                        </td>

                                        <td className="px-5 py-4">
                                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                                {assignment.status ||
                                                    "Active"}
                                            </span>
                                        </td>
                                    </tr>
                                ),
                            )}

                            {!assignments.length && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-5 py-12 text-center text-slate-500"
                                    >
                                        No site assignments yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

const inputClass =
    "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-700">
                {label}
            </span>

            {children}
        </label>
    );
}