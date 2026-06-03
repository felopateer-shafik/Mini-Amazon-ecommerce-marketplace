import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, User, LayoutGrid } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "@/hooks/useTranslation";

const navItems = [
  { key: "home", icon: Home, path: "/", matchExact: true },
  { key: "categories", icon: LayoutGrid, path: "/products" },
  { key: "cart", icon: ShoppingCart, path: "/cart", badge: true },
  { key: "account", icon: User, path: "/account", authPath: "/login" },
];

export default memo(function MobileBottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuthStore();
  const itemCount = useCartStore((s) => s.getItemCount());

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border/50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const to = item.authPath && !isAuthenticated ? item.authPath : item.path;
          const isActive = item.matchExact ? pathname === item.path : pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${isActive ? "text-primary" : "text-text-secondary"}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-danger text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-0.5">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">
                {t(`bottomNav.${item.key}`, item.key.charAt(0).toUpperCase() + item.key.slice(1))}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
