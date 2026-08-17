import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { storage } from "@/lib/firebase";

/* ==========================================================
   Upload Employee File
========================================================== */

export async function uploadEmployeeFile({

  companyId,

  employeeId,

  firestoreId,

  fileName,

  file,

  existingUrl = "",

}) {

  try {

    /* ==========================================
       Keep Existing File
    ========================================== */

    if (!file) {

      return {

        success: true,

        url: existingUrl,

        path: "",

      };

    }

    /* ==========================================
       Upload New File
    ========================================== */

    const extension =
      file.name.split(".").pop();

    const storagePath =

      `companies/${companyId}/employees/${employeeId}_${firestoreId}/${fileName}.${extension}`;

    const storageRef = ref(

      storage,

      storagePath

    );

    await uploadBytes(

      storageRef,

      file

    );

    const downloadURL =
      await getDownloadURL(storageRef);

    return {

      success: true,

      url: downloadURL,

      path: storagePath,

    };

  }

  catch (error) {

    console.error(error);

    return {

      success: false,

      url: existingUrl,

      path: "",

      error,

    };

  }

}

export async function deleteEmployeeFiles(paths = []) {
  await Promise.all(paths.filter(Boolean).map((path) => deleteObject(ref(storage, path)).catch(() => {})));
}
