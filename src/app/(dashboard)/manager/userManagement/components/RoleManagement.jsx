"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
} from "lucide-react";

import toast from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import roleRepository from "@/app/allservice/rbac/roleRepository";

// import activityLogRepository from "@/app/allservice/rbac/activityLogRepository";

import {
  PERMISSION_MODULES,
  permissionActionsForModule,
  permissionKey,
} from "@/app/allservice/rbac/permissionCatalog";

const neo =
  "border border-white bg-[#F9FAFC] shadow-[0px_1.8px_1.8px_-1.3px_rgba(0,0,0,.08),0px_6.8px_6.8px_-2.6px_rgba(0,0,0,.05),inset_0px_3px_1px_white]";

function safePermissions(
  permissions
) {
  if (
    !Array.isArray(
      permissions
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      permissions.filter(
        Boolean
      )
    ),
  ];
}

function cloneRole(role) {
  if (!role) {
    return null;
  }

  return {
    ...role,

    permissions:
      safePermissions(
        role.permissions
      ),
  };
}

export default function RoleManagement() {
  const {
    company,
    currentUser,
    access,
  } = useAuth();

  const companyId =
    company?.id || "";

  const [roles, setRoles] =
    useState([]);

  const [
    selected,
    setSelected,
  ] = useState(null);

  const [search, setSearch] =
    useState("");

  const [
    expanded,
    setExpanded,
  ] = useState(
    () =>
      new Set(
        PERMISSION_MODULES
      )
  );

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [dirty, setDirty] =
    useState(false);

  /* ==========================================
      Load Roles
  ========================================== */

  async function loadRoles({
    force = false,
    keepSelection = true,
  } = {}) {
    if (!companyId) {
      setRoles([]);
      setSelected(null);
      setLoading(false);

      return;
    }

    try {
      const items =
        await roleRepository.list(
          companyId,
          {
            force,
          }
        );

      const safeItems =
        Array.isArray(items)
          ? items.map(
            cloneRole
          )
          : [];

      setRoles(
        safeItems
      );

      setSelected(
        (current) => {
          if (
            keepSelection &&
            current?.id
          ) {
            const found =
              safeItems.find(
                (item) =>
                  item.id ===
                  current.id
              );

            if (found) {
              return cloneRole(
                found
              );
            }
          }

          return (
            cloneRole(
              safeItems[0]
            ) || null
          );
        }
      );

      setDirty(false);
    } catch (error) {
      console.error(
        "[RoleManagement] Unable to load roles",
        error
      );

      toast.error(
        error?.message ||
        "Unable to load roles."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled =
      false;

    async function run() {
      if (!companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const items =
          await roleRepository.list(
            companyId
          );

        if (cancelled) {
          return;
        }

        const safeItems =
          Array.isArray(items)
            ? items.map(
              cloneRole
            )
            : [];

        setRoles(
          safeItems
        );

        setSelected(
          cloneRole(
            safeItems[0]
          ) || null
        );
      } catch (error) {
        if (!cancelled) {
          console.error(
            "[RoleManagement] Unable to load roles",
            error
          );

          toast.error(
            error?.message ||
            "Unable to load roles."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  /* ==========================================
      Available Modules
  ========================================== */

  const modules =
    useMemo(() => {
      const keyword =
        String(
          search || ""
        )
          .trim()
          .toLowerCase();

      if (!keyword) {
        return PERMISSION_MODULES;
      }

      return PERMISSION_MODULES.filter(
        (module) => {
          if (
            module
              .toLowerCase()
              .includes(keyword)
          ) {
            return true;
          }

          return permissionActionsForModule(
            module
          ).some(
            (action) =>
              `${module} ${action}`
                .toLowerCase()
                .includes(keyword)
          );
        }
      );
    }, [search]);

  const editable =
    Boolean(
      access?.isOwner &&
      selected &&
      selected.id !==
      "owner"
    );

  /* ==========================================
      Select Role
  ========================================== */

  function selectRole(
    role
  ) {
    if (
      dirty &&
      !window.confirm(
        "You have unsaved permission changes. Switch roles anyway?"
      )
    ) {
      return;
    }

    setSelected(
      cloneRole(role)
    );

    setDirty(false);
  }

  /* ==========================================
      Edit Role Name
  ========================================== */

  function updateName(
    value
  ) {
    if (!editable) {
      return;
    }

    setSelected(
      (role) => ({
        ...role,
        name: value,
      })
    );

    setDirty(true);
  }

  /* ==========================================
      Toggle Permission
  ========================================== */

  function toggle(key) {
    if (!editable) {
      return;
    }

    setSelected(
      (role) => {
        const permissions =
          safePermissions(
            role?.permissions
          );

        const has =
          permissions.includes(
            key
          );

        return {
          ...role,

          permissions:
            has
              ? permissions.filter(
                (item) =>
                  item !== key
              )
              : [
                ...permissions,
                key,
              ],
        };
      }
    );

    setDirty(true);
  }

  /* ==========================================
      Toggle Module
  ========================================== */

  function toggleModule(
    module
  ) {
    if (!editable) {
      return;
    }

    const actions =
      permissionActionsForModule(
        module
      );

    const keys =
      actions.map(
        (action) =>
          permissionKey(
            module,
            action
          )
      );

    setSelected(
      (role) => {
        const permissions =
          safePermissions(
            role?.permissions
          );

        const all =
          keys.every(
            (key) =>
              permissions.includes(
                key
              )
          );

        return {
          ...role,

          permissions:
            all
              ? permissions.filter(
                (key) =>
                  !keys.includes(
                    key
                  )
              )
              : [
                ...new Set([
                  ...permissions,
                  ...keys,
                ]),
              ],
        };
      }
    );

    setDirty(true);
  }

  /* ==========================================
      Expand / Collapse
  ========================================== */

  function toggleExpanded(
    module
  ) {
    setExpanded(
      (current) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(module)
        ) {
          next.delete(
            module
          );
        } else {
          next.add(module);
        }

        return next;
      }
    );
  }

  /* ==========================================
      Add Custom Role
  ========================================== */

  function addRole() {
    if (
      !access?.isOwner
    ) {
      return;
    }

    if (
      dirty &&
      !window.confirm(
        "You have unsaved changes. Create a new role anyway?"
      )
    ) {
      return;
    }

    setSelected({
      id: "",

      name:
        "Custom Role",

      description: "",

      permissions: [
        "dashboard.view",
        "notifications.view",
      ],

      system: false,

      isNew: true,
    });

    setDirty(true);

    setSearch("");
  }

  /* ==========================================
      Save
  ========================================== */

  async function save() {
    if (
      !companyId ||
      !selected ||
      !editable ||
      saving
    ) {
      return;
    }

    const roleName =
      String(
        selected.name || ""
      ).trim();

    if (!roleName) {
      toast.error(
        "Role name is required."
      );

      return;
    }

    if (
      !selected.permissions
        ?.length
    ) {
      const confirm =
        window.confirm(
          "This role has no permissions. Save it anyway?"
        );

      if (!confirm) {
        return;
      }
    }

    try {
      setSaving(true);

      const result =
        await roleRepository.save(
          companyId,
          {
            ...selected,

            name:
              roleName,

            permissions:
              safePermissions(
                selected.permissions
              ),
          },

          currentUser?.uid
        );

      toast.success(
        "Role permissions saved."
      );

      /*
       * Force one fresh role read after
       * mutation so server-normalized
       * data is reflected correctly.
       */
      const refreshed =
        await roleRepository.list(
          companyId,
          {
            force: true,
          }
        );

      const safeRoles =
        refreshed.map(
          cloneRole
        );

      setRoles(
        safeRoles
      );

      const saved =
        safeRoles.find(
          (role) =>
            role.id ===
            result.id
        );

      setSelected(
        cloneRole(
          saved ||
          result.role
        )
      );

      setDirty(false);
    } catch (error) {
      console.error(
        "[RoleManagement] Save failed",
        error
      );

      toast.error(
        error?.message ||
        "Unable to save role."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================
      Manual Refresh
  ========================================== */

  async function refresh() {
    if (
      refreshing ||
      !companyId
    ) {
      return;
    }

    if (
      dirty &&
      !window.confirm(
        "Refresh will discard unsaved changes. Continue?"
      )
    ) {
      return;
    }

    setRefreshing(true);

    await loadRoles({
      force: true,
      keepSelection: true,
    });
  }

  /* ==========================================
      Loading
  ========================================== */

  if (loading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <div className={`${neo} h-96 animate-pulse rounded-3xl`} />

        <div className={`${neo} h-[600px] animate-pulse rounded-3xl`} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      {/* =====================================
          Role List
      ====================================== */}

      <aside
        className={`${neo} h-fit rounded-3xl p-4`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">
              Roles
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              {roles.length} roles
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={
                refresh
              }
              disabled={
                refreshing
              }
              className="
                grid
                h-9
                w-9
                place-items-center
                rounded-xl
                text-slate-500
                transition
                hover:bg-white
                hover:text-blue-600
                disabled:opacity-50
              "
              title="Refresh roles"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </button>

            {access?.isOwner && (
              <button
                type="button"
                onClick={
                  addRole
                }
                className="
                  grid
                  h-9
                  w-9
                  place-items-center
                  rounded-xl
                  bg-blue-600
                  text-white
                  transition
                  hover:bg-blue-700
                "
                aria-label="Create custom role"
                title="Create custom role"
              >
                <Plus
                  size={16}
                />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {roles.map(
            (role) => {
              const active =
                selected?.id ===
                role.id;

              return (
                <button
                  type="button"
                  key={
                    role.id
                  }
                  onClick={() =>
                    selectRole(
                      role
                    )
                  }
                  className={`
                    w-full
                    rounded-2xl
                    p-3
                    text-left
                    transition
                    ${active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-blue-50"
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm">
                      {
                        role.name
                      }
                    </strong>

                    {role.id ===
                      "owner" && (
                        <ShieldCheck
                          size={
                            15
                          }
                          className="shrink-0"
                        />
                      )}
                  </div>

                  <span className="mt-1 block text-xs opacity-70">
                    {
                      role
                        .permissions
                        .length
                    }{" "}
                    permissions
                  </span>
                </button>
              );
            }
          )}

          {!roles.length && (
            <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400">
              No roles available.
            </p>
          )}
        </div>
      </aside>

      {/* =====================================
          Permission Editor
      ====================================== */}

      {selected ? (
        <section
          className={`${neo} min-w-0 rounded-3xl p-5 sm:p-7`}
        >
          {/* Header */}

          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <ShieldCheck
                  size={
                    21
                  }
                />
              </div>

              <div className="min-w-0">
                {editable ? (
                  <input
                    value={
                      selected.name ||
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      updateName(
                        event
                          .target
                          .value
                      )
                    }
                    className="
                      max-w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-3
                      py-2
                      text-xl
                      font-bold
                      text-slate-800
                      outline-none
                      transition
                      focus:border-blue-400
                    "
                  />
                ) : (
                  <h2 className="truncate text-xl font-bold text-slate-800">
                    {
                      selected.name
                    }
                  </h2>
                )}

                <p className="mt-1 text-sm text-slate-500">
                  {selected.id ===
                    "owner"
                    ? "Immutable full system access"
                    : "Configure module-level actions"}
                </p>
              </div>
            </div>

            {editable && (
              <button
                type="button"
                onClick={
                  save
                }
                disabled={
                  saving ||
                  !dirty
                }
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-2.5
                  font-bold
                  text-white
                  transition
                  hover:bg-blue-700
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {saving ? (
                  <Loader2
                    size={
                      17
                    }
                    className="animate-spin"
                  />
                ) : dirty ? (
                  <Save
                    size={
                      17
                    }
                  />
                ) : (
                  <Check
                    size={
                      17
                    }
                  />
                )}

                {saving
                  ? "Saving..."
                  : dirty
                    ? "Save role"
                    : "Saved"}
              </button>
            )}
          </header>

          {/* Search */}

          <div className="relative mt-5">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={17}
            />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
              placeholder="Search modules or permissions..."
              className="
                h-11
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                pl-10
                pr-3
                text-sm
                outline-none
                transition
                focus:border-blue-400
              "
            />
          </div>

          {/* Permissions */}

          <div className="mt-5 space-y-3">
            {modules.map(
              (
                module
              ) => {
                const open =
                  expanded.has(
                    module
                  );

                const actions =
                  permissionActionsForModule(
                    module
                  );

                const keys =
                  actions.map(
                    (action) =>
                      permissionKey(
                        module,
                        action
                      )
                  );

                const permissions =
                  safePermissions(
                    selected.permissions
                  );

                const all =
                  keys.every(
                    (
                      key
                    ) =>
                      permissions.includes(
                        key
                      )
                  );

                const selectedCount =
                  keys.filter(
                    (
                      key
                    ) =>
                      permissions.includes(
                        key
                      )
                  ).length;

                return (
                  <div
                    key={
                      module
                    }
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <button
                        type="button"
                        onClick={() =>
                          toggleExpanded(
                            module
                          )
                        }
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                      >
                        {open ? (
                          <ChevronUp
                            size={
                              18
                            }
                          />
                        ) : (
                          <ChevronDown
                            size={
                              18
                            }
                          />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <strong className="block capitalize text-slate-700">
                          {
                            module
                          }
                        </strong>

                        <span className="text-xs text-slate-400">
                          {
                            selectedCount
                          }
                          /
                          {
                            keys.length
                          }{" "}
                          enabled
                        </span>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          disabled={
                            !editable
                          }
                          checked={
                            all
                          }
                          onChange={() =>
                            toggleModule(
                              module
                            )
                          }
                          className="h-4 w-4"
                        />

                        Select all
                      </label>
                    </div>

                    {open && (
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 xl:grid-cols-8">
                        {actions.map(
                          (action) => {
                            const key =
                              permissionKey(
                                module,
                                action
                              );

                            const checked =
                              permissions.includes(
                                key
                              );

                            return (
                              <label
                                key={
                                  key
                                }
                                className={`
                                  flex
                                  cursor-pointer
                                  items-center
                                  gap-2
                                  rounded-xl
                                  border
                                  p-3
                                  text-xs
                                  font-semibold
                                  capitalize
                                  transition
                                  ${checked
                                    ? "border-blue-100 bg-blue-50 text-blue-700"
                                    : "border-transparent bg-white text-slate-600"
                                  }
                                `}
                              >
                                <input
                                  type="checkbox"
                                  disabled={
                                    !editable
                                  }
                                  checked={
                                    checked
                                  }
                                  onChange={() =>
                                    toggle(
                                      key
                                    )
                                  }
                                  className="h-4 w-4"
                                />

                                {
                                  action
                                }
                              </label>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}

            {!modules.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                <p className="text-sm text-slate-400">
                  No permissions match your search.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section
          className={`${neo} flex min-h-[400px] items-center justify-center rounded-3xl p-6`}
        >
          <p className="text-sm text-slate-400">
            Select a role to manage permissions.
          </p>
        </section>
      )}
    </div>
  );
}