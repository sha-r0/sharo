"use client";
import { ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { defaultRouteForAccess } from "@/app/allservice/rbac/AuthorizationService";
export default function AccessDenied() { const router = useRouter(), { access } = useAuth(); return <div className="grid min-h-[60vh] place-items-center p-6"><div className="max-w-md rounded-3xl border border-white bg-[#F9FAFC] p-10 text-center shadow-xl"><ShieldX className="mx-auto text-red-500" size={44}/><h1 className="mt-5 text-2xl font-bold text-slate-800">Access restricted</h1><p className="mt-2 text-sm text-slate-500">Your role does not include permission to open this ERP module.</p><button onClick={() => router.push(defaultRouteForAccess(access))} className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white">Open my workspace</button></div></div>; }
