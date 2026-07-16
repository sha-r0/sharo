"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/app/(auth)/context/AuthContext";

import Dashboard from "./components/Dashboard";

export default function QuotationPage() {

    const router = useRouter();

    const { company } = useAuth();

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        if (!company?.id) return;

        checkSetup();

    }, [company]);

    async function checkSetup() {

        try {

            const ref = doc(

                db,

                "Companies",

                company.id,

                "QuotationSettings",

                "default"

            );

            const snap = await getDoc(ref);

            if (!snap.exists()) {

                router.replace(

                    "/manager/quotation-builder/setup"

                );

                return;

            }

            setLoading(false);

        } catch (error) {

            console.error(error);

            setLoading(false);

        }

    }

    if (loading) {

        return (

            <div className="flex h-[70vh] items-center justify-center">

                Loading...

            </div>

        );

    }

    return <Dashboard />;

}