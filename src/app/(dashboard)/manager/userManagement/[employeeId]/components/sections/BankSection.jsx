"use client";

import { useState } from "react";
import { BadgeCheck, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";

import InfoCard from "../InfoCard";
import InfoItem from "../InfoItem";
import { payoutBeneficiaryService } from "../../../services/PayoutBeneficiaryService";

export default function BankSection({ employee, canSync = false, onSynced }) {

    const bank = employee.bankDetails || {};
    const [syncing, setSyncing] = useState(false);
    const beneficiary = employee.payoutBeneficiary || {};
    const status = String(beneficiary.status || "NOT SET").toUpperCase();
    const verified = status === "VERIFIED";
    const payoutLabel = verified ? "Ready for payout" : status === "NOT SET" ? "Not synced" : "Error / needs bank details";

    const sync = async () => {
        setSyncing(true);
        try {
            const result = await payoutBeneficiaryService.sync(employee.firestoreId);
            toast.success(result?.payoutReady ? "Employee payout account verified." : `Payout account status: ${result?.status || "Pending"}.`);
            await onSynced?.();
        } catch {
            toast.error("Unable to sync the employee payout account.");
        } finally {
            setSyncing(false);
        }
    };

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

            <div className={`mt-6 rounded-2xl border p-4 ${verified ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 place-items-center rounded-xl ${verified ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-600"}`}><BadgeCheck size={18}/></span>
                        <div><p className="text-xs font-semibold uppercase text-slate-500">Payout account</p><p className={`text-sm font-bold ${verified ? "text-emerald-800" : "text-slate-800"}`}>{payoutLabel}</p></div>
                    </div>
                    {canSync && <button type="button" onClick={sync} disabled={syncing} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><RefreshCw size={15} className={syncing ? "animate-spin" : ""}/>{syncing ? "Syncing…" : "Sync Payout Account"}</button>}
                </div>
            </div>

        </InfoCard>

    );

}
