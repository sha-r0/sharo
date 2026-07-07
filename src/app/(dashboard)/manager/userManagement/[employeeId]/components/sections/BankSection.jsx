"use client";

import InfoCard from "../InfoCard";
import InfoItem from "../InfoItem";

export default function BankSection({ employee }) {

    const bank = employee.bankDetails || {};

    return (

        <InfoCard title="Bank Details">

            <div className="grid grid-cols-2 gap-6">

                <InfoItem
                    label="Bank Name"
                    value={bank.bankName}
                />

                <InfoItem
                    label="Account Holder"
                    value={bank.accountHolderName}
                />

                <InfoItem
                    label="Account Number"
                    value={bank.accountNumber}
                />

                <InfoItem
                    label="IFSC"
                    value={bank.ifsc}
                />

                <InfoItem
                    label="UPI"
                    value={bank.upi}
                />

                <InfoItem
                    label="Branch"
                    value={bank.branch}
                />

            </div>

        </InfoCard>

    );

}