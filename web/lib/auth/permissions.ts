export type UserRole = "owner" | "viewer" | "admin";

export type Permission =
  | "profile.update.own"
  | "documents.manage.own"
  | "users.read"
  | "users.roles.update"
  | "users.status.update";

const permissionsByRole: Record<UserRole, readonly Permission[]> = {
  owner: [
    "profile.update.own",
    "documents.manage.own",
  ],
  viewer: [
    "profile.update.own",
  ],
  admin: [
    "profile.update.own",
    "documents.manage.own",
    "users.read",
    "users.roles.update",
    "users.status.update",
  ],
};

export function parseUserRole(value: unknown): UserRole | null {
  if (
    value === "owner" ||
    value === "viewer" ||
    value === "admin"
  ) {
    return value;
  }

  return null;
}

export function hasPermission(
  role: unknown,
  permission: Permission,
): boolean {
  const validRole = parseUserRole(role);

  if (!validRole) {
    return false;
  }

  return permissionsByRole[validRole].includes(permission);
}
