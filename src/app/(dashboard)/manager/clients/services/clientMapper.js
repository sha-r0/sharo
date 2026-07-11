import { serverTimestamp } from "firebase/firestore";

export function mapClient(form, clientId) {

    return {

        clientId,

        clientName: form.clientName,

        companyName: form.companyName,

        contactPerson: form.contactPerson,

        phone: form.phone,

        email: form.email,

        gstNo: form.gstNo,

        panNo: form.panNo,

        address: form.address,

        notes: form.notes,

        status: form.status,

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),

    };

}