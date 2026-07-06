import {
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";

/* =====================================================
   Upload Company Logo
===================================================== */

async function uploadCompanyLogo(companyId, file) {

  if (!file) return null;

  const storageRef = ref(
    storage,
    `companies/${companyId}/logo`
  );

  await uploadBytes(storageRef, file);

  return await getDownloadURL(storageRef);

}

/* =====================================================
   Create Workspace
===================================================== */

export async function createWorkspace(
  companyId,
  workspaceData,
  onProgress
) {

  try {

    /* -------------------------------
       Step 1
    -------------------------------- */

    onProgress?.({
      progress: 20,
      title: "Uploading company logo...",
    });

    let logoUrl = null;

    if (workspaceData.companyProfile.logo) {

      logoUrl = await uploadCompanyLogo(
        companyId,
        workspaceData.companyProfile.logo
      );

    }

    /* -------------------------------
       Step 2
    -------------------------------- */

    onProgress?.({
      progress: 60,
      title: "Saving company profile...",
    });

    const companyData = {

      companyName:
        workspaceData.companyProfile.companyName,
    
      shortName:
        workspaceData.companyProfile.shortName,
    
      businessType:
        workspaceData.companyProfile.businessType,
    
      industry:
        workspaceData.companyProfile.industry,
    
      website:
        workspaceData.companyProfile.website,
    
      description:
        workspaceData.companyProfile.description,
    
      workingHours:
        workspaceData.workingHours,
    
      workspaceCompleted: true,
    
      onboardingCompleted: true,
    
      onboardingStep: 999,
    
      setupCompletedAt:
        serverTimestamp(),
    
      updatedAt:
        serverTimestamp(),
    
    };
    
    if (logoUrl) {
    
      companyData.logoUrl = logoUrl;
    
    }

    onProgress?.({

      progress: 90,
    
      title: "Finalizing workspace...",
    
    });

    await updateDoc(
      doc(db, "Companies", companyId),
      companyData
    );

    /* -------------------------------
       Step 3
    -------------------------------- */

    onProgress?.({
      progress: 100,
      title: "Workspace created successfully.",
    });

    return {

      success: true,

    };

  } catch (error) {

    console.error(error);

    return {

      success: false,

      message: error.message,

    };

  }

}