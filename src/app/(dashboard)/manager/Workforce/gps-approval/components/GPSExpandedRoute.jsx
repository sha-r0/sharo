"use client";

import {
    Clock3,
    MapPin,
    Navigation,
    CheckCircle2,
    XCircle,
    ShieldCheck,
    ShieldX,
} from "lucide-react";
import GPSRouteMap from "./GPSRouteMap";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function GPSExpandedRoute({ row }) {

    function formatTime(value) {

        if (!value) return "--";

        try {
            const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
            if (Number.isNaN(date.getTime())) return "--";

            return date.toLocaleTimeString([], {

                hour: "2-digit",

                minute: "2-digit",

            });

        } catch {

            return "--";

        }

    }

    const timeline = [

        {
            title: "Check In",
            icon: CheckCircle2,
            color: "bg-green-500",
            time: row.checkIn,
            location: row.checkInLocation,
        },

        {
            title: "Check Out",
            icon: XCircle,
            color: "bg-red-500",
            time: row.checkOut,
            location: row.checkOutLocation,
        },

    ];

    return (

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* LEFT */}

            <div className="xl:col-span-2 space-y-6">

                {/* Employee Summary */}

                <div className={`${neo} rounded-3xl bg-white p-6`}>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

                        <div>

                            <p className="text-sm text-slate-500">

                                Employee

                            </p>

                            <h3 className="font-bold mt-1">

                                {row.employeeName}

                            </h3>

                        </div>

                        <div>

                            <p className="text-sm text-slate-500">

                                Date

                            </p>

                            <h3 className="font-bold mt-1">

                                {row.date}

                            </h3>

                        </div>

                        <div>

                            <p className="text-sm text-slate-500">

                                Status

                            </p>

                            <div className="mt-2">

                                {row.gpsValid ? (

                                    <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-green-700">

                                        <ShieldCheck size={15} />

                                        GPS Valid

                                    </span>

                                ) : (

                                    <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-red-700">

                                        <ShieldX size={15} />

                                        GPS Invalid

                                    </span>

                                )}

                            </div>

                        </div>

                        <div>

                            <p className="text-sm text-slate-500">

                                Working Hours

                            </p>

                            <h3 className="font-bold mt-1">

                                {row.totalHours || 0} hrs

                            </h3>

                        </div>

                    </div>

                </div>

                {/* Timeline */}

                <div className={`${neo} rounded-3xl bg-white p-6`}>

                    <h2 className="text-xl font-bold mb-8">

                        GPS Timeline

                    </h2>

                    <div className="relative ml-5">

                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200"></div>

                        {timeline.map((item, index) => {

                            const Icon = item.icon;

                            return (

                                <div
                                    key={index}
                                    className="relative flex gap-5 pb-10"
                                >

                                    <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full ${item.color}`}>

                                        <Icon
                                            size={14}
                                            className="text-white"
                                        />

                                    </div>

                                    <div className="flex-1">

                                        <div className="flex items-center justify-between">

                                            <h4 className="font-semibold">

                                                {item.title}

                                            </h4>

                                            <span className="text-sm text-slate-500">

                                                {formatTime(item.time)}

                                            </span>

                                        </div>

                                        <div className="mt-3 rounded-xl bg-slate-50 p-4">

                                            <div className="flex items-start gap-3">

                                                <MapPin
                                                    size={18}
                                                    className="mt-1 text-indigo-600"
                                                />

                                                <div>

                                                    <p className="font-medium">

                                                        GPS Coordinates

                                                    </p>

                                                    <p className="mt-1 text-sm text-slate-500 break-all">

                                                        {item.location

                                                            ? `${item.location.latitude ?? item.location.lat}, ${item.location.longitude ?? item.location.lng}`

                                                            : "No GPS Location"}

                                                    </p>

                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            );

                        })}

                    </div>

                </div>

            </div>

            {/* RIGHT */}
            <div className={`${neo} rounded-3xl bg-white p-6`}>

                <h2 className="text-xl font-bold mb-6">

                    Route Map

                </h2>

                <GPSRouteMap row={row} />

            </div>

        </div>

    );

}
