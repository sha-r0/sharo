export function requireCompanyPermission(context, ...permissions) {
  if (!context.isOwner && !permissions.some((permission) => context.permissions.includes(permission))) throw new Error("FORBIDDEN");
}
