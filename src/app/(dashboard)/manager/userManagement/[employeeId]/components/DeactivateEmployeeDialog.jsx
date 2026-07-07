"use client";

import { useState } from "react";

import {
    AlertTriangle,
    UserX,
    Loader2,
} from "lucide-react";

import { toast } from "react-hot-toast";

import employeeService from "@/app/allservice/employee/employeeService";

import { useAuth } from "@/app/(auth)/context/AuthContext";

export default function DeactivateEmployeeDialog({

    employee,

    open,

    onClose,

    onSuccess,

}) {

    const { company, currentUser } = useAuth();

    const [loading, setLoading] = useState(false);

    async function deactivate() {

        try {

            setLoading(true);

            const result =
                await employeeService.deactivateEmployee(

                    company.id,

                    employee.firestoreId,

                    currentUser

                );

            if (!result.success) {

                toast.error(result.message);

                return;

            }

            toast.success(result.message);

            onSuccess?.();

            onClose();

        }

        catch (error) {

            console.error(error);

            toast.error("Something went wrong.");

        }

        finally {

            setLoading(false);

        }

    }

    if (!open) return null;

    return (

        <div
            className="
                fixed
                inset-0
                z-50
                bg-black/40
                backdrop-blur-sm
                flex
                items-center
                justify-center
                p-5
            "
        >

            <div
                className="
                    w-full
                    max-w-lg
                    rounded-3xl
                    bg-white
                    shadow-2xl
                    overflow-hidden
                    animate-in
                    fade-in
                    zoom-in-95
                "
            >

                {/* Header */}

                <div className="p-8">

                    <div
                        className="
                            w-16
                            h-16
                            rounded-2xl
                            bg-red-100
                            flex
                            items-center
                            justify-center
                            mx-auto
                        "
                    >

                        <AlertTriangle

                            className="text-red-600"

                            size={34}

                        />

                    </div>

                    <h2
                        className="
                            text-2xl
                            font-bold
                            text-center
                            mt-5
                        "
                    >

                        Deactivate Employee

                    </h2>

                    <p
                        className="
                            text-center
                            text-slate-500
                            mt-3
                            leading-relaxed
                        "
                    >

                        Are you sure you want to deactivate

                        <br />

                        <span className="font-semibold text-slate-800">

                            {employee.fullName}

                        </span>

                        ?

                    </p>

                </div>

                {/* Body */}

                <div className="px-8">

                    <div
                        className="
                            rounded-2xl
                            bg-red-50
                            border
                            border-red-100
                            p-5
                            space-y-3
                        "
                    >

                        <div>✅ Login access will be disabled</div>

                        <div>✅ Employee won't appear in active employees</div>

                        <div>✅ Attendance history will remain safe</div>

                        <div>✅ Salary & expense history will remain safe</div>

                        <div>✅ Employee can be restored later</div>

                    </div>

                </div>

                {/* Footer */}

                <div
                    className="
                        p-8
                        flex
                        justify-end
                        gap-3
                    "
                >

                    <button

                        onClick={onClose}

                        disabled={loading}

                        className="
                            h-12
                            px-6
                            rounded-xl
                            border
                            border-slate-300
                            hover:bg-slate-100
                            transition
                        "
                    >

                        Cancel

                    </button>

                    <button

                        onClick={deactivate}

                        disabled={loading}

                        className="
                            h-12
                            px-6
                            rounded-xl
                            bg-red-600
                            hover:bg-red-700
                            text-white
                            font-semibold
                            flex
                            items-center
                            gap-2
                            transition
                        "
                    >

                        {loading ? (

                            <>

                                <Loader2

                                    className="animate-spin"

                                    size={18}

                                />

                                Deactivating...

                            </>

                        ) : (

                            <>

                                <UserX size={18} />

                                Deactivate Employee

                            </>

                        )}

                    </button>

                </div>

            </div>

        </div>

    );

}