"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import employeeService from "@/app/allservice/employee/employeeService";

import EmployeeForm from "../../components/ EmployeeForm";

export default function EditEmployeePage() {

    const { employeeId } = useParams();

    const { company } = useAuth();

    const [loading, setLoading] = useState(true);

    const [employee, setEmployee] = useState(null);

    useEffect(() => {

        if (!company?.id || !employeeId) return;

        loadEmployee();

    }, [company?.id, employeeId]);

    async function loadEmployee() {

        try {

            const data = await employeeService.getEmployee(

            company.id,

            employeeId

        );

            setEmployee(data);

        } catch (error) {

            console.error("[EditEmployee] Unable to load employee", {
                operation: "getDoc",
                path: `Companies/${company.id}/Usermanagement/${employeeId}`,
                code: error?.code || "unknown",
            });

            toast.error("Unable to load employee.");

        } finally {

            setLoading(false);

        }

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
