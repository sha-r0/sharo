"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function GlobalSearch() {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        const text = search.trim();

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (text.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        timerRef.current = setTimeout(async () => {
            try {
                setLoading(true);

                const user = auth.currentUser;

                if (!user) {
                    setResults([]);
                    return;
                }

                const token = await user.getIdToken();

                const response = await fetch(
                    `/api/search?q=${encodeURIComponent(text)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                const contentType =
                    response.headers.get("content-type") || "";

                if (!contentType.includes("application/json")) {
                    throw new Error("SEARCH_API_UNAVAILABLE");
                }

                const body =
                    await response.json();

                if (!response.ok) {
                    throw new Error(body.error || "SEARCH_FAILED");
                }

                setResults(
                    Array.isArray(body.results)
                        ? body.results
                        : []
                );
            } catch (error) {
                console.error("[GlobalSearch]", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 350);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [search]);

    return (
        <div className="relative w-full max-w-sm">
            <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
                value={search}
                onChange={(event) =>
                    setSearch(event.target.value)
                }
                placeholder="Search anything..."
                className="
          h-10
          w-full
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          pl-10
          pr-4
          text-sm
          text-slate-700
          outline-none
          transition
          focus:border-blue-400
          focus:bg-white
          focus:ring-4
          focus:ring-blue-50
        "
            />

            {search.trim().length >= 2 && (
                <div className="
          absolute
          left-0
          right-0
          top-12
          z-50
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-2
          shadow-xl
        ">
                    {loading ? (
                        <p className="px-3 py-4 text-center text-sm text-slate-500">
                            Searching...
                        </p>
                    ) : results.length ? (
                        results.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={() => {
                                    setSearch("");
                                    setResults([]);
                                }}
                                className="
                  flex
                  items-center
                  justify-between
                  rounded-xl
                  px-3
                  py-2.5
                  transition
                  hover:bg-slate-50
                "
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-slate-700">
                                        {item.label}
                                    </span>

                                    <span className="block truncate text-xs text-slate-400">
                                        {item.detail}
                                    </span>
                                </span>

                                <span className="ml-3 text-xs font-semibold text-blue-600">
                                    Open
                                </span>
                            </Link>
                        ))
                    ) : (
                        <p className="px-3 py-4 text-center text-sm text-slate-500">
                            No matching records
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}