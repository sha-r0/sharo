"use client";

import {
    User,
    Clock3,
    BadgeIndianRupee,
    Trash2,
    Plus,
} from "lucide-react";

const neo =
"shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const input =
`${neo}
h-11
rounded-xl
bg-[#F9FAFC]
border
border-white
px-4
outline-none`;

export default function ProjectEmployeeStep({

    form,

    employees = [],

    addEmployee,

    removeEmployee,

    updateEmployee,

}) {

    function handleAdd(id) {

        const emp = employees.find(e => e.id === id);

        if (!emp) return;

        if (
            form.employees.some(
                e => e.employeeId === emp.id
            )
        ) {
            return;
        }

        addEmployee({

            employeeId: emp.id,

            fullName: emp.fullName,

            designation: emp.designation,

            salary: emp.salary,

            hours: 160,

        });

    }

    const totalCost = form.employees.reduce((sum, emp) => {

        const hourly = Number(emp.salary || 0) / 208;

        return sum + hourly * Number(emp.hours || 0);

    }, 0);

    return (

        <div className="space-y-8">

            <div className={` px-7 py-2`}>

                <div className="flex items-center justify-between mb-6">

                    <div>

                        <h3 className="text-xl font-bold">

                            Assign Employees

                        </h3>

                        <p className="text-slate-500 mt-1">

                            Select project team

                        </p>

                    </div>

                    <select

                        onChange={(e)=>{

                            if(e.target.value){

                                handleAdd(e.target.value);

                                e.target.value="";

                            }

                        }}

                        className={`${input} w-72`}

                    >

                        <option value="">

                            + Add Employee

                        </option>

                        {

                            employees.map(emp=>(

                                <option

                                    key={emp.id}

                                    value={emp.id}

                                >

                                    {emp.fullName}

                                </option>

                            ))

                        }

                    </select>

                </div>

                <div className="space-y-5">

                    {

                        form.employees.length===0 && (

                            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">

                                <Plus
                                    size={40}
                                    className="mx-auto text-slate-300"
                                />

                                <p className="mt-3 text-slate-500">

                                    No employees assigned

                                </p>

                            </div>

                        )

                    }

                    {

                        form.employees.map(emp=>{

                            const hourly = Number(emp.salary||0)/208;

                            const cost = hourly*Number(emp.hours||0);

                            return(

                                <div

                                    key={emp.employeeId}

                                    className={`${neo} rounded-2xl bg-[#F9FAFC] p-6`}

                                >

                                    <div className="grid grid-cols-6 gap-6 items-center">

                                        <div>

                                            <div className="font-bold">

                                                {emp.fullName}

                                            </div>

                                            <div className="text-sm text-slate-500">

                                                {emp.designation}

                                            </div>

                                        </div>

                                        <div>

                                            <div className="text-xs text-slate-500">

                                                Salary

                                            </div>

                                            <div>

                                                ₹{Number(emp.salary).toLocaleString()}

                                            </div>

                                        </div>

                                        <div>

                                            <div className="text-xs text-slate-500">

                                                Hours

                                            </div>

                                            <input

                                                type="number"

                                                value={emp.hours}

                                                onChange={(e)=>

                                                    updateEmployee(

                                                        emp.employeeId,

                                                        "hours",

                                                        e.target.value

                                                    )

                                                }

                                                className={`${input} w-24`}

                                            />

                                        </div>

                                        <div>

                                            <div className="text-xs text-slate-500">

                                                Hourly

                                            </div>

                                            ₹{hourly.toFixed(0)}

                                        </div>

                                        <div>

                                            <div className="text-xs text-slate-500">

                                                Estimated Cost

                                            </div>

                                            <div className="font-bold text-emerald-600">

                                                ₹{cost.toLocaleString()}

                                            </div>

                                        </div>

                                        <div className="flex justify-end">

                                            <button

                                                onClick={()=>removeEmployee(emp.employeeId)}

                                                className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"

                                            >

                                                <Trash2 size={18}/>

                                            </button>

                                        </div>

                                    </div>

                                </div>

                            )

                        })

                    }

                </div>

            </div>

            <div className={`${neo} rounded-3xl bg-white p-7`}>

                <div className="grid grid-cols-3 gap-8">

                    <div>

                        <div className="text-sm text-slate-500">

                            Employees

                        </div>

                        <div className="mt-2 text-3xl font-bold">

                            {form.employees.length}

                        </div>

                    </div>

                    <div>

                        <div className="text-sm text-slate-500">

                            Estimated Labour Cost

                        </div>

                        <div className="mt-2 text-3xl font-bold text-blue-600">

                            ₹{totalCost.toLocaleString()}

                        </div>

                    </div>

                    <div>

                        <div className="text-sm text-slate-500">

                            Avg Cost / Employee

                        </div>

                        <div className="mt-2 text-3xl font-bold text-emerald-600">

                            ₹{

                                form.employees.length
                                ?
                                (totalCost/form.employees.length).toLocaleString()
                                :
                                0

                            }

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}