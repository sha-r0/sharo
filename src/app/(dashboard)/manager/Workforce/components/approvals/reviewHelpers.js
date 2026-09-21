export const REVIEW_STATUSES = ["Pending", "Approved", "Rejected", "All"];
export function reviewStatus(item, gps = false) {
  const raw = String((gps ? item.reviewStatus || item.approvalStatus || item.decision || item.status : item.status || item.approvalStatus) || "Pending").trim().toLowerCase();
  return REVIEW_STATUSES.find((status) => status.toLowerCase() === raw) || raw;
}
export function asDate(value) {
  if (!value) return null;
  const date = value.toDate?.() || new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
export const dateText = (value) => asDate(value)?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) || "—";
export function employeeDetails(item, employees) {
  const employee = employees.find((e) => [e.id, e.employeeId, e.login?.employeeId].filter(Boolean).includes(item.employeeFirestoreId || item.userId || item.employeeId));
  return { name: item.employeeName || employee?.personalInfo?.fullName || employee?.name || "Employee", code: employee?.employeeId || employee?.login?.employeeId || item.employeeId || "—" };
}
export function leaveDuration(item) {
  const days = item.totalDays ?? item.days ?? item.daysRequested ?? item.durationDays;
  if (days != null && Number.isFinite(Number(days)) && Number(days) > 0) return `${Number(days)} ${Number(days) === 1 ? "day" : "days"}`;
  const start = asDate(item.fromDate || item.startDate), end = asDate(item.toDate || item.endDate || item.fromDate || item.startDate);
  if (!start || !end || end < start) return "—";
  const count = Math.floor((end - start) / 86400000) + 1;
  return `${count} ${count === 1 ? "day" : "days"}`;
}
export function gpsDetails(item) {
  const type = String(item.type || item.punchType || "").toUpperCase();
  const location = item.location || (type === "OUT" ? item.checkOutLocation : item.checkInLocation) || {};
  const lat = item.latitude ?? location.latitude ?? location._latitude ?? location.lat ?? location._lat;
  const lng = item.longitude ?? location.longitude ?? location._longitude ?? location.lng ?? location._long;
  const coordinates = lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180 ? [Number(lat), Number(lng)] : null;
  const distance = item.officeDistance ?? item.distance;
  return { type: ["IN", "OUT"].includes(type) ? type : "—", coordinates,
    time: asDate(item.time || item.punchTime || (type === "OUT" ? item.checkOut : item.checkIn) || item.createdAt),
    photo: item.photoUrl || item.selfieUrl || "",
    address: readableAddress(item.address) || readableAddress(item.fullAddress) || readableAddress(location.address) || readableAddress(location.fullAddress),
    distance: distance != null && Number.isFinite(Number(distance)) ? `${Math.round(Number(distance)).toLocaleString("en-IN")} m` : "Not available",
  };
}
export function readableAddress(value) {
  if (!value) return "";
  if (typeof value === "object") return readableAddress(value.fullAddress || value.formatted_address || value.formattedAddress || value.display_name) || [...new Set([value.street, value.road, value.area, value.city, value.district, value.state, value.postcode, value.country].filter((part) => typeof part === "string" && part !== "N/A"))].join(", ");
  // A Plus Code alone (or followed only by a locality) is not a full street address.
  const text = String(value).trim();
  if (/^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}(?:\s|,|$)/i.test(text) || /^(N\/A|Address not found|Unknown|Location unavailable)$/i.test(text)) return "";
  return text;
}
