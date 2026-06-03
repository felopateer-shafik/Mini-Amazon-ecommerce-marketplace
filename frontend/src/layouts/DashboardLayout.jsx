import { useState } from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { useTranslation } from "@/hooks/useTranslation";

export default function DashboardLayout({ menuItems, title }) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-alt">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-[60] focus:bg-white focus:text-text focus:px-3 focus:py-2 focus:rounded-md"
      >
        {t("common.skipToContent")}
      </a>
      <DashboardSidebar
        menuItems={menuItems}
        isOpen={sidebarOpen}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        title={title}
      />
      <div
        className={`transition-all duration-300 ${sidebarOpen ? "lg:ms-64" : "lg:ms-20"}`}
      >
        <DashboardHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onMobileMenuToggle={() => setMobileSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
          menuItems={menuItems}
        />
        <main id="main-content" className="mt-16 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
