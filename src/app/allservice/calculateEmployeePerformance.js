"use client";

import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

/* ================= MULTIPLIER ================= */
const getMultiplier = (targetHours, actualHours) => {

    targetHours = Number(targetHours);
    actualHours = Number(actualHours);

    if (!targetHours || targetHours <= 0) return 0;
    if (!actualHours || actualHours <= 0) return 0;

    const ratio = actualHours / targetHours;

    if (ratio <= 0.25) return 2;
    if (ratio <= 0.5) return 1.5;
    if (ratio <= 0.75) return 1.25;
    if (ratio <= 1.0) return 1;
    if (ratio <= 1.25) return 0.75;
    if (ratio <= 1.5) return 0.5;
    if (ratio <= 2.0) return 0.25;

    return 0;
};

/* ================= GRADE ================= */
const getGrade = (score) => {
    if (score >= 60) return "Excellent";
    if (score >= 40) return "Good";
    if (score >= 20) return "Average";
    return "Poor";
};


/* ================= MAIN FUNCTION ================= */
export async function calculateEmployeePerformance(startDate, endDate) {

    if (!startDate || !endDate) return [];

    const employeeMap = {};

    /* 1. Active users */
    const usersSnap = await getDocs(collection(db, "Usermanagement"));

    const activeUsers = {};

    usersSnap.forEach((doc) => {

        const data = doc.data();

        if (data?.isActive !== false) {
            activeUsers[doc.id] = data;
        }

    });


    /* 2. Completed projects */
    const projectSnap = await getDocs(collection(db, "Projectmanagement"));

    const completedProjects = [];

    projectSnap.forEach((doc) => {

        const p = doc.data();

        if (
            p.status === "Completed" &&
            p.endDate &&
            p.endDate >= startDate &&
            p.endDate <= endDate
        ) {

            completedProjects.push({
                id: doc.id,
                ...p
            });

        }

    });


    /* 3. All work */
    const allWork = [];

    for (const userId of Object.keys(activeUsers)) {

        const workSnap = await getDocs(
            collection(db, "Usermanagement", userId, "WorkDetails")
        );

        workSnap.forEach((doc) => {

            allWork.push({
                ...doc.data(),
                employeeUid: userId
            });

        });

    }


    /* 4. Score calculation */
    completedProjects.forEach((project) => {

        const projectId = project.id;

        (project.assignedEmployees || []).forEach((emp) => {

            if (!emp?.id) return;
            if (!activeUsers[emp.id]) return;

            const targetHours = Number(emp.targetHours);

            if (!targetHours) return;

            if (!employeeMap[emp.id]) {

                employeeMap[emp.id] = {

                    id: emp.id,
                    name: emp.name || activeUsers[emp.id]?.name || "—",

                    score: 0,
                    totalProjects: 0,
                    goodProjects: 0,
                    badProjects: 0,

                    projects: []

                };

            }

            const actualHours =
                allWork
                    .filter(
                        w =>
                            String(w.projectId) === String(projectId) &&
                            String(w.employeeUid) === String(emp.id)
                    )
                    .reduce(
                        (sum, w) =>
                            sum + Number(w.hoursWorked || 0),
                        0
                    );


            employeeMap[emp.id].totalProjects++;

            const multiplier =
                getMultiplier(targetHours, actualHours);

            const projectScore =
                targetHours * multiplier;

            employeeMap[emp.id].score += projectScore;

            employeeMap[emp.id].projects.push({

                projectId,

                projectName:
                    project.name ||
                    project.projectName ||
                    "Unnamed Project",

                targetHours,
                actualHours,

                multiplier,

                score: projectScore,

                efficiency:
                    (actualHours / targetHours).toFixed(2),

                performance:
                    multiplier >= 1
                        ? "Good"
                        : multiplier >= 0.75
                            ? "Average"
                            : "Poor"

            });


            if (multiplier >= 1)
                employeeMap[emp.id].goodProjects++;
            else
                employeeMap[emp.id].badProjects++;

        });

    });


    /* 5. Final ranking */
    const rankingArray =
        Object.values(employeeMap)
            .map(emp => ({
                ...emp,
                grade: getGrade(emp.score)
            }))
            .sort(
                (a, b) =>
                    b.score - a.score
            );

    return rankingArray;

}
