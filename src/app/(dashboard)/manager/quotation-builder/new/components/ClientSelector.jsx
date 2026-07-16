"use client";

import { useMemo, useState } from "react";
import {
    Search,
    Building2,
    User,
    Phone,
    Check,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ClientSelector({

    clients = [],

    value,

    onSelect,

}) {

    const [search, setSearch] = useState("");

    const [open, setOpen] = useState(false);

    const filtered = useMemo(() => {

        if (!search) return clients;

        return clients.filter((c) => {

            const q = search.toLowerCase();

            return (

                c.companyName?.toLowerCase().includes(q) ||

                c.contactPerson?.toLowerCase().includes(q) ||

                c.phone?.toLowerCase().includes(q) ||

                c.gstNumber?.toLowerCase().includes(q)

            );

        });

    }, [search, clients]);

    const selected = clients.find(

        x => x.id === value

    );

    return (

        <div className="relative">

            <div
                className={`${neo} rounded-2xl border border-slate-300 bg-white`}
            >

                <div className="relative">

                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input

                        value={

                            open

                                ? search

                                : selected?.companyName || ""

                        }

                        onFocus={() => setOpen(true)}

                        onChange={(e)=>{

                            setSearch(e.target.value);

                            setOpen(true);

                        }}

                        placeholder="Search Client..."

                        className="h-14 w-full rounded-2xl bg-transparent pl-12 pr-4 outline-none"

                    />

                </div>

            </div>

            {

                open && (

                    <div className="absolute z-50 mt-3 max-h-96 w-full overflow-y-auto rounded-2xl border bg-white">

                        {

                            filtered.length === 0 &&

                            <div className="p-8 text-center text-slate-500">

                                No Client Found

                            </div>

                        }

                        {

                            filtered.map(client=>(

                                <button

                                    key={client.id}

                                    onClick={()=>{

                                        onSelect(client);

                                        setOpen(false);

                                        setSearch("");

                                    }}

                                    className="flex w-full items-start justify-between border-b p-4 text-left hover:bg-slate-50"

                                >

                                    <div>

                                        <div className="flex items-center gap-2">

                                            <Building2

                                                size={18}

                                                className="text-indigo-600"

                                            />

                                            <span className="font-semibold">

                                                {client.companyName}

                                            </span>

                                        </div>

                                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">

                                            <User size={14}/>

                                            {client.contactPerson}

                                        </div>

                                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">

                                            <Phone size={14}/>

                                            {client.phone}

                                        </div>

                                        {

                                            client.gstNumber &&

                                            <div className="mt-1 text-xs text-slate-400">

                                                GST : {client.gstNumber}

                                            </div>

                                        }

                                    </div>

                                    {

                                        value===client.id &&

                                        <Check

                                            className="text-green-600"

                                        />

                                    }

                                </button>

                            ))

                        }

                    </div>

                )

            }

        </div>

    );

}