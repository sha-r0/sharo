"use client";

import { useState } from "react";

export default function useClientForm() {

    const [form, setForm] = useState({

        clientName: "",

        companyName: "",

        contactPerson: "",

        phone: "",

        email: "",

        gstNo: "",

        panNo: "",

        address: {

            line1: "",

            city: "",

            state: "",

            country: "India",

            pincode: "",

        },

        notes: "",

        status: "Active",

    });

    function updateField(name, value) {

        setForm(prev => ({

            ...prev,

            [name]: value,

        }));

    }

    function updateAddress(name, value) {

        setForm(prev => ({

            ...prev,

            address: {

                ...prev.address,

                [name]: value,

            },

        }));

    }

    function resetForm() {

        setForm({

            clientName: "",

            companyName: "",

            contactPerson: "",

            phone: "",

            email: "",

            gstNo: "",

            panNo: "",

            address: {

                line1: "",

                city: "",

                state: "",

                country: "India",

                pincode: "",

            },

            notes: "",

            status: "Active",

        });

    }

    return {

        form,

        updateField,

        updateAddress,

        resetForm,

    };

}