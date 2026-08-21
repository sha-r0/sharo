export const ATTENDANCE_TIME_ZONE = "Asia/Kolkata";

export function toAttendanceDate(value) {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function attendanceDayKey(value = new Date()) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = toAttendanceDate(value);
    if (!date) return typeof value === "string" ? value.slice(0, 10) : "";
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: ATTENDANCE_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function attendanceMonthKey(value = new Date()) {
    return attendanceDayKey(value).slice(0, 7);
}

export function formatAttendanceTime(value) {
    const date = toAttendanceDate(value);
    return date?.toLocaleTimeString("en-IN", {
        timeZone: ATTENDANCE_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }) || "--:--";
}

export function formatWorkedMinutes(value) {
    const minutes = Math.max(0, Number(value || 0));
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes % 60);
    return `${hours}h ${String(remainder).padStart(2, "0")}m`;
}

export function attendanceSource(record = {}) {
    const source = String(record.attendanceSource || record.source || record.checkInSource || record.checkOutSource || "manual").toLowerCase();
    if (record.hardwareVerified === true || source === "hardware" || source === "biometric") return "Biometric";
    if (source === "gps" || source === "mobile" || record.gpsValid !== undefined) return "GPS";
    return "Manual";
}

export function attendanceEmployeeKeys(record = {}) {
    return [record.employeeFirestoreId, record.userId, record.employeeId, record.employeeCode, record.deviceUserId, record.biometricEmployeeId]
        .filter(Boolean)
        .map(String);
}
