import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { storage } from "@/lib/firebase";

/* ==========================================================
   Helpers
========================================================== */

function safeExtension(file) {
  const name =
    String(file?.name || "").trim();

  const extension =
    name.includes(".")
      ? name.split(".").pop()
      : "";

  return String(extension || "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "bin";
}

/*
 * Firebase Storage can resolve normal Firebase Storage
 * download URLs through ref(storage, url).
 *
 * If the URL is invalid or belongs to another provider,
 * deletion is treated as best-effort only.
 */
async function deleteByUrl(url) {
  if (!url) {
    return;
  }

  try {
    const storageRef =
      ref(storage, url);

    await deleteObject(
      storageRef
    );
  } catch (error) {
    /*
     * Do not make employee update fail simply because
     * an old/orphaned file could not be deleted.
     */
    console.warn(
      "[EmployeeStorage] Unable to delete previous file",
      {
        code:
          error?.code ||
          "unknown",
      }
    );
  }
}

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

  removeExisting = false,
}) {
  try {
    if (
      !companyId ||
      !firestoreId ||
      !fileName
    ) {
      throw new Error(
        "Employee file information is incomplete."
      );
    }

    /* ==========================================
       Explicitly Remove Existing File
    ========================================== */

    if (
      !file &&
      removeExisting
    ) {
      await deleteByUrl(
        existingUrl
      );

      return {
        success: true,
        url: "",
        path: "",
        removed: true,
      };
    }

    /* ==========================================
       Keep Existing File

       No upload.
       No Storage request.
       Fastest path for employee editing.
    ========================================== */

    if (!file) {
      return {
        success: true,

        url:
          existingUrl || "",

        path: "",

        reused: Boolean(
          existingUrl
        ),
      };
    }

    /* ==========================================
       Validate File Object
    ========================================== */

    if (
      typeof file !== "object" ||
      typeof file.name !== "string"
    ) {
      throw new Error(
        "Invalid employee file."
      );
    }

    /* ==========================================
       Upload New File
    ========================================== */

    const extension =
      safeExtension(file);

    const safeEmployeeId =
      String(
        employeeId ||
          "pending"
      )
        .trim()
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

    const safeFirestoreId =
      String(
        firestoreId
      )
        .trim()
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

    const safeFileName =
      String(
        fileName
      )
        .trim()
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

    const storagePath =
      `companies/${companyId}` +
      `/employees/${safeEmployeeId}_${safeFirestoreId}` +
      `/${safeFileName}.${extension}`;

    const storageRef =
      ref(
        storage,
        storagePath
      );

    /*
     * uploadBytes is sufficient here.
     * EmployeeService already runs the three
     * document uploads concurrently.
     */
    await uploadBytes(
      storageRef,
      file,
      {
        contentType:
          file.type ||
          undefined,

        cacheControl:
          "public,max-age=3600",
      }
    );

    const downloadURL =
      await getDownloadURL(
        storageRef
      );

    /* ==========================================
       Delete Previous File

       Only after the new upload succeeded.

       This prevents losing the old file if the
       new upload fails.
    ========================================== */

    if (
      existingUrl &&
      existingUrl !==
        downloadURL
    ) {
      await deleteByUrl(
        existingUrl
      );
    }

    return {
      success: true,

      url:
        downloadURL,

      path:
        storagePath,

      replaced:
        Boolean(
          existingUrl
        ),
    };
  } catch (error) {
    console.error(
      "[EmployeeStorage] Upload failed",
      {
        fileName,

        companyId,

        firestoreId,

        code:
          error?.code ||
          error?.message ||
          "unknown",
      }
    );

    return {
      success: false,

      /*
       * Keep the previous URL so a failed
       * replacement does not erase a valid
       * existing document.
       */
      url:
        existingUrl || "",

      path: "",

      error,
    };
  }
}

/* ==========================================================
   Delete Employee Files By Storage Path

   Used mainly for rollback after failed employee creation.
========================================================== */

export async function deleteEmployeeFiles(
  paths = []
) {
  const uniquePaths = [
    ...new Set(
      paths.filter(Boolean)
    ),
  ];

  if (!uniquePaths.length) {
    return;
  }

  await Promise.all(
    uniquePaths.map(
      async (path) => {
        try {
          await deleteObject(
            ref(
              storage,
              path
            )
          );
        } catch (error) {
          console.warn(
            "[EmployeeStorage] Rollback delete failed",
            {
              path,

              code:
                error?.code ||
                "unknown",
            }
          );
        }
      }
    )
  );
}