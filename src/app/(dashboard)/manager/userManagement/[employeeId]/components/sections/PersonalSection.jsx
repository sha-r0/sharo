"use client";

import InfoCard from "../InfoCard";
import InfoItem from "../InfoItem";

export default function PersonalSection({

    employee,

}) {

    return (

        <InfoCard title="Personal Information">

            <div className="grid grid-cols-2 gap-6">

                <InfoItem
                    label="First Name"
                    value={employee.firstName}
                />

                <InfoItem
                    label="Last Name"
                    value={employee.lastName}
                />

                <InfoItem
                    label="Gender"
                    value={employee.gender}
                />

                <InfoItem
                    label="Date of Birth"
                    value={employee.dob}
                />

                <InfoItem
                    label="Phone"
                    value={employee.phone}
                />

                <InfoItem
                    label="Email"
                    value={employee.email}
                />

            </div>

        </InfoCard>

    );

}