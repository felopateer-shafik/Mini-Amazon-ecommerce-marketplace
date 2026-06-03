const ROUTE_PERMISSION_RULES = [
  { test: (p) => p === "/admin", permission: "view-dashboard" },
  {
    test: (p) =>
      p.startsWith("/admin/users") || p.startsWith("/admin/customers"),
    permission: "view-users",
  },
  {
    test: (p) => p.startsWith("/admin/wholesale"),
    permission: "view-wholesale",
  },
  {
    test: (p) => p.startsWith("/admin/merchants"),
    permission: "view-merchants",
  },
  { test: (p) => p.startsWith("/admin/products"), permission: "view-products" },
  {
    test: (p) => p.startsWith("/admin/categories"),
    permission: "view-categories",
  },
  { test: (p) => p.startsWith("/admin/brands"), permission: "view-brands" },
  { test: (p) => p.startsWith("/admin/reviews"), permission: "view-reviews" },
  {
    test: (p) =>
      p.startsWith("/admin/orders") || p.startsWith("/admin/pickup-hub"),
    permission: "view-orders",
  },
  { test: (p) => p.startsWith("/admin/shipping"), permission: "edit-shipping" },
  {
    test: (p) =>
      p.startsWith("/admin/finance") ||
      p.startsWith("/admin/wallets") ||
      p.startsWith("/admin/transactions"),
    permission: "view-finance",
  },
  { test: (p) => p.startsWith("/admin/refunds"), permission: "view-refunds" },
  {
    test: (p) =>
      p.startsWith("/admin/marketing") ||
      p.startsWith("/admin/campaigns") ||
      p.startsWith("/admin/coupons") ||
      p.startsWith("/admin/flash-deals") ||
      p.startsWith("/admin/subscribers") ||
      p.startsWith("/admin/bulk-sms"),
    permission: "view-marketing",
  },
  {
    test: (p) => p.startsWith("/admin/affiliates"),
    permission: "manage-affiliates",
  },
  { test: (p) => p.startsWith("/admin/rewards"), permission: "view-rewards" },
  { test: (p) => p.startsWith("/admin/pos"), permission: "use-pos" },
  { test: (p) => p.startsWith("/admin/chat"), permission: "view-chats" },
  {
    test: (p) =>
      p.startsWith("/admin/content") ||
      p.startsWith("/admin/blog") ||
      p.startsWith("/admin/pages"),
    permission: "view-content",
  },
  { test: (p) => p.startsWith("/admin/media"), permission: "view-media" },
  {
    test: (p) => p.startsWith("/admin/storefront"),
    permission: "view-storefront",
  },
  { test: (p) => p.startsWith("/admin/theme"), permission: "edit-storefront" },
  { test: (p) => p.startsWith("/admin/reports"), permission: "view-reports" },
  { test: (p) => p.startsWith("/admin/staff"), permission: "view-staff" },
  { test: (p) => p.startsWith("/admin/roles"), permission: "view-roles" },
  { test: (p) => p.startsWith("/admin/settings"), permission: "view-settings" },
  { test: (p) => p.startsWith("/admin/system"), permission: "view-system" },
];

const ADMIN_ENTRY_PATHS = [
  "/admin",
  "/admin/users",
  "/admin/merchants",
  "/admin/products",
  "/admin/categories",
  "/admin/brands",
  "/admin/orders",
  "/admin/shipping",
  "/admin/finance",
  "/admin/refunds",
  "/admin/marketing",
  "/admin/affiliates",
  "/admin/rewards",
  "/admin/pos",
  "/admin/chat",
  "/admin/content",
  "/admin/media",
  "/admin/reviews",
  "/admin/storefront",
  "/admin/theme",
  "/admin/reports",
  "/admin/wholesale",
  "/admin/staff",
  "/admin/settings",
  "/admin/system",
];

function normalizePath(pathname) {
  if (typeof pathname !== "string" || pathname.trim() === "") {
    return "/";
  }
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function requiredPermissionForAdminPath(pathname) {
  const path = normalizePath(pathname);
  const rule = ROUTE_PERMISSION_RULES.find((entry) => entry.test(path));
  return rule?.permission ?? null;
}

export function canAccessAdminPath(user, pathname) {
  if (!user) {
    return false;
  }

  const path = normalizePath(pathname);

  if (path.startsWith("/admin") && user?.is_system_admin === true) {
    return true;
  }

  if (user?.is_active === false) {
    return false;
  }

  if (path === "/admin" && (user?.role === "admin" || user?.role === "staff")) {
    return true;
  }

  // Admin role: grant access to all admin paths (admins have full access).
  if (user?.role === "admin") {
    return path.startsWith("/admin");
  }

  // Staff role: grant access to all operational paths.
  // Restricted areas (staff management, roles, and system config) are admin-only.
  if (user?.role === "staff") {
    const STAFF_BLOCKED_PREFIXES = [
      "/admin/staff",
      "/admin/roles",
      "/admin/settings",
      "/admin/system",
    ];
    if (STAFF_BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return false;
    }
    // Allow all other admin paths for staff
    return path.startsWith("/admin");
  }

  const permissionSet = new Set(
    Array.isArray(user?.permissions)
      ? user.permissions.map((p) => String(p || "").toLowerCase())
      : [],
  );

  const requiredPermission = requiredPermissionForAdminPath(path);
  if (!requiredPermission) {
    return false;
  }

  return permissionSet.has(requiredPermission.toLowerCase());
}

export function firstAccessibleAdminPath(user) {
  for (const path of ADMIN_ENTRY_PATHS) {
    if (canAccessAdminPath(user, path)) {
      return path;
    }
  }

  return "/";
}
