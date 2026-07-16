export const userRoles = ["admin", "staff", "customer"] as const;

export type UserRole = (typeof userRoles)[number];

export function canAccessBackoffice(role: string | null | undefined): role is "admin" | "staff" {
  return role === "admin" || role === "staff";
}
