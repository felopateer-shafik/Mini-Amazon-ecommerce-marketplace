import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  Search,
  Globe,
  Moon,
  Sun,
  Settings,
  User,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/hooks/useApi";
import Avatar from "@/components/ui/Avatar";
import Dropdown, { DropdownItem } from "@/components/ui/Dropdown";
import { useTranslation } from "@/hooks/useTranslation";

export default function DashboardHeader({
  onToggleSidebar,
  onMobileMenuToggle,
  sidebarOpen,
  menuItems = [],
}) {
  const { user, logout } = useAuthStore();
  const { data: notificationsRes } = useNotifications();
  const unreadCount = notificationsRes?.meta?.unread_count ?? 0;
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const quickLinks = useMemo(() => {
    const links = [];

    const walk = (items, parentLabel = "") => {
      (items || []).forEach((item) => {
        const prefix = parentLabel ? `${parentLabel} / ` : "";
        if (item.path) {
          links.push({
            label: `${prefix}${item.label}`,
            path: item.path,
          });
        }
        if (Array.isArray(item.children) && item.children.length > 0) {
          walk(item.children, item.label);
        }
      });
    };

    walk(menuItems);
    return links;
  }, [menuItems]);

  const filteredLinks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return quickLinks
      .filter((item) => item.label.toLowerCase().includes(query))
      .slice(0, 8);
  }, [quickLinks, searchTerm]);

  return (
    <header className="fixed top-0 right-0 left-0 z-20 bg-white border-b border-border/50 h-16 shadow-sm transition-all duration-300">
      <div
        className={`flex items-center justify-between h-full px-4 lg:px-6 transition-all duration-300 ${sidebarOpen ? "lg:ms-64" : "lg:ms-20"}`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block relative w-64">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <Search className="h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder={t("dashboard.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredLinks.length > 0) {
                    navigate(filteredLinks[0].path);
                    setSearchTerm("");
                  }
                }}
                className="bg-transparent text-sm focus:outline-none w-full"
              />
            </div>

            {filteredLinks.length > 0 && (
              <div className="absolute top-[110%] left-0 right-0 z-50 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
                {filteredLinks.map((item) => (
                  <button
                    key={`${item.path}-${item.label}`}
                    type="button"
                    className="w-full text-start px-3 py-2 text-sm hover:bg-gray-50 text-text"
                    onClick={() => {
                      navigate(item.path);
                      setSearchTerm("");
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary flex items-center gap-1"
            title={language === "ar" ? "English" : "العربية"}
          >
            <Globe className="h-5 w-5" />
            <span className="hidden sm:block text-xs font-semibold">
              {language === "ar" ? "EN" : "ع"}
            </span>
          </button>

          <Link
            to="/"
            target="_blank"
            className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary hidden sm:flex items-center gap-1 text-xs"
          >
            <ExternalLink className="h-4 w-4" />
            <span>{t("dashboard.viewStore")}</span>
          </Link>

          <Link
            to="/notifications"
            className="relative p-2 hover:bg-gray-100 rounded-lg"
          >
            <Bell className="h-5 w-5 text-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 bg-danger text-white text-[10px] rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <Dropdown
            trigger={
              <button className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg">
                <Avatar src={user?.avatar} name={user?.name} size="sm" />
                <div className="hidden sm:block text-start">
                  <p className="text-sm font-medium text-text leading-tight">
                    {user?.name || "Admin"}
                  </p>
                  <p className="text-xs text-text-secondary leading-tight capitalize">
                    {user?.role || "admin"}
                  </p>
                </div>
              </button>
            }
          >
            <DropdownItem icon={User} onClick={() => navigate("/account")}>
              {t("dashboard.profile")}
            </DropdownItem>
            <DropdownItem
              icon={Settings}
              onClick={() =>
                navigate(
                  `/${user?.role === "merchant" ? "merchant" : "admin"}/settings`,
                )
              }
            >
              {t("dashboard.settings")}
            </DropdownItem>
            <div className="border-t border-border my-1" />
            <DropdownItem
              icon={LogOut}
              onClick={() => {
                logout();
                navigate("/login");
              }}
              danger
            >
              {t("dashboard.signOut")}
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
