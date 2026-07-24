import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";

import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytes,
} from "firebase/storage";

import {
    db,
    storage,
} from "@/lib/firebase";

export default class QuotationSetupService {

    //////////////////////////////////////////////////////
    // Validation
    //////////////////////////////////////////////////////

    static validateCompanyId(companyId) {
        if (
            !companyId ||
            typeof companyId !== "string"
        ) {
            throw new Error(
                "Company ID is required."
            );
        }
    }

    //////////////////////////////////////////////////////
    // References
    //////////////////////////////////////////////////////

    static settingsRef(companyId) {
        this.validateCompanyId(companyId);

        return doc(
            db,
            "Companies",
            companyId,
            "QuotationSettings",
            "default"
        );
    }

    static companyRef(companyId) {
        this.validateCompanyId(companyId);

        return doc(
            db,
            "Companies",
            companyId
        );
    }

    //////////////////////////////////////////////////////
    // Upload Validation
    //////////////////////////////////////////////////////

    static validateImage(file) {
        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            throw new Error(
                "Only JPG, PNG and WEBP images are allowed."
            );
        }

        const maximumSize =
            5 * 1024 * 1024;

        if (file.size > maximumSize) {
            throw new Error(
                "Image size must be less than 5 MB."
            );
        }
    }

    //////////////////////////////////////////////////////
    // Upload Image
    //////////////////////////////////////////////////////

    static async uploadImage(
        companyId,
        file,
        folder
    ) {
        this.validateCompanyId(companyId);

        if (!file) return "";

        this.validateImage(file);

        const originalExtension =
            file.name
                ?.split(".")
                .pop()
                ?.toLowerCase() || "png";

        const safeExtension = [
            "jpg",
            "jpeg",
            "png",
            "webp",
        ].includes(originalExtension)
            ? originalExtension
            : "png";

        const fileName =
            `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

        const storageReference = ref(
            storage,
            `companies/${companyId}/quotation/${folder}/${fileName}`
        );

        await uploadBytes(
            storageReference,
            file,
            {
                contentType: file.type,
            }
        );

        return getDownloadURL(
            storageReference
        );
    }

    //////////////////////////////////////////////////////
    // Delete Uploaded Image
    //////////////////////////////////////////////////////

    static async deleteImageByUrl(url) {
        if (!url || typeof url !== "string") {
            return;
        }

        try {
            const storageReference =
                ref(storage, url);

            await deleteObject(
                storageReference
            );
        } catch (error) {
            console.warn(
                "Unable to delete old quotation image:",
                error
            );
        }
    }

    //////////////////////////////////////////////////////
    // Normalise Text
    //////////////////////////////////////////////////////

    static text(value) {
        return String(value ?? "").trim();
    }

    //////////////////////////////////////////////////////
    // Load Setup
    //////////////////////////////////////////////////////

    static async load(companyId) {
        this.validateCompanyId(companyId);

        const snapshot = await getDoc(
            this.settingsRef(companyId)
        );

        if (!snapshot.exists()) {
            return null;
        }

        return {
            id: snapshot.id,
            ...snapshot.data(),
        };
    }

    //////////////////////////////////////////////////////
    // Convert Saved Settings to Form
    //////////////////////////////////////////////////////

    static settingsToForm(
        settings,
        company = {}
    ) {
        const branding =
            settings?.branding || {};

        const bank =
            settings?.bank || {};

        const terms =
            settings?.terms || {};

        const signature =
            settings?.signature || {};

        return {
            // Branding
            logo:
                branding.logo ||
                company.logoUrl ||
                "",

            logoFile: null,

            companyName:
                branding.companyName ||
                company.companyName ||
                "",

            tagline:
                branding.tagline || "",

            primaryColor:
                branding.primaryColor ||
                "#2563eb",

            secondaryColor:
                branding.secondaryColor ||
                "#111827",

            // Bank
            bankName:
                bank.bankName || "",

            accountName:
                bank.accountName || "",

            accountNumber:
                bank.accountNumber || "",

            ifsc:
                bank.ifsc || "",

            branch:
                bank.branch || "",

            upi:
                bank.upi || "",

            qrCode:
                bank.qrCode || "",

            qrCodeFile: null,

            // Terms
            paymentTerms:
                terms.paymentTerms || "",

            deliveryTerms:
                terms.deliveryTerms || "",

            warranty:
                terms.warranty || "",

            notes:
                terms.notes || "",

            declaration:
                terms.declaration || "",

            // Signature
            signature:
                signature.signature || "",

            signatureFile: null,

            signatory:
                signature.signatory ||
                company.ownerName ||
                "",

            designation:
                signature.designation || "",

            seal:
                signature.seal || "",

            sealFile: null,

            quotationPrefix:
                settings?.quotationPrefix ||
                "QT",

            defaultValidityDays:
                Number(
                    settings?.defaultValidityDays ||
                    30
                ),
        };
    }

    //////////////////////////////////////////////////////
    // Save Setup
    //////////////////////////////////////////////////////

    static async save(companyId, form) {
        this.validateCompanyId(companyId);

        if (!form || typeof form !== "object") {
            throw new Error(
                "Quotation setup data is required."
            );
        }

        const settingsReference =
            this.settingsRef(companyId);

        const existingSnapshot =
            await getDoc(
                settingsReference
            );

        const existingSettings =
            existingSnapshot.exists()
                ? existingSnapshot.data()
                : null;

        const existingBranding =
            existingSettings?.branding || {};

        const existingBank =
            existingSettings?.bank || {};

        const existingSignature =
            existingSettings?.signature || {};

        //////////////////////////////////////////////////////
        // Upload Changed Images
        //////////////////////////////////////////////////////

        const [
            uploadedLogo,
            uploadedQrCode,
            uploadedSignature,
            uploadedSeal,
        ] = await Promise.all([
            form.logoFile
                ? this.uploadImage(
                    companyId,
                    form.logoFile,
                    "logo"
                )
                : Promise.resolve(
                    form.logo ||
                    existingBranding.logo ||
                    ""
                ),

            form.qrCodeFile
                ? this.uploadImage(
                    companyId,
                    form.qrCodeFile,
                    "qr"
                )
                : Promise.resolve(
                    form.qrCode ||
                    existingBank.qrCode ||
                    ""
                ),

            form.signatureFile
                ? this.uploadImage(
                    companyId,
                    form.signatureFile,
                    "signature"
                )
                : Promise.resolve(
                    form.signature ||
                    existingSignature.signature ||
                    ""
                ),

            form.sealFile
                ? this.uploadImage(
                    companyId,
                    form.sealFile,
                    "seal"
                )
                : Promise.resolve(
                    form.seal ||
                    existingSignature.seal ||
                    ""
                ),
        ]);

        //////////////////////////////////////////////////////
        // Build Settings Data
        //////////////////////////////////////////////////////

        const payload = {
            branding: {
                logo: uploadedLogo,

                companyName:
                    this.text(form.companyName),

                tagline:
                    this.text(form.tagline),

                gstNumber:
                    this.text(form.gstNumber)
                        .toUpperCase(),

                phone:
                    this.text(form.phone),

                email:
                    this.text(form.email)
                        .toLowerCase(),

                address:
                    this.text(form.address),

                website:
                    this.text(form.website),

                primaryColor:
                    form.primaryColor || "#2563eb",

                secondaryColor:
                    form.secondaryColor || "#111827",
            },

            bank: {
                bankName:
                    this.text(
                        form.bankName
                    ),

                accountName:
                    this.text(
                        form.accountName
                    ),

                accountNumber:
                    this.text(
                        form.accountNumber
                    ),

                ifsc:
                    this.text(
                        form.ifsc
                    ).toUpperCase(),

                branch:
                    this.text(
                        form.branch
                    ),

                upi:
                    this.text(
                        form.upi
                    ),

                qrCode:
                    uploadedQrCode,
            },

            terms: {
                paymentTerms:
                    this.text(
                        form.paymentTerms
                    ),

                deliveryTerms:
                    this.text(
                        form.deliveryTerms
                    ),

                warranty:
                    this.text(
                        form.warranty
                    ),

                notes:
                    this.text(
                        form.notes
                    ),

                declaration:
                    this.text(
                        form.declaration
                    ),
            },

            signature: {
                signatory:
                    this.text(
                        form.signatory
                    ),

                designation:
                    this.text(
                        form.designation
                    ),

                signature:
                    uploadedSignature,

                seal:
                    uploadedSeal,
            },

            setupCompleted: true,

            defaultValidityDays:
                Number(
                    form.defaultValidityDays ||
                    existingSettings
                        ?.defaultValidityDays ||
                    30
                ),

            updatedAt:
                serverTimestamp(),
        };

        //////////////////////////////////////////////////////
        // Only First-Time Setup Fields
        //////////////////////////////////////////////////////

        if (!existingSnapshot.exists()) {
            payload.quotationPrefix =
                this.text(
                    form.quotationPrefix
                ) || "QT";

            payload.nextQuotationNumber = 1;

            payload.createdAt =
                serverTimestamp();
        }

        //////////////////////////////////////////////////////
        // Optional Prefix Update
        //////////////////////////////////////////////////////

        if (
            existingSnapshot.exists() &&
            form.quotationPrefix
        ) {
            payload.quotationPrefix =
                this.text(
                    form.quotationPrefix
                ).toUpperCase();
        }

        //////////////////////////////////////////////////////
        // Save Firestore Settings
        //////////////////////////////////////////////////////

        console.log(
            "Quotation branding being saved:",
            payload.branding
        );

        await setDoc(
            settingsReference,
            payload,
            {
                merge: true,
            }
        );

        //////////////////////////////////////////////////////
        // Mark Company Setup Complete
        //////////////////////////////////////////////////////

        await updateDoc(
            this.companyRef(companyId),
            {
                quotationSetupCompleted: true,

                quotationSetupUpdatedAt:
                    serverTimestamp(),
            }
        );

        //////////////////////////////////////////////////////
        // Delete Replaced Old Images
        //////////////////////////////////////////////////////

        const oldImageUrls = [];

        if (
            form.logoFile &&
            existingBranding.logo &&
            existingBranding.logo !==
            uploadedLogo
        ) {
            oldImageUrls.push(
                existingBranding.logo
            );
        }

        if (
            form.qrCodeFile &&
            existingBank.qrCode &&
            existingBank.qrCode !==
            uploadedQrCode
        ) {
            oldImageUrls.push(
                existingBank.qrCode
            );
        }

        if (
            form.signatureFile &&
            existingSignature.signature &&
            existingSignature.signature !==
            uploadedSignature
        ) {
            oldImageUrls.push(
                existingSignature.signature
            );
        }

        if (
            form.sealFile &&
            existingSignature.seal &&
            existingSignature.seal !==
            uploadedSeal
        ) {
            oldImageUrls.push(
                existingSignature.seal
            );
        }

        await Promise.allSettled(
            oldImageUrls.map((url) =>
                this.deleteImageByUrl(url)
            )
        );

        return {
            success: true,

            isNewSetup:
                !existingSnapshot.exists(),

            settings: {
                ...payload,

                branding: {
                    ...payload.branding,
                    logo: uploadedLogo,
                },

                bank: {
                    ...payload.bank,
                    qrCode: uploadedQrCode,
                },

                signature: {
                    ...payload.signature,
                    signature:
                        uploadedSignature,
                    seal: uploadedSeal,
                },
            },
        };
    }
}