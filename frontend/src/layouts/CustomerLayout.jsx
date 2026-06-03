import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import CustomerHeader from "@/components/layout/CustomerHeader";
import CustomerFooter from "@/components/layout/CustomerFooter";
import ComparisonDrawer from "@/components/ComparisonDrawer";
import ScrollToTop from "@/components/ScrollToTop";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useTranslation } from "@/hooks/useTranslation";
import { usePublicSettings } from "@/hooks/useApi";

export default function CustomerLayout() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const syncFromServer = useCartStore((s) => s.syncFromServer);
  const { data: publicSettingsRes } = usePublicSettings();

  const publicSettings = publicSettingsRes?.data ?? publicSettingsRes ?? {};
  const announcement =
    publicSettings?.announcement_bar &&
    typeof publicSettings.announcement_bar === "object"
      ? publicSettings.announcement_bar
      : {};
  const showAnnouncement = !!announcement?.enabled && !!announcement?.text;
  const inMaintenance = !!publicSettings?.maintenance_mode;
  const maintenanceMessage =
    publicSettings?.maintenance_message || t("admin.defaultMaintenanceMessage");

  useEffect(() => {
    if (isAuthenticated) {
      syncFromServer();
    }
  }, [isAuthenticated, syncFromServer]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:bg-white focus:text-text focus:px-3 focus:py-2 focus:rounded-md"
      >
        {t("common.skipToContent")}
      </a>
      {showAnnouncement && (
        <div
          className="px-4 py-2 text-center text-sm"
          style={{
            backgroundColor: announcement?.background_color || "#FF9900",
            color: announcement?.text_color || "#FFFFFF",
          }}
        >
          {announcement?.link ? (
            <a
              href={announcement.link}
              className="underline underline-offset-2"
            >
              {announcement.text}
            </a>
          ) : (
            <span>{announcement.text}</span>
          )}
        </div>
      )}
      {inMaintenance && (
        <div className="px-4 py-2 text-center text-sm bg-yellow-100 text-yellow-900 border-b border-yellow-200">
          {maintenanceMessage}
        </div>
      )}
      <CustomerHeader />
      <main id="main-content" className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <Outlet />
      </main>
      <CustomerFooter />
      <ComparisonDrawer />
      <ScrollToTop />
      <MobileBottomNav />
    </div>
  );
}
