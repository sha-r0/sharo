"use client";

import { useEffect, useState } from "react";
import categoryService from "@/app/allservice/expense/categoryService";
import { travelRouteEnabled, resolveTravelRoute } from "@/lib/expenses/travelRoute";
import ReceiptPicker from "./ReceiptPicker";
import { X } from "lucide-react";

export default function EditAmountModal({
    open,
    expense,
    onClose,
    onUpdate,
    loading,
    stage,
}) {

    const [routeCategory, setRouteCategory] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState("");
    const [travelFrom, setTravelFrom] = useState("");
    const [travelTo, setTravelTo] = useState("");
    useEffect(() => {
        let active = true;
        setTravelFrom(expense?.travelFrom || ""); setTravelTo(expense?.travelTo || ""); setRouteError(""); setRouteCategory(null);
        if (!open || !expense || expense.status !== "pending") { setRouteLoading(false); return; }
        if (!expense.categoryId) { setRouteCategory({ name: expense.categoryName || expense.category }); setRouteLoading(false); return; }
        setRouteLoading(true);
        categoryService.list().then(({ categories }) => {
            if (!active) return;
            const category = categories.find((item) => item.id === expense.categoryId);
            if (!category) throw new Error("Expense category is unavailable.");
            setRouteCategory(category);
        }).catch((error) => { if (active) setRouteError(error.message); }).finally(() => { if (active) setRouteLoading(false); });
        return () => { active = false; };
    }, [open, expense]);
    const needsRoute = expense?.status === "pending" && travelRouteEnabled(routeCategory);
    const [amount, setAmount] = useState("");
    const [file, setFile] = useState(null);
    const [removed, setRemoved] = useState(false);

    useEffect(() => {

        if (expense) {

            setAmount(expense.amount || 0);
            setFile(null); setRemoved(false);

        }

    }, [expense, open]);

    if (!open || !expense) return null;

    return (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-2xl w-[420px] max-h-[90vh] overflow-auto shadow-xl">

                <div className="flex justify-between items-center border-b px-6 py-4">

                    <h2 className="text-xl font-semibold">
                        Edit Expense
                    </h2>

                    <button disabled={loading} onClick={onClose}>

                        <X size={20} />

                    </button>

                </div>

                <div className="p-6 space-y-5">

                    <div>

                        <label className="text-sm text-gray-600">

                            Amount

                        </label>

                        <input

                            disabled={loading}
                            type="number"

                            value={amount}

                            onChange={(e) =>
                                setAmount(e.target.value)
                            }

                            className="w-full mt-2 border rounded-lg px-4 py-3"

                        />

                    </div>

                    {routeError && <p role="alert" className="text-sm text-red-600">{routeError}</p>}
                    {needsRoute && <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm">From *<input required disabled={loading} maxLength={300} value={travelFrom} placeholder="Enter starting location" onChange={(event) => setTravelFrom(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
                        <label className="text-sm">To *<input required disabled={loading} maxLength={300} value={travelTo} placeholder="Enter destination" onChange={(event) => setTravelTo(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
                    </div>}
                    <ReceiptPicker file={file} removed={removed} existingUrl={expense.billUrl} disabled={loading} onChange={(nextFile, nextRemoved) => { setFile(nextFile); setRemoved(nextRemoved); }} />

                    <div className="flex justify-end gap-3">

                        <button

                            disabled={loading}
                            onClick={onClose}

                            className="px-5 py-2 rounded-lg border"

                        >

                            Cancel

                        </button>

                        <button

                            disabled={loading || routeLoading || Boolean(routeError) || (needsRoute && (!travelFrom.trim() || !travelTo.trim()))}

                            onClick={() =>
                                onUpdate(Number(amount), { file, removed }, needsRoute ? resolveTravelRoute(routeCategory, { travelFrom, travelTo }) : {})
                            }

                            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"

                        >

                            {loading ? stage || "Updating…" : "Update"}

                        </button>

                    </div>

                </div>

            </div>

        </div>

    );

}