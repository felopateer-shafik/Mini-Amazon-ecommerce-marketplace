import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "@/hooks/useTranslation";

export default function DashboardSidebar({
  menuItems,
  isOpen,
  mobileOpen,
  onMobileClose,
  title,
}) {
  const location = useLocation();
  const { logout } = useAuthStore();
  const { t } = useTranslation();
  const mobileAsideRef = useRef(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const sidebar = mobileAsideRef.current;
    if (!sidebar) return;

    const getFocusable = () => {
      return sidebar.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
    };

    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onMobileClose?.();
        return;
      }

      if (event.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed top-0 start-0 z-30 h-screen bg-secondary-dark text-white transition-all duration-300 hidden lg:flex flex-col overflow-hidden",
          isOpen ? "w-64" : "w-20",
        )}
      >
        <div className="p-4 border-b border-gray-700">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            {isOpen && (
              <span className="text-lg font-bold truncate">{title}</span>
            )}
          </Link>
        </div>

        <nav className="py-4 px-2 flex-1 overflow-y-auto scrollbar-hidden">
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              item={item}
              isOpen={isOpen}
              currentPath={location.pathname}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700 shrink-0">
          <button
            onClick={logout}
            className={cn(
              "flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors",
              !isOpen && "justify-center",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isOpen && (
              <span className="text-sm">{t("dashboard.signOut")}</span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-visibility duration-300 ${mobileOpen ? "visible" : "invisible pointer-events-none"}`}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={onMobileClose}
        />
        <aside
          ref={mobileAsideRef}
          className={`absolute start-0 top-0 h-full w-72 bg-secondary-dark text-white overflow-y-auto scrollbar-hidden transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-lg font-bold">{title}</span>
            </Link>
            <button
              onClick={onMobileClose}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="py-4 px-2">
            {menuItems.map((item, index) => (
              <MenuItem
                key={index}
                item={item}
                isOpen={true}
                currentPath={location.pathname}
                onNavigate={onMobileClose}
              />
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}

function MenuItem({ item, isOpen, currentPath, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const isActive =
    item.path === currentPath ||
    item.children?.some((c) => c.path === currentPath);
  const Icon = item.icon;

  if (item.children) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-3 w-full p-2.5 rounded-lg text-sm transition-colors",
            isActive
              ? "bg-white/10 text-white"
              : "text-gray-400 hover:text-white hover:bg-white/5",
            !isOpen && "justify-center",
          )}
        >
          {Icon && <Icon className="h-5 w-5 shrink-0" />}
          {isOpen && (
            <>
              <span className="flex-1 text-start">{item.label}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </>
          )}
        </button>
        {expanded && isOpen && (
          <div className="ms-4 mt-1 space-y-0.5 ltr:border-l rtl:border-r border-gray-700 ps-4">
            {item.children.map((child, i) => (
              <Link
                key={i}
                to={child.path}
                onClick={onNavigate}
                className={cn(
                  "block py-2 px-3 rounded-lg text-sm transition-colors",
                  currentPath === child.path
                    ? "bg-primary/20 text-primary"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-lg text-sm transition-colors mb-1",
        isActive
          ? "bg-primary/20 text-primary"
          : "text-gray-400 hover:text-white hover:bg-white/5",
        !isOpen && "justify-center",
      )}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" />}
      {isOpen && <span>{item.label}</span>}
    </Link>
  );
}
