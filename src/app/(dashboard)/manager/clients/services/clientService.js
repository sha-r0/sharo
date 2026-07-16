import clientRepository from "./clientRepository";
import { validateClient } from "./clientValidator";
import { generateClientId } from "./clientIdGenerator";
import { mapClient } from "./clientMapper";
import notificationService from "@/app/allservice/notification/notificationService";

const clientService = {

    async create(companyId, form) {

        const validation = validateClient(form);

        if (!validation.valid) {

            return validation;

        }

        const clientId = await generateClientId(companyId);

        const client = mapClient(

            form,

            clientId

        );

        await clientRepository.save(

            companyId,

            client

        );

        await notificationService.emitSafe("client.created", {
            companyId,
            clientName: client.clientName || form.clientName || form.name,
            receiver: "company",
            actionRoute: "/manager/clients",
            metadata: { clientId, clientName: client.clientName || form.clientName || form.name },
        });

        return {

            success: true,

        };

    },

    async getClients(companyId) {
        return await clientRepository.getAll(companyId);
    },

    async updateClient(companyId, id, data) {

        return clientRepository.update(

            companyId,

            id,

            data

        );

    },

    async deleteClient(companyId, id) {

        return clientRepository.remove(

            companyId,

            id

        );

    },

};

export default clientService;
