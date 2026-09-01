export function logFirestoreFailure({ feature, operation, path, query = "", error }) {
  console.error("[FirestoreAuth]", {
    feature,
    operation,
    path,
    query,
    code: error?.code || "unknown",
  });
}

export function firestoreUserMessage(error, fallback) {
  return error?.code === "permission-denied"
    ? "You don't have access to this section."
    : fallback;
}
