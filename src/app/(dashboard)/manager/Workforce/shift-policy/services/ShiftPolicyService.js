import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default class ShiftPolicyService {
  static collection(companyId) {
    return collection(
      db,
      "Companies",
      companyId,
      "ShiftPolicies"
    );
  }

  static async getAll(companyId) {
    const q = query(
      this.collection(companyId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  static async create(companyId, form) {
    await addDoc(this.collection(companyId), {
      // ================= BASIC =================

      basic: {
        name: form.name,
        code: form.code,
        description: form.description || "",
        status: form.status || "active",
        isNightShift: form.isNightShift || false,
      },

      // ================= TIMING =================

      timing: {
        startTime: form.startTime,
        endTime: form.endTime,
        workingHours: form.workingHours,
      },

      // ================= BREAK =================

      break: {
        enabled: form.hasBreak || false,
        startTime: form.breakStart,
        endTime: form.breakEnd,
        duration: form.breakDuration,
      },

      // ================= WEEKLY OFF =================

      weeklyOff: {
        primary: form.weeklyOff1,
        secondary: form.weeklyOff2,
        weeks: form.weekNumbers || [],
      },

      // ================= ATTENDANCE =================

      attendance: {
        lateGrace: Number(form.lateGrace || 15),

        earlyGrace: Number(form.earlyGrace || 10),

        minimumWorkingHours:
          form.minimumWorkingHours,

        halfDayHours:
          form.halfDayHours,

        absentHours:
          form.absentHours,

        missingCheckout:
          form.missingCheckout,

        enableAutoCheckout:
          form.enableAutoCheckout || false,

        autoCheckoutTime:
          form.autoCheckoutTime,

        maximumWorkingHours:
          form.maximumWorkingHours,
      },

      // ================= GPS =================

      gps: {
        officeName: form.officeName,

        locationMethod:
          form.locationMethod,

        latitude:
          Number(form.latitude || 0),

        longitude:
          Number(form.longitude || 0),

        attendanceRadius:
          Number(form.attendanceRadius || 50),

        gpsRequired:
          form.gpsRequired,

        outsideRadiusAction:
          form.outsideRadiusAction,
      },

      // ================= PAYROLL =================

      payroll: {
        allowOvertime:
          form.allowOvertime,

        overtimeAfter:
          form.overtimeAfter,

        overtimeRound:
          Number(form.overtimeRound || 30),
      },

      active: true,

      createdAt: Timestamp.now(),

      updatedAt: Timestamp.now(),
    });
  }

  static async update(companyId, id, form) {
    await updateDoc(
      doc(
        db,
        "Companies",
        companyId,
        "ShiftPolicies",
        id
      ),
      {
        basic: {
          name: form.name,
          code: form.code,
          description: form.description || "",
          status: form.status || "active",
          isNightShift: form.isNightShift || false,
        },

        timing: {
          startTime: form.startTime,
          endTime: form.endTime,
          workingHours: form.workingHours,
        },

        break: {
          enabled: form.hasBreak || false,
          startTime: form.breakStart,
          endTime: form.breakEnd,
          duration: form.breakDuration,
        },

        weeklyOff: {
          primary: form.weeklyOff1,
          secondary: form.weeklyOff2,
          weeks: form.weekNumbers || [],
        },

        attendance: {
          lateGrace:
            Number(form.lateGrace || 15),

          earlyGrace:
            Number(form.earlyGrace || 10),

          minimumWorkingHours:
            form.minimumWorkingHours,

          halfDayHours:
            form.halfDayHours,

          absentHours:
            form.absentHours,

          missingCheckout:
            form.missingCheckout,

          enableAutoCheckout:
            form.enableAutoCheckout,

          autoCheckoutTime:
            form.autoCheckoutTime,

          maximumWorkingHours:
            form.maximumWorkingHours,
        },

        gps: {
          officeName:
            form.officeName,

          locationMethod:
            form.locationMethod,

          latitude:
            Number(form.latitude || 0),

          longitude:
            Number(form.longitude || 0),

          attendanceRadius:
            Number(form.attendanceRadius || 50),

          gpsRequired:
            form.gpsRequired,

          outsideRadiusAction:
            form.outsideRadiusAction,
        },

        payroll: {
          allowOvertime:
            form.allowOvertime,

          overtimeAfter:
            form.overtimeAfter,

          overtimeRound:
            Number(form.overtimeRound || 30),
        },

        active: form.status === "active",

        updatedAt: Timestamp.now(),
      }
    );
  }

  static async delete(companyId, id) {
    await deleteDoc(
      doc(
        db,
        "Companies",
        companyId,
        "ShiftPolicies",
        id
      )
    );
  }
}