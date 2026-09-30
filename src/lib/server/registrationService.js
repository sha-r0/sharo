import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { securePendingPassword, importPendingPassword } from "./pendingPassword.mjs";

export async function completeRegistration(orderId) {
    let authUser = null;
    let companyRef = null;
    let ownerRef = null;

    const ownerEmployeeId = "00000001";

    try {
        // ============================================
        // Get Pending Registration
        // ============================================

        let pendingRef = adminDb
            .collection("PendingRegistrations")
            .doc(orderId);

        let pendingDoc = await pendingRef.get();
        if (!pendingDoc.exists) {
            const matches = await adminDb.collection("PendingRegistrations")
                .where("orderId", "==", orderId).limit(1).get();
            if (!matches.empty) {
                pendingDoc = matches.docs[0];
                pendingRef = pendingDoc.ref;
            }
        }

        if (!pendingDoc.exists) {
            return {
                success: false,
                message: "Pending registration not found.",
            };
        }

        const data = await securePendingPassword(pendingDoc);

        // ============================================
        // Prevent Duplicate Registration
        // ============================================

        const existingCompany = await adminDb
            .collection("Companies")
            .where("corporateId", "==", data.admin.corporateId)
            .limit(1)
            .get();

        if (!existingCompany.empty) {
            await pendingRef.delete();

            return {
                success: true,
                message: "Already Registered",
            };
        }

        // ============================================
        // Create Firebase Auth User
        // ============================================

        authUser = await adminAuth.createUser({
            email: data.admin.adminEmail,
            displayName: data.admin.fullName,
        });
        await importPendingPassword(adminAuth, authUser, data.admin.passwordHash);

        // ============================================
        // Calculate Plan Dates
        // ============================================

        const planStart = Timestamp.now();

        const end = new Date();

        if (data.subscription.billingType === "monthly") {
            end.setMonth(end.getMonth() + 1);
        } else {
            end.setFullYear(end.getFullYear() + 1);
        }

        const planEnd = Timestamp.fromDate(end);

        // ============================================
        // Create Company
        // ============================================

        companyRef = await adminDb.collection("Companies").add({

            companyName: data.company.companyName,

            companyAddress: data.company.companyAddress,

            companyEmail: data.company.companyEmail,

            phone: data.company.phone,

            gstNumber: data.company.gstNumber,

            corporateId: data.admin.corporateId,

            companyCode: data.admin.corporateId,

            employeeId: ownerEmployeeId,

            ownerUid: authUser.uid,

            ownerName: data.admin.fullName,

            ownerEmail: data.admin.adminEmail,

            ownerPhone: data.admin.adminPhone,

            role: "owner",

            plan: data.subscription.plan,

            billingType: data.subscription.billingType,

            employeeCount: data.subscription.employeeCount,

            employeeRange: data.subscription.employeeRange,

            pricePerUser: data.subscription.pricePerUser,

            yearlyDiscount: data.subscription.yearlyDiscount,

            amount: data.subscription.amount,

            paymentStatus: "paid",

            paymentUTR: "",

            planStart,

            planEnd,

            serviceStatus: "active",

            workspaceCompleted: false,

            onboardingCompleted: false,
            
            onboardingStep: 1,
            
            setupCompletedAt: null,
            
            createdAt: Timestamp.now(),
            
            updatedAt: Timestamp.now(),

        });

        // ============================================
        // Create Owner
        // ============================================

        ownerRef = await adminDb.collection("Usermanagement").add({

            uid: authUser.uid,

            companyId: companyRef.id,

            

            name: data.admin.fullName,

            email: data.admin.adminEmail,

            phone: data.admin.adminPhone,


            department: "Management",

            designation: "Owner",

            role: "owner",

            isPrimary: true,

            isActive: true,

            joiningDate: new Date().toISOString().split("T")[0],

            salary: 0,

            plan: data.subscription.plan,

            leaveBalance: {
                CL: 12,
                ML: 2,
            },

            createdAt: Timestamp.now(),

            updatedAt: Timestamp.now(),

        });

        // ============================================
        // Delete Pending Registration
        // ============================================

        await pendingRef.delete();

        await adminAuth.setCustomUserClaims(authUser.uid, {

            companyId: companyRef.id,
          
            role: "owner",
          
          });

        // ============================================
        // Create Custom Token
        // ============================================

        const customToken = await adminAuth.createCustomToken(
            authUser.uid
        );

        return {
            success: true,

            uid: authUser.uid,

            companyId: companyRef.id,

            customToken,
        };

    } catch (error) {

        console.error("Registration completion failed.");

        // Rollback

        try {

            if (ownerRef) {
                await ownerRef.delete();
            }

            if (companyRef) {
                await companyRef.delete();
            }

            if (authUser) {
                await adminAuth.deleteUser(authUser.uid);
            }

        } catch (rollbackError) {

            console.error("Rollback Error", rollbackError);

        }

        return {
            success: false,
            message: "Unable to complete registration. Please try again.",
        };
    }
}