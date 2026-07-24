"use client";

import { useEffect, useMemo, useState } from "react";

import ClientHeader from "./components/ClientHeader";
import ClientFilters from "./components/ClientFilters";
import ClientTable from "./components/ClientTable";
import ClientDialog from "./components/ClientDialog";
import ClientViewDialog from "./components/ClientViewDialog";
import DeleteClientDialog from "./components/DeleteClientDialog";

import clientService from "./services/clientService";
import { useAuth } from "@/app/(auth)/context/AuthContext";

export default function ClientsPage() {
  const { company, loading: authLoading } = useAuth();

  const companyId = company?.id || "";

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [viewClient, setViewClient] = useState(null);
  const [deleteClient, setDeleteClient] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    loadClients();
  }, [companyId]);

  async function loadClients() {
    if (!companyId) return;

    try {
      setLoading(true);

      const data = await clientService.getClients(companyId);

      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load clients:", error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAddClient() {
    setSelectedClient(null);
    setOpenDialog(true);
  }

  function handleEditClient(client) {
    setSelectedClient(client);
    setOpenDialog(true);
  }

  function handleCloseDialog() {
    setOpenDialog(false);
    setSelectedClient(null);
  }

  async function handleDeleteClient() {
    if (!companyId || !deleteClient?.id) return;

    try {
      setDeleting(true);

      await clientService.deleteClient(
        companyId,
        deleteClient.id,
      );

      setDeleteClient(null);
      await loadClients();
    } catch (error) {
      console.error("Failed to delete client:", error);
    } finally {
      setDeleting(false);
    }
  }

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedStatus = status.trim().toLowerCase();

    return clients.filter((client) => {
      const matchSearch =
        !normalizedSearch ||
        String(client.clientName || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(client.companyName || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(client.contactPerson || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(client.phone || "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchStatus =
        !normalizedStatus ||
        String(client.status || "").toLowerCase() ===
          normalizedStatus;

      return matchSearch && matchStatus;
    });
  }, [clients, search, status]);

  if (authLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        Company information is unavailable. Please log in again.
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4">
      <ClientHeader
        loading={loading}
        onRefresh={loadClients}
        onAddClient={handleAddClient}
      />

      <ClientFilters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        onExport={() => {}}
      />

      <ClientTable
        clients={filteredClients}
        onView={(client) => setViewClient(client)}
        onEdit={handleEditClient}
        onDelete={(client) => setDeleteClient(client)}
      />

      <ClientDialog
        open={openDialog}
        companyId={companyId}
        client={selectedClient}
        onClose={handleCloseDialog}
        onSaved={loadClients}
      />

      <ClientViewDialog
        open={Boolean(viewClient)}
        client={viewClient}
        onClose={() => setViewClient(null)}
      />

      <DeleteClientDialog
        open={Boolean(deleteClient)}
        client={deleteClient}
        deleting={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteClient(null);
          }
        }}
        onConfirm={handleDeleteClient}
      />
    </div>
  );
}