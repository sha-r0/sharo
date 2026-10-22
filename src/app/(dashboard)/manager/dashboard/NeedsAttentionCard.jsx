"use client";

import Link from "next/link";
import {
    CalendarDays,
    BanknoteArrowDown,
    ReceiptIndianRupee,
    MapPin,
    ShoppingCart,
    ChevronRight,
    BellRing,
} from "lucide-react";

import { neo } from "./DashboardWidgets";

const tones = {
    red: {
        icon: "bg-red-50 text-red-500",
        value: "text-red-500",
    },

    green: {
        icon: "bg-emerald-50 text-emerald-600",
        value: "text-emerald-600",
    },

    blue: {
        icon: "bg-blue-50 text-blue-600",
        value: "text-blue-600",
    },

    amber: {
        icon: "bg-amber-50 text-amber-600",
        value: "text-amber-600",
    },

    violet: {
        icon: "bg-violet-50 text-violet-600",
        value: "text-violet-600",
    },
};

function AttentionRow({
    icon: Icon,
    value = 0,
    label,
    href,
    tone = "blue",
}) {
    const selected =
        tones[tone] || tones.blue;

    const content = (
        <div
            className="
        group
        flex
        min-h-[54px]
        items-center
        gap-3
        rounded-2xl
        border
        border-slate-100
        bg-white
        px-3
        py-2.5
        transition
        hover:border-blue-100
        hover:bg-slate-50
        hover:shadow-sm
        mt-2
      "
        >
            {/* ICON */}
            <div
                className={`
          grid
          h-9
          w-9
          shrink-0
          place-items-center
          rounded-xl
          ${selected.icon}
        `}
            >
                <Icon
                    size={17}
                    strokeWidth={2}
                />
            </div>

            {/* COUNT */}
            <span
                className={`
          w-7
          shrink-0
          text-center
          text-sm
          font-bold
          ${selected.value}
        `}
            >
                {value}
            </span>

            {/* LABEL */}
            <span
                className="
          min-w-0
          flex-1
          truncate
          text-sm
          font-medium
          text-slate-600
        "
            >
                {label}
            </span>

            {/* ARROW */}
            <ChevronRight
                size={18}
                className="
          shrink-0
          text-slate-400
          transition
          group-hover:translate-x-0.5
          group-hover:text-blue-600
        "
            />
        </div>
    );

    if (!href) return content;

    return (
        <Link href={href}>
            {content}
        </Link>
    );
}

export default function NeedsAttentionCard({
    metrics,
    purchaseOrderPending = null,
}) {
    const pendingLeaves =
        Number(
            metrics?.summary?.pendingLeaves || 0
        );

    const pendingAdvances =
        Number(
            metrics?.summary?.pendingAdvances || 0
        );

    const pendingExpenses =
        Number(
            metrics?.summary?.pendingExpenses || 0
        );

    const gpsReview =
        Number(
            metrics?.gps?.outside || 0
        );

    const items = [
        {
            id: "leave",
            label: "Leave Requests",
            value: pendingLeaves,
            icon: CalendarDays,
            tone: "red",
            href:
                "/manager/Workforce/leave-approval",
        },

        {
            id: "advance",
            label: "Advance Requests",
            value: pendingAdvances,
            icon: BanknoteArrowDown,
            tone: "green",
            href: "/manager/advance",
        },

        {
            id: "expense",
            label: "Expense Approvals",
            value: pendingExpenses,
            icon: ReceiptIndianRupee,
            tone: "blue",
            href: "/manager/expenses",
        },

        {
            id: "gps",
            label: "GPS Punch Requests",
            value: gpsReview,
            icon: MapPin,
            tone: "amber",
            href:
                "/manager/Workforce/gps-approval",
        },

        ...(purchaseOrderPending !== null
            ? [
                {
                    id: "po",
                    label:
                        "Purchase Orders Awaiting Approval",
                    value:
                        Number(
                            purchaseOrderPending
                        ) || 0,
                    icon: ShoppingCart,
                    tone: "violet",
                    href:
                        "/manager/purchase-orders",
                },
            ]
            : []),
    ];

    const totalAttention =
        items.reduce(
            (sum, item) =>
                sum + Number(item.value || 0),
            0
        );

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
            {/* HEADER */}
            <div
                className="
          mb-4
          flex
          items-center
          justify-between
          gap-4
        "
            >
                <div
                    className="
            flex
            min-w-0
            items-center
            gap-3
          "
                >
                    {/* HEADER ICON */}
                    <div
                        className="
              grid
              h-10
              w-10
              shrink-0
              place-items-center
              rounded-xl
              bg-red-50
              text-red-500
            "
                    >
                        <BellRing
                            size={20}
                            strokeWidth={2}
                        />
                    </div>

                    <h2
                        className="
              truncate
              text-lg
              font-bold
              text-slate-800
            "
                    >
                        Needs Your Attention
                    </h2>

                    {/* TOTAL BADGE */}
                    {totalAttention > 0 && (
                        <span
                            className="
                inline-flex
                min-w-8
                items-center
                justify-center
                rounded-full
                bg-red-500
                px-2.5
                py-1
                text-xs
                font-bold
                text-white
              "
                        >
                            {totalAttention}
                        </span>
                    )}
                </div>

                <Link
                    href="/manager/notifications"
                    className="
            shrink-0
            text-xs
            font-bold
            text-blue-600
            transition
            hover:text-blue-700
          "
                >
                    View All
                </Link>
            </div>

            {/* ROWS */}
            <div className="space-y-2">
                {items.map((item) => (
                    <AttentionRow
                        key={item.id}
                        icon={item.icon}
                        value={item.value}
                        label={item.label}
                        href={item.href}
                        tone={item.tone}
                    />
                ))}
            </div>

            {/* EMPTY STATE */}
            {totalAttention === 0 && (
                <div
                    className="
            mt-3
            rounded-2xl
            bg-emerald-50
            px-4
            py-3
            text-center
            text-sm
            font-semibold
            text-emerald-700
          "
                >
                    You&apos;re all caught up.
                </div>
            )}
        </section>
    );
}