/* ==========================================================
   Company Model
========================================================== */

export function mapCompany(doc) {

    if (!doc) return null;
  
    return {
  
      /* =============================
         Identity
      ============================== */
  
      id: doc.id || "",
  
      companyCode: doc.companyCode || "",
  
      corporateId: doc.corporateId || "",
  
      /* =============================
         Company Information
      ============================== */
  
      companyName: doc.companyName || "",
  
      shortName: doc.shortName || "",
  
      businessType: doc.businessType || "",
  
      industry: doc.industry || "",
  
      description: doc.description || "",
  
      website: doc.website || "",
  
      logoUrl: doc.logoUrl || "",
  
      /* =============================
         Contact
      ============================== */
  
      companyEmail: doc.companyEmail || "",
  
      phone: doc.phone || "",
  
      companyAddress: doc.companyAddress || "",
  
      gstNumber: doc.gstNumber || "",
  
      /* =============================
         Owner
      ============================== */
  
      ownerUid: doc.ownerUid || "",
  
      ownerName: doc.ownerName || "",
  
      ownerEmail: doc.ownerEmail || "",
  
      ownerPhone: doc.ownerPhone || "",
  
      /* =============================
         Subscription
      ============================== */
  
      plan: doc.plan || "starter",
  
      billingType: doc.billingType || "monthly",
  
      employeeCount: doc.employeeCount || 0,
  
      employeeRange: doc.employeeRange || "",
  
      pricePerUser: doc.pricePerUser || 0,
  
      amount: doc.amount || 0,
  
      yearlyDiscount: doc.yearlyDiscount || 0,
  
      /* =============================
         Status
      ============================== */
  
      role: doc.role || "manager",
  
      paymentStatus: doc.paymentStatus || "pending",
  
      paymentUTR: doc.paymentUTR || "",
  
      serviceStatus: doc.serviceStatus || "inactive",
  
      workspaceCompleted:
        doc.workspaceCompleted ?? false,
  
      onboardingCompleted:
        doc.onboardingCompleted ?? false,
  
      onboardingStep:
        doc.onboardingStep ?? 1,
  
      /* =============================
         Dates
      ============================== */
  
      createdAt: doc.createdAt || null,
  
      updatedAt: doc.updatedAt || null,
  
      setupCompletedAt:
        doc.setupCompletedAt || null,
  
      planStart:
        doc.planStart || null,
  
      planEnd:
        doc.planEnd || null,
  
      /* =============================
         Working Hours
      ============================== */
  
      workingHours: {
  
        address:
          doc.workingHours?.address || "",
  
        latitude:
          doc.workingHours?.latitude || "",
  
        longitude:
          doc.workingHours?.longitude || "",
  
        officeStart:
          doc.workingHours?.officeStart || "",
  
        officeEnd:
          doc.workingHours?.officeEnd || "",
  
        hasLunchBreak:
          doc.workingHours?.hasLunchBreak ?? false,
  
        lunchStart:
          doc.workingHours?.lunchStart || "",
  
        lunchEnd:
          doc.workingHours?.lunchEnd || "",
  
        saturdayWeeks:
          doc.workingHours?.saturdayWeeks || [],
  
        weeklyOff: {
  
          saturday:
            doc.workingHours?.weeklyOff?.saturday ?? false,
  
          sunday:
            doc.workingHours?.weeklyOff?.sunday ?? true,
  
        },
  
      },
  
    };
  
  }