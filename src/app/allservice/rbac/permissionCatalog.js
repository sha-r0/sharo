export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
  "print",
  "manage",
];

export const PERMISSION_ACTIONS_BY_MODULE = {
  performance: [
    "view",
    "manage",
  ],
};

export function permissionActionsForModule(
  module
) {
  return (
    PERMISSION_ACTIONS_BY_MODULE[
      module
    ] ||
    PERMISSION_ACTIONS
  );
}

export const PERMISSION_MODULES = [
  "dashboard",
  "employee",
  "attendance",
  "gps",
  "leave",
  "advance",
  "expense",
  "projects",
  "clients",
  "vendors",
  "inventory",
  "billing",
  "invoices",
  "payroll",
  "reports",
  "notifications",
  "settings",
  "company",
  "quotation",
  "purchase_order",
  "performance",
  "site_assignment",
];

export const permissionKey = (module, action) =>
  `${module}.${action}`;

export const DEDICATED_PERMISSIONS = [
  "payout.execute",
  "purchase_order.issue",
  "purchase_order.cancel",
  "purchase_order.fulfill",
  "purchase_order.bill",
  "performance.manage",
];

export const ALL_PERMISSIONS = [
  ...PERMISSION_MODULES.flatMap(
    (module) =>
      permissionActionsForModule(
        module
      )
        .map((action) =>
          permissionKey(
            module,
            action
          )
        )
        .filter(
          (permission) =>
            permission !==
            "performance.manage"
        )
  ),

  ...DEDICATED_PERMISSIONS,
];

export const DEFAULT_ROLE_LEVELS = {
  owner: 100,
  admin: 90,
  hr_manager: 70,
  accounts_manager: 70,
  project_manager: 60,
  manager: 60,
  team_leader: 50,
  employee: 10,
};

export function calculateEffectivePermissions({
  rolePermissions = [],
  grantedPermissions = [],
  deniedPermissions = [],
}) {
  const valid = new Set(
    ALL_PERMISSIONS
  );

  const permissions =
    new Set(
      [
        ...rolePermissions,
        ...grantedPermissions,
      ].filter(
        (permission) =>
          valid.has(
            permission
          )
      )
    );

  deniedPermissions
    .filter(
      (permission) =>
        valid.has(
          permission
        )
    )
    .forEach(
      (permission) =>
        permissions.delete(
          permission
        )
    );

  return [
    ...permissions,
  ];
}

const modulePermissions = (
  modules,
  actions = PERMISSION_ACTIONS,
) =>
  modules.flatMap((module) =>
    actions.map((action) =>
      permissionKey(module, action),
    ),
  );

const commonActions = [
  "view",
  "create",
  "edit",
  "approve",
  "export",
  "print",
];

export const ROLE_TEMPLATES = {
  owner: {
    name: "Owner",
    level: 100,
    system: true,
    isActive: true,

    canAssignRoles: [
      "admin",
      "hr_manager",
      "accounts_manager",
      "project_manager",
      "manager",
      "team_leader",
      "employee",
    ],

    canManagePermissions: true,

    permissions: ALL_PERMISSIONS,
  },

  hr_manager: {
    name: "HR Manager",
    level: 70,
    system: true,
    isActive: true,

    canAssignRoles: [
      "project_manager",
      "manager",
      "team_leader",
      "employee",
    ],

    canManagePermissions: true,

    permissions: [
      ...modulePermissions(
        [
          "dashboard",
          "employee",
          "attendance",
          "gps",
          "leave",
          "payroll",
          "reports",
          "notifications",
          "site_assignment",
        ],
        [...commonActions, "manage"],
      ),

      ...modulePermissions(
        ["performance"],
        ["view"],
      ),
    ],
  },

  accounts_manager: {
    name: "Accounts Manager",
    level: 70,
    system: true,
    isActive: true,

    canAssignRoles: ["employee"],

    canManagePermissions: false,

    permissions: [
      "employee.view",
      "advance.delete",

      ...modulePermissions(
        [
          "dashboard",
          "expense",
          "advance",
          "billing",
          "invoices",
          "vendors",
          "reports",
          "notifications",
        ],
        commonActions,
      ),

      ...modulePermissions(
        ["purchase_order"],
        [
          "view",
          "create",
          "edit",
          "approve",
        ],
      ),

      "payout.execute",
      "purchase_order.issue",
      "purchase_order.cancel",
      "purchase_order.fulfill",
      "purchase_order.bill",
    ],
  },

  project_manager: {
    name: "Project Manager",
    level: 60,
    system: true,
    isActive: true,

    canAssignRoles: [
      "team_leader",
      "employee",
    ],

    canManagePermissions: false,

    permissions: [
      ...modulePermissions(
        [
          "dashboard",
          "projects",
          "employee",
          "attendance",
          "gps",
          "expense",
          "clients",
          "reports",
          "notifications",
          "site_assignment",
        ],
        commonActions,
      ),

      ...modulePermissions(
        ["performance"],
        ["view"],
      ),
    ],
  },

  team_leader: {
    name: "Team Leader",
    level: 50,
    system: true,
    isActive: true,

    canAssignRoles: ["employee"],

    canManagePermissions: false,

    permissions: [
      ...modulePermissions(
        [
          "dashboard",
          "projects",
          "employee",
          "attendance",
          "gps",
          "leave",
          "notifications",
        ],
        [
          "view",
          "create",
          "edit",
          "approve",
        ],
      ),

      /*
       * Team Leader can create/edit assignments,
       * but backend MUST restrict them to employees
       * belonging to the same teamId.
       */
      ...modulePermissions(
        ["site_assignment"],
        [
          "view",
          "create",
          "edit",
        ],
      ),

      ...modulePermissions(
        ["performance"],
        ["view"],
      ),
    ],
  },

  employee: {
    name: "Employee",
    level: 10,
    system: true,
    isActive: true,

    canAssignRoles: [],

    canManagePermissions: false,

    permissions: modulePermissions(
      [
        "dashboard",
        "attendance",
        "gps",
        "leave",
        "advance",
        "expense",
        "projects",
        "notifications",
      ],
      [
        "view",
        "create",
        "edit",
      ],
    ),
  },
};

export const normalizeRoleId = (value) =>
  String(value || "employee")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");

export const permissionsForRole = (roleId) =>
  ROLE_TEMPLATES[
    normalizeRoleId(roleId)
  ]?.permissions || [];

/*
 * =========================================================
 * ROUTE PERMISSIONS
 * =========================================================
 */

export const ROUTE_PERMISSIONS = [
  /*
   * Expenses
   */
  [
    "/manager/expenses/add",
    "expense.create",
  ],
  [
    "/manager/expenses/setup",
    "expense.manage",
  ],

  /*
   * Employees
   */
  [
    "/manager/userManagement/add",
    "employee.create",
  ],
  [
    "/manager/userManagement/edit",
    "employee.edit",
  ],
  [
    "/manager/userManagement",
    "employee.view",
  ],

  /*
   * Billing
   */
  [
    "/manager/billing/new",
    "billing.create",
  ],
  [
    "/manager/billing/settings",
    "billing.manage",
  ],

  /*
   * Performance
   */
  [
    "/manager/performance",
    "performance.view",
  ],

  /*
   * Company Settings
   */
  [
    "/manager/settings",
    "company.manage",
  ],

  /*
   * Quotations
   */
  [
    "/manager/quotation-builder/new",
    "quotation.create",
  ],
  [
    "/manager/quotation-builder/setup",
    "quotation.manage",
  ],
  [
    "/manager/quotation-builder",
    "quotation.view",
  ],

  /*
   * Workforce
   */
  [
    "/manager/Workforce/payroll",
    "payroll.view",
  ],

  [
    "/manager/Workforce/esi-pf",
    "payroll.view",
  ],

  /*
   * NEW SITE ASSIGNMENT MODULE
   */
  [
    "/manager/Workforce/site-assignments",
    "site_assignment.view",
  ],

  [
    "/manager/Workforce/attendance",
    "attendance.view",
  ],

  [
    "/manager/Workforce/gps-approval",
    "gps.view",
  ],

  [
    "/manager/Workforce/leave-approval",
    "leave.view",
  ],

  [
    "/manager/Workforce/leave-policy",
    "leave.manage",
  ],

  [
    "/manager/Workforce/shift-policy",
    "settings.manage",
  ],

  /*
   * Workforce fallback MUST remain after
   * specific Workforce routes.
   */
  [
    "/manager/Workforce",
    "attendance.view",
  ],

  /*
   * Projects
   */
  [
    "/manager/projects",
    "projects.view",
  ],

  /*
   * Clients
   */
  [
    "/manager/clients",
    "clients.view",
  ],

  /*
   * Vendors
   */
  [
    "/manager/vendors",
    "vendors.view",
  ],

  /*
   * Expenses
   */
  [
    "/manager/expenses",
    "expense.view",
  ],

  /*
   * Advances
   */
  [
    "/manager/advance",
    "advance.view",
  ],

  /*
   * Billing
   */
  [
    "/manager/billing",
    "billing.view",
  ],

  /*
   * Purchase Orders
   */
  [
    "/manager/purchase-orders/new",
    "purchase_order.create",
  ],
  [
    "/manager/purchase-orders",
    "purchase_order.view",
  ],

  /*
   * Notifications
   */
  [
    "/manager/notifications",
    "notifications.view",
  ],
  [
    "/manager/notice",
    "notifications.manage",
  ],

  /*
   * Dashboard fallback
   */
  [
    "/manager",
    "dashboard.view",
  ],
].sort(
  (a, b) =>
    b[0].length - a[0].length,
);

export const permissionForPath = (
  pathname,
) =>
  ROUTE_PERMISSIONS.find(
    ([route]) =>
      pathname === route ||
      pathname.startsWith(
        `${route}/`,
      ),
  )?.[1] || null;