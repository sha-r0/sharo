const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getAdvanceReferenceData,
  createAdvanceRequest,
} = require("../src/advance/AdvanceService");

function harness(
  role = "accounts_manager",
  permissions = ["employee.view", "advance.create"],
) {
  const writes = [];
  const paths = [];

  const employees = {
    caller: {
      employeeId: "EMP-SELF",
      personalInfo: {
        fullName: "Caller Employee",
        photoUrl: "caller-photo",
      },
      employment: {
        status: "Active",
        department: "Accounts",
        designation: "Accounts Manager",
      },
      access: {
        authUid: "caller-uid",
        roleId: role,
        status: "active",
        loginEnabled: true,
        effectivePermissions: permissions,
      },
    },

    target: {
      employeeId: "EMP-007",
      personalInfo: {
        fullName: "Target Employee",
        photoUrl: "target-photo",
      },
      employment: {
        status: "Active",
        department: "Operations",
        designation: "Engineer",
      },
      access: {
        authUid: "target-uid",
        roleId: "employee",
        status: "active",
        loginEnabled: true,
        effectivePermissions: [
          "advance.view",
          "advance.create",
        ],
      },
    },

    inactive: {
      employeeId: "EMP-008",
      personalInfo: {
        fullName: "Inactive Employee",
      },
      employment: {
        status: "Inactive",
      },
      access: {
        authUid: "inactive-uid",
        roleId: "employee",
        status: "inactive",
        loginEnabled: false,
        effectivePermissions: [],
      },
    },
  };

  const projects = {
    "project-a": {
      projectId: "PRJ-001",
      projectName: "Book My Bai",
      status: "Active",
    },
  };

  const stores = {
    Usermanagement: employees,
    Projectmanagement: projects,
    advance_requests: {},
    ActivityLogs: {},
    PrivilegedOperations: {},
  };

  const companyData = {
    ownerUid: "owner-uid",
    serviceStatus: "active",
    advanceSettings: {},
  };

  const rootMemberships = {
    "caller-uid": {
      uid: "caller-uid",
      companyId: "tenant-a",
      companyEmployeeId: "caller",
      employeeFirestoreId: "caller",
      roleId: role,
      status: "active",
    },

    "target-uid": {
      uid: "target-uid",
      companyId: "tenant-a",
      companyEmployeeId: "target",
      employeeFirestoreId: "target",
      roleId: "employee",
      status: "active",
    },
  };

  function snapshot(ref, value) {
    return {
      id: ref.id,
      ref,
      exists: value !== undefined,
      data: () => value,
    };
  }

  function makeDocRef(collectionName, id, store) {
    const ref = {
      id,
      name: collectionName,
      collectionName,
      _store: store,

      async get() {
        return snapshot(
          ref,
          Object.prototype.hasOwnProperty.call(
            store,
            id,
          )
            ? store[id]
            : undefined,
        );
      },
    };

    return ref;
  }

  function makeCollectionRef(
    collectionName,
    store,
  ) {
    return {
      doc(id) {
        return makeDocRef(
          collectionName,
          id,
          store,
        );
      },

      async get() {
        return {
          docs: Object.keys(store).map(
            (id) =>
              snapshot(
                makeDocRef(
                  collectionName,
                  id,
                  store,
                ),
                store[id],
              ),
          ),
        };
      },
    };
  }

  const companyRef = {
    id: "tenant-a",
    name: "Companies",

    async get() {
      return {
        id: "tenant-a",
        ref: companyRef,
        exists: true,
        data: () => companyData,
      };
    },

    collection(name) {
      paths.push(
        `Companies/tenant-a/${name}`,
      );

      if (!stores[name]) {
        stores[name] = {};
      }

      return makeCollectionRef(
        name,
        stores[name],
      );
    },
  };

  const companiesCollection = {
    doc(id) {
      if (id === "tenant-a") {
        return companyRef;
      }

      const missingRef = {
        id,
        name: "Companies",

        async get() {
          return {
            id,
            ref: missingRef,
            exists: false,
            data: () => undefined,
          };
        },

        collection() {
          return makeCollectionRef(
            "missing",
            {},
          );
        },
      };

      return missingRef;
    },

    where(field, operator, value) {
      assert.equal(field, "ownerUid");
      assert.equal(operator, "==");

      return {
        limit() {
          return {
            async get() {
              if (
                value ===
                companyData.ownerUid
              ) {
                return {
                  empty: false,
                  docs: [
                    {
                      id: "tenant-a",
                      ref: companyRef,
                      data: () =>
                        companyData,
                    },
                  ],
                };
              }

              return {
                empty: true,
                docs: [],
              };
            },
          };
        },
      };
    },
  };

  const rootUsersCollection = {
    doc(uid) {
      return makeDocRef(
        "Usermanagement",
        uid,
        rootMemberships,
      );
    },
  };

  const db = {
    collection(name) {
      if (name === "Companies") {
        return companiesCollection;
      }

      if (name === "Usermanagement") {
        return rootUsersCollection;
      }

      throw new Error(
        `Unexpected root collection: ${name}`,
      );
    },

    async runTransaction(callback) {
      const transaction = {
        async get(ref) {
          return ref.get();
        },

        create(ref, data) {
          if (
            ref._store &&
            Object.prototype.hasOwnProperty.call(
              ref._store,
              ref.id,
            )
          ) {
            throw new Error(
              "ALREADY_EXISTS",
            );
          }

          if (ref._store) {
            ref._store[ref.id] = data;
          }

          writes.push({
            ref,
            data,
          });
        },

        update(ref, data) {
          if (!ref._store) {
            throw new Error(
              "INVALID_REF",
            );
          }

          ref._store[ref.id] = {
            ...(ref._store[ref.id] ||
              {}),
            ...data,
          };

          writes.push({
            ref,
            data,
            update: true,
          });
        },
      };

      return callback(transaction);
    },
  };

  const auth = {
    uid:
      role === "owner"
        ? "owner-uid"
        : "caller-uid",

    token: {
      companyId: "tenant-a",
      companyEmployeeId: "caller",
      roleId: role,
    },
  };

  const personalInput = {
    idempotencyKey:
      "request_key_1234567890",

    advanceType: "Personal",

    amount: 1000,

    repaymentMethod:
      "Manual Payment",

    reason:
      "Personal advance request",
  };

  const companyInput = {
    idempotencyKey:
      "company_request_1234567890",

    employeeFirestoreId:
      "target",

    advanceType: "Company",

    amount: 6000,

    projectId: "project-a",

    workPurpose:
      "Site material purchase",

    description:
      "Advance required for project work",

    priority: "Normal",

    requiredDate:
      "2026-10-10T00:00:00.000Z",
  };

  return {
    db,
    auth,
    writes,
    paths,
    stores,
    employees,
    companyData,
    personalInput,
    companyInput,
  };
}

function advanceWrite(h) {
  return h.writes.find(
    (entry) =>
      entry.ref.name ===
      "advance_requests",
  );
}

test(
  "owner, manager and Accounts Manager readers get only tenant active employees",
  async () => {
    const cases = [
      [
        "owner",
        [],
      ],

      [
        "manager",
        [
          "employee.view",
          "advance.create",
        ],
      ],

      [
        "accounts_manager",
        [
          "employee.view",
          "advance.create",
        ],
      ],
    ];

    for (const [
      role,
      permissions,
    ] of cases) {
      const h = harness(
        role,
        permissions,
      );

      const result =
        await getAdvanceReferenceData(
          h.db,
          {
            auth: h.auth,
            data: {},
          },
        );

      assert.equal(
        result.companyId,
        "tenant-a",
      );

      assert.deepEqual(
        result.employees
          .map(
            (employee) =>
              employee.id,
          )
          .sort(),
        [
          "caller",
          "target",
        ],
      );

      const target =
        result.employees.find(
          (employee) =>
            employee.id ===
            "target",
        );

      assert.equal(
        target.employeeId,
        "EMP-007",
      );

      assert.equal(
        target.access,
        undefined,
      );

      assert.ok(
        h.paths.every((path) =>
          path.startsWith(
            "Companies/tenant-a/",
          ),
        ),
      );
    }
  },
);

test(
  "normal employee remains self-only even with employee.view",
  async () => {
    const h = harness(
      "employee",
      [
        "employee.view",
        "advance.create",
      ],
    );

    const reference =
      await getAdvanceReferenceData(
        h.db,
        {
          auth: h.auth,
          data: {},
        },
      );

    assert.deepEqual(
      reference.employees,
      [],
    );

    await assert.rejects(
      createAdvanceRequest(
        h.db,
        {
          auth: h.auth,

          data: {
            ...h.personalInput,

            employeeFirestoreId:
              "target",
          },
        },
      ),

      /On-behalf advance creation is not allowed/,
    );

    assert.equal(
      h.writes.length,
      0,
    );
  },
);

test(
  "staff without on-behalf permission cannot create for another employee",
  async () => {
    const h = harness(
      "accounts_manager",
      ["employee.view"],
    );

    await assert.rejects(
      createAdvanceRequest(
        h.db,
        {
          auth: h.auth,

          data: {
            ...h.personalInput,

            employeeFirestoreId:
              "target",
          },
        },
      ),

      /On-behalf advance creation is not allowed/,
    );

    assert.equal(
      h.writes.length,
      0,
    );
  },
);

test(
  "Accounts Manager resolves selected Firestore ID to trusted employee business ID",
  async () => {
    const h = harness(
      "accounts_manager",
      [
        "employee.view",
        "advance.create",
      ],
    );

    const response =
      await createAdvanceRequest(
        h.db,
        {
          auth: h.auth,

          data: {
            ...h.personalInput,

            employeeFirestoreId:
              "target",
          },
        },
      );

    const write =
      advanceWrite(h);

    assert.ok(write);

    assert.equal(
      write.data.employeeFirestoreId,
      "target",
    );

    assert.equal(
      write.data.employeeId,
      "EMP-007",
    );

    assert.equal(
      write.data.employeeName,
      "Target Employee",
    );

    assert.equal(
      write.data.companyId,
      "tenant-a",
    );

    assert.equal(
      write.data.status,
      "Pending",
    );

    assert.equal(
      write.data.payoutStatus,
      "NOT_INITIATED",
    );

    assert.equal(
      write.data.authUid,
      undefined,
    );

    assert.equal(
      response.status,
      "Pending",
    );

    assert.equal(
      response.payoutStatus,
      "NOT_INITIATED",
    );
  },
);

test(
  "owner can create an advance on behalf of active employee",
  async () => {
    const h = harness(
      "owner",
      [],
    );

    const response =
      await createAdvanceRequest(
        h.db,
        {
          auth: h.auth,

          data: {
            ...h.personalInput,

            employeeFirestoreId:
              "target",
          },
        },
      );

    const write =
      advanceWrite(h);

    assert.ok(write);

    assert.equal(
      write.data.employeeFirestoreId,
      "target",
    );

    assert.equal(
      write.data.employeeId,
      "EMP-007",
    );

    assert.equal(
      write.data.companyId,
      "tenant-a",
    );

    assert.equal(
      write.data.status,
      "Pending",
    );

    assert.equal(
      response.status,
      "Pending",
    );
  },
);

test(
  "normal employee can create only their own advance",
  async () => {
    const h = harness(
      "employee",
      ["advance.create"],
    );

    const response =
      await createAdvanceRequest(
        h.db,
        {
          auth: h.auth,

          data: {
            ...h.personalInput,
          },
        },
      );

    const write =
      advanceWrite(h);

    assert.ok(write);

    assert.equal(
      write.data.employeeFirestoreId,
      "caller",
    );

    assert.equal(
      write.data.employeeId,
      "EMP-SELF",
    );

    assert.equal(
      write.data.employeeName,
      "Caller Employee",
    );

    assert.equal(
      write.data.companyId,
      "tenant-a",
    );

    assert.equal(
      write.data.status,
      "Pending",
    );

    assert.equal(
      response.status,
      "Pending",
    );
  },
);

test(
  "inactive, missing and path-injected employees cannot be selected",
  async () => {
    const cases = [
      [
        "inactive",
        /Selected employee is not active in this company/,
      ],

      [
        "foreign-only-id",
        /Selected employee is not active in this company/,
      ],

      [
        "tenant-b/target",
        /Employee document ID is invalid/,
      ],
    ];

    for (const [
      employeeFirestoreId,
      expectedError,
    ] of cases) {
      const h = harness(
        "accounts_manager",
        [
          "employee.view",
          "advance.create",
        ],
      );

      await assert.rejects(
        createAdvanceRequest(
          h.db,
          {
            auth: h.auth,

            data: {
              ...h.personalInput,
              employeeFirestoreId,
            },
          },
        ),

        expectedError,
      );

      assert.equal(
        h.writes.length,
        0,
      );
    }
  },
);

test(
  "Company advance uses canonical project and employee values",
  async () => {
    const h = harness(
      "accounts_manager",
      [
        "employee.view",
        "advance.create",
      ],
    );

    const response =
      await createAdvanceRequest(
        h.db,
        {
          auth: h.auth,
          data: h.companyInput,
        },
      );

    const write =
      advanceWrite(h);

    assert.ok(write);

    assert.equal(
      write.data.employeeFirestoreId,
      "target",
    );

    assert.equal(
      write.data.employeeId,
      "EMP-007",
    );

    assert.equal(
      write.data.projectId,
      "project-a",
    );

    assert.equal(
      write.data.projectName,
      "Book My Bai",
    );

    assert.equal(
      write.data.purpose,
      "Site material purchase",
    );

    assert.equal(
      write.data.amount,
      6000,
    );

    assert.equal(
      write.data.priority,
      "Normal",
    );

    assert.equal(
      write.data.repaymentMethod,
      "Expense Settlement",
    );

    assert.equal(
      write.data.status,
      "Pending",
    );

    assert.equal(
      write.data.payoutStatus,
      "NOT_INITIATED",
    );

    assert.equal(
      response.status,
      "Pending",
    );
  },
);

test(
  "restricted browser identity and tenant fields are rejected",
  async () => {
    const restrictedFields = [
      {
        companyId:
          "tenant-b",
      },

      {
        employeeId:
          "FORGED",
      },

      {
        projectName:
          "Forged Project",
      },

      {
        firstDeductionDate:
          "2026-10-10",
      },
    ];

    for (const restricted of restrictedFields) {
      const h = harness(
        "accounts_manager",
        [
          "employee.view",
          "advance.create",
        ],
      );

      await assert.rejects(
        createAdvanceRequest(
          h.db,
          {
            auth: h.auth,

            data: {
              ...h.personalInput,
              ...restricted,
            },
          },
        ),

        /Advance request contains restricted fields/,
      );

      assert.equal(
        h.writes.length,
        0,
      );
    }
  },
);

test(
  "same idempotency key does not create duplicate advance",
  async () => {
    const h = harness(
      "accounts_manager",
      [
        "employee.view",
        "advance.create",
      ],
    );

    const data = {
      ...h.personalInput,

      employeeFirestoreId:
        "target",
    };

    const first =
      await createAdvanceRequest(
        h.db,
        {
          auth: h.auth,
          data,
        },
      );

    const writesAfterFirst =
      h.writes.length;

    const second =
      await createAdvanceRequest(
        h.db,
        {
          auth: h.auth,
          data,
        },
      );

    assert.equal(
      first.advanceId,
      second.advanceId,
    );

    assert.equal(
      h.writes.length,
      writesAfterFirst,
    );

    assert.equal(
      Object.keys(
        h.stores.advance_requests,
      ).length,
      1,
    );

    assert.equal(
      Object.keys(
        h.stores.PrivilegedOperations,
      ).length,
      1,
    );

    assert.equal(
      Object.keys(
        h.stores.ActivityLogs,
      ).length,
      1,
    );
  },
);

test(
  "reference API rejects client supplied tenant",
  async () => {
    const h = harness();

    await assert.rejects(
      getAdvanceReferenceData(
        h.db,
        {
          auth: h.auth,

          data: {
            companyId:
              "tenant-b",
          },
        },
      ),

      /INVALID_REFERENCE_INPUT/,
    );
  },
);