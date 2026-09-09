"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Building2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Star,
} from "lucide-react";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import {
  EmptyState,
  MiniMetric,
  ProgressRow,
  SectionCard,
  neo,
} from "@/app/(dashboard)/manager/dashboard/DashboardWidgets";

import useVendorData from "../hooks/useVendorData";
import VendorPaymentDialog from "../components/VendorPaymentDialog";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const date = (value) =>
  value
    ? new Date(value?.toDate?.() || value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const paymentDateValue = (value) => {
  const resolved = value?.toDate?.() || value;
  const time = new Date(resolved).getTime();
  return Number.isNaN(time) ? 0 : time;
};

function resolveProjectGroup(payment, projects) {
  const explicitIds = [
    payment?.projectFirestoreId,
    payment?.projectId,
    payment?.project?.id,
    payment?.project?.projectId,
  ]
    .filter(Boolean)
    .map((item) => String(item).trim());

  if (!explicitIds.length) {
    return {
      key: "unresolved",
      projectId: "",
      projectName: "Unresolved / Unlinked Project",
      unresolved: true,
    };
  }

  const project = projects.find((item) =>
    explicitIds.some(
      (value) =>
        String(item.id) === value ||
        String(item.projectId || "") === value ||
        String(item.projectCode || "") === value,
    ),
  );

  if (!project) {
    return {
      key: "unresolved",
      projectId: "",
      projectName: "Unresolved / Unlinked Project",
      unresolved: true,
    };
  }

  return {
    key: `project:${project.id}`,
    projectId: project.projectId || project.id,
    projectName: project.projectName || payment.projectName || "Unnamed project",
    unresolved: false,
  };
}

export default function VendorProfilePage({ params }) {
  const { id } = use(params);
  const { company, can } = useAuth();
  const router = useRouter();
  const data = useVendorData(company?.id, can("projects.view"));
  const [tab, setTab] = useState("overview");
  const [payment, setPayment] = useState(false);
  const [projectFilter, setProjectFilter] = useState("all");

  useEffect(() => {
    setProjectFilter("all");
  }, [id]);

  const vendor = useMemo(
    () => data.analytics.vendors.find((item) => item.id === id),
    [data.analytics.vendors, id],
  );

  const paymentRows = useMemo(
    () =>
      [...(vendor?.payments || [])]
        .sort((left, right) => paymentDateValue(right.date || right.createdAt) - paymentDateValue(left.date || left.createdAt))
        .map((item) => ({ ...item })),
    [vendor?.payments],
  );

  const projectGroups = useMemo(() => {
    const summaryMap = new Map();

    paymentRows.forEach((paymentItem) => {
      const group = resolveProjectGroup(paymentItem, data.projects || []);
      const key = group.key;
      const current = summaryMap.get(key) || {
        key,
        projectId: group.projectId,
        projectName: group.projectName,
        unresolved: group.unresolved,
        totalPaid: 0,
        paymentCount: 0,
        lastPaymentAt: 0,
      };

      const amount = Number(paymentItem.amount || 0);
      current.totalPaid += amount;
      current.paymentCount += 1;
      current.lastPaymentAt = Math.max(
        current.lastPaymentAt,
        paymentDateValue(paymentItem.date || paymentItem.createdAt),
      );
      current.projectName = group.projectName || current.projectName;
      current.projectId = group.projectId || current.projectId;
      current.unresolved = group.unresolved;
      summaryMap.set(key, current);
    });

    return [...summaryMap.values()].sort(
      (left, right) =>
        right.totalPaid - left.totalPaid ||
        right.paymentCount - left.paymentCount ||
        left.projectName.localeCompare(right.projectName),
    );
  }, [paymentRows, data.projects]);

  const totalPaidToVendor = useMemo(
    () => projectGroups.reduce((sum, item) => sum + item.totalPaid, 0),
    [projectGroups],
  );

  const projectOptions = useMemo(
    () => projectGroups.filter((item) => !item.unresolved),
    [projectGroups],
  );

  const selectedProject = useMemo(
    () => projectGroups.find((item) => item.key === projectFilter) || null,
    [projectFilter, projectGroups],
  );

  const filteredPaymentRows = useMemo(() => {
    if (projectFilter === "all") return paymentRows;
    return paymentRows.filter((paymentItem) => {
      const group = resolveProjectGroup(paymentItem, data.projects || []);
      return group.key === projectFilter;
    });
  }, [paymentRows, projectFilter, data.projects]);

  const paymentRowsWithBalance = useMemo(() => {
    if (!filteredPaymentRows.length) return [];

    const chronological = [...filteredPaymentRows].sort(
      (left, right) =>
        paymentDateValue(left.date || left.createdAt) -
        paymentDateValue(right.date || right.createdAt),
    );

    let runningBalance = Number(vendor?.allocated || 0);
    const balanceById = new Map();

    chronological.forEach((paymentItem) => {
      runningBalance = Math.max(0, runningBalance - Number(paymentItem.amount || 0));
      balanceById.set(
        paymentItem.id,
        paymentItem.runningBalance ?? runningBalance,
      );
    });

    return filteredPaymentRows.map((paymentItem) => ({
      ...paymentItem,
      displayBalance:
        paymentItem.runningBalance ??
        balanceById.get(paymentItem.id) ??
        null,
    }));
  }, [filteredPaymentRows, vendor?.allocated]);

  if (data.loading) {
    return (
      <div className="space-y-4 p-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-3xl bg-white/70" />
        ))}
      </div>
    );
  }

  if (!vendor) return <div className="p-10">Vendor not found.</div>;

  const tabs = ["overview", "projects", "payments", "documents", "activity"];

  return (
    <div className="space-y-6 px-2 py-2 sm:px-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-bold text-blue-600"
      >
        <ArrowLeft size={17} />
        Back to vendors
      </button>

      <header className={`${neo} rounded-3xl bg-white p-6`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white">
              <Building2 />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {vendor.companyName}
              </h1>
              <p className="text-sm text-slate-500">
                {vendor.vendorId} • {vendor.category || "General"} •{" "}
                <span className="capitalize">{vendor.status}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setPayment(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Banknote size={17} />
            Create payment
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info icon={Phone} label="Phone" value={vendor.phone} />
          <Info icon={Mail} label="Email" value={vendor.email} />
          <Info
            icon={MapPin}
            label="Location"
            value={[vendor.address?.city, vendor.address?.state]
              .filter(Boolean)
              .join(", ")}
          />
          <Info icon={Star} label="Rating" value={`${vendor.rating || 0}/5`} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniMetric
          label="Total work given"
          value={vendor.allocated}
          format="currency"
        />
        <MiniMetric
          label="Amount paid"
          value={totalPaidToVendor}
          format="currency"
        />
        <MiniMetric
          label="Outstanding"
          value={vendor.outstanding}
          format="currency"
          tone="text-red-600"
        />
        <MiniMetric
          label="Performance"
          value={vendor.performance}
          format="percent"
        />
      </section>

      <nav className={`${neo} flex gap-2 overflow-x-auto rounded-2xl p-2`}>
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold capitalize ${
              tab === item ? "bg-blue-600 text-white" : "text-slate-600"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Business details">
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Contact person" value={vendor.contactPerson} />
              <Detail label="GST" value={vendor.gstNo} />
              <Detail label="PAN" value={vendor.panNo} />
              <Detail label="UPI" value={vendor.upi} />
              <Detail label="Services" value={(vendor.services || []).join(", ")} />
              <Detail
                label="Address"
                value={[
                  vendor.address?.line1,
                  vendor.address?.city,
                  vendor.address?.state,
                  vendor.address?.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            </div>
          </SectionCard>

          <SectionCard title="Payment tracker">
            <ProgressRow
              label="Paid against allocation"
              value={vendor.paymentPercent}
              detail={`${vendor.paymentPercent.toFixed(0)}%`}
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniMetric label="Pending" value={vendor.pendingPayments} format="currency" />
              <MiniMetric label="Completed" value={vendor.completedPayments} format="currency" />
            </div>
          </SectionCard>

          <SectionCard title="Bank details">
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Account name" value={vendor.bankDetails?.accountName} />
              <Detail label="Account number" value={vendor.bankDetails?.accountNumber} />
              <Detail label="Bank" value={vendor.bankDetails?.bankName} />
              <Detail label="IFSC" value={vendor.bankDetails?.ifsc} />
            </div>
          </SectionCard>

          <SectionCard title="Performance">
            <ProgressRow
              label="Vendor performance"
              value={vendor.performance}
              detail={`${vendor.performance.toFixed(0)}%`}
              color="bg-violet-500"
            />
            <p className="mt-4 text-sm text-slate-500">
              Based on rating and completed assigned work.
            </p>
          </SectionCard>
        </div>
      )}

      {tab === "projects" && (
        <SectionCard title="Projects assigned">
          {vendor.assignments.length ? (
            <div className="space-y-3">
              {vendor.assignments.map((item) => (
                <button
                  key={item.projectId}
                  onClick={() => router.push(`/manager/projects/${item.projectId}`)}
                  className="w-full rounded-2xl border bg-white p-4 text-left"
                >
                  <div className="flex justify-between">
                    <strong>{item.projectName}</strong>
                    <span>{Number(item.progress || 0)}%</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 text-xs text-slate-500">
                    <span>Allocated {money(item.allocatedAmount)}</span>
                    <span>Paid {money(item.paidAmount)}</span>
                    <span>Target {date(item.targetCompletion)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState label="No assigned projects" />
          )}
        </SectionCard>
      )}

      {tab === "payments" && (
        <div className="space-y-6">
          <SectionCard
            title="Project-Wise Payment Summary"
            subtitle={`Total paid to vendor ${money(totalPaidToVendor)}`}
          >
            {projectGroups.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-slate-400">
                      <th className="p-3">Project</th>
                      <th className="p-3 text-right">Total paid</th>
                      <th className="p-3 text-right">Payments</th>
                      <th className="p-3">Last payment date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectGroups.map((item) => (
                      <tr key={item.key} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-700">
                          {item.projectName}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          {money(item.totalPaid)}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {item.paymentCount} payment{item.paymentCount === 1 ? "" : "s"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {item.lastPaymentAt ? date(item.lastPaymentAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState label="No vendor payments found" />
            )}
          </SectionCard>

          <SectionCard
            title="Payment history"
            subtitle="Newest payment first"
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Project filter
                </p>
                <select
                  value={projectFilter}
                  onChange={(event) => setProjectFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"
                >
                  <option value="all">All Projects</option>
                  {projectOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.projectName}
                      {item.projectId ? ` • ${item.projectId}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProject && projectFilter !== "all" && (
                <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                  Paid for this project: {money(selectedProject.totalPaid)}
                </div>
              )}
            </div>

            {paymentRowsWithBalance.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-slate-400">
                      <th className="p-3">Date</th>
                      <th className="p-3">Project</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Approved by</th>
                      <th className="p-3">Remarks</th>
                      <th className="p-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRowsWithBalance.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 text-slate-600">
                          {date(item.date || item.createdAt)}
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          {resolveProjectGroup(item, data.projects || []).projectName}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          {money(item.amount)}
                        </td>
                        <td className="p-3 text-slate-600">
                          {item.referenceNumber || "—"}
                        </td>
                        <td className="p-3 capitalize text-slate-600">
                          {item.status || "paid"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {item.approvedBy?.name || "—"}
                        </td>
                        <td className="p-3 max-w-[240px]">
                          <p className="truncate text-slate-600">
                            {item.remarks || "—"}
                          </p>
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-700">
                          {item.displayBalance == null ? "—" : money(item.displayBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState label="No vendor payments" />
            )}
          </SectionCard>
        </div>
      )}

      {tab === "documents" && (
        <SectionCard title="Vendor documents">
          {vendor.documents?.length ? (
            <div className="space-y-2">
              {vendor.documents.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex gap-3 rounded-2xl border bg-white p-4"
                >
                  <FileText />
                  <span>{item.name || item.fileName}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No vendor documents" />
          )}
        </SectionCard>
      )}

      {tab === "activity" && (
        <SectionCard title="Activity timeline">
          {vendor.payments.length ? (
            <div className="space-y-3">
              {vendor.payments.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-2xl border bg-white p-4"
                >
                  <span className="mt-1 h-3 w-3 rounded-full bg-blue-500" />
                  <div>
                    <strong>Vendor payment • {money(item.amount)}</strong>
                    <p className="text-sm text-slate-500">
                      {resolveProjectGroup(item, data.projects || []).projectName} •{" "}
                      {date(item.date || item.createdAt)} •{" "}
                      {item.referenceNumber || "No reference"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No vendor activity" />
          )}
        </SectionCard>
      )}

      <VendorPaymentDialog
        open={payment}
        onClose={() => setPayment(false)}
        companyId={company.id}
        vendors={data.vendors}
        projects={data.projects}
        initialVendor={vendor}
      />
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-[#F9FAFC] p-3">
      <Icon size={17} className="text-blue-600" />
      <span>
        <small className="block text-slate-400">{label}</small>
        <strong className="text-sm">{value || "—"}</strong>
      </span>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold">{value || "—"}</p>
    </div>
  );
}
