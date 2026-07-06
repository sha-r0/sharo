"use client";

import { useMemo, useState } from "react";
import {
    MapPin,
    Clock3,
    Coffee,
    CalendarDays,
    ArrowLeft,
    ArrowRight,
    LocateFixed,
} from "lucide-react";

export default function WorkingHoursStep({
    onBack,
    onNext,
}) {

    const [useCurrentLocation, setUseCurrentLocation] =
        useState(false);

    const [locationLoading, setLocationLoading] =
        useState(false);

    const [address, setAddress] =
        useState("");

    const [latitude, setLatitude] =
        useState("");

    const [longitude, setLongitude] =
        useState("");

    const [officeStart, setOfficeStart] =
        useState("09:00");

    const [officeEnd, setOfficeEnd] =
        useState("18:00");

    const [hasLunchBreak, setHasLunchBreak] =
        useState(true);

    const [lunchStart, setLunchStart] =
        useState("13:00");

    const [lunchEnd, setLunchEnd] =
        useState("14:00");

    const [weeklyOff, setWeeklyOff] =
        useState({
            sunday: true,
            saturday: false,
        });

    const [saturdayWeeks, setSaturdayWeeks] =
        useState([2, 4]);

    const toggleSaturdayWeek = (week) => {

        if (saturdayWeeks.includes(week)) {

            setSaturdayWeeks(
                saturdayWeeks.filter((w) => w !== week)
            );

        } else {

            setSaturdayWeeks([
                ...saturdayWeeks,
                week,
            ].sort());

        }

    };

    // ==========================================
    // Calculate Working Hours
    // ==========================================

    const workingHours = useMemo(() => {

        const officeStartDate =
            new Date(`2000-01-01T${officeStart}`);

        const officeEndDate =
            new Date(`2000-01-01T${officeEnd}`);

        let total =
            (officeEndDate - officeStartDate) /
            (1000 * 60);

        if (hasLunchBreak) {

            const lunchStartDate =
                new Date(`2000-01-01T${lunchStart}`);

            const lunchEndDate =
                new Date(`2000-01-01T${lunchEnd}`);

            total -=
                (lunchEndDate - lunchStartDate) /
                (1000 * 60);

        }

        if (total < 0) total = 0;

        const h = Math.floor(total / 60);

        const m = total % 60;

        return `${h} Hours ${m} Minutes`;

    }, [
        officeStart,
        officeEnd,
        lunchStart,
        lunchEnd,
        hasLunchBreak,
    ]);

    // ==========================================
    // Current Location
    // ==========================================

    const getCurrentLocation = () => {

        if (!navigator.geolocation) {

            alert("Geolocation is not supported.");

            return;

        }

        setLocationLoading(true);

        navigator.geolocation.getCurrentPosition(

            (position) => {

                setLatitude(
                    position.coords.latitude.toFixed(6)
                );

                setLongitude(
                    position.coords.longitude.toFixed(6)
                );

                setUseCurrentLocation(true);

                setLocationLoading(false);

            },

            () => {

                setLocationLoading(false);

                alert("Unable to fetch location.");

            }

        );

    };

    return (

        <div className="min-h-screen bg-[#eef2f7] py-10">

            <div className="max-w-6xl mx-auto">

                {/* Header */}

                <div className="mb-10">

                    <h1 className="text-5xl font-bold text-[#071330]">

                        Working Hours

                    </h1>

                    <p className="text-slate-500 mt-4 text-lg">

                        Configure your office timings and
                        weekly holidays.

                    </p>

                </div>

                <div className="grid lg:grid-cols-3 gap-8">

                    {/* LEFT */}

                    <div className="lg:col-span-2 space-y-8">

                        {/* Office Location */}

                        <div className="rounded-3xl bg-white shadow-xl p-8">

                            <div className="flex items-center gap-3">

                                <MapPin
                                    className="text-blue-600"
                                    size={28}
                                />

                                <h2 className="text-2xl font-bold">

                                    Office Location

                                </h2>

                            </div>

                            <p className="text-slate-500 mt-3">

                                This location will be used for
                                attendance, reports and company
                                profile.

                            </p>

                            <button

                                onClick={getCurrentLocation}

                                className="mt-8 flex items-center gap-3 rounded-2xl bg-blue-600 text-white px-6 py-4 hover:bg-blue-700 transition"

                            >

                                <LocateFixed size={20} />

                                {locationLoading
                                    ? "Getting Location..."
                                    : "Use Current Location"}

                            </button>

                            <div className="grid md:grid-cols-2 gap-5 mt-8">

                                <div>

                                    <label className="text-sm font-medium">

                                        Latitude

                                    </label>

                                    <input

                                        value={latitude}

                                        onChange={(e) =>
                                            setLatitude(e.target.value)
                                        }

                                        className="w-full mt-2 rounded-2xl border border-slate-200 p-4"

                                    />

                                </div>

                                <div>

                                    <label className="text-sm font-medium">

                                        Longitude

                                    </label>

                                    <input

                                        value={longitude}

                                        onChange={(e) =>
                                            setLongitude(e.target.value)
                                        }

                                        className="w-full mt-2 rounded-2xl border border-slate-200 p-4"

                                    />

                                </div>

                            </div>

                            <div className="mt-6">

                                <label className="text-sm font-medium">

                                    Office Address

                                </label>

                                <textarea

                                    rows={4}

                                    value={address}

                                    onChange={(e) =>
                                        setAddress(e.target.value)
                                    }

                                    className="w-full mt-2 rounded-2xl border border-slate-200 p-4"

                                    placeholder="Enter office address..."

                                />

                            </div>

                        </div>
                        {/* Office Timing */}

                        <div className="rounded-3xl bg-white shadow-xl p-8">

                            <div className="flex items-center gap-3">

                                <Clock3
                                    className="text-blue-600"
                                    size={28}
                                />

                                <h2 className="text-2xl font-bold">
                                    Office Timing
                                </h2>

                            </div>

                            <p className="text-slate-500 mt-3">
                                Configure your regular office timings.
                            </p>

                            <div className="grid md:grid-cols-2 gap-6 mt-8">

                                <div>

                                    <label className="text-sm font-medium">
                                        Office Starts
                                    </label>

                                    <input
                                        type="time"
                                        value={officeStart}
                                        onChange={(e) =>
                                            setOfficeStart(e.target.value)
                                        }
                                        className="w-full mt-2 rounded-2xl border border-slate-200 p-4"
                                    />

                                </div>

                                <div>

                                    <label className="text-sm font-medium">
                                        Office Ends
                                    </label>

                                    <input
                                        type="time"
                                        value={officeEnd}
                                        onChange={(e) =>
                                            setOfficeEnd(e.target.value)
                                        }
                                        className="w-full mt-2 rounded-2xl border border-slate-200 p-4"
                                    />

                                </div>

                            </div>

                        </div>

                        {/* Lunch Break */}

                        <div className="rounded-3xl bg-white shadow-xl p-8">

                            <div className="flex items-center justify-between">

                                <div className="flex items-center gap-3">

                                    <Coffee
                                        className="text-blue-600"
                                        size={28}
                                    />

                                    <h2 className="text-2xl font-bold">
                                        Lunch Break
                                    </h2>

                                </div>

                                <label className="flex items-center gap-3 cursor-pointer">

                                    <input
                                        type="checkbox"
                                        checked={hasLunchBreak}
                                        onChange={(e) =>
                                            setHasLunchBreak(e.target.checked)
                                        }
                                    />

                                    <span>
                                        Enable
                                    </span>

                                </label>

                            </div>

                            {hasLunchBreak && (

                                <div className="grid md:grid-cols-2 gap-6 mt-8">

                                    <div>

                                        <label className="text-sm font-medium">
                                            Lunch Starts
                                        </label>

                                        <input
                                            type="time"
                                            value={lunchStart}
                                            onChange={(e) =>
                                                setLunchStart(e.target.value)
                                            }
                                            className="w-full mt-2 rounded-2xl border border-slate-200 p-4"
                                        />

                                    </div>

                                    <div>

                                        <label className="text-sm font-medium">
                                            Lunch Ends
                                        </label>

                                        <input
                                            type="time"
                                            value={lunchEnd}
                                            onChange={(e) =>
                                                setLunchEnd(e.target.value)
                                            }
                                            className="w-full mt-2 rounded-2xl border border-slate-200 p-4"
                                        />

                                    </div>

                                </div>

                            )}

                        </div>

                        {/* Weekly Off */}

                        <div className="rounded-3xl bg-white shadow-xl p-8">

                            <div className="flex items-center gap-3">

                                <CalendarDays
                                    className="text-blue-600"
                                    size={28}
                                />

                                <h2 className="text-2xl font-bold">
                                    Weekly Off
                                </h2>

                            </div>

                            <p className="text-slate-500 mt-3">
                                Select your company's weekly holidays.
                            </p>

                            <div className="grid md:grid-cols-2 gap-5 mt-8">

                                <label className="rounded-2xl border p-5 flex items-center gap-4 cursor-pointer hover:border-blue-500">

                                    <input
                                        type="checkbox"
                                        checked={weeklyOff.sunday}
                                        onChange={(e) =>
                                            setWeeklyOff({
                                                ...weeklyOff,
                                                sunday: e.target.checked,
                                            })
                                        }
                                    />

                                    <span className="font-medium">
                                        Sunday
                                    </span>

                                </label>

                                <label className="rounded-2xl border p-5 flex items-center gap-4 cursor-pointer hover:border-blue-500">

                                    <input
                                        type="checkbox"
                                        checked={weeklyOff.saturday}
                                        onChange={(e) =>
                                            setWeeklyOff({
                                                ...weeklyOff,
                                                saturday: e.target.checked,
                                            })
                                        }
                                    />

                                    <span className="font-medium">
                                        Saturday
                                    </span>

                                </label>

                            </div>

                            {weeklyOff.saturday && (

                                <div className="mt-8">

                                    <label className="font-semibold text-lg">

                                        Saturday Holidays

                                    </label>

                                    <p className="text-slate-500 mt-2">

                                        Select which Saturdays are holidays.

                                    </p>

                                    <div className="grid grid-cols-5 gap-4 mt-6">

                                        {[1, 2, 3, 4, 5].map((week) => (

                                            <button
                                                key={week}
                                                type="button"
                                                onClick={() =>
                                                    toggleSaturdayWeek(week)
                                                }
                                                className={`
                                                          rounded-2xl
                                                        border
                                                        py-5
                                                        font-semibold
                                                        transition

                                                        ${saturdayWeeks.includes(week)
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                                                        : "bg-white hover:border-blue-500"
                                                    }

                                                        `}
                                            >

                                                {week}

                                                <div className="text-xs mt-2">

                                                    {
                                                        week === 1
                                                            ? "1st"

                                                            : week === 2
                                                                ? "2nd"

                                                                : week === 3
                                                                    ? "3rd"

                                                                    : week === 4
                                                                        ? "4th"

                                                                        : "5th"
                                                    }

                                                </div>

                                            </button>

                                        ))}

                                    </div>

                                </div>

                            )}

                        </div>

                    </div>

                    {/* RIGHT PANEL */}

                    <div>

                        <div className="sticky top-10 rounded-3xl bg-white shadow-xl p-8">

                            <h2 className="text-2xl font-bold text-[#071330]">
                                Live Summary
                            </h2>

                            <p className="text-slate-500 mt-2">
                                Review your working schedule.
                            </p>

                            <div className="mt-8 space-y-6">

                                <div className="rounded-2xl bg-[#EEF4FF] p-5">

                                    <p className="text-sm text-slate-500">
                                        Office Hours
                                    </p>

                                    <h3 className="text-2xl font-bold mt-2 text-[#071330]">
                                        {workingHours}
                                    </h3>

                                </div>

                                <div>

                                    <p className="text-sm text-slate-500">
                                        Office Timing
                                    </p>

                                    <h3 className="mt-2 text-lg font-semibold">
                                        {officeStart} — {officeEnd}
                                    </h3>

                                </div>

                                <div>

                                    <p className="text-sm text-slate-500">
                                        Lunch Break
                                    </p>

                                    <h3 className="mt-2 text-lg font-semibold">

                                        {hasLunchBreak
                                            ? `${lunchStart} — ${lunchEnd}`
                                            : "No Lunch Break"}

                                    </h3>

                                </div>

                                <div>

                                    <p className="text-sm text-slate-500">
                                        Weekly Off
                                    </p>

                                    <div className="mt-3 space-y-2">

                                        {weeklyOff.sunday && (
                                            <div className="rounded-xl bg-slate-100 px-4 py-2">
                                                Sunday
                                            </div>
                                        )}

                                        {weeklyOff.saturday && (
                                            <div className="rounded-xl bg-slate-100 px-4 py-2">
                                                {saturdayWeeks.length
                                                    ? saturdayWeeks
                                                        .map((w) => {
                                                            if (w === 1) return "1st";
                                                            if (w === 2) return "2nd";
                                                            if (w === 3) return "3rd";
                                                            if (w === 4) return "4th";
                                                            return "5th";
                                                        })
                                                        .join(", ") + " Saturday"
                                                    : "No Saturday Off"}
                                            </div>
                                        )}

                                        {!weeklyOff.sunday &&
                                            !weeklyOff.saturday && (
                                                <div className="rounded-xl bg-slate-100 px-4 py-2">
                                                    No Weekly Off
                                                </div>
                                            )}

                                    </div>

                                </div>

                                <div>

                                    <p className="text-sm text-slate-500">
                                        Office Location
                                    </p>

                                    <div className="mt-3 rounded-2xl bg-slate-100 p-4">

                                        {address
                                            ? address
                                            : "Office address not added"}

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

                {/* Footer */}

                <div className="flex justify-between items-center mt-10">

                    <button
                        onClick={onBack}
                        className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-8 py-4 hover:bg-slate-50 transition"
                    >

                        <ArrowLeft size={20} />

                        Back

                    </button>

                    <button
                        onClick={() =>
                            onNext({
                                officeStart,
                                officeEnd,
                                hasLunchBreak,
                                lunchStart,
                                lunchEnd,
                                weeklyOff,
                                saturdayWeeks,
                                latitude,
                                longitude,
                                address,
                            })
                        }
                        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] px-10 py-4 text-white font-semibold shadow-xl hover:scale-[1.02] transition"
                    >
                        🚀 Create Workspace

                    </button>

                </div>

            </div>

        </div>

    );

}