export function logFirestoreFailure({ feature, operation, path, query = "", companyId = null, isOwner = false, error }) {
  console.error("[FirestoreAuth]", {
    feature,
    operation,
    path,
    query,
    companyId,
    isOwner: Boolean(isOwner),
    code: error?.code || "unknown",
  });
}

export function firestoreUserMessage(error, fallback) {
  return error?.code === "permission-denied"
    ? "You don't have access to this section."
    : fallback;
}
