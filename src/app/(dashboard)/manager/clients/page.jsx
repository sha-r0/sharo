"use client";

import { useEffect, useState } from "react";

import ClientHeader from "./components/ClientHeader";
import ClientFilters from "./components/ClientFilters";
import ClientTable from "./components/ClientTable";
import ClientDialog from "./components/ClientDialog";

import clientService from "./services/clientService";

export default function ClientsPage() {

    // Replace later with logged-in company id
    const companyId = "XdEE03nNR5cyBlXWkrpV";

    const [clients, setClients] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");

    const [status, setStatus] = useState("");

    const [openDialog, setOpenDialog] = useState(false);

    useEffect(() => {

        loadClients();

    }, []);

    async function loadClients() {

        try {

            setLoading(true);

            const data = await clientService.getClients(companyId);

            setClients(data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    }

    const filteredClients = clients.filter((client) => {

        const matchSearch =
            !search ||
            client.clientName?.toLowerCase().includes(search.toLowerCase()) ||
            client.companyName?.toLowerCase().includes(search.toLowerCase()) ||
            client.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
            client.phone?.includes(search);

        const matchStatus =
            !status ||
            client.status === status;

        return matchSearch && matchStatus;

    });

    return (

        <div className="space-y-8 px-4">

            <ClientHeader

                loading={loading}

                onRefresh={loadClients}

                onAddClient={() => setOpenDialog(true)}

            />

            <ClientFilters

                search={search}

                setSearch={setSearch}

                status={status}

                setStatus={setStatus}

                onExport={() => { }}

            />

            <ClientTable

                clients={filteredClients}

                onView={(client) => console.log(client)}

                onEdit={(client) => console.log(client)}

                onDelete={(client) => console.log(client)}

            />

            <ClientDialog

                open={openDialog}

                companyId={companyId}

                onClose={() => setOpenDialog(false)}

                onSaved={loadClients}

            />

        </div>

    );

}