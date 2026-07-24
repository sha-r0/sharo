"use client";


const sectionClass =
    "rounded-3xl bg-white p-6 border border-slate-100 shadow-sm";

const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-[#F9FAFC] px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

export default function ClientForm({

    form,

    updateField,

    updateAddress,

    errors,

}) {
    return (

        <div className="space-y-8">

            {/* =============================================== */}
            {/* Client Information */}
            {/* =============================================== */}

            <section className={sectionClass}>

                <h3 className="text-lg font-semibold text-slate-800 mb-5">

                    Client Information

                </h3>

                <div className="grid grid-cols-3 gap-5">

                    <div>

                        <label className="mb-2 block text-sm font-medium">

                            Client Name *

                        </label>

                        <input

                            value={form.clientName}

                            onChange={(e) =>
                                updateField(
                                    "clientName",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="Enter client name"

                        />

                    </div>

                    <div>

                        <label className="mb-2 block text-sm font-medium">

                            Company Name

                        </label>

                        <input

                            value={form.companyName}

                            onChange={(e) =>
                                updateField(
                                    "companyName",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="Enter company name"

                        />

                    </div>

                    <div>

                        <label className="mb-2 block text-sm font-medium">

                            Contact Person

                        </label>

                        <input

                            value={form.contactPerson}

                            onChange={(e) =>
                                updateField(
                                    "contactPerson",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="Enter contact person"

                        />

                    </div>

                </div>

            </section>

            {/* =============================================== */}
            {/* Communication */}
            {/* =============================================== */}

            <section className={sectionClass}>

                <h3 className="text-lg font-semibold text-slate-800 mb-5">

                    Communication

                </h3>

                <div className="grid grid-cols-2 gap-5">

                    <div>

                        <label className="mb-2 block text-sm font-medium">

                            Mobile Number

                        </label>

                        <input

                            value={form.phone}

                            onChange={(e) =>
                                updateField(
                                    "phone",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="9876543210"

                        />

                    </div>

                    <div>

                        <label className="mb-2 block text-sm font-medium">

                            Email

                        </label>

                        <input

                            value={form.email}

                            onChange={(e) =>
                                updateField(
                                    "email",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="info@company.com"

                        />

                    </div>

                </div>

            </section>

            {/* =============================================== */}
            {/* Business Details */}
            {/* =============================================== */}

            <section className={sectionClass}>

                <h3 className="text-lg font-semibold text-slate-800 mb-5">

                    Business Details

                </h3>

                <div className="grid grid-cols-2 gap-5">

                    <div>

                        <label className="mb-2 block text-sm font-medium">

                            GST Number

                        </label>

                        <input

                            value={form.gstNo}

                            onChange={(e) =>
                                updateField(
                                    "gstNo",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="GST Number"

                        />

                    </div>

                    <div>

                        <label className="mb-2 block text-sm font-medium">

                            PAN Number

                        </label>

                        <input

                            value={form.panNo}

                            onChange={(e) =>
                                updateField(
                                    "panNo",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="PAN Number"

                        />

                    </div>

                </div>

            </section>

            {/* =============================================== */}
            {/* Address */}
            {/* =============================================== */}

            <section className={sectionClass}>

                <h3 className="text-lg font-semibold text-slate-800 mb-5">

                    Address

                </h3>

                <div className="space-y-5">

                    <div>

                        <label className="mb-2 block text-sm font-medium">

                            Address

                        </label>

                        <textarea

                            rows={3}

                            value={form.address.line1}

                            onChange={(e) =>
                                updateAddress(
                                    "line1",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="Complete address"

                        />

                    </div>

                    <div className="grid grid-cols-4 gap-5">

                        <input

                            value={form.address.city}

                            onChange={(e) =>
                                updateAddress(
                                    "city",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="City"

                        />

                        <input

                            value={form.address.state}

                            onChange={(e) =>
                                updateAddress(
                                    "state",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="State"

                        />

                        <input

                            value={form.address.country}

                            onChange={(e) =>
                                updateAddress(
                                    "country",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="Country"

                        />

                        <input

                            value={form.address.pincode}

                            onChange={(e) =>
                                updateAddress(
                                    "pincode",
                                    e.target.value
                                )
                            }

                            className={inputClass}

                            placeholder="Pincode"

                        />

                    </div>

                </div>

            </section>

            {/* =============================================== */}
            {/* Status */}
            {/* =============================================== */}

            <section className={sectionClass}>
                <h3 className="mb-5 text-lg font-semibold text-slate-800">
                    Client Status
                </h3>

                <div className="max-w-sm">
                    <label className="mb-2 block text-sm font-medium">
                        Status
                    </label>

                    <select
                        value={form.status}
                        onChange={(e) =>
                            updateField("status", e.target.value)
                        }
                        className={inputClass}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </section>

            {/* =============================================== */}
            {/* Notes */}
            {/* =============================================== */}

            <section className={sectionClass}>

                <h3 className="text-lg font-semibold text-slate-800 mb-5">

                    Notes

                </h3>

                <textarea

                    rows={5}

                    value={form.notes}

                    onChange={(e) =>
                        updateField(
                            "notes",
                            e.target.value
                        )
                    }

                    className={inputClass}

                    placeholder="Additional information about this client..."

                />

            </section>

        </div>

    );

}