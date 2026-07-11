"use client";

import { X } from "lucide-react";

export default function BillPreviewModal({

    open,

    billUrl,

    onClose,

}) {

    if (!open || !billUrl) return null;

    const isPdf = billUrl
        .toLowerCase()
        .includes(".pdf");

    return (

        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-6">

            <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl">

                {/* Header */}

                <div className="flex items-center justify-between px-6 py-4 border-b">

                    <h2 className="text-xl font-semibold">

                        Expense Bill

                    </h2>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100"
                    >

                        <X size={20} />

                    </button>

                </div>

                {/* Preview */}

                <div className="h-full bg-slate-100">

                    {isPdf ? (

                        <iframe

                            src={billUrl}

                            title="Bill"

                            className="w-full h-full"

                        />

                    ) : (

                        <img

                            src={billUrl}

                            alt="Bill"

                            className="w-full h-full object-contain"

                        />

                    )}

                </div>

            </div>

        </div>

    );

}