"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function EditAmountModal({
    open,
    expense,
    onClose,
    onUpdate,
    loading,
}) {

    const [amount, setAmount] = useState("");

    useEffect(() => {

        if (expense) {

            setAmount(expense.amount || 0);

        }

    }, [expense]);

    if (!open || !expense) return null;

    return (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-2xl w-[420px] shadow-xl">

                <div className="flex justify-between items-center border-b px-6 py-4">

                    <h2 className="text-xl font-semibold">
                        Edit Expense Amount
                    </h2>

                    <button onClick={onClose}>

                        <X size={20} />

                    </button>

                </div>

                <div className="p-6 space-y-5">

                    <div>

                        <label className="text-sm text-gray-600">

                            Amount

                        </label>

                        <input

                            type="number"

                            value={amount}

                            onChange={(e) =>
                                setAmount(e.target.value)
                            }

                            className="w-full mt-2 border rounded-lg px-4 py-3"

                        />

                    </div>

                    <div className="flex justify-end gap-3">

                        <button

                            onClick={onClose}

                            className="px-5 py-2 rounded-lg border"

                        >

                            Cancel

                        </button>

                        <button

                            disabled={loading}

                            onClick={() =>
                                onUpdate(Number(amount))
                            }

                            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"

                        >

                            {loading ? "Updating..." : "Update"}

                        </button>

                    </div>

                </div>

            </div>

        </div>

    );

}