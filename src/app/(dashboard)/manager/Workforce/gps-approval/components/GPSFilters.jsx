"use client";

import {
    Search,
    Calendar,
    MapPin,
    User,
    RotateCcw,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function GPSFilters({

    filters,

    setFilters,

    employees,

    onApply,

    onReset,

}) {

    function resetFilters() {

        const month = new Date()

            .toISOString()

            .slice(0, 7);

        const nextFilters = {

            employee: "",

            month,

            gpsStatus: "all",

        };

        setFilters(nextFilters);
        onReset?.(nextFilters);

    }

    return (

        <div
            className={`${neo} rounded-3xl bg-[#F9FAFC] p-7`}
        >

            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">

                {/* Employee */}

                <div>

                    <label className="mb-2 flex items-center gap-2 font-medium text-slate-700">

                        <User size={16} />

                        Employee

                    </label>

                    <select

                        value={filters.employee}

                        onChange={(e) =>

                            setFilters({

                                ...filters,

                                employee: e.target.value,

                            })

                        }

                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"

                    >

                        <option value="">

                            All Employees

                        </option>

                        {employees.map((emp) => (

                            <option

                                key={emp.id}

                                value={emp.id}

                            >

                                {emp.name}

                            </option>

                        ))}

                    </select>

                </div>

                {/* Month */}

                <div>

                    <label className="mb-2 flex items-center gap-2 font-medium text-slate-700">

                        <Calendar size={16} />

                        Month

                    </label>

                    <input

                        type="month"

                        value={filters.month}

                        onChange={(e) =>

                            setFilters({

                                ...filters,

                                month: e.target.value,

                            })

                        }

                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"

                    />

                </div>

                {/* GPS Status */}

                <div>

                    <label className="mb-2 flex items-center gap-2 font-medium text-slate-700">

                        <MapPin size={16} />

                        GPS Status

                    </label>

                    <select

                        value={filters.gpsStatus}

                        onChange={(e) =>

                            setFilters({

                                ...filters,

                                gpsStatus: e.target.value,

                            })

                        }

                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"

                    >

                        <option value="all">

                            All

                        </option>

                        <option value="valid">

                            GPS Valid

                        </option>

                        <option value="invalid">

                            GPS Invalid

                        </option>

                    </select>

                </div>

                {/* Buttons */}

                <div className="flex items-end gap-3">

                    <button

                        onClick={() => onApply(filters)}

                        className={`${neo} flex-1 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700`}

                    >

                        <Search
                            size={18}
                            className="mr-2 inline"
                        />

                        Apply

                    </button>

                    <button

                        onClick={resetFilters}
                        aria-label="Reset GPS filters"

                        className={`${neo} rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-100`}

                    >

                        <RotateCcw size={18} />

                    </button>

                </div>

            </div>

        </div>

    );

}
