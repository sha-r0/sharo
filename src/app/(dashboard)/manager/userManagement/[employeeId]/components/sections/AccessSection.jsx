"use client";

import {
  useState,
} from "react";

import {
  ChevronDown,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Unlock,
  UserX,
} from "lucide-react";

import toast from "react-hot-toast";

import { auth } from "@/lib/firebase";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import activityLogRepository from "@/app/allservice/rbac/activityLogRepository";

/* ==========================================
    Helpers
========================================== */

function formatDate(value) {
  const current =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value
        ? new Date(value)
        : null;

  if (
    !current ||
    Number.isNaN(
      current.getTime()
    )
  ) {
    return "Never";
  }

  return current.toLocaleString(
    "en-IN"
  );
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function employeeFirestoreId(
  employee
) {
  return (
    employee?.firestoreId ||
    employee?.id ||
    ""
  );
}

/* ==========================================
    Component
========================================== */

export default function AccessSection({
  employee,
  onChanged,
}) {
  const {
    company,
    access,
  } = useAuth();

  const [logs, setLogs] =
    useState([]);

  const [logsLoaded, setLogsLoaded] =
    useState(false);

  const [logsLoading, setLogsLoading] =
    useState(false);

  const [busy, setBusy] =
    useState("");

  /*
   * Access controls are only rendered for
   * owners.
   *
   * Actual authorization must still remain
   * server-side inside /api/rbac/users.
   */
  if (!access?.isOwner) {
    return null;
  }

  const companyId =
    company?.id || "";

  const firestoreId =
    employeeFirestoreId(
      employee
    );

  const authUid =
    employee?.access
      ?.authUid || "";

  const email =
    employee?.email ||
    employee?.personalInfo
      ?.email ||
    "";

  const currentStatus =
    normalize(
      employee?.access
        ?.status ||
      employee?.status
    );

  const ownerAccount =
    Boolean(
      company?.ownerUid &&
      authUid &&
      authUid ===
        company.ownerUid
    );

  const permissions =
    Array.isArray(
      employee?.access
        ?.effectivePermissions
    )
      ? employee.access
          .effectivePermissions
      : [];

  const hasAccount =
    Boolean(authUid);

  /* ==========================================
      Load Security Activity

      IMPORTANT:
      Do not automatically read activity logs
      every time Employee Details opens.

      This keeps normal profile viewing at
      zero activity-log reads.

      Next we will optimize the repository
      query itself.
  ========================================== */

  async function loadActivity({
    force = false,
  } = {}) {
    if (
      !companyId ||
      logsLoading
    ) {
      return;
    }

    if (
      logsLoaded &&
      !force
    ) {
      return;
    }

    try {
      setLogsLoading(true);

      /*
       * Temporary implementation using the
       * existing repository method.
       *
       * Next step:
       * replace this with something like:
       *
       * activityLogRepository.forEmployee(...)
       *
       * so Firestore returns only relevant
       * records.
       */
      const items =
      await activityLogRepository.forEmployee(
        companyId,
        {
          employeeFirestoreId:
            firestoreId,
    
          authUid,
    
          count: 5,
        }
      );
    
    setLogs(
      Array.isArray(items)
        ? items
        : []
    );

      setLogsLoaded(true);
    } catch (error) {
      console.error(
        "[AccessSection] Unable to load security activity",
        {
          companyId,
          firestoreId,
          code:
            error?.code ||
            error?.message ||
            "unknown",
        }
      );

      toast.error(
        "Unable to load security activity."
      );
    } finally {
      setLogsLoading(false);
    }
  }

  /* ==========================================
      Security Action
  ========================================== */

  async function action(name) {
    if (!companyId) {
      toast.error(
        "Company information is unavailable."
      );

      return;
    }

    if (!firestoreId) {
      toast.error(
        "Employee information is unavailable."
      );

      return;
    }

    if (
      ownerAccount &&
      [
        "lock",
        "disable",
        "delete",
        "revoke",
      ].includes(name)
    ) {
      toast.error(
        "The Company Owner account is protected."
      );

      return;
    }

    if (
      !hasAccount &&
      name !== "unlock"
    ) {
      toast.error(
        "This employee does not have a login account."
      );

      return;
    }

    try {
      setBusy(name);

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const token =
        await currentUser.getIdToken();

      const response =
        await fetch(
          "/api/rbac/users",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                action: name,

                targetUid:
                  authUid ||
                  undefined,

                employeeFirestoreId:
                  firestoreId,

                email:
                  email ||
                  undefined,
              }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Account action failed."
        );
      }

      /* ==============================
          Reset Password
      ============================== */

      if (result?.resetLink) {
        try {
          await navigator.clipboard.writeText(
            result.resetLink
          );

          toast.success(
            "Password reset link copied."
          );
        } catch {
          toast.success(
            "Password reset link generated."
          );
        }
      } else {
        const messages = {
          revoke:
            "Employee sessions revoked successfully.",

          lock:
            "Employee account locked.",

          unlock:
            "Employee account unlocked.",

          "expire-password":
            "Employee password expired.",

          disable:
            "Employee account deactivated.",

          "reset-password":
            "Password reset completed.",
        };

        toast.success(
          messages[name] ||
            "Account action completed."
        );
      }

      /*
       * Parent detail page clears this
       * employee's cache and reloads
       * exactly one fresh employee
       * document.
       */
      await onChanged?.();

      /*
       * Do NOT automatically fetch activity
       * logs after every action.
       *
       * If logs were already opened, refresh
       * them. Otherwise leave them unloaded.
       */
      if (logsLoaded) {
        await loadActivity({
          force: true,
        });
      }
    } catch (error) {
      console.error(
        "[AccessSection] Security action failed",
        {
          action: name,

          employeeFirestoreId:
            firestoreId,

          code:
            error?.code ||
            error?.message ||
            "unknown",
        }
      );

      toast.error(
        error?.message ||
          "Account action failed."
      );
    } finally {
      setBusy("");
    }
  }

  const isBusy =
    Boolean(busy);

  /* ==========================================
      Render
  ========================================== */

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
      {/* Header */}

      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
          <ShieldCheck
            size={22}
          />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Access & Security
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            Role, permissions,
            password and session
            controls
          </p>
        </div>
      </div>

      {/* =====================================
          Account Information
      ====================================== */}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Info
          label="Role"
          value={
            employee?.access
              ?.roleId ||
            employee?.role ||
            "Employee"
          }
        />

        <Info
          label="Account status"
          value={
            employee?.access
              ?.status ||
            employee?.status ||
            "—"
          }
        />

        <Info
          label="Last login"
          value={formatDate(
            employee?.login
              ?.lastLogin ||
              employee?.access
                ?.lastLoginAt
          )}
          capitalize={false}
        />

        <Info
          label="Permissions"
          value={
            ownerAccount
              ? "Full access"
              : `${permissions.length} granted`
          }
        />
      </div>

      {/* =====================================
          Account State Notice
      ====================================== */}

      {!hasAccount && (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-700">
            Login account not
            configured
          </p>

          <p className="mt-1 text-xs text-amber-600">
            Security controls will
            become available after a
            login account is created for
            this employee.
          </p>
        </div>
      )}

      {ownerAccount && (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-700">
            Company Owner account
          </p>

          <p className="mt-1 text-xs text-blue-600">
            Lock, logout and
            deactivation actions are
            protected for the Company
            Owner.
          </p>
        </div>
      )}

      {/* =====================================
          Actions
      ====================================== */}

      <div className="mt-5 flex flex-wrap gap-2">
        <Action
          icon={KeyRound}
          label={
            busy ===
            "reset-password"
              ? "Working..."
              : "Reset password"
          }
          loading={
            busy ===
            "reset-password"
          }
          disabled={
            !hasAccount ||
            isBusy
          }
          onClick={() =>
            action(
              "reset-password"
            )
          }
        />

        <Action
          icon={LogOut}
          label={
            busy === "revoke"
              ? "Working..."
              : "Force logout"
          }
          loading={
            busy === "revoke"
          }
          disabled={
            !hasAccount ||
            ownerAccount ||
            isBusy
          }
          onClick={() =>
            action("revoke")
          }
        />

        {currentStatus ===
        "locked" ? (
          <Action
            icon={Unlock}
            label={
              busy === "unlock"
                ? "Working..."
                : "Unlock"
            }
            loading={
              busy === "unlock"
            }
            disabled={
              !hasAccount ||
              isBusy
            }
            onClick={() =>
              action("unlock")
            }
          />
        ) : (
          <Action
            icon={Lock}
            label={
              busy === "lock"
                ? "Working..."
                : "Lock"
            }
            loading={
              busy === "lock"
            }
            disabled={
              !hasAccount ||
              ownerAccount ||
              isBusy
            }
            onClick={() =>
              action("lock")
            }
          />
        )}

        <Action
          icon={KeyRound}
          label={
            busy ===
            "expire-password"
              ? "Working..."
              : "Expire password"
          }
          loading={
            busy ===
            "expire-password"
          }
          disabled={
            !hasAccount ||
            isBusy
          }
          onClick={() =>
            action(
              "expire-password"
            )
          }
        />

        <Action
          icon={UserX}
          label={
            busy === "disable"
              ? "Working..."
              : "Deactivate"
          }
          loading={
            busy === "disable"
          }
          danger
          disabled={
            !hasAccount ||
            ownerAccount ||
            isBusy
          }
          onClick={() =>
            action("disable")
          }
        />
      </div>

      {/* =====================================
          Security Activity
      ====================================== */}

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Recent security activity
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Security actions for this
              employee
            </p>
          </div>

          {!logsLoaded ? (
            <button
              type="button"
              onClick={() =>
                loadActivity()
              }
              disabled={
                logsLoading
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                py-2
                text-xs
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:opacity-50
              "
            >
              {logsLoading ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <ChevronDown
                  size={14}
                />
              )}

              {logsLoading
                ? "Loading"
                : "Load activity"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                loadActivity({
                  force: true,
                })
              }
              disabled={
                logsLoading
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                px-3
                py-2
                text-xs
                font-semibold
                text-blue-600
                transition
                hover:bg-blue-50
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={14}
                className={
                  logsLoading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          )}
        </div>

        {!logsLoaded && (
          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-sm text-slate-400">
              Activity is loaded only
              when requested to reduce
              unnecessary database
              reads.
            </p>
          </div>
        )}

        {logsLoaded &&
          !logsLoading &&
          !logs.length && (
            <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-400">
              No security activity
              recorded yet.
            </p>
          )}

        {logsLoaded &&
          logs.length > 0 && (
            <div className="mt-3 space-y-2">
              {logs.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={
                      item?.id ||
                      `security-${index}`
                    }
                    className="
                      flex
                      flex-col
                      gap-1
                      rounded-xl
                      bg-slate-50
                      px-4
                      py-3
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <span className="text-xs font-semibold text-slate-700">
                      {item?.type ||
                        "Security action"}
                    </span>

                    <span className="text-xs text-slate-400">
                      {formatDate(
                        item?.createdAt
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </section>
  );
}

/* ==========================================
    Info Card
========================================== */

function Info({
  label,
  value,
  capitalize = true,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p
        className={`
          mt-1
          truncate
          font-bold
          text-slate-700
          ${
            capitalize
              ? "capitalize"
              : ""
          }
        `}
      >
        {value || "—"}
      </p>
    </div>
  );
}

/* ==========================================
    Action Button
========================================== */

function Action({
  icon: Icon,
  label,
  danger = false,
  loading = false,
  ...props
}) {
  return (
    <button
      type="button"
      {...props}
      className={`
        inline-flex
        items-center
        gap-2
        rounded-xl
        border
        px-3.5
        py-2
        text-sm
        font-bold
        transition
        disabled:cursor-not-allowed
        disabled:opacity-40
        ${
          danger
            ? `
                border-red-100
                bg-red-50
                text-red-600
                hover:bg-red-100
              `
            : `
                border-slate-200
                bg-white
                text-slate-700
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-700
              `
        }
      `}
    >
      {loading ? (
        <Loader2
          size={15}
          className="animate-spin"
        />
      ) : (
        <Icon size={15} />
      )}

      {label}
    </button>
  );
}