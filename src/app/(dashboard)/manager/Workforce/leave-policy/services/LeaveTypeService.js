import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    setDoc,
    Timestamp,
    updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import notificationService from "@/app/allservice/notification/notificationService";

export default class LeavePolicyService {

    ///////////////////////////////////////////////////////
    // COLLECTIONS
    ///////////////////////////////////////////////////////

    static leaveCollection(companyId) {
        return collection(
            db,
            "Companies",
            companyId,
            "LeaveTypes"
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

    static employeeCollection(companyId) {
        return collection(
            db,
            "Companies",
            companyId,
            "Usermanagement"
        );
    }

    static settingDoc(companyId) {
        return doc(
            db,
            "Companies",
            companyId,
            "AppSettings",
            "leaveConfig"
        );
    }

    ///////////////////////////////////////////////////////
    // LOAD EVERYTHING
    ///////////////////////////////////////////////////////

    static async getAll(companyId) {

        const [

            leaveSnap,

            holidaySnap,

            employeeSnap,

        ] = await Promise.all([

            getDocs(
                this.leaveCollection(companyId)
            ),

            getDocs(
                this.holidayCollection(companyId)
            ),

            getDocs(
                this.employeeCollection(companyId)
            ),

        ]);

        const leaveTypes =
            leaveSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));

        const holidays =
            holidaySnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));

        const employees =
            employeeSnap.docs
                .map((d) => ({
                    id: d.id,
                    ...d.data(),
                }))
                .filter(
                    (x) =>
                        x.employment?.status ===
                        "Active"
                );

        return {

            leaveTypes,

            holidays,

            employees,

        };

    }

    ///////////////////////////////////////////////////////
    // CREATE LEAVE TYPE
    ///////////////////////////////////////////////////////

    static async saveLeaveType(
        companyId,
        form
    ) {

        if (!form.code || !form.name) {
            throw new Error(
                "Leave code & name required."
            );
        }

        if (!form.total) {
            throw new Error(
                "Leave count required."
            );
        }

        await addDoc(
            this.leaveCollection(companyId),
            {

                code: form.code
                    .trim()
                    .toUpperCase(),

                name: form.name.trim(),

                type: form.type,

                total: Number(form.total),

                includeWeeklyOff:
                    form.includeWeeklyOff,

                includeHoliday:
                    form.includeHoliday,

                paid: form.paid,

                carryForward:
                    form.carryForward,

                createdAt:
                    Timestamp.now(),

            }
        );

    }

    ///////////////////////////////////////////////////////
    // DELETE LEAVE TYPE
    ///////////////////////////////////////////////////////

    static async deleteLeaveType(
        companyId,
        id
    ) {

        await deleteDoc(

            doc(
                db,
                "Companies",
                companyId,
                "LeaveTypes",
                id
            )

        );

    }

    ///////////////////////////////////////////////////////
    // SAVE HOLIDAY
    ///////////////////////////////////////////////////////

    static async saveHoliday(
        companyId,
        form
    ) {

        if (!form.name || !form.date) {
            throw new Error(
                "Holiday name & date required."
            );
        }

        await addDoc(
            this.holidayCollection(companyId),
            {

                name: form.name.trim(),

                date: form.date,

                createdAt: Timestamp.now(),

            }
        );

        await notificationService.emitSafe("holiday.added", {
            companyId, holidayName: form.name.trim(), receiver: "company",
            actionRoute: "/manager/Workforce/leave-policy", metadata: { holidayName: form.name.trim(), date: form.date },
        });

    }

    ///////////////////////////////////////////////////////
    // DELETE HOLIDAY
    ///////////////////////////////////////////////////////

    static async deleteHoliday(
        companyId,
        id
    ) {

        await deleteDoc(

            doc(
                db,
                "Companies",
                companyId,
                "Holidays",
                id
            )

        );

    }


    ///////////////////////////////////////////////////////
    // ASSIGN LEAVE TYPE TO EMPLOYEES
    ///////////////////////////////////////////////////////

    static async assignPolicyBulk(

        companyId,

        employees,

        leaveTypes,

        selectedEmployees,

        selectedPolicy

    ) {

        if (!selectedPolicy) {
            throw new Error("Select Leave Type.");
        }

        if (selectedEmployees.length === 0) {
            throw new Error("Select Employees.");
        }

        const policy = leaveTypes.find(
            (x) => x.code === selectedPolicy
        );

        if (!policy) {
            throw new Error("Invalid Leave Type.");
        }

        const updates = selectedEmployees.map(
            async (employeeId) => {

                const employee = employees.find(
                    (e) => e.id === employeeId
                );

                const currentPolicies =
                    employee?.leavePolicies || {};

                const currentBalance =
                    employee?.leaveBalance || {};

                await updateDoc(

                    doc(
                        db,
                        "Companies",
                        companyId,
                        "Usermanagement",
                        employeeId
                    ),

                    {

                        leavePolicies: {

                            ...currentPolicies,

                            [policy.code]: {

                                code: policy.code,

                                name: policy.name,

                                type: policy.type,

                                assignedAt: Timestamp.now(),

                            },

                        },

                        leaveBalance: {

                            ...currentBalance,

                            [policy.code]: {

                                allocated: Number(
                                    policy.total
                                ),

                                used: currentBalance[
                                    policy.code
                                ]?.used || 0,

                                balance:
                                    currentBalance[
                                        policy.code
                                    ]?.balance ??
                                    Number(policy.total),

                            },

                        },

                        updatedAt:
                            Timestamp.now(),

                    }

                );

            }

        );

        await Promise.all(updates);

    }

    ///////////////////////////////////////////////////////
    // UPDATE SINGLE EMPLOYEE BALANCE
    ///////////////////////////////////////////////////////

    static async updateEmployeeBalance(

        companyId,

        employeeId,

        employee,

        balances

    ) {

        const current =
            employee.leaveBalance || {};

        const updated = {};

        Object.keys(balances).forEach(
            (code) => {

                updated[code] = {

                    allocated:
                        current[code]
                            ?.allocated ??
                        Number(balances[code]),

                    used:
                        current[code]
                            ?.used ?? 0,

                    balance:
                        Number(
                            balances[code]
                        ),

                };

            }
        );

        await updateDoc(

            doc(

                db,

                "Companies",

                companyId,

                "Usermanagement",

                employeeId

            ),

            {

                leaveBalance: {

                    ...current,

                    ...updated,

                },

                updatedAt:
                    Timestamp.now(),

            }

        );

    }
    ///////////////////////////////////////////////////////
    // APPLY MONTHLY LEAVES
    ///////////////////////////////////////////////////////

    static async applyMonthlyLeaves(

        companyId,

        employees,

        leaveTypes

    ) {

        try {

            const updates = employees.map(async (emp) => {

                let updatedBalance = {

                    ...(emp.leaveBalance || {}),

                };

                leaveTypes.forEach((leave) => {

                    if (leave.type === "Monthly") {

                        updatedBalance[leave.code] =

                            (updatedBalance[leave.code] || 0) +

                            Number(leave.total || 0);

                    }

                });

                await updateDoc(

                    doc(

                        db,

                        "Companies",

                        companyId,

                        "Usermanagement",

                        emp.id

                    ),

                    {

                        leaveBalance: updatedBalance,

                    }

                );

            });

            await Promise.all(updates);

        } catch (err) {

            console.error(err);

            throw err;

        }

    }

    ///////////////////////////////////////////////////////
    // RUN MONTHLY UPDATE
    ///////////////////////////////////////////////////////

    static async runMonthlyLeaveUpdate(

        companyId,

        employees,

        leaveTypes

    ) {

        try {

            const now = new Date();

            const currentKey =

                `${now.getFullYear()}-${now.getMonth()}`;

            /////////////////////////////////////////////////////

            // READ LAST UPDATE

            /////////////////////////////////////////////////////

            const settingSnap = await getDocs(

                collection(

                    db,

                    "Companies",

                    companyId,

                    "AppSettings"

                )

            );

            let lastKey = null;

            settingSnap.forEach((doc) => {

                if (doc.id === "leaveConfig") {

                    lastKey =

                        doc.data().lastLeaveUpdate;

                }

            });

            /////////////////////////////////////////////////////

            // ALREADY UPDATED

            /////////////////////////////////////////////////////

            if (lastKey === currentKey) {

                return;

            }

            /////////////////////////////////////////////////////

            // APPLY MONTHLY LEAVES

            /////////////////////////////////////////////////////

            await this.applyMonthlyLeaves(

                companyId,

                employees,

                leaveTypes

            );

            /////////////////////////////////////////////////////

            // SAVE MONTH

            /////////////////////////////////////////////////////

            await updateDoc(

                this.settingDoc(companyId),

                {

                    lastLeaveUpdate: currentKey,

                }

            ).catch(async () => {

                await setDoc(

                    this.settingDoc(companyId),

                    {

                        lastLeaveUpdate: currentKey,

                    }

                );

            });

            console.log(

                "Monthly Leave Applied"

            );

        } catch (err) {

            console.error(err);

            throw err;

        }

    }

}
