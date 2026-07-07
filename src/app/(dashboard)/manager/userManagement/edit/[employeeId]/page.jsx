"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import employeeService from "@/app/allservice/employee/employeeService";

import EmployeeForm from "../../components/ EmployeeForm";

export default function EditEmployeePage() {

    const { employeeId } = useParams();

    const { company } = useAuth();

    const [loading, setLoading] = useState(true);

    const [employee, setEmployee] = useState(null);

    useEffect(() => {

        if (!company) return;

        loadEmployee();

    }, [company]);

    async function loadEmployee() {

        const data = await employeeService.getEmployee(

            company.id,

            employeeId

        );

        setEmployee(data);

        setLoading(false);

    }

    if (loading) {

        return <div>Loading...</div>;

    }

    return (

        <EmployeeForm

            mode="edit"

            employee={employee}

        />

    );

}