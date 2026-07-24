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
    const client = mapClient(form, clientId);

    await clientRepository.save(companyId, client);

    await notificationService.emitSafe("client.created", {
      companyId,
      clientName:
        client.clientName ||
        form.clientName ||
        form.name,
      receiver: "company",
      actionRoute: "/manager/clients",
      metadata: {
        clientId,
        clientName:
          client.clientName ||
          form.clientName ||
          form.name,
      },
    });

    return {
      success: true,
      message: "Client created successfully.",
    };
  },

  async getClients(companyId) {
    return clientRepository.getAll(companyId);
  },

  async updateClient(companyId, id, form) {
    const validation = validateClient(form);
  
    if (!validation.valid) {
      return validation;
    }
  
    const updateData = {
      clientName: form.clientName.trim(),
      companyName: form.companyName.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      gstNo: form.gstNo.trim().toUpperCase(),
      panNo: form.panNo.trim().toUpperCase(),
  
      address: {
        line1: form.address.line1.trim(),
        city: form.address.city.trim(),
        state: form.address.state.trim(),
        country: form.address.country.trim(),
        pincode: form.address.pincode.trim(),
      },
  
      notes: form.notes.trim(),
      status: form.status,
      updatedAt: new Date(),
    };
  
    await clientRepository.update(
      companyId,
      id,
      updateData,
    );
  
    return {
      success: true,
      message: "Client updated successfully.",
    };
  },

  async deleteClient(companyId, id) {
    await clientRepository.remove(companyId, id);

    return {
      success: true,
      message: "Client deleted successfully.",
    };
  },
};

export default clientService;