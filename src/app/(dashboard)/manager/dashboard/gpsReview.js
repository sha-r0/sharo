import { asDate } from "./dashboardMetrics";

export function isPendingOutsidePunch(item) {
  const state = String(item.reviewStatus || item.approvalStatus || item.decision || "pending").trim().toLowerCase().replace(/[ _-]/g, "");
  const outside = item.insideGeofence === false || item.outsideRadius === true || item.isOutsideRadius === true || item.withinRadius === false || item.isWithinRadius === false || item.gpsValid === false;
  return state === "pending" && outside;
}

export function gpsReviewDetails(item) {
  const type = String(item.type || item.punchType || "").toUpperCase();
  const time = asDate(item.time || item.punchTime || (type === "OUT" ? item.checkOut : item.checkIn) || item.createdAt);
  const distance = item.officeDistance ?? item.distance;
  const radius = item.configuredRadius;
  const hasDistance = distance != null && radius != null && Number.isFinite(Number(distance)) && Number.isFinite(Number(radius));
  const outsideDistance = hasDistance ? Math.max(0, Number(distance) - Number(radius)) : null;
  const location = item.location || (type === "OUT" ? item.checkOutLocation : item.checkInLocation);
  const latitude = item.latitude ?? location?.latitude ?? location?._latitude ?? location?.lat;
  const longitude = item.longitude ?? location?.longitude ?? location?._longitude ?? location?.lng;
  return {
    name: item.employeeName || item.name || "Employee",
    type: ["IN", "OUT"].includes(type) ? type : "—",
    time: time?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) || "--",
    distance: outsideDistance === null ? "Distance unavailable" : `${Math.round(outsideDistance).toLocaleString("en-IN")} m outside radius`,
    address: item.address || location?.address || (latitude != null && longitude != null ? `${latitude}, ${longitude}` : "Location unavailable"),
    photo: item.photoUrl || item.selfieUrl || "",
  };
}
