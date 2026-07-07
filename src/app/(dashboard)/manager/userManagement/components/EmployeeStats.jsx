"use client";

import {
    Users,
    UserCheck,
    UserMinus,
    UserX,
} from "lucide-react";

const cards = [

    {
        key: "total",
        title: "Total Employees",
        icon: Users,
        color: "blue",
    },

    {
        key: "active",
        title: "Active",
        icon: UserCheck,
        color: "green",
    },

    {
        key: "leave",
        title: "On Leave",
        icon: UserMinus,
        color: "amber",
    },

    {
        key: "inactive",
        title: "Inactive",
        icon: UserX,
        color: "red",
    },

];

const colors = {

    blue: {
        bg: "bg-blue-50",
        icon: "text-blue-600",
        border: "border-blue-100",
    },

    green: {
        bg: "bg-green-50",
        icon: "text-green-600",
        border: "border-green-100",
    },

    amber: {
        bg: "bg-amber-50",
        icon: "text-amber-600",
        border: "border-amber-100",
    },

    red: {
        bg: "bg-red-50",
        icon: "text-red-600",
        border: "border-red-100",
    },

};

export default function EmployeeStats({

    employees = [],

}) {

    const stats = {

        total: employees.length,

        active: employees.filter(

            (e) => e.status === "Active"

        ).length,

        leave: employees.filter(

            (e) => e.status === "Leave"

        ).length,

        inactive: employees.filter(

            (e) => e.status === "Inactive"

        ).length,

    };

    return (

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

            {cards.map((card) => {

                const Icon = card.icon;

                const style = colors[card.color];

                return (

                    <div

                        key={card.key}

                        className={`
                            bg-white
                            rounded-3xl
                            border
                            ${style.border}
                            shadow-sm
                            p-6
                            hover:shadow-lg
                            transition
                        `}
                    >

                        <div className="flex justify-between items-center">

                            <div>

                                <p className="text-sm text-slate-500">

                                    {card.title}

                                </p>

                                <h2 className="mt-2 text-4xl font-bold text-slate-800">

                                    {stats[card.key]}

                                </h2>

                            </div>

                            <div
                                className={`
                                    w-16
                                    h-16
                                    rounded-2xl
                                    flex
                                    items-center
                                    justify-center
                                    ${style.bg}
                                `}
                            >

                                <Icon
                                    size={30}
                                    className={style.icon}
                                />

                            </div>

                        </div>

                    </div>

                );

            })}

        </div>

    );

}