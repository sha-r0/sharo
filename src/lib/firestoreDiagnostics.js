export function logFirestoreFailure({ feature, operation, path, query = "", companyId = null, isOwner = false, error }) {
  console.error("[FirestoreAuth]", JSON.stringify({
    feature,
    operation: error?.operation || operation,
    path: error?.path || path,
    query: error?.query || query,
    companyId,
    isOwner: Boolean(isOwner),
    code: error?.code ?? "unknown",
    message: error?.message || String(error || "Unknown error"),
  }));
}

export function firestoreUserMessage(error, fallback) {
  return error?.code === "permission-denied"
    ? "You don't have access to this section."
    : fallback;
}
