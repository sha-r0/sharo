"use client";

import InfoCard from "../InfoCard";
import InfoItem from "../InfoItem";

export default function EmploymentSection({ employee }) {

    return (

        <InfoCard title="Employment Information">

            <div className="grid grid-cols-2 gap-6">

                <InfoItem
                    label="Department"
                    value={employee.department}
                />

                <InfoItem
                    label="Designation"
                    value={employee.designation}
                />

                <InfoItem
                    label="Role"
                    value={employee.role}
                />

                <InfoItem
                    label="Employee Type"
                    value={employee.employeeType}
                />

                <InfoItem
                    label="Joining Date"
                    value={employee.joiningDate}
                />

                <InfoItem
                    label="Shift"
                    value={employee.shift}
                />

            </div>

        </InfoCard>

    );

}