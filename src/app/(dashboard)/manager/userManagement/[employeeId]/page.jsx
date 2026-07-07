"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import employeeService from "@/app/allservice/employee/employeeService";

import EmployeeHeader from "./components/EmployeeHeader";

import PersonalSection from "./components/sections/PersonalSection";
import EmploymentSection from "./components/sections/EmploymentSection";
import SalarySection from "./components/sections/SalarySection";
import BankSection from "./components/sections/BankSection";
import AddressSection from "./components/sections/AddressSection";
import DocumentsSection from "./components/sections/DocumentsSection";
import DeactivateEmployeeDialog from "./components/DeactivateEmployeeDialog";

export default function EmployeeDetailsPage() {

    const router = useRouter();

    const { employeeId } = useParams();

    const { company, currentUser } = useAuth();

    const [loading, setLoading] = useState(true);

    const [employee, setEmployee] = useState(null);

    const [showDeactivate, setShowDeactivate] = useState(false);

    useEffect(() => {

        if (!company || !employeeId) return;

        loadEmployee();

    }, [company, employeeId]);

    async function loadEmployee() {

        try {

            setLoading(true);

            const data = await employeeService.getEmployee(

                company.id,

                employeeId

            );

            setEmployee(data);

        }

        catch (error) {

            console.error(error);

            toast.error("Unable to load employee.");

        }

        finally {

            setLoading(false);

        }

    }

    // async function handleDeactivate() {

    //     if (

    //         !window.confirm(

    //             "Deactivate this employee?"

    //         )

    //     ) return;

    //     const result = await employeeService.deactivateEmployee(

    //         company.id,

    //         employee.firestoreId,

    //         currentUser

    //     );

    //     if (!result.success) {

    //         toast.error(result.message);

    //         return;

    //     }

    //     toast.success(result.message);

    //     await loadEmployee();

    // }

    function handleEdit() {

        router.push(

            `/manager/userManagement/edit/${employee.firestoreId}`

        );

    }

    if (loading) {

        return (

            <div className="flex items-center justify-center py-32">

                <p className="text-slate-500">

                    Loading Employee...

                </p>

            </div>

        );

    }

    if (!employee) {

        return (

            <div className="flex items-center justify-center py-32">

                <p className="text-slate-500">

                    Employee not found.

                </p>

            </div>

        );

    }

    return (

        <div className="space-y-6">

            {/* =====================================
                Header
            ===================================== */}

            <EmployeeHeader

                employee={employee}

                onEdit={handleEdit}

                onDeactivate={() => setShowDeactivate(true)}

            />

            {/* =====================================
                Information
            ===================================== */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                <PersonalSection

                    employee={employee}

                />

                <EmploymentSection

                    employee={employee}

                />

                <SalarySection

                    employee={employee}

                />

                <BankSection

                    employee={employee}

                />

                <AddressSection

                    employee={employee}

                />

                <DocumentsSection

                    employee={employee}

                />

            </div>

            <DeactivateEmployeeDialog

                employee={employee}

                open={showDeactivate}

                onClose={() => setShowDeactivate(false)}

                onSuccess={loadEmployee}

            />

        </div>

    );

}