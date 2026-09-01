import {
    collection,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    Timestamp,
    limit,
    onSnapshot,
} from "firebase/firestore";

import { db, functions } from "@/lib/firebase"
import { httpsCallable } from "firebase/functions";
import { attendanceDayKey, attendanceEmployeeKeys, attendanceSource, formatAttendanceTime, formatWorkedMinutes } from "../../services/attendanceDateTime";

export default class AttendanceService {

    //////////////////////////////////////////////////////
    // Collections
    //////////////////////////////////////////////////////

    static employeeCollection(companyId) {

        return collection(
            db,
            "Companies",
            companyId,
            "Usermanagement"
        );

    }

    static holidayCollection(companyId) {

        return collection(
            db,
            "Companies",
            companyId,
            "Holidays"
        );

    }

    static attendanceCollection(companyId) {

        return collection(
            db,
            "Companies",
            companyId,
            "Attendance"
        );

    }

    //////////////////////////////////////////////////////
    // Initial Loader
    // (Same Pattern as Leave Module)
    //////////////////////////////////////////////////////

    static async getAll(companyId) {

        const [

            employeeSnap,

            holidaySnap,

        ] = await Promise.all([

            getDocs(
                this.employeeCollection(companyId)
            ),

            getDocs(
                this.holidayCollection(companyId)
            ),

        ]);

        //////////////////////////////////////////////////
        // Employees
        //////////////////////////////////////////////////

        const employees = employeeSnap.docs

            .map((doc) => {

                const data = doc.data();

                return {

                    id: doc.id,

                    ...data,

                    name:
                        data.personalInfo?.fullName || "",

                    employeeId:
                        data.employeeId ||
                        data.login?.employeeId ||
                        "",

                    department:
                        data.employment?.department || "",

                    designation:
                        data.employment?.designation || "",

                    shift:
                        data.employment?.shift || "",

                    status:
                        data.employment?.status || "",

                    shiftPolicy:
                        data.shiftPolicy || null,

                };

            })

            .filter(

                (emp) =>

                    String(emp.status).toLowerCase() ===
                    "active"

            )

            .sort((a, b) =>

                a.name.localeCompare(b.name)

            );

        //////////////////////////////////////////////////
        // Holidays
        //////////////////////////////////////////////////

        const holidays = holidaySnap.docs.map(

            (doc) => ({

                id: doc.id,

                ...doc.data(),

            })

        );

        return {

            employees,

            holidays,

        };

    }

    //////////////////////////////////////////////////////
    // Attendance Query
    //////////////////////////////////////////////////////

    static async getAttendance(

        companyId,

        fromDate,

        toDate

    ) {


        console.log("Company ID:", companyId);
        const q = query(

            this.attendanceCollection(companyId),

            where("date", ">=", fromDate),

            where("date", "<=", toDate)

        );

        const snap = await getDocs(q);

        console.log("Documents Found:", snap.size);

        return snap.docs.map((doc) => ({

            id: doc.id,

            ...doc.data(),

        }));

    }

    static subscribeAttendance(companyId, fromDate, toDate, onData, onError) {
        const q = query(this.attendanceCollection(companyId), where("date", ">=", fromDate), where("date", "<=", toDate));
        return onSnapshot(q, (snap) => onData(snap.docs.map((item) => ({ id: item.id, ...item.data() }))), onError);
    }

    static async getHardwareEvents(companyId, attendance) {
        if (!companyId || !attendance?.date) return [];
        const events = collection(db, "Companies", companyId, "HardwareAttendanceEvents");
        const snap = await getDocs(query(events, where("date", "==", attendance.date)));
        const keys = new Set(attendanceEmployeeKeys(attendance));
        return snap.docs.map((item) => ({ id: item.id, ...item.data() }))
            .filter((item) => attendanceEmployeeKeys(item).some((key) => keys.has(key)));
    }
    //////////////////////////////////////////////////////
    // Date Array
    //////////////////////////////////////////////////////

    static getDaysArray(

        fromDate,

        toDate

    ) {

        const days = [];

        const current = new Date(`${fromDate}T00:00:00`);

        const end = new Date(`${toDate}T00:00:00`);

        while (current <= end) {

            days.push(

                attendanceDayKey(current)

            );

            current.setDate(

                current.getDate() + 1

            );

        }

        return days;

    }

    //////////////////////////////////////////////////////
    // Weekly Off
    //////////////////////////////////////////////////////

    static isWeeklyOff(

        date,

        shiftPolicy

    ) {

        if (!shiftPolicy) {

            return false;

        }

        const weeklyOff =

            shiftPolicy.weeklyOff ||

            shiftPolicy;

        const current = new Date(date);

        const day = current.getDay();

        const weekNo = Math.ceil(

            current.getDate() / 7

        );

        ////////////////////////////////////////////
        // Sunday
        ////////////////////////////////////////////

        if (

            day === 0 &&

            weeklyOff.sunday

        ) {

            return true;

        }

        ////////////////////////////////////////////
        // Saturday
        ////////////////////////////////////////////

        if (

            day === 6 &&

            weeklyOff.saturday

        ) {

            const weeks =

                shiftPolicy.saturdayWeeks ||

                weeklyOff.saturdayWeeks ||

                [];

            if (weeks.length === 0) {

                return true;

            }

            return weeks.includes(weekNo);

        }

        return false;

    }

    //////////////////////////////////////////////////////
    // Attendance Status
    //////////////////////////////////////////////////////

    static getShortStatus(status) {

        switch (

        String(status || "")

            .toLowerCase()

        ) {

            case "present":

                return "P";

            case "late":

                return "LT";

            case "halfday":

            case "half day":

            case "half_day":

                return "HD";

            case "leave":

                return "L";

            case "holiday":

                return "H";

            case "weeklyoff":

                return "WO";

            case "absent":

                return "A";

            default:

                return "A";

        }

    }

    //////////////////////////////////////////////////////
    // Time Formatter
    //////////////////////////////////////////////////////

    static formatTime(time) {

        if (!time) {

            return "--:--";

        }

        return formatAttendanceTime(time);

    }

    //////////////////////////////////////////////////////
    // Hours Formatter
    //////////////////////////////////////////////////////

    static formatHours(hours) {

        if (

            hours === null ||

            hours === undefined

        ) {

            return "0.00";

        }

        return Number(

            hours

        ).toFixed(2);

    }

    //////////////////////////////////////////////////////
    // Status Color
    //////////////////////////////////////////////////////

    static getStatusColor(status) {

        switch (status) {

            case "P":

                return "bg-green-100 text-green-700";

            case "LT":

                return "bg-orange-100 text-orange-700";

            case "HD":

                return "bg-yellow-100 text-yellow-700";

            case "L":

                return "bg-cyan-100 text-cyan-700";

            case "WO":

                return "bg-blue-100 text-blue-700";

            case "H":

                return "bg-purple-100 text-purple-700";

            default:

                return "bg-red-100 text-red-700";

        }

    }

    //////////////////////////////////////////////////////
    // Generate Attendance Report
    //////////////////////////////////////////////////////

    static async generateAttendanceReport({

        companyId,

        employees,

        holidays,

        fromDate,

        toDate,

        selectedEmployees = [],

        attendanceRecords,

    }) {

        ////////////////////////////////////////////
        // Days
        ////////////////////////////////////////////

        const days = this.getDaysArray(

            fromDate,

            toDate

        );

        ////////////////////////////////////////////
        // Attendance
        ////////////////////////////////////////////

        const attendance = attendanceRecords || await this.getAttendance(companyId, fromDate, toDate);

        ////////////////////////////////////////////
        // Attendance Map
        ////////////////////////////////////////////

        const attendanceMap = {};

        attendance.forEach((item) => {
            attendanceEmployeeKeys(item).forEach((key) => {
                if (!attendanceMap[key]) attendanceMap[key] = {};
                attendanceMap[key][item.date || attendanceDayKey(item.checkIn || item.createdAt)] = item;
            });
        });

        ////////////////////////////////////////////
        // Holiday Map
        ////////////////////////////////////////////

        const holidayMap = {};

        holidays.forEach((holiday) => {

            holidayMap[holiday.date] = holiday;

        });

        ////////////////////////////////////////////
        // Employee Filter
        ////////////////////////////////////////////

        const employeeList =

            selectedEmployees.length > 0

                ? employees.filter((emp) =>

                    selectedEmployees.includes(

                        emp.id

                    )

                )

                : employees;

        ////////////////////////////////////////////
        // Build Report
        ////////////////////////////////////////////

        const report = employeeList.map((employee) => {

            const row = {

                id: employee.id,

                employee,

                days: {},

                details: {},

            };

            const employeeAttendance = attendanceMap[employee.id] || attendanceMap[employee.employeeId] || {};

            days.forEach((date) => {

                const record =

                    employeeAttendance[date];

                ////////////////////////////////////
                // Attendance Exists
                ////////////////////////////////////

                if (record) {

                    const shortStatus =

                        this.getShortStatus(

                            record.status

                        );

                    row.days[date] = shortStatus;

                    row.details[date] = {

                        checkIn:

                            this.formatTime(

                                record.checkIn

                            ),

                        checkOut:

                            this.formatTime(

                                record.checkOut

                            ),

                        totalHours:
                            record.workedMinutes !== undefined ? formatWorkedMinutes(record.workedMinutes) : this.formatHours(record.totalHours),

                        workedMinutes: Number(record.workedMinutes || 0),

                        lateMinutes: Number(record.lateMinutes || 0),

                        source: attendanceSource(record),

                        hardwareVerified: record.hardwareVerified === true,

                        hardwarePunchCount: Number(record.hardwarePunchCount || 0),

                        checkInSource: record.checkInSource || "",

                        checkOutSource: record.checkOutSource || "",

                        verifyType: record.verifyType || record.verify || record.verificationType || "",

                        shiftName: record.shiftName || record.appliedShiftName || record.shift?.name || "",

                        shiftTiming: record.shiftTiming || record.appliedShiftTiming || "",

                        record,

                        approvalStatus:

                            record.approvalStatus ||

                            "",

                        gpsValid:

                            record.gpsValid ||

                            false,

                        status:

                            record.status ||

                            "Absent",

                    };

                    return;

                }

                ////////////////////////////////////
                // Holiday
                ////////////////////////////////////

                if (holidayMap[date]) {

                    row.days[date] = "H";

                    row.details[date] = {

                        status: "Holiday",

                    };

                    return;

                }

                ////////////////////////////////////
                // Weekly Off
                ////////////////////////////////////

                if (

                    this.isWeeklyOff(

                        date,

                        employee.shiftPolicy

                    )

                ) {

                    row.days[date] = "WO";

                    row.details[date] = {

                        status: "Weekly Off",

                    };

                    return;

                }

                ////////////////////////////////////
                // Default Absent
                ////////////////////////////////////

                row.days[date] = "A";

                row.details[date] = {

                    status: "Absent",

                };

            });

            return row;

        });

        ////////////////////////////////////////////

        return {

            days,

            report,

        };

    }
    //////////////////////////////////////////////////////
    // Excel Export Data
    //////////////////////////////////////////////////////

    static prepareExcelData(

        report,

        days

    ) {

        return report.map((row) => {

            const excelRow = {

                "Employee Name":

                    row.employee.name ||

                    "",

                "Employee ID":

                    row.employee.employeeId ||

                    "",

                Department:

                    row.employee.department ||

                    "",

                Designation:

                    row.employee.designation ||

                    "",

                Shift:

                    row.employee.shift ||

                    "",

            };

            ////////////////////////////////////////////////////
            // Day Wise Attendance
            ////////////////////////////////////////////////////

            days.forEach((day) => {

                excelRow[day] =

                    row.days[day];

            });

            ////////////////////////////////////////////////////
            // Summary
            ////////////////////////////////////////////////////

            let present = 0;

            let absent = 0;

            let late = 0;

            let halfDay = 0;

            let leave = 0;

            let weeklyOff = 0;

            let holiday = 0;

            days.forEach((day) => {

                switch (row.days[day]) {

                    case "P":

                        present++;

                        break;

                    case "LT":

                        late++;

                        break;

                    case "HD":

                        halfDay++;

                        break;

                    case "L":

                        leave++;

                        break;

                    case "WO":

                        weeklyOff++;

                        break;

                    case "H":

                        holiday++;

                        break;

                    default:

                        absent++;

                        break;

                }

            });

            excelRow["Present"] =

                present;

            excelRow["Late"] =

                late;

            excelRow["Half Day"] =

                halfDay;

            excelRow["Leave"] =

                leave;

            excelRow["Weekly Off"] =

                weeklyOff;

            excelRow["Holiday"] =

                holiday;

            excelRow["Absent"] =

                absent;

            excelRow["Total Days"] =

                days.length;

            return excelRow;

        });

    }

    //////////////////////////////////////////////////////
    // Get Attendance By Employee & Date
    //////////////////////////////////////////////////////

    static async getAttendanceRecord(

        companyId,

        employeeId,

        date

    ) {

        const q = query(

            this.attendanceCollection(companyId),

            where("employeeFirestoreId", "==", employeeId),

            where("date", "==", date),

            limit(1)

        );

        const snap = await getDocs(q);

        if (snap.empty) {

            return null;

        }

        return {

            id: snap.docs[0].id,

            ...snap.docs[0].data(),

        };

    }

    //////////////////////////////////////////////////////
    // Update Attendance
    //////////////////////////////////////////////////////

    static async updateAttendance(

        companyId,

        attendanceId,

        values

    ) {

        void companyId;
        const response = await httpsCallable(functions, "correctAttendance")({
            attendanceId,
            changes: {
                checkIn: values.checkIn instanceof Date ? values.checkIn.toISOString() : values.checkIn,
                checkOut: values.checkOut instanceof Date ? values.checkOut.toISOString() : values.checkOut,
                status: values.status,
                approvalStatus: values.approvalStatus,
                remarks: values.remarks || "",
            },
        });
        return response.data;

    }

    //////////////////////////////////////////////////////
    // Monthly Attendance
    //////////////////////////////////////////////////////

    //////////////////////////////////////////////////////
    // Monthly Attendance
    //////////////////////////////////////////////////////

    static async getEmployeeMonthlyAttendance({

        companyId,

        employeeId,

        month,

    }) {

        const q = query(

            this.attendanceCollection(companyId),

            where(
                "employeeFirestoreId",
                "==",
                employeeId
            ),

            where(
                "month",
                "==",
                month
            )

        );

        const snap = await getDocs(q);

        ////////////////////////////////////////////
        // Existing Attendance
        ////////////////////////////////////////////

        const attendanceMap = {};

        snap.docs.forEach((doc) => {

            attendanceMap[doc.data().date] = {

                id: doc.id,

                ...doc.data(),

            };

        });

        ////////////////////////////////////////////
        // Generate Complete Month
        ////////////////////////////////////////////

        const year = Number(month.split("-")[0]);

        const monthNumber = Number(month.split("-")[1]);

        const totalDays = new Date(
            year,
            monthNumber,
            0
        ).getDate();

        const rows = [];

        for (let day = 1; day <= totalDays; day++) {

            const date = `${month}-${String(day).padStart(2, "0")}`;

            if (attendanceMap[date]) {

                rows.push(attendanceMap[date]);

            } else {

                rows.push({

                    id: null,

                    date,

                    month,

                    employeeFirestoreId: employeeId,

                    checkIn: null,

                    checkOut: null,

                    totalHours: 0,

                    status: "absent",

                    approvalStatus: "pending",

                    gpsValid: false,

                    remarks: "",

                    exists: false,

                });

            }

        }

        return rows;

    }



}
