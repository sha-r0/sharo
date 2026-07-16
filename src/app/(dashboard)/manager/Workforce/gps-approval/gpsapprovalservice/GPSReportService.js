import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const companyCollection = (companyId, name) =>
    collection(db, "Companies", companyId, name);

const timestampDate = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateKey = (value) => timestampDate(value)?.toISOString().slice(0, 10) || "";

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizeLocation = (value) => {
    if (!value) return null;
    const latitude = Number(firstValue(value.latitude, value.lat, value._lat));
    const longitude = Number(firstValue(value.longitude, value.lng, value.lon, value._long));
    return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { ...value, latitude, longitude }
        : null;
};

const readMonthly = async (companyId, name, month) => {
    const reference = companyCollection(companyId, name);
    if (!month) return getDocs(reference);
    return getDocs(query(reference, where("month", "==", month)));
};

const asEmployee = (doc) => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.personalInfo?.fullName || data.name || data.displayName || "Unnamed employee",
        employeeId: data.employeeId || data.login?.employeeId || "",
        department: data.employment?.department || data.department || "",
    };
};

const normalizeAttendance = (doc, employeeMap) => {
    const data = doc.data();
    const employeeFirestoreId = firstValue(data.employeeFirestoreId, data.userId, data.employeeId, "");
    const employee = employeeMap.get(String(employeeFirestoreId));
    const checkIn = firstValue(data.checkIn, data.checkInTime, data.punchIn, data.createdAt);
    const checkOut = firstValue(data.checkOut, data.checkOutTime, data.punchOut);
    const checkInLocation = normalizeLocation(
        firstValue(data.checkInLocation, data.checkInGps, data.checkInGPS, data.location)
    );
    const checkOutLocation = normalizeLocation(
        firstValue(data.checkOutLocation, data.checkOutGps, data.checkOutGPS)
    );
    const rawGpsValid = firstValue(data.gpsValid, data.isWithinRadius, data.withinRadius);

    return {
        ...data,
        id: doc.id,
        employeeFirestoreId,
        employeeId: employee?.employeeId || data.employeeId || "--",
        employeeName: data.employeeName || data.name || employee?.name || "Unknown employee",
        date: data.date || dateKey(checkIn || data.createdAt),
        checkIn,
        checkOut,
        checkInLocation,
        checkOutLocation,
        gpsValid: rawGpsValid === true,
        totalHours: Number(data.totalHours || data.hours || 0),
    };
};

export default class GPSReportService {
    static async getReport({ companyId, filters = {} }) {
        if (!companyId) throw new Error("Company is not available.");

        const [employeeSnap, attendanceSnap, gpsSnap] = await Promise.all([
            getDocs(companyCollection(companyId, "Usermanagement")),
            readMonthly(companyId, "Attendance", filters.month),
            readMonthly(companyId, "GPSPunches", filters.month),
        ]);

        const employees = employeeSnap.docs.map(asEmployee);
        const employeeMap = new Map();
        employees.forEach((employee) => {
            employeeMap.set(String(employee.id), employee);
            if (employee.employeeId) employeeMap.set(String(employee.employeeId), employee);
        });

        const documents = [...attendanceSnap.docs, ...gpsSnap.docs];
        const unique = new Map();
        documents.forEach((doc) => {
            const row = normalizeAttendance(doc, employeeMap);
            const identity = `${row.employeeFirestoreId}|${row.date}|${dateKey(row.checkIn)}`;
            const existing = unique.get(identity);
            unique.set(identity, existing ? { ...row, ...existing } : row);
        });

        let rows = [...unique.values()]
            .filter((row) => !filters.month || String(row.date).startsWith(filters.month))
            .sort((a, b) => String(b.date).localeCompare(String(a.date)));

        if (filters.employee) {
            const selected = employees.find((employee) => employee.id === filters.employee);
            rows = rows.filter((row) =>
                [row.employeeFirestoreId, row.employeeId].map(String).includes(String(filters.employee)) ||
                (selected?.employeeId && String(row.employeeId) === String(selected.employeeId))
            );
        }
        if (filters.gpsStatus === "valid") rows = rows.filter((row) => row.gpsValid);
        if (filters.gpsStatus === "invalid") rows = rows.filter((row) => !row.gpsValid);

        return {
            employees: employees.sort((a, b) => a.name.localeCompare(b.name)),
            rows,
            summary: {
                totalPunches: rows.length,
                gpsValid: rows.filter((row) => row.gpsValid).length,
                gpsInvalid: rows.filter((row) => !row.gpsValid).length,
                employees: new Set(rows.map((row) => row.employeeFirestoreId || row.employeeId)).size,
            },
        };
    }

    static toExportRows(rows) {
        const formatTime = (value) =>
            timestampDate(value)?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || "--";
        return rows.map((row) => ({
            Employee: row.employeeName,
            "Employee ID": row.employeeId,
            Date: row.date,
            "Check In": formatTime(row.checkIn),
            "Check Out": formatTime(row.checkOut),
            Hours: row.totalHours || 0,
            "GPS Status": row.gpsValid ? "Valid" : "Invalid",
            "Check-in Coordinates": row.checkInLocation
                ? `${row.checkInLocation.latitude}, ${row.checkInLocation.longitude}`
                : "",
            "Check-out Coordinates": row.checkOutLocation
                ? `${row.checkOutLocation.latitude}, ${row.checkOutLocation.longitude}`
                : "",
        }));
    }
}
