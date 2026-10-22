"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Landmark,
  WalletCards,
} from "lucide-react";

import { neo } from "./DashboardWidgets";

function currency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function FinanceRow({
  title,
  subtitle,
  amount,
  href,
  tone = "green",
}) {
  const styles = {
    green: {
      amount: "text-emerald-600",
      icon: "bg-emerald-50 text-emerald-600",
    },
    red: {
      amount: "text-red-600",
      icon: "bg-red-50 text-red-600",
    },
  };

  const selected =
    styles[tone] || styles.green;

  const Icon =
    tone === "red"
      ? ArrowUpRight
      : ArrowDownLeft;

  const content = (
    <div
      className="
        group
        flex
        items-center
        gap-3
        rounded-2xl
        px-3
        py-2.5
        transition
        hover:bg-slate-50
      "
    >
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
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="
            truncate
            text-sm
            font-semibold
            text-slate-700
          "
        >
          {title}
        </p>

        {subtitle && (
          <p
            className="
              mt-0.5
              truncate
              text-xs
              text-slate-400
            "
          >
            {subtitle}
          </p>
        )}
      </div>

      <strong
        className={`
          shrink-0
          text-sm
          font-bold
          ${selected.amount}
        `}
      >
        {currency(amount)}
      </strong>

      <ChevronRight
        size={16}
        className="
          shrink-0
          text-slate-300
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

function EmptyFinanceState({
  label,
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-dashed
        border-slate-200
        px-4
        py-8
        text-center
      "
    >
      <p
        className="
          text-sm
          font-medium
          text-slate-400
        "
      >
        {label}
      </p>
    </div>
  );
}

export default function ReceivablesPayablesCard({
  receivables = [],
  payables = [],
}) {
  const safeReceivables =
    Array.isArray(receivables)
      ? receivables
      : [];

  const safePayables =
    Array.isArray(payables)
      ? payables
      : [];

  const totalReceivables =
    safeReceivables.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

  const totalPayables =
    safePayables.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

  return (
    <section
      className={`
        ${neo}
        rounded-3xl
        bg-white
        p-4
        sm:p-5
      `}
    >
      {/* HEADER */}
      <div
        className="
          flex
          items-center
          justify-between
          gap-4
        "
      >
        <div>
          <h2
            className="
              text-lg
              font-bold
              text-slate-800
            "
          >
            Receivables & Payables
          </h2>

          <p
            className="
              mt-1
              text-xs
              text-slate-400
            "
          >
            Outstanding money to receive and pay
          </p>
        </div>

        <Link
          href="/manager/billing"
          className="
            shrink-0
            text-xs
            font-bold
            text-blue-600
            transition
            hover:text-blue-700
          "
        >
          View Finance
        </Link>
      </div>

      {/* SUMMARY */}
      <div
        className="
          mt-4
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-2
        "
      >
        {/* RECEIVABLE */}
        <div
          className="
            rounded-2xl
            border
            border-emerald-100
            bg-emerald-50/60
            p-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                grid
                h-10
                w-10
                place-items-center
                rounded-xl
                bg-white
                text-emerald-600
                shadow-sm
              "
            >
              <Landmark size={19} />
            </div>

            <div>
              <p
                className="
                  text-xs
                  font-semibold
                  text-emerald-700
                "
              >
                Total Receivable
              </p>

              <p
                className="
                  mt-1
                  text-2xl
                  font-bold
                  text-slate-900
                "
              >
                {currency(
                  totalReceivables
                )}
              </p>
            </div>
          </div>
        </div>

        {/* PAYABLE */}
        <div
          className="
            rounded-2xl
            border
            border-red-100
            bg-red-50/60
            p-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                grid
                h-10
                w-10
                place-items-center
                rounded-xl
                bg-white
                text-red-600
                shadow-sm
              "
            >
              <WalletCards
                size={19}
              />
            </div>

            <div>
              <p
                className="
                  text-xs
                  font-semibold
                  text-red-700
                "
              >
                Total Payable
              </p>

              <p
                className="
                  mt-1
                  text-2xl
                  font-bold
                  text-slate-900
                "
              >
                {currency(
                  totalPayables
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILS */}
      <div
        className="
          mt-5
          grid
          grid-cols-1
          gap-6
          lg:grid-cols-2
        "
      >
        {/* RECEIVABLES */}
        <div>
          <div
            className="
              mb-3
              flex
              items-center
              justify-between
            "
          >
            <div>
              <h3
                className="
                  text-sm
                  font-bold
                  text-slate-700
                "
              >
                Money to Receive
              </h3>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-400
                "
              >
                Outstanding invoices
              </p>
            </div>

            <span
              className="
                rounded-full
                bg-emerald-50
                px-2.5
                py-1
                text-xs
                font-bold
                text-emerald-600
              "
            >
              {safeReceivables.length}
            </span>
          </div>

          <div className="space-y-1">
            {safeReceivables.length ? (
              safeReceivables
                .slice(0, 5)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <FinanceRow
                      key={
                        item.id ||
                        index
                      }
                      title={
                        item.clientName ||
                        item.title ||
                        "Client"
                      }
                      subtitle={
                        item.invoiceNumber ||
                        item.detail ||
                        "Outstanding"
                      }
                      amount={
                        item.amount
                      }
                      href={
                        item.href ||
                        "/manager/billing"
                      }
                      tone="green"
                    />
                  )
                )
            ) : (
              <EmptyFinanceState
                label="No receivables to show"
              />
            )}
          </div>
        </div>

        {/* PAYABLES */}
        <div>
          <div
            className="
              mb-3
              flex
              items-center
              justify-between
            "
          >
            <div>
              <h3
                className="
                  text-sm
                  font-bold
                  text-slate-700
                "
              >
                Money to Pay
              </h3>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-400
                "
              >
                Outstanding vendor payments
              </p>
            </div>

            <span
              className="
                rounded-full
                bg-red-50
                px-2.5
                py-1
                text-xs
                font-bold
                text-red-600
              "
            >
              {safePayables.length}
            </span>
          </div>

          <div className="space-y-1">
            {safePayables.length ? (
              safePayables
                .slice(0, 5)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <FinanceRow
                      key={
                        item.id ||
                        index
                      }
                      title={
                        item.vendorName ||
                        item.title ||
                        "Vendor"
                      }
                      subtitle={
                        item.billNumber ||
                        item.detail ||
                        "Outstanding"
                      }
                      amount={
                        item.amount
                      }
                      href={
                        item.href ||
                        "/manager/vendors"
                      }
                      tone="red"
                    />
                  )
                )
            ) : (
              <EmptyFinanceState
                label="No payables to show"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}