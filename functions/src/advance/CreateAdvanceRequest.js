'use strict';

const { createHash } = require('node:crypto');
const { activeEmployee } = require('./EmployeeDirectory');

class AdvanceRequestError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const SharoError = AdvanceRequestError;

function safeError(error) {
  if (error instanceof AdvanceRequestError) return error;

  console.error('Advance creation failed', {
    code: error?.code,
  });

  return new AdvanceRequestError(
    'internal',
    'The advance could not be created.',
  );
}

const stableHash = (value) =>
  createHash('sha256').update(value).digest('hex');

const canonicalInputHash = (input) =>
  stableHash(
    JSON.stringify(
      Object.fromEntries(
        Object.keys(input)
          .sort()
          .map((key) => [key, input[key]]),
      ),
    ),
  );

const ALLOWED_FIELDS = new Set([
  'idempotencyKey',
  'employeeFirestoreId',

  'workPurpose',

  'advanceType',
  'amount',

  'projectId',
  'purpose',

  'reason',
  'description',
  'priority',

  'repaymentMethod',
  'monthlyDeduction',
  'months',

  'emergencyContact',
  'requiredDate',
  'attachmentUrl',
]);

function text(value) {
  return String(value ?? '').trim();
}

function finiteNumber(
  value,
  field,
  { required = false } = {},
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    if (required) {
      throw new SharoError(
        'invalid-argument',
        `${field} is required.`,
      );
    }

    return 0;
  }

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    throw new SharoError(
      'invalid-argument',
      `${field} must be a valid number.`,
    );
  }

  return value;
}

function boundedText(
  value,
  field,
  maximum,
  { required = false } = {},
) {
  const result = text(value);

  if (required && !result) {
    throw new SharoError(
      'invalid-argument',
      `${field} is required.`,
    );
  }

  if (result.length > maximum) {
    throw new SharoError(
      'invalid-argument',
      `${field} is too long.`,
    );
  }

  return result;
}

function dateValue(value, field) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new SharoError(
      'invalid-argument',
      `${field} is invalid.`,
    );
  }

  const result = new Date(value);

  if (Number.isNaN(result.getTime())) {
    throw new SharoError(
      'invalid-argument',
      `${field} is invalid.`,
    );
  }

  return result;
}

function validateAdvanceInput(data) {
  const raw =
    data &&
    typeof data === 'object' &&
    !Array.isArray(data)
      ? data
      : {};

  const unexpected = Object.keys(raw).filter(
    (key) => !ALLOWED_FIELDS.has(key),
  );

  if (unexpected.length) {
    throw new SharoError(
      'permission-denied',
      'Advance request contains restricted fields.',
    );
  }

  const idempotencyKey = text(
    raw.idempotencyKey,
  );

  if (
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 128 ||
    !/^[A-Za-z0-9_-]+$/.test(idempotencyKey)
  ) {
    throw new SharoError(
      'invalid-argument',
      'A valid request key is required.',
    );
  }

  const advanceType = text(raw.advanceType);

  if (
    !['Company', 'Personal'].includes(
      advanceType,
    )
  ) {
    throw new SharoError(
      'invalid-argument',
      'Advance type is invalid.',
    );
  }

  const amount = finiteNumber(
    raw.amount,
    'Amount',
    { required: true },
  );

  if (amount <= 0) {
    throw new SharoError(
      'invalid-argument',
      'Amount must be greater than zero.',
    );
  }

  const input = {
    idempotencyKey,

    advanceType,

    amount,

    projectId: boundedText(
      raw.projectId,
      'Project',
      160,
    ),

    purpose: boundedText(
      advanceType === 'Company'
        ? raw.workPurpose
        : raw.purpose,
      'Work purpose',
      500,
    ),

    reason: boundedText(
      raw.reason,
      'Reason',
      500,
    ),

    description: boundedText(
      raw.description,
      'Description',
      2000,
    ),

    priority: boundedText(
      raw.priority,
      'Priority',
      30,
    ),

    repaymentMethod: boundedText(
      raw.repaymentMethod,
      'Repayment method',
      60,
    ),

    monthlyDeduction: finiteNumber(
      raw.monthlyDeduction,
      'Monthly deduction',
    ),

    months: finiteNumber(
      raw.months,
      'Number of months',
    ),

    emergencyContact: boundedText(
      raw.emergencyContact,
      'Emergency contact',
      120,
    ),

    requiredDate: dateValue(
      raw.requiredDate,
      'Required date',
    ),

    attachmentUrl: boundedText(
      raw.attachmentUrl,
      'Attachment',
      2000,
    ),
  };

  if (input.advanceType === 'Company') {
    if (input.projectId.includes('/')) {
      throw new SharoError(
        'invalid-argument',
        'Project ID is invalid.',
      );
    }

    if (!input.projectId) {
      throw new SharoError(
        'invalid-argument',
        'Project is required.',
      );
    }

    if (
      ![
        'Normal',
        'Urgent',
        'Emergency',
      ].includes(input.priority)
    ) {
      throw new SharoError(
        'invalid-argument',
        'Priority is invalid.',
      );
    }

    if (!input.requiredDate) {
      throw new SharoError(
        'invalid-argument',
        'Required date is required.',
      );
    }
  } else {
    if (!input.reason) {
      throw new SharoError(
        'invalid-argument',
        'Reason is required.',
      );
    }

    if (
      ![
        'Salary Deduction',
        'Manual Payment',
      ].includes(input.repaymentMethod)
    ) {
      throw new SharoError(
        'invalid-argument',
        'Repayment method is invalid.',
      );
    }

    if (
      input.repaymentMethod ===
      'Salary Deduction'
    ) {
      if (
        input.monthlyDeduction <= 0 ||
        !Number.isInteger(input.months) ||
        input.months <= 0
      ) {
        throw new SharoError(
          'invalid-argument',
          'A valid repayment plan is required.',
        );
      }
    }
  }

  return input;
}

async function resolveEmployeeActor({
  firestore,
  uid,
}) {
  if (!text(uid)) {
    throw new SharoError(
      'unauthenticated',
      'Authentication is required.',
    );
  }

  const membership = await firestore
    .collection('Usermanagement')
    .doc(uid)
    .get();

  if (!membership.exists) {
    throw new SharoError(
      'permission-denied',
      'Employee membership was not found.',
    );
  }

  const member = membership.data() || {};

  const companyId = text(
    member.companyId,
  );

  const employeeFirestoreId = text(
    member.companyEmployeeId ||
      member.employeeFirestoreId,
  );

  if (
    !companyId ||
    !employeeFirestoreId
  ) {
    throw new SharoError(
      'permission-denied',
      'Employee membership is incomplete.',
    );
  }

  const companyRef = firestore
    .collection('Companies')
    .doc(companyId);

  const [
    companySnapshot,
    employeeSnapshot,
  ] = await Promise.all([
    companyRef.get(),

    companyRef
      .collection('Usermanagement')
      .doc(employeeFirestoreId)
      .get(),
  ]);

  if (
    !companySnapshot.exists ||
    !employeeSnapshot.exists
  ) {
    throw new SharoError(
      'permission-denied',
      'Employee membership is invalid.',
    );
  }

  const company =
    companySnapshot.data() || {};

  const employee =
    employeeSnapshot.data() || {};

  const access =
    employee.access || {};

  const employmentStatus = text(
    employee.employment?.status,
  ).toLowerCase();

  if (
    text(access.authUid) !== uid
  ) {
    throw new SharoError(
      'permission-denied',
      'Employee identity does not match authentication.',
    );
  }

  if (
    text(
      company.serviceStatus || 'active',
    ).toLowerCase() !== 'active'
  ) {
    throw new SharoError(
      'failed-precondition',
      'Company service is inactive.',
    );
  }

  if (
    access.loginEnabled !== true ||
    text(
      access.status,
    ).toLowerCase() !== 'active' ||
    (
      employmentStatus &&
      employmentStatus !== 'active'
    )
  ) {
    throw new SharoError(
      'permission-denied',
      'Employee is inactive.',
    );
  }

  return {
    companyId,
    employeeFirestoreId,
    companyRef,
    company,
    employee,
    isOwner: false,
  };
}

async function resolveAdvanceActor({
  firestore,
  uid,
  auth,
  data,
}) {
  if (!text(uid)) {
    throw new SharoError(
      'unauthenticated',
      'Authentication is required.',
    );
  }

  let owned = null;

  /*
   * OWNER RESOLUTION
   *
   * First trust the authenticated token's
   * companyId only after confirming that
   * company.ownerUid === authenticated UID.
   */
  if (auth?.token?.companyId) {
    const candidate = await firestore
      .collection('Companies')
      .doc(text(auth.token.companyId))
      .get();

    if (
      candidate.exists &&
      candidate.data().ownerUid === uid
    ) {
      owned = candidate;
    }
  }

  /*
   * Existing fallback for owners whose token
   * does not yet contain companyId.
   */
  if (!owned) {
    const matches = await firestore
      .collection('Companies')
      .where('ownerUid', '==', uid)
      .limit(1)
      .get();

    if (!matches.empty) {
      owned = matches.docs[0];
    }
  }

  let actor;

  if (owned) {
    if (
      text(
        owned.data().serviceStatus ||
          'active',
      ).toLowerCase() !== 'active'
    ) {
      throw new SharoError(
        'failed-precondition',
        'Company service is inactive.',
      );
    }

    actor = {
      companyId: owned.id,
      companyRef: owned.ref,
      company: owned.data(),

      employee: null,
      employeeFirestoreId: null,

      isOwner: true,

      requesterEmployeeFirestoreId:
        null,
    };
  } else {
    actor =
      await resolveEmployeeActor({
        firestore,
        uid,
      });

    actor.requesterEmployeeFirestoreId =
      actor.employeeFirestoreId;
  }

  const selected =
    data?.employeeFirestoreId;

  /*
   * If employeeFirestoreId is sent,
   * this is an on-behalf request.
   */
  if (selected !== undefined) {
    const requesterEmployee =
      actor.employee || {};

    const role = text(
      requesterEmployee.access?.roleId ||
        requesterEmployee.roleId ||
        requesterEmployee.employment?.role ||
        'employee',
    ).toLowerCase();

    const permissions = Array.isArray(
      requesterEmployee.access
        ?.effectivePermissions,
    )
      ? requesterEmployee.access
          .effectivePermissions
      : [];

    /*
     * Owner may always select an employee.
     *
     * Non-owner staff must:
     * - not be normal employee role
     * - have advance.create OR advance.manage
     *
     * Normal employees therefore stay self-only.
     */
    const mayActForOthers =
      actor.isOwner ||
      (
        role !== 'employee' &&
        [
          'advance.create',
          'advance.manage',
        ].some((permission) =>
          permissions.includes(permission),
        )
      );

    if (!mayActForOthers) {
      throw new SharoError(
        'permission-denied',
        'On-behalf advance creation is not allowed.',
      );
    }

    if (
      typeof selected !== 'string' ||
      !selected.trim() ||
      selected.includes('/')
    ) {
      throw new SharoError(
        'invalid-argument',
        'Employee document ID is invalid.',
      );
    }

    /*
     * Target is resolved ONLY inside
     * authenticated actor's company.
     *
     * This prevents cross-tenant employee
     * selection.
     */
    const target = await actor.companyRef
      .collection('Usermanagement')
      .doc(selected.trim())
      .get();

    if (
      !target.exists ||
      !activeEmployee(target.data())
    ) {
      throw new SharoError(
        'permission-denied',
        'Selected employee is not active in this company.',
      );
    }

    actor.employeeFirestoreId =
      target.id;

    actor.employee =
      target.data();
  }

  /*
   * Owner has no implicit target employee.
   * Owner therefore must select somebody.
   *
   * Normal employee already has their own
   * employeeFirestoreId from membership.
   */
  if (!actor.employeeFirestoreId) {
    throw new SharoError(
      'invalid-argument',
      'Select an employee for the advance.',
    );
  }

  if (!activeEmployee(actor.employee)) {
    throw new SharoError(
      'permission-denied',
      'Employee is inactive.',
    );
  }

  return actor;
}

function salary(employee) {
  const structure =
    employee.salaryStructure || {};

  for (const value of [
    structure.grossSalary,
    structure.basicSalary,
    structure.ctc,
    employee.salary,
  ]) {
    const parsed =
      typeof value === 'number'
        ? value
        : Number(value);

    if (
      Number.isFinite(parsed) &&
      parsed > 0
    ) {
      return parsed;
    }
  }

  return 0;
}

async function createAdvanceRequestCore({
  firestore,
  fieldValue,
  uid,
  auth,
  data,
}) {
  try {
    /*
     * 1. Validate browser payload first.
     */
    const input =
      validateAdvanceInput(data);

    /*
     * 2. Resolve authenticated actor and
     * trusted target employee.
     */
    const actor =
      await resolveAdvanceActor({
        firestore,
        uid,
        auth,
        data,
      });

    const employee =
      actor.employee;

    const employeeId = text(
      employee.employeeId ||
        employee.login?.employeeId,
    );

    if (!employeeId) {
      throw new SharoError(
        'failed-precondition',
        'Employee business ID is missing.',
      );
    }

    /*
     * Company advance:
     *
     * Project is resolved server-side from
     * this company.
     *
     * We intentionally do NOT require the
     * selected employee to already be assigned
     * to that project because the previous
     * advance workflow did not require it.
     */
    let projectName = '';

    if (
      input.advanceType === 'Company'
    ) {
      const project =
        await actor.companyRef
          .collection(
            'Projectmanagement',
          )
          .doc(input.projectId)
          .get();

      if (!project.exists) {
        throw new SharoError(
          'failed-precondition',
          'The selected project is not available.',
        );
      }

      const projectData =
        project.data() || {};

      const status = text(
        projectData.status,
      ).toLowerCase();

      if (
        [
          'inactive',
          'completed',
          'cancelled',
          'canceled',
          'closed',
          'archived',
        ].includes(status)
      ) {
        throw new SharoError(
          'failed-precondition',
          'The selected project is not available.',
        );
      }

      /*
       * Never trust projectName supplied by
       * browser. Resolve it from Firestore.
       */
      projectName =
        text(
          projectData.projectName ||
            projectData.name,
        ) || 'Untitled Project';
    }

    /*
     * Preserve Personal advance calculation
     * behavior from this implementation.
     */
    const settings =
      actor.company.advanceSettings || {};

    const interestPercent =
      input.advanceType === 'Personal' &&
      input.repaymentMethod ===
        'Salary Deduction'
        ? finiteNumber(
            settings
              .personalAdvanceInterestPercent,
            'Interest rate',
          )
        : 0;

    const interest =
      (
        input.amount *
        interestPercent
      ) / 100;

    const total =
      input.amount + interest;

    let monthlyDeduction = 0;
    let months = 0;

    let firstDeductionDate =
      null;

    let expectedCompletion =
      null;

    if (
      input.advanceType ===
        'Personal' &&
      input.repaymentMethod ===
        'Salary Deduction'
    ) {
      const maximumPercent =
        settings
          .maxSalaryDeductionPercent ===
        undefined
          ? 40
          : finiteNumber(
              settings
                .maxSalaryDeductionPercent,
              'Maximum deduction percentage',
            );

      const maximum =
        (
          salary(employee) *
          Math.min(
            100,
            Math.max(
              0,
              maximumPercent,
            ),
          )
        ) / 100;

      monthlyDeduction =
        input.monthlyDeduction;

      if (
        monthlyDeduction > maximum
      ) {
        throw new SharoError(
          'failed-precondition',
          'Monthly deduction exceeds the allowed limit.',
        );
      }

      months = Math.ceil(
        total / monthlyDeduction,
      );

      /*
       * First salary deduction starts next
       * calendar month.
       */
      const now = new Date();

      firstDeductionDate =
        new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() + 1,
            1,
          ),
        );

      expectedCompletion =
        new Date(
          Date.UTC(
            firstDeductionDate
              .getUTCFullYear(),

            firstDeductionDate
              .getUTCMonth() +
              months -
              1,

            1,
          ),
        );
    }

    /*
     * Include target employee in hash when
     * actor is creating on behalf of another
     * employee.
     */
    const inputHash =
      canonicalInputHash({
        ...input,

        ...(
          actor.employeeFirestoreId !==
          actor.requesterEmployeeFirestoreId
            ? {
                employeeFirestoreId:
                  actor.employeeFirestoreId,
              }
            : {}
        ),

        requiredDate:
          input.requiredDate
            ?.toISOString() || '',
      });

    /*
     * Deterministic idempotency IDs.
     */
    const operationId =
      stableHash(
        `${uid}:${input.idempotencyKey}`,
      ).slice(0, 40);

    const requestId =
      `advance_${operationId}`;

    const operationRef =
      actor.companyRef
        .collection(
          'PrivilegedOperations',
        )
        .doc(
          `createAdvanceRequest_${operationId}`,
        );

    const requestRef =
      actor.companyRef
        .collection(
          'advance_requests',
        )
        .doc(requestId);

    const auditRef =
      actor.companyRef
        .collection('ActivityLogs')
        .doc(
          `advance-request-${requestId}`,
        );

    const result =
      await firestore.runTransaction(
        async (transaction) => {
          /*
           * Re-read company and target employee
           * inside transaction.
           */
          const liveCompany =
            await transaction.get(
              actor.companyRef,
            );

          const liveEmployee =
            await transaction.get(
              actor.companyRef
                .collection(
                  'Usermanagement',
                )
                .doc(
                  actor.employeeFirestoreId,
                ),
            );

          if (
            !liveCompany.exists ||
            !liveEmployee.exists ||
            !activeEmployee(
              liveEmployee.data(),
            ) ||
            text(
              liveCompany.data()
                .serviceStatus ||
                'active',
            ).toLowerCase() !==
              'active'
          ) {
            throw new SharoError(
              'permission-denied',
              'Company or employee is no longer active.',
            );
          }

          /*
           * Owner authority must still exist at
           * transaction time.
           */
          if (
            actor.isOwner &&
            liveCompany.data()
              .ownerUid !== uid
          ) {
            throw new SharoError(
              'permission-denied',
              'Company ownership changed.',
            );
          }

          /*
           * Re-check staff authorization inside
           * transaction so stale client/session
           * permission cannot authorize request.
           */
          if (!actor.isOwner) {
            const requester =
              actor
                .requesterEmployeeFirestoreId ===
              actor.employeeFirestoreId
                ? liveEmployee
                : await transaction.get(
                    actor.companyRef
                      .collection(
                        'Usermanagement',
                      )
                      .doc(
                        actor
                          .requesterEmployeeFirestoreId,
                      ),
                  );

            if (!requester.exists) {
              throw new SharoError(
                'permission-denied',
                'Requester is no longer active.',
              );
            }

            const current =
              requester.data() || {};

            if (
              current.access?.authUid !==
                uid ||
              current.access
                ?.loginEnabled !==
                true ||
              !activeEmployee(current)
            ) {
              throw new SharoError(
                'permission-denied',
                'Requester is no longer active.',
              );
            }

            /*
             * employeeFirestoreId being present
             * means staff intentionally requested
             * another target employee.
             */
            if (
              data
                ?.employeeFirestoreId !==
              undefined
            ) {
              const role = text(
                current.access?.roleId ||
                  current.roleId ||
                  current.employment
                    ?.role ||
                  'employee',
              ).toLowerCase();

              const permissions =
                Array.isArray(
                  current.access
                    ?.effectivePermissions,
                )
                  ? current.access
                      .effectivePermissions
                  : [];

              if (
                role === 'employee' ||
                ![
                  'advance.create',
                  'advance.manage',
                ].some(
                  (permission) =>
                    permissions.includes(
                      permission,
                    ),
                )
              ) {
                throw new SharoError(
                  'permission-denied',
                  'On-behalf permission changed.',
                );
              }
            }
          }

          /*
           * IDEMPOTENCY
           *
           * Same request key + same input returns
           * previous request instead of creating
           * duplicate advance.
           */
          const existing =
            await transaction.get(
              operationRef,
            );

          if (existing.exists) {
            const operation =
              existing.data() || {};

            if (
              operation.inputHash !==
              inputHash
            ) {
              throw new SharoError(
                'already-exists',
                'This request key was used for different Advance data.',
              );
            }

            return {
              requestId: text(
                operation.requestId,
              ),

              status: 'Pending',

              payoutStatus:
                'NOT_INITIATED',
            };
          }

          const liveTarget =
            liveEmployee.data() || {};

          const personal =
            liveTarget.personalInfo ||
            {};

          const employment =
            liveTarget.employment || {};

          const documents =
            liveTarget.documents || {};

          /*
           * Canonical Advance record.
           *
           * IMPORTANT:
           * authUid is intentionally NOT copied
           * from requester because owner/manager
           * may be creating for another employee.
           */
          transaction.create(
            requestRef,
            {
              requestId,

              companyId:
                actor.companyId,

              employeeFirestoreId:
                actor.employeeFirestoreId,

              employeeId,

              employeeName: text(
                personal.fullName ||
                  liveTarget.fullName ||
                  liveTarget.name,
              ),

              employeePhotoUrl: text(
                personal.photoUrl ||
                  documents.photoUrl ||
                  liveTarget.photoUrl,
              ),

              department: text(
                employment.department ||
                  liveTarget.department,
              ),

              designation: text(
                employment.designation ||
                  liveTarget.designation,
              ),

              advanceType:
                input.advanceType,

              projectId:
                input.advanceType ===
                'Company'
                  ? input.projectId
                  : '',

              projectName:
                input.advanceType ===
                'Company'
                  ? projectName
                  : '',

              amount: input.amount,

              reason:
                input.advanceType ===
                'Personal'
                  ? input.reason
                  : '',

              purpose:
                input.advanceType ===
                'Company'
                  ? input.purpose
                  : '',

              description:
                input.advanceType ===
                'Company'
                  ? input.description
                  : '',

              priority:
                input.advanceType ===
                'Company'
                  ? input.priority
                  : 'Normal',

              repaymentMethod:
                input.advanceType ===
                'Personal'
                  ? input.repaymentMethod
                  : 'Expense Settlement',

              monthlyDeduction,

              months,

              remainingAmount:
                total,

              interest,

              status: 'Pending',

              /*
               * Preserve existing payout flow
               * expectation.
               */
              payoutStatus:
                'NOT_INITIATED',

              managerRemarks: '',

              attachmentUrl:
                input.advanceType ===
                'Company'
                  ? input.attachmentUrl
                  : '',

              requiredDate:
                input.advanceType ===
                'Company'
                  ? input.requiredDate
                  : null,

              emergencyContact:
                input.advanceType ===
                'Personal'
                  ? input.emergencyContact
                  : '',

              firstDeductionDate,

              expectedCompletion,

              requestedAt:
                fieldValue
                  .serverTimestamp(),

              approvedAt: null,

              approvedBy: null,

              createdAt:
                fieldValue
                  .serverTimestamp(),

              updatedAt:
                fieldValue
                  .serverTimestamp(),

              settledAmount: 0,

              linkedExpenseId: '',
            },
          );

          /*
           * Preserve the old audit trail.
           */
          transaction.create(
            auditRef,
            {
              type:
                'advance.requested',

              actorId: uid,

              actorEmployeeId:
                actor
                  .requesterEmployeeFirestoreId ||
                null,

              targetUserId:
                actor.employeeFirestoreId,

              companyId:
                actor.companyId,

              metadata: {
                advanceId:
                  requestId,
              },

              createdAt:
                fieldValue
                  .serverTimestamp(),
            },
          );

          /*
           * Idempotency operation record.
           */
          transaction.create(
            operationRef,
            {
              type:
                'createAdvanceRequest',

              actorUid: uid,

              requestId,

              inputHash,

              status: 'completed',

              createdAt:
                fieldValue
                  .serverTimestamp(),

              completedAt:
                fieldValue
                  .serverTimestamp(),

              updatedAt:
                fieldValue
                  .serverTimestamp(),
            },
          );

          return {
            requestId,

            status: 'Pending',

            payoutStatus:
              'NOT_INITIATED',
          };
        },
      );

    return {
      ok: true,

      data: result,

      advanceId:
        result.requestId,

      status:
        result.status,

      payoutStatus:
        result.payoutStatus,
    };
  } catch (error) {
    throw safeError(error);
  }
}

module.exports = {
  AdvanceRequestError,

  ALLOWED_FIELDS,

  createAdvanceRequestCore,

  resolveEmployeeActor,

  validateAdvanceInput,
};