"use client";

import { Trash2, Plus } from "lucide-react";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const input = `${neo}
h-11
rounded-xl
bg-[#F9FAFC]
border
border-white
px-4
outline-none`;

const MONTHLY_WORKING_HOURS = 208;

export default function ProjectEmployeeStep({
  form,
  employees = [],
  addEmployee,
  removeEmployee,
  updateEmployee,
}) {
  function handleAdd(id) {
    const emp = employees.find(
      (employee) => employee.id === id,
    );

    if (!emp) return;

    const alreadyAdded = form.employees.some(
      (employee) =>
        employee.firestoreId === emp.id ||
        employee.employeeId === emp.employeeId,
    );

    if (alreadyAdded) return;

    const monthlyGrossSalary = Number(
      emp.salaryStructure?.grossSalary ||
        emp.grossSalary ||
        emp.salary ||
        0,
    );

    addEmployee({
      firestoreId: emp.id,
      employeeId: emp.employeeId || emp.id,
      fullName:
        emp.fullName ||
        emp.personalInfo?.fullName ||
        "Employee",
      designation:
        emp.designation ||
        emp.employment?.designation ||
        "",
      salary: monthlyGrossSalary,
      hours: 160,
    });
  }

  const totalCost = form.employees.reduce(
    (sum, employee) => {
      const monthlySalary = Number(
        employee.salary || 0,
      );

      const assignedHours = Number(
        employee.hours || 0,
      );

      const hourlyCost =
        monthlySalary / MONTHLY_WORKING_HOURS;

      return sum + hourlyCost * assignedHours;
    },
    0,
  );

  return (
    <div className="space-y-8">
      <div className="px-7 py-2">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold">
              Assign Employees
            </h3>

            <p className="mt-1 text-slate-500">
              Select project team
            </p>
          </div>

          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                handleAdd(event.target.value);
                event.target.value = "";
              }
            }}
            className={`${input} w-full sm:w-72`}
          >
            <option value="">+ Add Employee</option>

            {employees.map((employee) => {
              const employeeSalary = Number(
                employee.salaryStructure
                  ?.grossSalary ||
                  employee.grossSalary ||
                  employee.salary ||
                  0,
              );

              return (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.fullName ||
                    employee.personalInfo
                      ?.fullName ||
                    "Employee"}{" "}
                  — ₹
                  {employeeSalary.toLocaleString(
                    "en-IN",
                  )}
                </option>
              );
            })}
          </select>
        </div>

        <div className="space-y-5">
          {form.employees.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
              <Plus
                size={40}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-slate-500">
                No employees assigned
              </p>
            </div>
          )}

          {form.employees.map((employee) => {
            const monthlySalary = Number(
              employee.salary || 0,
            );

            const assignedHours = Number(
              employee.hours || 0,
            );

            const hourlyCost =
              monthlySalary /
              MONTHLY_WORKING_HOURS;

            const estimatedCost =
              hourlyCost * assignedHours;

            return (
              <div
                key={
                  employee.firestoreId ||
                  employee.employeeId
                }
                className={`${neo} rounded-2xl bg-[#F9FAFC] p-6`}
              >
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:items-center">
                  <div>
                    <div className="font-bold">
                      {employee.fullName}
                    </div>

                    <div className="text-sm text-slate-500">
                      {employee.designation ||
                        "No designation"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">
                      Monthly Gross Salary
                    </div>

                    <div>
                      ₹
                      {monthlySalary.toLocaleString(
                        "en-IN",
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">
                      Assigned Hours
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={employee.hours}
                      onChange={(event) =>
                        updateEmployee(
                          employee.employeeId,
                          "hours",
                          event.target.value,
                        )
                      }
                      className={`${input} w-24`}
                    />
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">
                      Hourly Cost
                    </div>

                    ₹
                    {hourlyCost.toLocaleString(
                      "en-IN",
                      {
                        maximumFractionDigits: 2,
                      },
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">
                      Estimated Cost
                    </div>

                    <div className="font-bold text-emerald-600">
                      ₹
                      {estimatedCost.toLocaleString(
                        "en-IN",
                        {
                          maximumFractionDigits: 2,
                        },
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        removeEmployee(
                          employee.employeeId,
                        )
                      }
                      aria-label={`Remove ${employee.fullName}`}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`${neo} rounded-3xl bg-white p-7`}
      >
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
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
              ₹
              {totalCost.toLocaleString(
                "en-IN",
                {
                  maximumFractionDigits: 2,
                },
              )}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-500">
              Average Cost / Employee
            </div>

            <div className="mt-2 text-3xl font-bold text-emerald-600">
              ₹
              {(
                form.employees.length
                  ? totalCost /
                    form.employees.length
                  : 0
              ).toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}