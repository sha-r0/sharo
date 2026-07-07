"use client";

import InfoCard from "../InfoCard";
import InfoItem from "../InfoItem";

export default function SalarySection({ employee }) {

    const salary = employee.salaryStructure || {};

    return (

        <InfoCard title="Salary Structure">

            <div className="grid grid-cols-2 gap-6">

                <InfoItem
                    label="CTC"
                    value={`₹ ${salary.ctc || "-"}`}
                />

                <InfoItem
                    label="Gross Salary"
                    value={`₹ ${salary.grossSalary || "-"}`}
                />

                <InfoItem
                    label="Basic Salary"
                    value={`₹ ${salary.basicSalary || "-"}`}
                />

                <InfoItem
                    label="HRA"
                    value={`₹ ${salary.hra || "-"}`}
                />

                <InfoItem
                    label="Other Allowance"
                    value={`₹ ${salary.otherAllowance || "-"}`}
                />

                <InfoItem
                    label="PF"
                    value={salary.includePf ? "Enabled" : "Disabled"}
                />

                <InfoItem
                    label="ESI"
                    value={salary.includeEsi ? "Enabled" : "Disabled"}
                />

            </div>

        </InfoCard>

    );

}