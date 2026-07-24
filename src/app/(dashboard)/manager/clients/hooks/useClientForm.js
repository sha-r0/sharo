"use client";

import { useEffect, useState } from "react";

const initialForm = {
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
};

export default function useClientForm(client = null) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!client) {
      setForm(initialForm);
      return;
    }

    setForm({
      clientName: client.clientName || "",
      companyName: client.companyName || "",
      contactPerson: client.contactPerson || "",
      phone: client.phone || "",
      email: client.email || "",
      gstNo: client.gstNo || "",
      panNo: client.panNo || "",

      address: {
        line1: client.address?.line1 || "",
        city: client.address?.city || "",
        state: client.address?.state || "",
        country: client.address?.country || "India",
        pincode: client.address?.pincode || "",
      },

      notes: client.notes || "",
      status: client.status || "Active",
    });
  }, [client]);

  function updateField(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function updateAddress(name, value) {
    setForm((previous) => ({
      ...previous,
      address: {
        ...previous.address,
        [name]: value,
      },
    }));
  }

  function resetForm() {
    setForm(initialForm);
  }

  return {
    form,
    updateField,
    updateAddress,
    resetForm,
  };
}