"use client";

import InfoCard from "../InfoCard";
import InfoItem from "../InfoItem";

export default function AddressSection({ employee }) {

    const address = employee.address || {};

    return (

        <InfoCard title="Address">

            <div className="grid grid-cols-2 gap-6">

                <InfoItem
                    label="Address"
                    value={address.addressLine}
                />

                <InfoItem
                    label="City"
                    value={address.city}
                />

                <InfoItem
                    label="State"
                    value={address.state}
                />

                <InfoItem
                    label="Country"
                    value={address.country}
                />

                <InfoItem
                    label="Pincode"
                    value={address.pincode}
                />

            </div>

        </InfoCard>

    );

}