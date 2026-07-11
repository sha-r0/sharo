"use client";

export default function EmployeeTab({ project }) {

    return (

        <div className="rounded-3xl bg-white p-8">

            <h2 className="mb-6 text-2xl font-bold">

                Assigned Employees

            </h2>

            <table className="w-full">

                <thead>

                    <tr className="border-b">

                        <th className="py-3 text-left">Employee</th>

                        <th className="text-left">Designation</th>

                        <th className="text-right">Salary</th>

                    </tr>

                </thead>

                <tbody>

                    {(project.employees || []).map(emp => (

                        <tr key={emp.firestoreId} className="border-b">

                            <td className="py-4">

                                {emp.fullName}

                            </td>

                            <td>

                                {emp.designation}

                            </td>

                            <td className="text-right">

                                ₹{Number(emp.salary || 0).toLocaleString()}

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

}