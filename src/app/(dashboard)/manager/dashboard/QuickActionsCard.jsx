"use client";

import Link from "next/link";
import {
    UserPlus,
    FolderPlus,
    FilePlus2,
    ShoppingCart,
    MapPin,
    BarChart3,
    Building2,
    UsersRound,
    FileText,
} from "lucide-react";

import { neo } from "./DashboardWidgets";
import { useAuth } from "@/app/(auth)/context/AuthContext";

const actionStyles = {
    blue: {
        box: "bg-blue-50 hover:bg-blue-100",
        icon: "text-blue-600",
        text: "text-blue-700",
    },

    violet: {
        box: "bg-violet-50 hover:bg-violet-100",
        icon: "text-violet-600",
        text: "text-violet-700",
    },

    green: {
        box: "bg-emerald-50 hover:bg-emerald-100",
        icon: "text-emerald-600",
        text: "text-emerald-700",
    },

    amber: {
        box: "bg-amber-50 hover:bg-amber-100",
        icon: "text-amber-600",
        text: "text-amber-700",
    },

    red: {
        box: "bg-red-50 hover:bg-red-100",
        icon: "text-red-500",
        text: "text-red-600",
    },

    cyan: {
        box: "bg-cyan-50 hover:bg-cyan-100",
        icon: "text-cyan-600",
        text: "text-cyan-700",
    },
};

function QuickActionItem({
    href,
    icon: Icon,
    label,
    tone = "blue",
}) {
    const styles =
        actionStyles[tone] ||
        actionStyles.blue;

    return (
        <Link
            href={href}
            className={`
        group
        flex
        min-h-[58px]
        items-center
        justify-center
        gap-2.5
        rounded-2xl
        border
        border-transparent
        px-2
        py-2
        transition
        duration-200
        hover:-translate-y-0.5
        hover:border-slate-200
        hover:shadow-sm
        ${styles.box}
      `}
        >
            <Icon
                size={18}
                strokeWidth={2}
                className={styles.icon}
            />

            <span
                className={`
          text-sm
          font-semibold
          ${styles.text}
        `}
            >
                {label}
            </span>
        </Link>
    );
}

export default function QuickActionsCard() {
    const {
        can,
        isOwner,
    } = useAuth();

    const actions = [
        {
            id: "employee",
            label: "Add Employee",
            href: "/manager/userManagement/add",
            icon: UserPlus,
            tone: "blue",
            visible:
                isOwner ||
                can("employee.create"),
        },

        {
            id: "project",
            label: "Create Project",
            href: "/manager/projects/new",
            icon: FolderPlus,
            tone: "violet",
            visible:
                isOwner ||
                can("projects.create"),
        },

        {
            id: "quotation",
            label: "Create Quotation",
            href: "/manager/quotation-builder/new",
            icon: FilePlus2,
            tone: "green",
            visible:
                isOwner ||
                can("quotation.create"),
        },

        {
            id: "po",
            label: "Create PO",
            href: "/manager/purchase-orders/new",
            icon: ShoppingCart,
            tone: "amber",
            visible:
                isOwner ||
                can("purchase_order.create"),
        },

        {
            id: "site",
            label: "Assign Site",
            href: "/manager/Workforce/site-assignments",
            icon: MapPin,
            tone: "red",
            visible:
                isOwner ||
                can("site_assignment.create"),
        },

        {
            id: "vendor",
            label: "Add Vendor",
            href: "/manager/vendors/add",
            icon: Building2,
            tone: "cyan",
            visible:
                isOwner ||
                can("vendors.create"),
        },

        {
            id: "client",
            label: "Add Client",
            href: "/manager/clients/add",
            icon: UsersRound,
            tone: "blue",
            visible:
                isOwner ||
                can("clients.create"),
        },

        {
            id: "invoice",
            label: "Create Invoice",
            href: "/manager/billing/new",
            icon: FileText,
            tone: "violet",
            visible:
                isOwner ||
                can("billing.create"),
        },
    ].filter((item) => item.visible);

    return (
        <section
            className={`
    ${neo}
    h-fit
    self-start
    rounded-3xl
    bg-white
    p-4
    sm:p-5
  `}
        >
            <div
                className="
          mb-4
          flex
          items-center
          justify-between
        "
            >
                <h2
                    className="
            text-lg
            font-bold
            text-slate-800
          "
                >
                    Quick Actions
                </h2>
            </div>

            <div
                className="
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-2
        "
            >
                {actions.map(
                    (action) => (
                        <QuickActionItem
                            key={action.id}
                            href={action.href}
                            icon={action.icon}
                            label={action.label}
                            tone={action.tone}
                        />
                    )
                )}
            </div>

            {!actions.length && (
                <div
                    className="
            rounded-2xl
            bg-slate-50
            px-2
            py-3
            text-center
            text-sm
            font-medium
            text-slate-500
          "
                >
                    No quick actions available.
                </div>
            )}
        </section>
    );
}