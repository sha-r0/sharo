"use client";

import EmployeeCard from "./EmployeeCard";

export default function EmployeeList({

    employees,

}) {

    if (!employees.length) {

        return (

            <div
                className="
                    bg-white
                    rounded-3xl
                    border
                    border-slate-200
                    py-24
                    text-center
                "
            >

                <h2 className="text-2xl font-bold">

                    No Employees Found

                </h2>

                <p className="mt-3 text-slate-500">

                    Try changing your filters or add a new employee.

                </p>

            </div>

        );

    }

    return (

        <div className="space-y-4">

            {employees.map((employee) => (

                <EmployeeCard

                    key={employee.firestoreId}

                    employee={employee}

                />

            ))}

        </div>

    );

}