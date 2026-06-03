import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

export default function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-alt flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:bg-white focus:text-text focus:px-3 focus:py-2 focus:rounded-md">
        {t("common.skipToContent")}
      </a>
      <header className="py-4 px-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-xl font-bold text-secondary-dark">
            Mini Amazon
          </span>
        </Link>
      </header>
      <main id="main-content" className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
      <footer className="py-4 px-6 text-center text-xs text-text-light">
        &copy; {new Date().getFullYear()} Mini Amazon. All rights reserved.
      </footer>
    </div>
  );
}
