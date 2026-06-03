import { useAuthStore } from "@/store/authStore";

/**
 * Returns permission helpers for the current admin user.
 * hasPerm(...permissions) returns true when:
 *   - the user is system admin, OR
 *   - the user owns at least one of the listed permissions.
 */
export function usePermission() {
  const user = useAuthStore((state) => state.user);
  const isSystemAdmin = user?.is_system_admin === true;
  const perms = new Set(
    Array.isArray(user?.permissions)
      ? user.permissions.map((p) => String(p).toLowerCase())
      : [],
  );

  const hasPerm = (...ps) => {
    if (isSystemAdmin) return true;
    return ps.some((p) => perms.has(p));
  };

  return { user, isSystemAdmin, hasPerm };
}
