import { serverTimestamp } from "firebase/firestore";

export function mapProject({

    companyId,

    firestoreId,

    projectId,

    form,

    currentUser,

}) {

    return {

        /* =====================================================
            IDs
        ===================================================== */

        id: firestoreId,

        companyId,

        projectId,

        /* =====================================================
            Basic Information
        ===================================================== */

        projectName: form.projectName || "",

        clientId: form.clientId || "",

        clientName: form.clientName || "",

        managerId: form.managerId || "",

        managerName: form.managerName || "",

        /* =====================================================
            Financial
        ===================================================== */

        poAmount: Number(form.poAmount || 0),

        budget: Number(form.budget || 0),

        totalExpense: 0,

        employeeExpense: 0,

        normalExpense: 0,

        vendorExpense: 0,

        materialExpense: 0,

        totalProfit: Number(form.poAmount || 0),

        /* =====================================================
            Timeline
        ===================================================== */

        startDate: form.startDate || null,

        endDate: form.endDate || null,

        /* =====================================================
            Status
        ===================================================== */

        status: form.status || "Pending",

        progress: 0,

        healthScore: 100,

        overdue: false,

        /* =====================================================
            Employees
        ===================================================== */

        employees: (form.employees || []).map(employee => ({

            firestoreId: employee.id || "",
        
            employeeId: employee.employeeId || "",
        
            fullName: employee.fullName || "",
        
            designation: employee.designation || "",
        
            salary: Number(employee.salary || 0),
        
        })),

        employeeCount:

            (form.employees || []).length,

        /* =====================================================
            Description
        ===================================================== */

        description: form.description || "",

        /* =====================================================
            Analytics
        ===================================================== */

        totalHours: 0,

        completedTasks: 0,

        pendingTasks: 0,

        delayedTasks: 0,

        /* =====================================================
            Billing
        ===================================================== */

        totalReceived: 0,

        totalPending: Number(form.poAmount || 0),

        /* =====================================================
            Metadata
        ===================================================== */

        createdBy: {

            uid: currentUser?.uid || "",

            name: currentUser?.displayName || "",

            email: currentUser?.email || "",

        },

        updatedBy: {

            uid: currentUser?.uid || "",

            name: currentUser?.displayName || "",

            email: currentUser?.email || "",

        },

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),

    };

}