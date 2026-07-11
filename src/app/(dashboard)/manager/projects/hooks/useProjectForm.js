"use client";

import { useState } from "react";

const initialForm = {

    // Basic

    projectName: "",

    projectCode: "",

    clientId: "",
    clientName: "",

    managerId: "",
    managerName: "",

    projectType: "Structural Design",

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

};

export default function useProjectForm() {

    const [form, setForm] = useState(initialForm);

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

        setForm(initialForm);

    }

    return {

        form,

        updateField,

        addEmployee,

        removeEmployee,

        updateEmployee,

        resetForm,

    };

}