"use client";

import ClientRow from "./ClientRow";

export default function ClientTable({

    clients,

    onView,

    onEdit,

    onDelete,

}) {

    return (

        <div className="space-y-4">

            {

                clients.length===0 ?

                (

                    <div className="rounded-3xl bg-white p-20 text-center">

                        No Clients Found

                    </div>

                )

                :

                clients.map(client=>(

                    <ClientRow

                        key={client.id}

                        client={client}

                        onView={onView}

                        onEdit={onEdit}

                        onDelete={onDelete}

                    />

                ))

            }

        </div>

    );

}