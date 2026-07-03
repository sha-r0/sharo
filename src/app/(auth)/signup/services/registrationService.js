import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function completeRegistration(orderId) {
  try {
    // 1. Read pending registration
    const pendingRef = adminDb
      .collection("PendingRegistrations")
      .doc(orderId);

    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      throw new Error("Registration not found.");
    }

    const data = pendingSnap.data();

    // 2. Create Firebase Auth User
    const authUser = await adminAuth.createUser({
      email: data.admin.adminEmail,
      password: data.admin.password,
      displayName: data.admin.fullName,
    });

    // 3. Create Company
    const companyRef = await adminDb.collection("Companies").add({
      companyName: data.company.companyName,
      companyAddress: data.company.companyAddress,
      companyEmail: data.company.companyEmail,
      phone: data.company.phone,
      gstNumber: data.company.gstNumber,

      corporateId: data.admin.corporateId,

      ownerUid: authUser.uid,

      ownerName: data.admin.fullName,
      ownerEmail: data.admin.adminEmail,
      ownerPhone: data.admin.adminPhone,

      subscription: data.subscription,

      paymentStatus: "PAID",

      serviceStatus: "active",

      createdAt: new Date(),
    });

    // 4. Create Owner in Usermanagement
    await adminDb.collection("Usermanagement").add({
      uid: authUser.uid,

      companyId: companyRef.id,

      employeeId: "OWNER001",

      fullName: data.admin.fullName,

      email: data.admin.adminEmail,

      phone: data.admin.adminPhone,

      role: "owner",

      isPrimary: true,

      status: "Active",

      createdAt: new Date(),
    });

    // 5. Delete Pending Registration
    await pendingRef.delete();

    return {
      success: true,
      uid: authUser.uid,
      companyId: companyRef.id,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: error.message,
    };
  }
}