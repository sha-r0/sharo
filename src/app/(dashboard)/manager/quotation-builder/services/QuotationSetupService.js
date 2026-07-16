import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import {
    ref,
    uploadBytes,
    getDownloadURL,
} from "firebase/storage";

import {

    db,

    storage,

} from "@/lib/firebase";

export default class QuotationSetupService {

    //////////////////////////////////////////////////////
    // Reference
    //////////////////////////////////////////////////////

    static settingsRef(companyId) {

        return doc(

            db,

            "Companies",

            companyId,

            "QuotationSettings",

            "default"

        );

    }

    //////////////////////////////////////////////////////
    // Upload Image
    //////////////////////////////////////////////////////

    static async uploadImage(companyId, file, folder) {

        if (!file) return "";

        const extension = file.name.split(".").pop();

        const storageRef = ref(

            storage,

            `companies/${companyId}/quotation/${folder}/${Date.now()}.${extension}`

        );

        await uploadBytes(storageRef, file);

        return await getDownloadURL(storageRef);

    }

    //////////////////////////////////////////////////////
    // Save Setup
    //////////////////////////////////////////////////////

    static async save(companyId, form) {

        //////////////////////////////////////////////////////
        // Upload Images
        //////////////////////////////////////////////////////

        const logo =

            form.logoFile

                ? await this.uploadImage(

                    companyId,

                    form.logoFile,

                    "logo"

                )

                : form.logo;

        const qrCode =

            form.qrCodeFile

                ? await this.uploadImage(

                    companyId,

                    form.qrCodeFile,

                    "qr"

                )

                : form.qrCode;

        const signature =

            form.signatureFile

                ? await this.uploadImage(

                    companyId,

                    form.signatureFile,

                    "signature"

                )

                : form.signature;

        const seal =

            form.sealFile

                ? await this.uploadImage(

                    companyId,

                    form.sealFile,

                    "seal"

                )

                : form.seal;

        //////////////////////////////////////////////////////
        // Save Firestore
        //////////////////////////////////////////////////////

        await setDoc(

            this.settingsRef(companyId),

            {

                branding: {

                    logo,

                    companyName: form.companyName,

                    tagline: form.tagline,

                    primaryColor: form.primaryColor,

                    secondaryColor: form.secondaryColor,

                },

                bank: {

                    bankName: form.bankName,

                    accountName: form.accountName,

                    accountNumber: form.accountNumber,

                    ifsc: form.ifsc,

                    branch: form.branch,

                    upi: form.upi,

                    qrCode,

                },

                terms: {

                    paymentTerms: form.paymentTerms,

                    deliveryTerms: form.deliveryTerms,

                    warranty: form.warranty,

                    notes: form.notes,

                    declaration: form.declaration,

                },

                signature: {

                    signatory: form.signatory,

                    designation: form.designation,

                    signature,

                    seal,

                },

                quotationPrefix: "QT",

                nextQuotationNumber: 1,

                defaultValidityDays: 30,

                setupCompleted: true,

                createdAt: serverTimestamp(),

                updatedAt: serverTimestamp(),

            },

            {

                merge: true,

            }

        );

        //////////////////////////////////////////////////////
        // Update Company
        //////////////////////////////////////////////////////

        await updateDoc(

            doc(

                db,

                "Companies",

                companyId

            ),

            {

                quotationSetupCompleted: true,

            }

        );

    }

    //////////////////////////////////////////////////////
    // Load Setup
    //////////////////////////////////////////////////////

    static async load(companyId) {

        const snap = await getDoc(

            this.settingsRef(companyId)

        );

        if (!snap.exists()) return null;

        return snap.data();

    }

}