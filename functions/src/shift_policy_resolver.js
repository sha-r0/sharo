'use strict';

function text(value) { return String(value ?? '').trim(); }
function map(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function durationMinutes(value, fallback = 0) {
  if (typeof value === 'number') return Math.trunc(value);
  const raw = text(value).toLowerCase();
  if (!raw) return fallback;
  if (raw.includes(':')) {
    const [hours, minutes = '0'] = raw.split(':');
    if (Number.isFinite(Number(hours)) && Number.isFinite(Number(minutes))) {
      return Number(hours) * 60 + Number(minutes);
    }
  }
  const hours = /([0-9]+)\s*h/.exec(raw);
  const minutes = /([0-9]+)\s*m/.exec(raw);
  if (hours || minutes) return Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0);
  return Number.isFinite(Number(raw)) ? Number(raw) : fallback;
}

function isActiveShift(shift) {
  if (shift.active !== true) return false;
  const status = text(map(shift.basic).status).toLowerCase();
  return !status || status === 'active';
}

function resolveEffectiveShift(employee, company, shifts) {
  const active = shifts.filter(isActiveShift);
  const assignedId = text(map(employee.employment).shiftPolicyId ?? employee.shiftPolicyId);
  if (assignedId) {
    const assigned = active.find((shift) => shift.id === assignedId);
    if (assigned) return normalizeShift(assigned, 'employee_assignment');
  }
  const configuredId = text(company.defaultShiftPolicyId ?? company.shiftPolicyId);
  if (configuredId) {
    const configured = active.find((shift) => shift.id === configuredId);
    if (configured) return normalizeShift(configured, 'company_default');
  }
  const marked = active.filter((shift) => shift.isDefault === true || map(shift.basic).isDefault === true);
  if (marked.length === 1) return normalizeShift(marked[0], 'marked_default');
  if (active.length === 1) return normalizeShift(active[0], 'single_active');
  return null;
}

function normalizeShift(shift, resolutionSource) {
  const basic = map(shift.basic);
  const timing = map(shift.timing);
  const attendance = map(shift.attendance);
  const breakData = map(shift.break);
  const gps = map(shift.gps);
  const payroll = map(shift.payroll);
  const weeklyOff = map(shift.weeklyOff);
  return {
    id: text(shift.id), code: text(basic.code), name: text(basic.name) || 'Legacy Shift',
    isNightShift: basic.isNightShift === true,
    startTime: text(timing.startTime) || '09:30', endTime: text(timing.endTime) || '18:00',
    lateGrace: Math.trunc(number(attendance.lateGrace)),
    earlyGrace: Math.trunc(number(attendance.earlyGrace)),
    absentMinutes: durationMinutes(attendance.absentHours, 120),
    halfDayMinutes: durationMinutes(attendance.halfDayHours, 240),
    minimumWorkingMinutes: durationMinutes(attendance.minimumWorkingHours, 480),
    maximumWorkingMinutes: durationMinutes(attendance.maximumWorkingHours, 960),
    breakEnabled: breakData.enabled === true, breakMinutes: durationMinutes(breakData.duration),
    missingCheckout: text(attendance.missingCheckout).toLowerCase() || 'manager',
    enableAutoCheckout: attendance.enableAutoCheckout === true,
    autoCheckoutTime: text(attendance.autoCheckoutTime),
    weeklyOff: text(weeklyOff.primary) || 'Sunday',
    gpsRequired: gps.gpsRequired !== false, attendanceRadius: number(gps.attendanceRadius, 50),
    latitude: number(gps.latitude), longitude: number(gps.longitude), officeName: text(gps.officeName),
    outsideRadiusAction: text(gps.outsideRadiusAction).toLowerCase() || 'approval',
    allowOvertime: payroll.allowOvertime === true,
    overtimeAfterMinutes: durationMinutes(payroll.overtimeAfter),
    overtimeRoundMinutes: Math.trunc(number(payroll.overtimeRound)), resolutionSource, source: resolutionSource,
  };
}

function snapshot(shift) {
  const result = {...shift};
  delete result.resolutionSource;
  return result;
}

function clockMinutes(value) {
  const [hour, minute] = text(value).split(':').map(Number);
  return Number.isInteger(hour) && Number.isInteger(minute) ? hour * 60 + minute : 0;
}
function lateMinutes(shift, localParts) {
  return Math.max(0, localParts.hour * 60 + localParts.minute - clockMinutes(shift.startTime) - shift.lateGrace);
}
function workingMinutes(shift, checkIn, checkOut) {
  let minutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);
  if (minutes < 0 && shift.isNightShift) minutes += 1440;
  if (shift.breakEnabled) minutes -= shift.breakMinutes;
  return Math.max(0, Math.min(7 * 1440, minutes));
}
function statusFor(shift, minutes, wasLate) {
  if (minutes < shift.absentMinutes || minutes < shift.halfDayMinutes) return 'absent';
  if (minutes < shift.minimumWorkingMinutes) return 'halfday';
  return wasLate ? 'late' : 'present';
}

module.exports = {resolveEffectiveShift, snapshot, lateMinutes, workingMinutes, statusFor};

