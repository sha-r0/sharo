"use client";

import { memo, useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Inbox,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "@/app/(auth)/context/AuthContext";

export const neo =
  "border border-white/80 bg-[#F9FAFC] shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";


// ============================================================
// Animated Number
// ============================================================

export function AnimatedNumber({
  value = 0,
  format = "number",
}) {
  const numericValue =
    value === null || value === undefined
      ? null
      : Number(value);

  const [display, setDisplay] =
    useState(numericValue || 0);

  useEffect(() => {
    if (numericValue === null) return;

    const target =
      Number.isFinite(numericValue)
        ? numericValue
        : 0;

    const started = performance.now();

    let frame;

    const animate = (now) => {
      const progress =
        Math.min(
          (now - started) / 550,
          1
        );

      setDisplay(
        target *
          (1 - Math.pow(1 - progress, 3))
      );

      if (progress < 1) {
        frame =
          requestAnimationFrame(animate);
      }
    };

    frame =
      requestAnimationFrame(animate);

    return () =>
      cancelAnimationFrame(frame);
  }, [numericValue]);

  if (numericValue === null) {
    return "—";
  }

  if (format === "currency") {
    return `₹${Math.round(
      display
    ).toLocaleString("en-IN")}`;
  }

  if (format === "hours") {
    return `${display.toFixed(1)}h`;
  }

  if (format === "percent") {
    return `${display.toFixed(0)}%`;
  }

  return Math.round(
    display
  ).toLocaleString("en-IN");
}


// ============================================================
// Stat Card
// ============================================================

export const StatCard = memo(
  function StatCard({
    title,
    value,
    icon: Icon,
    tone = "blue",
    format,
    statusText,
    footerItems = [],
    showTrend = true,
  }) {
    const tones = {
      blue: {
        icon:
          "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200",
        trend: "text-blue-500",
        status: "text-emerald-600",
      },

      green: {
        icon:
          "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-200",
        trend: "text-emerald-500",
        status: "text-emerald-600",
      },

      violet: {
        icon:
          "bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-violet-200",
        trend: "text-violet-500",
        status: "text-violet-600",
      },

      amber: {
        icon:
          "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-200",
        trend: "text-amber-500",
        status: "text-amber-600",
      },

      red: {
        icon:
          "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-200",
        trend: "text-rose-500",
        status: "text-rose-600",
      },

      cyan: {
        icon:
          "bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-cyan-200",
        trend: "text-cyan-500",
        status: "text-cyan-600",
      },
    };

    const selected =
      tones[tone] || tones.blue;

    return (
      <article
        className={`
          group
          min-w-0
          rounded-3xl
          border
          border-slate-200
          bg-white
          px-4
          py-4
          shadow-sm
          transition
          duration-300
          hover:-translate-y-0.5
          hover:shadow-lg
        `}
      >
        <div className="flex min-w-0 items-start gap-3">

          {/* ICON */}
          <div
            className={`
              grid
              h-14
              w-14
              shrink-0
              place-items-center
              rounded-2xl
              shadow-md
              ${selected.icon}
            `}
          >
            {Icon && (
              <Icon
                size={25}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            )}
          </div>


          {/* MAIN CONTENT */}
          <div className="min-w-0 flex-1">

            <p
              className="
                truncate
                text-sm
                font-medium
                text-slate-500
              "
            >
              {title}
            </p>

            <div
              className="
                mt-1.5
                flex
                min-w-0
                items-end
                gap-2
              "
            >
              <p
                className="
                  truncate
                  text-[28px]
                  font-bold
                  leading-none
                  tracking-tight
                  text-slate-900
                "
              >
                <AnimatedNumber
                  value={value}
                  format={format}
                />
              </p>

              {statusText && (
                <span
                  className={`
                    mb-0.5
                    shrink-0
                    text-xs
                    font-semibold
                    ${selected.status}
                  `}
                >
                  {statusText}
                </span>
              )}
            </div>
          </div>


          {/* TREND ICON */}
          {showTrend && (
            <div
              className={`
                mt-auto
                hidden
                shrink-0
                self-end
                sm:block
                ${selected.trend}
              `}
            >
              <BarChart3
                size={27}
                strokeWidth={2.2}
              />
            </div>
          )}
        </div>


        {/* FOOTER */}
        {footerItems.length > 0 && (
          <div
            className="
              mt-4
              flex
              min-w-0
              flex-wrap
              items-center
              gap-x-5
              gap-y-1.5
              border-t
              border-slate-100
              pt-3
            "
          >
            {footerItems.map(
              (item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-1
                    text-xs
                  "
                >
                  <span
                    className="
                      font-bold
                      text-slate-800
                    "
                  >
                    {item.value}
                  </span>

                  <span
                    className="
                      truncate
                      text-slate-500
                    "
                  >
                    {item.label}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </article>
    );
  }
);


// ============================================================
// Section Card
// ============================================================

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}) {
  const { can } = useAuth();

  const panelPermissions = {
    "Recent Expenses": "expense.view",
    "Recent Work Logs": "projects.view",
    "Daily Attendance": "attendance.view",
    "Pending Leave": "leave.view",
    "Pending Advances": "advance.view",
    "Today's GPS Punches": "gps.view",
    "Recent Projects": "projects.view",
    "Employee Occasions": "employee.view",
    "Holidays & Occasions": "leave.view",
  };

  if (
    panelPermissions[title] &&
    !can(panelPermissions[title])
  ) {
    return null;
  }

  const dashboardRoutes = {
    "Recent Expenses":
      "/manager/expenses",

    "Recent Work Logs":
      "/manager/Workforce",

    "Daily Attendance":
      "/manager/Workforce/attendance",

    "Pending Leave":
      "/manager/Workforce",

    "Pending Advances":
      "/manager/advance",

    "Today's GPS Punches":
      "/manager/Workforce/gps-approval",

    "Recent Projects":
      "/manager/projects",

    "Recent Activity":
      "/manager/notifications",

    "Employee Occasions":
      "/manager/userManagement",

    "Holidays & Occasions":
      "/manager/Workforce/leave-policy",

    "Needs Attention":
      "/manager/notifications",
  };

  const resolvedAction =
    action ||
    (dashboardRoutes[title] ? (
      <Link
        href={dashboardRoutes[title]}
        className="
          shrink-0
          rounded-xl
          bg-blue-50
          px-3
          py-2
          text-xs
          font-bold
          text-blue-600
          transition
          hover:bg-blue-100
        "
      >
        View all
      </Link>
    ) : null);

  return (
    <section
      className={`
        ${neo}
        min-w-0
        rounded-3xl
        p-5
        sm:p-6
        ${className}
      `}
    >
      <div
        className="
          mb-5
          flex
          items-start
          justify-between
          gap-4
        "
      >
        <div className="min-w-0">
          <h2
            className="
              text-lg
              font-bold
              text-slate-800
              sm:text-xl
            "
          >
            {title}
          </h2>

          {subtitle && (
            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              {subtitle}
            </p>
          )}
        </div>

        {resolvedAction}
      </div>

      {children}
    </section>
  );
}


// ============================================================
// Bar Chart
// ============================================================

export function BarChart({
  data = [],
  color = "#2563eb",
  valueFormat = (value) =>
    value.toFixed(0),
}) {
  const max =
    Math.max(
      ...data.map(
        (item) => item.value
      ),
      1
    );

  if (
    !data.some(
      (item) => item.value > 0
    )
  ) {
    return (
      <EmptyState
        label="No data for this period"
        compact
      />
    );
  }

  return (
    <div
      className="
        flex
        h-52
        items-end
        gap-2
      "
      role="img"
      aria-label="Bar chart"
    >
      {data.map((item) => (
        <div
          key={item.label}
          className="
            group
            flex
            h-full
            min-w-0
            flex-1
            flex-col
            items-center
            justify-end
            gap-2
          "
        >
          <span
            className="
              pointer-events-none
              rounded-lg
              bg-slate-800
              px-2
              py-1
              text-[10px]
              font-semibold
              text-white
              opacity-0
              transition
              group-hover:opacity-100
            "
          >
            {valueFormat(item.value)}
          </span>

          <div
            className="
              w-full
              max-w-10
              rounded-t-xl
              transition-all
              duration-500
            "
            style={{
              height:
                `${Math.max(
                  (item.value / max) * 130,
                  4
                )}px`,
              backgroundColor: color,
            }}
          />

          <span
            className="
              truncate
              text-[10px]
              font-medium
              text-slate-500
              sm:text-xs
            "
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}


// ============================================================
// Line Chart
// ============================================================

export function LineChart({
  data = [],
  color = "#4f46e5",
}) {
  const gradientId =
    useId().replaceAll(":", "");

  const max =
    Math.max(
      ...data.map(
        (item) => item.value
      ),
      1
    );

  const points =
    data
      .map(
        (item, index) =>
          `${
            (index /
              Math.max(
                data.length - 1,
                1
              )) *
            100
          },${
            90 -
            (item.value / max) * 70
          }`
      )
      .join(" ");

  if (
    !data.some(
      (item) => item.value > 0
    )
  ) {
    return (
      <EmptyState
        label="No trend data yet"
        compact
      />
    );
  }

  return (
    <div className="h-52 w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="
          h-40
          w-full
          overflow-visible
        "
        role="img"
        aria-label="Trend line chart"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={color}
              stopOpacity=".25"
            />

            <stop
              offset="100%"
              stopColor={color}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <polygon
          points={`0,95 ${points} 100,95`}
          fill={`url(#${gradientId})`}
        />

        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div
        className="
          flex
          justify-between
          gap-2
        "
      >
        {data.map((item) => (
          <span
            key={item.label}
            className="
              text-[10px]
              font-medium
              text-slate-500
              sm:text-xs
            "
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}


// ============================================================
// Donut Chart
// ============================================================

export function DonutChart({
  data = [],
}) {
  const colors = [
    "#2563eb",
    "#10b981",
    "#ef4444",
    "#f59e0b",
  ];

  const total =
    data.reduce(
      (sum, item) =>
        sum + item.value,
      0
    );

  let offset = 0;

  return (
    <div
      className="
        flex
        flex-col
        items-center
        gap-6
        sm:flex-row
      "
    >
      <div
        className="
          relative
          h-36
          w-36
          shrink-0
          rounded-full
        "
        style={{
          background: total
            ? `conic-gradient(${data
                .map(
                  (item, index) => {
                    const start =
                      offset;

                    offset +=
                      (item.value /
                        total) *
                      100;

                    return `${
                      colors[
                        index %
                          colors.length
                      ]
                    } ${start}% ${offset}%`;
                  }
                )
                .join(",")})`
            : "#e2e8f0",
        }}
      >
        <div
          className="
            absolute
            inset-5
            grid
            place-items-center
            rounded-full
            bg-[#F9FAFC]
            text-center
          "
        >
          <div>
            <p
              className="
                text-2xl
                font-bold
                text-slate-800
              "
            >
              {total}
            </p>

            <p
              className="
                text-[10px]
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Projects
            </p>
          </div>
        </div>
      </div>

      <div className="w-full space-y-3">
        {data.map(
          (item, index) => (
            <div
              key={item.label}
              className="
                flex
                items-center
                justify-between
                text-sm
              "
            >
              <span
                className="
                  flex
                  items-center
                  gap-2
                  text-slate-600
                "
              >
                <span
                  className="
                    h-2.5
                    w-2.5
                    rounded-full
                  "
                  style={{
                    background:
                      colors[
                        index %
                          colors.length
                      ],
                  }}
                />

                {item.label}
              </span>

              <strong className="text-slate-800">
                {item.value}
              </strong>
            </div>
          )
        )}
      </div>
    </div>
  );
}


// ============================================================
// Progress Row
// ============================================================

export function ProgressRow({
  label,
  value,
  max = 100,
  color = "bg-blue-600",
  detail,
}) {
  const percentage =
    Math.min(
      100,
      Math.max(
        0,
        max
          ? (value / max) * 100
          : 0
      )
    );

  return (
    <div>
      <div
        className="
          mb-2
          flex
          items-center
          justify-between
          gap-3
          text-sm
        "
      >
        <span
          className="
            truncate
            font-medium
            text-slate-600
          "
        >
          {label}
        </span>

        <span
          className="
            shrink-0
            font-bold
            text-slate-800
          "
        >
          {detail ??
            `${Math.round(value)}%`}
        </span>
      </div>

      <div
        className="
          h-2
          overflow-hidden
          rounded-full
          bg-slate-100
        "
      >
        <div
          className={`
            h-full
            rounded-full
            transition-all
            duration-700
            ${color}
          `}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}


// ============================================================
// Quick Action
// ============================================================

export function QuickAction({
  href,
  icon: Icon,
  label,
  tone = "blue",
}) {
  const tones = {
    blue:
      "bg-blue-50 text-blue-600",
    green:
      "bg-emerald-50 text-emerald-600",
    amber:
      "bg-amber-50 text-amber-600",
    violet:
      "bg-violet-50 text-violet-600",
    red:
      "bg-red-50 text-red-600",
    cyan:
      "bg-cyan-50 text-cyan-600",
  };

  return (
    <Link
      href={href}
      className="
        group
        flex
        min-w-0
        items-center
        gap-3
        rounded-2xl
        border
        border-slate-100
        bg-white
        p-3
        transition
        hover:-translate-y-0.5
        hover:border-blue-100
        hover:shadow-md
      "
    >
      <span
        className={`
          grid
          h-10
          w-10
          shrink-0
          place-items-center
          rounded-xl
          ${
            tones[tone] ||
            tones.blue
          }
        `}
      >
        <Icon size={18} />
      </span>

      <span
        className="
          truncate
          text-sm
          font-semibold
          text-slate-700
        "
      >
        {label}
      </span>

      <ArrowUpRight
        size={15}
        className="
          ml-auto
          shrink-0
          text-slate-300
          transition
          group-hover:text-blue-600
        "
      />
    </Link>
  );
}


// ============================================================
// Empty State
// ============================================================

export function EmptyState({
  label = "Nothing to show yet",
  compact = false,
}) {
  return (
    <div
      className={`
        grid
        place-items-center
        rounded-2xl
        border
        border-dashed
        border-slate-200
        text-center
        ${
          compact
            ? "h-44"
            : "min-h-56"
        }
      `}
    >
      <div>
        <Inbox
          className="
            mx-auto
            text-slate-300
          "
          size={28}
        />

        <p
          className="
            mt-2
            text-sm
            font-medium
            text-slate-500
          "
        >
          {label}
        </p>
      </div>
    </div>
  );
}


// ============================================================
// Mini Metric
// ============================================================

export function MiniMetric({
  label,
  value,
  format,
  tone = "text-slate-800",
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-slate-100
        bg-white
        p-4
      "
    >
      <p
        className="
          text-xs
          font-medium
          text-slate-500
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-2
          text-xl
          font-bold
          ${tone}
        `}
      >
        <AnimatedNumber
          value={value}
          format={format}
        />
      </p>
    </div>
  );
}


// ============================================================
// Trend Badge
// ============================================================

export function TrendBadge({
  children,
}) {
  return (
    <span
      className="
        inline-flex
        items-center
        gap-1
        rounded-full
        bg-emerald-50
        px-2.5
        py-1
        text-xs
        font-bold
        text-emerald-600
      "
    >
      <TrendingUp size={12} />

      {children}
    </span>
  );
}