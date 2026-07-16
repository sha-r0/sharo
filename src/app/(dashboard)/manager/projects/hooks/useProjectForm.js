"use client";

import { useEffect, useState } from "react";

const initialForm = {

    // Basic

    projectName: "",

    projectCode: "",

    clientId: "",
    clientName: "",

    managerId: "",
    managerName: "",

    projectType: "Structural Design",

    executionModel: "inhouse",

    // Financial

    poAmount: "",

    budget: "",

    // Timeline

    startDate: "",

    endDate: "",

    // Status

    priority: "Medium",

    status: "Pending",

    // Others

    description: "",

    location: "",

    employees: [],

    vendors: [],

};

function projectToForm(project) {
    if (!project) return initialForm;
    return {
        ...initialForm,
        projectName: project.projectName || "",
        projectCode: project.projectCode || project.projectId || "",
        clientId: project.clientId || "",
        clientName: project.clientName || "",
        managerId: project.managerId || "",
        managerName: project.managerName || "",
        projectType: project.projectType || "Structural Design",
        executionModel: project.executionModel || ((project.vendors || []).length ? (project.employees || []).length ? "hybrid" : "outsourced" : "inhouse"),
        poAmount: project.poAmount ?? "",
        budget: project.budget ?? "",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
        priority: project.priority || "Medium",
        status: project.status || "Pending",
        description: project.description || "",
        location: project.location || "",
        employees: (project.employees || []).map((employee) => ({
            ...employee,
            firestoreId: employee.firestoreId || employee.id || "",
            employeeId: employee.employeeId || employee.firestoreId || employee.id || "",
            hours: employee.hours ?? 160,
        })),
        vendors: (project.vendors || []).map((vendor) => ({
            ...vendor,
            vendorId: vendor.vendorId || vendor.firestoreId || vendor.id || "",
            firestoreId: vendor.firestoreId || vendor.vendorId || vendor.id || "",
        })),
    };
}

export default function useProjectForm(initialProject = null) {

    const [form, setForm] = useState(() => projectToForm(initialProject));

    useEffect(() => {
        setForm(projectToForm(initialProject));
    }, [initialProject]);

    function updateField(field, value) {

        setForm(prev => ({

            ...prev,

            [field]: value,

        }));

    }

    function addEmployee(employee) {

        setForm(prev => ({

            ...prev,

            employees: [

                ...prev.employees,

                employee,

            ],

        }));

    }

    function removeEmployee(employeeId) {

        setForm(prev => ({

            ...prev,

            employees: prev.employees.filter(

                e => e.employeeId !== employeeId

            ),

        }));

    }

    function updateEmployee(employeeId, field, value) {

        setForm(prev => ({

            ...prev,

            employees: prev.employees.map(emp =>

                emp.employeeId === employeeId

                    ? {

                        ...emp,

                        [field]: value,

                    }

                    : emp

            ),

        }));

    }

    function resetForm() {

        setForm(projectToForm(initialProject));

    }

    function addVendor(vendor) { setForm((current) => ({ ...current, vendors: [...current.vendors, vendor] })); }
    function removeVendor(vendorId) { setForm((current) => ({ ...current, vendors: current.vendors.filter((item) => item.vendorId !== vendorId) })); }
    function updateVendor(vendorId, field, value) { setForm((current) => ({ ...current, vendors: current.vendors.map((item) => item.vendorId === vendorId ? { ...item, [field]: value } : item) })); }

    return {

        form,

        updateField,

        addEmployee,

        removeEmployee,

        updateEmployee,

        resetForm,
        addVendor,
        removeVendor,
        updateVendor,

    };

}
