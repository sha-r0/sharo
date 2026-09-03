"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import QuotationSetupService from "./services/QuotationSetupService";

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

            const settings = await QuotationSetupService.load(company.id);

            if (!settings) {

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
