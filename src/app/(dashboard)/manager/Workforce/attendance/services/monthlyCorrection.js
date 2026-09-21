import { attendanceDayKey, toAttendanceDate } from "../../services/attendanceDateTime";

export function timeInput(value) {
  if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) return value;
  const date = toAttendanceDate(value);
  if (!date || !Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}
export function monthlyRows(records, employeeFirestoreId, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Select a valid month.");
  const byDate = new Map();
  for (const record of records) {
    if ((record.employeeFirestoreId || record.userId) !== employeeFirestoreId) continue;
    const workDate = record.date || record.dateKey || record.id?.match(/\d{4}-\d{2}-\d{2}$/)?.[0];
    if (!workDate) continue;
    const date = attendanceDayKey(workDate);
    if (!date.startsWith(`${month}-`)) continue;
    // Prefer the deterministic canonical ID if legacy duplicates already exist.
    if (!byDate.has(date) || record.id === `${employeeFirestoreId}_${date}`) byDate.set(date, record);
  }
  const [year, number] = month.split("-").map(Number);
  return Array.from({ length: new Date(year, number, 0).getDate() }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const record = byDate.get(date);
    const fields = { checkIn: timeInput(record?.checkIn), checkOut: timeInput(record?.checkOut), status: record?.status || "", remarks: record?.remarks ?? record?.reviewRemarks ?? "" };
    return { ...record, ...fields, id: record?.id || null, date, month, employeeFirestoreId, exists: Boolean(record), _key: `${employeeFirestoreId}_${date}`,
      approvalStatus: record?.approvalStatus || record?.reviewStatus || "", reviewStatus: record?.reviewStatus || "",
      gpsValid: record?.gpsValid, _record: record || {}, _initial: fields, _dirty: {},
    };
  });
}
export function correctionChanges(row) {
  if (!row.employeeFirestoreId || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error("Select a valid employee and work date.");
  const changes = {};
  for (const key of ["checkIn", "checkOut", "status", "remarks"]) {
    if (!row._dirty?.[key]) continue;
    if (key === "status" || key === "remarks") { changes[key] = row[key]; continue; }
    if (!row[key]) { changes[key] = null; continue; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(row[key])) throw new Error("Enter a valid time.");
    // Keep an existing overnight punch on its actual calendar day.
    const original = toAttendanceDate(row._record?.[key]);
    let date = original && Number.isFinite(original.getTime()) ? attendanceDayKey(original) : row.date;
    if (!original && key === "checkOut" && row._record?.shiftPolicy?.isNightShift && row.checkIn && row.checkOut < row.checkIn) {
      const next = new Date(`${row.date}T12:00:00+05:30`); next.setUTCDate(next.getUTCDate() + 1); date = attendanceDayKey(next);
    }
    changes[key] = new Date(`${date}T${row[key]}:00+05:30`).toISOString();
  }
  return changes;
}
