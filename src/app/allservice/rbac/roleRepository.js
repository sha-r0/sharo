import {
  collection,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";

import {
  auth,
  db,
} from "@/lib/firebase";

import {
  ROLE_TEMPLATES,
  normalizeRoleId,
} from "./permissionCatalog";

const CACHE_TTL =
  5 * 60 * 1000;

const rolesRef = (companyId) =>
  collection(
    db,
    "Companies",
    companyId,
    "Roles"
  );

function normalizePermissions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) =>
          String(item || "").trim()
        )
        .filter(Boolean)
    ),
  ];
}

function normalizeRole(
  role,
  fallbackId = ""
) {
  const id =
    normalizeRoleId(
      role?.id ||
        fallbackId ||
        role?.name ||
        ""
    );

  return {
    ...role,

    id,

    name:
      String(
        role?.name ||
          id ||
          "Role"
      ).trim(),

    description:
      String(
        role?.description || ""
      ).trim(),

    permissions:
      normalizePermissions(
        role?.permissions
      ),

    system:
      Boolean(role?.system),
  };
}

class RoleRepository {
  constructor() {
    this.cache =
      new Map();
  }

  /* ==========================================
      Cache
  ========================================== */

  cacheKey(companyId) {
    return `roles:${companyId}`;
  }

  invalidate(companyId) {
    if (!companyId) return;

    this.cache.delete(
      this.cacheKey(companyId)
    );
  }

  /* ==========================================
      List Roles
  ========================================== */

  async list(
    companyId,
    {
      force = false,
    } = {}
  ) {
    if (!companyId) {
      return [];
    }

    const key =
      this.cacheKey(companyId);

    const cached =
      this.cache.get(key);

    if (
      !force &&
      cached &&
      Date.now() -
        cached.savedAt <
        CACHE_TTL
    ) {
      return cached.data.map(
        (role) => ({
          ...role,
          permissions: [
            ...role.permissions,
          ],
        })
      );
    }

    const snapshot =
      await getDocs(
        rolesRef(companyId)
      );

    const custom =
      snapshot.docs.map(
        (item) =>
          normalizeRole(
            {
              id: item.id,
              ...item.data(),
            },
            item.id
          )
      );

    const customIds =
      new Set(
        custom.map(
          (item) => item.id
        )
      );

    const systemRoles =
      Object.entries(
        ROLE_TEMPLATES
      )
        .filter(
          ([id]) =>
            !customIds.has(
              normalizeRoleId(id)
            )
        )
        .map(
          ([id, role]) =>
            normalizeRole(
              {
                id,
                ...role,
              },
              id
            )
        );

    const roles = [
      ...systemRoles,
      ...custom,
    ].sort((a, b) => {
      if (a.id === "owner") {
        return -1;
      }

      if (b.id === "owner") {
        return 1;
      }

      return a.name.localeCompare(
        b.name
      );
    });

    this.cache.set(key, {
      data: roles,
      savedAt: Date.now(),
    });

    return roles.map(
      (role) => ({
        ...role,
        permissions: [
          ...role.permissions,
        ],
      })
    );
  }

  /* ==========================================
      Save Role
  ========================================== */

  async save(
    companyId,
    role,
    actorId
  ) {
    if (!companyId) {
      throw new Error(
        "Company ID is required."
      );
    }

    if (!role) {
      throw new Error(
        "Role information is required."
      );
    }

    const name =
      String(
        role.name || ""
      ).trim();

    if (!name) {
      throw new Error(
        "Role name is required."
      );
    }

    const id =
      normalizeRoleId(
        role.id || name
      );

    if (!id) {
      throw new Error(
        "Unable to generate role ID."
      );
    }

    if (id === "owner") {
      throw new Error(
        "The Owner role is immutable."
      );
    }

    const token =
      await auth.currentUser?.getIdToken();

    if (!token) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    const payload = {
      id,

      name,

      description:
        String(
          role.description || ""
        ).trim(),

      permissions:
        normalizePermissions(
          role.permissions
        ),

      system:
        Boolean(role.system),

      actorId:
        actorId || undefined,
    };

    const response =
      await fetch(
        "/api/rbac/roles",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const result =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result?.error ||
          "Unable to save role."
      );
    }

    this.invalidate(
      companyId
    );

    return {
      id,
      role:
        normalizeRole(
          {
            ...payload,
            ...(result?.role ||
              {}),
          },
          id
        ),
    };
  }

  /* ==========================================
      Delete Role
  ========================================== */

  async remove(
    companyId,
    roleId
  ) {
    if (
      !companyId ||
      !roleId
    ) {
      throw new Error(
        "Role information is incomplete."
      );
    }

    const normalizedId =
      normalizeRoleId(roleId);

    if (
      normalizedId ===
      "owner"
    ) {
      throw new Error(
        "The Owner role cannot be deleted."
      );
    }

    if (
      ROLE_TEMPLATES[
        normalizedId
      ]?.system
    ) {
      throw new Error(
        "System roles cannot be deleted."
      );
    }

    await deleteDoc(
      doc(
        db,
        "Companies",
        companyId,
        "Roles",
        normalizedId
      )
    );

    this.invalidate(
      companyId
    );

    return {
      success: true,
    };
  }
}

export default new RoleRepository();