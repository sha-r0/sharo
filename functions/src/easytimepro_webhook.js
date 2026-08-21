'use strict';

const crypto = require('node:crypto');
const logger = require('firebase-functions/logger');
const {resolveEffectiveShift, snapshot, lateMinutes, workingMinutes, statusFor} = require('./shift_policy_resolver');

const PROVIDER = 'easytimepro';
const INDIA_OFFSET_MINUTES = 330;

function text(value) { return String(value ?? '').trim(); }
function normalizeEmployeeCode(value) {
  const raw = text(value);
  if (!raw) return '';
  return /^\d+$/.test(raw) ? raw.replace(/^0+(?=\d)/, '') : raw;
}
function secureEqual(left, right) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function validBasicAuth(header, username, password) {
  if (!text(header).startsWith('Basic ') || !username || !password) return false;
  let decoded;
  try { decoded = Buffer.from(text(header).slice(6), 'base64').toString('utf8'); } catch (_) { return false; }
  const separator = decoded.indexOf(':');
  return separator >= 0 && secureEqual(decoded.slice(0, separator), username) &&
    secureEqual(decoded.slice(separator + 1), password);
}

function parsePunchDateTime(value, offsetMinutes = INDIA_OFFSET_MINUTES) {
  const match = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(text(value));
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min, ss] = match.map(Number);
  const utc = Date.UTC(yyyy, mm - 1, dd, hh, min, ss) - offsetMinutes * 60000;
  const date = new Date(utc);
  const shifted = new Date(date.getTime() + offsetMinutes * 60000);
  if (shifted.getUTCFullYear() !== yyyy || shifted.getUTCMonth() !== mm - 1 || shifted.getUTCDate() !== dd ||
      shifted.getUTCHours() !== hh || shifted.getUTCMinutes() !== min || shifted.getUTCSeconds() !== ss) return null;
  return {date, parts: {year: yyyy, month: mm, day: dd, hour: hh, minute: min, second: ss},
    dateKey: `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
    monthKey: `${yyyy}-${String(mm).padStart(2, '0')}`};
}

function eventId(companyId, event) {
  return crypto.createHash('sha256').update([
    companyId, text(event.TERMINAL_SN), text(event.EMP_CODE), text(event.PUNCH_DATETIME),
    text(event.PUNCH_STATE), text(event.VERIFY_TYPE),
  ].join('|')).digest('hex');
}

async function resolveDevice(firestore, terminalSn) {
  const result = await firestore.collectionGroup('AttendanceDevices').where('terminalSn', '==', terminalSn).get();
  const matches = result.docs.filter((doc) => {
    const value = doc.data();
    return value.active === true && text(value.provider).toLowerCase() === PROVIDER && doc.ref.parent.parent;
  });
  if (matches.length !== 1) return {status: matches.length ? 'ambiguous_terminal' : 'unknown_terminal'};
  return {status: 'ready', device: matches[0].data(), companyRef: matches[0].ref.parent.parent};
}

async function resolveEmployee(companyRef, empCode) {
  const employees = companyRef.collection('Usermanagement');
  const explicit = await employees.where('attendanceHardware.easyTimeProEmpCode', '==', empCode).get();
  const exact = explicit.docs.filter((doc) => {
    const hardware = doc.data().attendanceHardware || {};
    return hardware.active === true && text(hardware.provider).toLowerCase() === PROVIDER;
  });
  if (exact.length === 1) return {status: 'ready', employeeDoc: exact[0]};
  if (exact.length > 1) return {status: 'ambiguous_employee', candidates: exact.map((doc) => doc.id)};
  const fallback = await employees.where('employeeId', '==', empCode).get();
  if (fallback.size === 1) return {status: 'ready', employeeDoc: fallback.docs[0]};
  if (fallback.size > 1) return {status: 'ambiguous_employee', candidates: fallback.docs.map((doc) => doc.id)};

  const normalizedCode = normalizeEmployeeCode(empCode);
  if (!/^\d+$/.test(empCode) || !normalizedCode) return {status: 'unmapped_employee', candidates: []};
  const all = await employees.get();
  const normalized = new Map();
  for (const doc of all.docs) {
    const employee = doc.data() || {};
    const hardware = employee.attendanceHardware || {};
    const identifiers = [text(employee.employeeId)];
    if (hardware.active === true && text(hardware.provider).toLowerCase() === PROVIDER) {
      identifiers.unshift(text(hardware.easyTimeProEmpCode));
    }
    if (identifiers.some((identifier) => /^\d+$/.test(identifier) && normalizeEmployeeCode(identifier) === normalizedCode)) {
      normalized.set(doc.id, doc);
    }
  }
  const matches = [...normalized.values()];
  if (matches.length === 1) return {status: 'ready', employeeDoc: matches[0]};
  return {status: matches.length > 1 ? 'ambiguous_employee' : 'unmapped_employee', candidates: matches.map((doc) => doc.id)};
}

async function processEvent({firestore, fieldValue, timestamp, event, diagnostic = {}}) {
  const terminalSn = text(event.TERMINAL_SN); const empCode = text(event.EMP_CODE);
  diagnostic.terminalSn = terminalSn;
  diagnostic.eventIdPrefix = crypto.createHash('sha256').update([
    terminalSn, empCode, text(event.PUNCH_DATETIME), text(event.PUNCH_STATE), text(event.VERIFY_TYPE),
  ].join('|')).digest('hex').slice(0, 12);
  diagnostic.stage = 'parse_event';
  const parsed = parsePunchDateTime(event.PUNCH_DATETIME);
  if (!terminalSn || !empCode || !parsed) return {status: 'invalid'};
  diagnostic.stage = 'device_lookup';
  const mapping = await resolveDevice(firestore, terminalSn);
  if (mapping.status !== 'ready') return {status: mapping.status};
  const companyRef = mapping.companyRef; const companyId = companyRef.id;
  diagnostic.companyId = companyId;
  diagnostic.stage = 'employee_lookup';
  const employeeMapping = await resolveEmployee(companyRef, empCode);
  const employeeDoc = employeeMapping.employeeDoc;
  const rawRef = companyRef.collection('HardwareAttendanceEvents').doc(eventId(companyId, event));
  if (!employeeDoc) {
    const processingStatus = employeeMapping.status === 'ambiguous_employee' ? 'ambiguous_employee' : 'unmapped_employee';
    await rawRef.set({provider: PROVIDER, companyId, terminalSn, terminalAlias: text(event.TERMINAL_ALIAS), empCode,
      normalizedEmpCode: normalizeEmployeeCode(empCode), mappingCandidateCount: employeeMapping.candidates.length,
      rawPunchDateTime: text(event.PUNCH_DATETIME), punchTimestamp: timestamp.fromDate(parsed.date),
      punchState: text(event.PUNCH_STATE), verifyType: text(event.VERIFY_TYPE), source: 'hardware',
      receivedAt: fieldValue.serverTimestamp(), processedAt: fieldValue.serverTimestamp(), processingStatus});
    if (processingStatus === 'ambiguous_employee') {
      logger.write({severity: 'WARNING', message: 'easytimepro_employee_mapping_ambiguous', companyId,
        terminalSn, empCode, normalizedEmpCode: normalizeEmployeeCode(empCode),
        candidateEmployeeFirestoreIds: employeeMapping.candidates});
    }
    return {status: 'unmapped'};
  }
  diagnostic.employeeFirestoreId = employeeDoc.id;
  diagnostic.stage = 'shift_policy_load';
  const company = (await companyRef.get()).data() || {};
  const shifts = (await companyRef.collection('ShiftPolicies').get()).docs.map((doc) => ({id: doc.id, ...doc.data()}));
  const employee = employeeDoc.data() || {};
  const shift = resolveEffectiveShift(employee, company, shifts);
  if (!shift) {
    await rawRef.set({provider: PROVIDER, companyId, employeeFirestoreId: employeeDoc.id,
      employeeId: text(employee.employeeId), terminalSn, terminalAlias: text(event.TERMINAL_ALIAS), empCode,
      rawPunchDateTime: text(event.PUNCH_DATETIME), punchTimestamp: timestamp.fromDate(parsed.date),
      punchState: text(event.PUNCH_STATE), verifyType: text(event.VERIFY_TYPE), source: 'hardware',
      receivedAt: fieldValue.serverTimestamp(), processedAt: fieldValue.serverTimestamp(), processingStatus: 'shift_unresolved'});
    return {status: 'unmapped'};
  }
  const attendanceRef = employeeDoc.ref.collection('Attendance').doc(parsed.dateKey);
  const mirrorRef = companyRef.collection('Attendance').doc(`${employeeDoc.id}_${parsed.dateKey}`);
  diagnostic.stage = 'attendance_transaction';
  return firestore.runTransaction(async (transaction) => {
    const [raw, attendance] = await Promise.all([transaction.get(rawRef), transaction.get(attendanceRef)]);
    if (raw.exists) return {status: 'duplicate'};
    const existing = attendance.exists ? attendance.data() || {} : {};
    const attendanceShift = existing.shiftPolicy && typeof existing.shiftPolicy === 'object'
      ? {...shift, ...existing.shiftPolicy}
      : shift;
    const punch = parsed.date; const currentIn = toDate(existing.checkIn); const currentOut = toDate(existing.checkOut);
    const hardware = {terminalSn, terminalAlias: text(event.TERMINAL_ALIAS), verifyType: text(event.VERIFY_TYPE), empCode};
    const updates = attendanceUpdate({existing, punch, parsed, shift: attendanceShift, hardware, fieldValue, timestamp});
    const synchronized = {...existing, ...updates, companyId, employeeFirestoreId: employeeDoc.id,
      employeeId: text(employee.employeeId), employeeName: employeeName(employee), date: parsed.dateKey,
      dateKey: parsed.dateKey, month: parsed.monthKey, year: parsed.parts.year, mirrorVersion: 2};
    transaction.set(attendanceRef, synchronized, {merge: true});
    transaction.set(mirrorRef, synchronized, {merge: true});
    transaction.create(rawRef, {provider: PROVIDER, companyId, employeeFirestoreId: employeeDoc.id,
      employeeId: text(employee.employeeId), terminalSn, terminalAlias: text(event.TERMINAL_ALIAS), empCode,
      rawPunchDateTime: text(event.PUNCH_DATETIME), punchTimestamp: timestamp.fromDate(punch),
      punchState: text(event.PUNCH_STATE), verifyType: text(event.VERIFY_TYPE), source: 'hardware',
      receivedAt: fieldValue.serverTimestamp(), processedAt: fieldValue.serverTimestamp(), processingStatus: 'processed'});
    return {status: 'processed', action: !currentIn || punch < currentIn ? 'check_in' : (!currentOut || punch > currentOut ? 'check_out' : 'retained')};
  });
}

function attendanceUpdate({existing, punch, parsed, shift, hardware, fieldValue, timestamp}) {
  const currentIn = toDate(existing.checkIn); const currentOut = toDate(existing.checkOut);
  let checkIn = currentIn; let checkOut = currentOut; const update = {};
  if (!checkIn || punch < checkIn) {
    checkIn = punch; update.checkIn = timestamp.fromDate(punch); update.checkInSource = 'hardware'; update.hardwareCheckIn = hardware;
  } else if (punch > checkIn && (!checkOut || punch > checkOut)) {
    checkOut = punch; update.checkOut = timestamp.fromDate(punch); update.checkOutSource = 'hardware'; update.hardwareCheckOut = hardware;
  }
  const firstHardware = toDate(existing.firstHardwarePunchAt);
  const lastHardware = toDate(existing.lastHardwarePunchAt);
  update.firstHardwarePunchAt = timestamp.fromDate(!firstHardware || punch < firstHardware ? punch : firstHardware);
  update.lastHardwarePunchAt = timestamp.fromDate(!lastHardware || punch > lastHardware ? punch : lastHardware);
  update.hardwarePunchCount = Number(existing.hardwarePunchCount || 0) + 1;
  const hadNonHardwareAttendance = Boolean(currentIn || currentOut) && existing.attendanceSource !== 'hardware';
  update.attendanceSource = hadNonHardwareAttendance || existing.attendanceSource === 'mixed' ? 'mixed' : 'hardware';
  update.hardwareVerified = true; update.updatedAt = fieldValue.serverTimestamp();
  if (!currentIn) {
    const late = lateMinutes(shift, parsed.parts);
    Object.assign(update, {createdAt: fieldValue.serverTimestamp(), shiftPolicy: snapshot(shift), shiftPolicyId: shift.id,
      shiftCode: shift.code, shiftName: shift.name, shiftStartTime: shift.startTime, shiftEndTime: shift.endTime,
      checkInStatus: late > 0 ? 'late' : 'present', lateMinutes: late, gpsValid: false,
      missingCheckout: shift.missingCheckout, status: 'pending', requiresManagerReview: false,
      approvalStatus: 'pending', approvedBy: '', approvedAt: null, autoApproved: false, overtimeMinutes: 0});
  } else if (punch < currentIn) {
    const late = lateMinutes(shift, parsed.parts);
    Object.assign(update, {checkInStatus: late > 0 ? 'late' : 'present', lateMinutes: late});
  }
  if (checkIn && checkOut && checkOut > checkIn) {
    const actual = workingMinutes(shift, checkIn, checkOut);
    const exceeded = actual > shift.maximumWorkingMinutes;
    const payable = Math.min(actual, shift.maximumWorkingMinutes);
    const wasLate = Number(update.lateMinutes ?? existing.lateMinutes ?? 0) > 0;
    Object.assign(update, {actualWorkingMinutes: actual, payableWorkingMinutes: payable, totalHours: payable / 60,
      status: exceeded ? 'pending' : statusFor(shift, payable, wasLate), requiresManagerReview: exceeded,
      durationExceededMaximum: exceeded, missingCheckout: shift.missingCheckout,
      overtimeMinutes: shift.allowOvertime ? Math.max(0, actual - shift.overtimeAfterMinutes) : 0});
  }
  return update;
}

function employeeName(employee) {
  return text((employee.personalInfo || {}).fullName || employee.employeeName || employee.name);
}
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function easyTimeProAttendanceWebhookCore({firestore, fieldValue, timestamp, body}) {
  if (!Array.isArray(body)) return {httpStatus: 400, body: {ok: false, error: 'invalid_payload'}};
  const summary = {ok: true, received: body.length, processed: 0, duplicates: 0, unmapped: 0, invalid: 0, failed: 0};
  for (const event of body) {
    const diagnostic = {};
    try {
      const result = await processEvent({firestore, fieldValue, timestamp, event: event || {}, diagnostic});
      if (result.status === 'processed') summary.processed++;
      else if (result.status === 'duplicate') summary.duplicates++;
      else if (result.status === 'invalid') summary.invalid++;
      else summary.unmapped++;
    } catch (error) {
      summary.failed++;
      const failure = safeFailure(error, diagnostic.stage);
      summary.failures ??= [];
      summary.failures.push({code: failure.code});
      logger.write({
        severity: 'ERROR',
        message: 'easytimepro_event_failed',
        companyId: diagnostic.companyId || '',
        employeeFirestoreId: diagnostic.employeeFirestoreId || '',
        terminalSn: diagnostic.terminalSn || '',
        eventIdPrefix: diagnostic.eventIdPrefix || '',
        stage: diagnostic.stage || 'unknown',
        errorCode: failure.code,
        errorName: text(error?.name) || 'Error',
      });
    }
  }
  if (summary.failed > 0) summary.ok = false;
  return {httpStatus: summary.failed > 0 ? 500 : 200, body: summary};
}

function safeFailure(error, stage) {
  const code = text(error?.code).toLowerCase();
  const message = text(error?.message).toLowerCase();
  if (stage === 'device_lookup' &&
      (code === '9' || code.includes('failed-precondition') || message.includes('requires an index'))) {
    return {code: 'ATTENDANCE_DEVICE_INDEX_REQUIRED'};
  }
  if (stage === 'attendance_transaction' && code.includes('permission-denied')) {
    return {code: 'ATTENDANCE_WRITE_DENIED'};
  }
  return {code: `EASYTIMEPRO_${text(stage).toUpperCase() || 'UNKNOWN'}_FAILED`};
}

module.exports = {
  validBasicAuth, parsePunchDateTime, eventId, attendanceUpdate,
  normalizeEmployeeCode, resolveEmployee, safeFailure, processEvent, easyTimeProAttendanceWebhookCore,
};
