import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { settingsService } from "@/api/services";
import { useThemeStore } from "@/store/themeStore";
import {
  canAccessAdminPath,
  firstAccessibleAdminPath,
} from "@/lib/adminAccess";

// Layouts
import CustomerLayout from "@/layouts/CustomerLayout";
import AuthLayout from "@/layouts/AuthLayout";
import AdminLayout from "@/layouts/AdminLayout";
import MerchantLayout from "@/layouts/MerchantLayout";

// Auth pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(
  () => import("@/pages/auth/ForgotPasswordPage"),
);
const SocialAuthCallbackPage = lazy(
  () => import("@/pages/auth/SocialAuthCallbackPage"),
);
const MerchantRegisterPage = lazy(
  () => import("@/pages/auth/MerchantRegisterPage"),
);

// Customer pages
const HomePage = lazy(() => import("@/pages/customer/HomePage"));
const ProductListPage = lazy(() => import("@/pages/customer/ProductListPage"));
const CustomerCategoriesPage = lazy(
  () => import("@/pages/customer/CategoriesPage"),
);
const ProductDetailPage = lazy(
  () => import("@/pages/customer/ProductDetailPage"),
);
const CartPage = lazy(() => import("@/pages/customer/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/customer/CheckoutPage"));
const OrdersPage = lazy(() => import("@/pages/customer/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/customer/OrderDetailPage"));
const WishlistPage = lazy(() => import("@/pages/customer/WishlistPage"));
const WalletPage = lazy(() => import("@/pages/customer/WalletPage"));
const AccountPage = lazy(() => import("@/pages/customer/AccountPage"));
const RewardsPage = lazy(() => import("@/pages/customer/RewardsPage"));
const MerchantStorePage = lazy(
  () => import("@/pages/customer/MerchantStorePage"),
);
const NotificationsPage = lazy(
  () => import("@/pages/customer/NotificationsPage"),
);
const CustomerMessagesPage = lazy(
  () => import("@/pages/customer/MessagesPage"),
);
const TermsPage = lazy(() => import("@/pages/customer/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/customer/PrivacyPage"));
const AboutPage = lazy(() => import("@/pages/customer/AboutPage"));
const BlogPage = lazy(() => import("@/pages/customer/BlogPage"));
const CareersPage = lazy(() => import("@/pages/customer/CareersPage"));
const BecomeSellerPage = lazy(
  () => import("@/pages/customer/BecomeSellerPage"),
);
const AffiliatePage = lazy(() => import("@/pages/customer/AffiliatePage"));
const ContactPage = lazy(() => import("@/pages/customer/ContactPage"));
const FAQPage = lazy(() => import("@/pages/customer/FAQPage"));
const ShippingPolicyPage = lazy(
  () => import("@/pages/customer/ShippingPolicyPage"),
);
const ReturnPolicyPage = lazy(
  () => import("@/pages/customer/ReturnPolicyPage"),
);
const CookiePolicyPage = lazy(
  () => import("@/pages/customer/CookiePolicyPage"),
);

// Merchant pages
const MerchantDashboard = lazy(
  () => import("@/pages/merchant/MerchantDashboard"),
);
const MerchantProductsPage = lazy(
  () => import("@/pages/merchant/ProductsPage"),
);
const ProductFormPage = lazy(() => import("@/pages/merchant/ProductFormPage"));
const MerchantOrdersPage = lazy(
  () => import("@/pages/merchant/OrdersManagePage"),
);
const EarningsPage = lazy(() => import("@/pages/merchant/EarningsPage"));
const MerchantSettingsPage = lazy(
  () => import("@/pages/merchant/MerchantSettingsPage"),
);
const MerchantReviewsPage = lazy(() => import("@/pages/merchant/ReviewsPage"));
const MerchantMessagesPage = lazy(
  () => import("@/pages/merchant/MessagesPage"),
);

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const UsersManagePage = lazy(() => import("@/pages/admin/UsersManagePage"));
const MerchantsManagePage = lazy(
  () => import("@/pages/admin/MerchantsManagePage"),
);
const ProductsManagePage = lazy(
  () => import("@/pages/admin/ProductsManagePage"),
);
const AdminMyProductsPage = lazy(
  () => import("@/pages/admin/AdminMyProductsPage"),
);
const AdminMyOrdersPage = lazy(() => import("@/pages/admin/AdminMyOrdersPage"));
const CategoriesPage = lazy(() => import("@/pages/admin/CategoriesPage"));
const BrandsPage = lazy(() => import("@/pages/admin/BrandsPage"));
const ReviewsManagePage = lazy(() => import("@/pages/admin/ReviewsManagePage"));
const OrdersManageAdminPage = lazy(
  () => import("@/pages/admin/OrdersManageAdminPage"),
);
const FinancePage = lazy(() => import("@/pages/admin/FinancePage"));
const RefundsPage = lazy(() => import("@/pages/admin/RefundsPage"));
const ShippingConfigPage = lazy(
  () => import("@/pages/admin/ShippingConfigPage"),
);
const MarketingPage = lazy(() => import("@/pages/admin/MarketingPage"));
const AffiliatesPage = lazy(() => import("@/pages/admin/AffiliatesPage"));
const RewardsManagePage = lazy(() => import("@/pages/admin/RewardsManagePage"));
const POSPage = lazy(() => import("@/pages/admin/POSPage"));
const ChatManagePage = lazy(() => import("@/pages/admin/ChatManagePage"));
const ContentPage = lazy(() => import("@/pages/admin/ContentPage"));
const MediaLibraryPage = lazy(() => import("@/pages/admin/MediaLibraryPage"));
const StoreFrontPage = lazy(() => import("@/pages/admin/StoreFrontPage"));
const ReportsPage = lazy(() => import("@/pages/admin/ReportsPage"));
const StaffPage = lazy(() => import("@/pages/admin/StaffPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));
const WholesalePage = lazy(() => import("@/pages/admin/WholesalePage"));
const SystemPage = lazy(() => import("@/pages/admin/SystemPage"));
const ThemeCustomizationPage = lazy(
  () => import("@/pages/admin/ThemeCustomizationPage"),
);

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  );
}

// Protected route components
function RequireAuth({ children, allowedRoles }) {
  const location = useLocation();
  const { token, user, fetchUser, logout } = useAuthStore();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setChecked(true);
      return;
    }

    if (user) {
      setChecked(true);
      fetchUser().catch(() => {});
      return;
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        setChecked(true);
      }
    }, 4000);

    fetchUser()
      .catch(() => {})
      .finally(() => {
        settled = true;
        clearTimeout(timeoutId);
        setChecked(true);
      });

    return () => clearTimeout(timeoutId);
  }, [token, user, fetchUser]);

  if (!token) {
    const redirect = encodeURIComponent(
      `${location.pathname}${location.search}`,
    );
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (!checked) return <PageLoader />;
  // If user was banned (detected via fetchUser or already in store)
  if (user?.is_banned) {
    logout();
    return <Navigate to="/login?banned=1" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Allow admin/staff users (any user with assigned permissions) to access
    // customer-facing routes so they can manage their own account data
    const hasAdminAccess =
      user?.is_system_admin ||
      (Array.isArray(user?.permissions) && user.permissions.length > 0);
    if (!hasAdminAccess) {
      return <Navigate to="/" replace />;
    }
  }

  if (location.pathname.startsWith("/admin")) {
    if (!canAccessAdminPath(user, location.pathname)) {
      return <Navigate to={firstAccessibleAdminPath(user)} replace />;
    }
  }

  return children;
}

function RedirectIfAuth({ children }) {
  const { token, user } = useAuthStore();
  if (token) {
    const adminEntryPath = firstAccessibleAdminPath(user);
    if (adminEntryPath !== "/") {
      return <Navigate to={adminEntryPath} replace />;
    }
    if (user?.role === "merchant") return <Navigate to="/merchant" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

// 404 page
function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-text mb-2">Page Not Found</p>
        <p className="text-text-secondary mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  useLiveUpdates();
  const location = useLocation();
  const setTheme = useThemeStore((state) => state.setTheme);
  const [publicSettings, setPublicSettings] = React.useState({});
  useFacebookPixel(publicSettings);

  // Global ban check: if user has a stored token, validate it on app init
  const { token, user, fetchUser } = useAuthStore();
  const [appReady, setAppReady] = React.useState(!token || !!user);

  React.useEffect(() => {
    let cancelled = false;

    settingsService
      .public()
      .then((response) => {
        if (cancelled) return;
        const data = response?.data?.data ?? response?.data ?? {};
        setPublicSettings(data);
        const themeColors = data?.theme_colors;
        if (
          themeColors &&
          typeof themeColors === "object" &&
          !Array.isArray(themeColors)
        ) {
          setTheme(themeColors);
        } else {
          setTheme({
            primary: data?.primary_color || "#ff9900",
            secondary: data?.secondary_color || "#232f3e",
            accent: data?.accent_color || "#146eb4",
          });
        }

        const darkModeEnabled = !!data?.dark_mode_enabled;
        document.documentElement.classList.toggle("dark", darkModeEnabled);

        if (typeof data?.favicon_url === "string" && data.favicon_url.trim()) {
          const href = data.favicon_url.trim();
          let favicon = document.querySelector("link[rel='icon']");
          if (!favicon) {
            favicon = document.createElement("link");
            favicon.setAttribute("rel", "icon");
            document.head.appendChild(favicon);
          }
          favicon.setAttribute("href", href);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  React.useEffect(() => {
    const pathname = location.pathname;
    const appName = publicSettings?.site_name || "ECommerce";

    const staticTitles = {
      "/": "Home",
      "/login": "Login",
      "/register": "Register",
      "/forgot-password": "Forgot Password",
      "/merchant/register": "Merchant Registration",
      "/products": "Products",
      "/categories": "Categories",
      "/cart": "Cart",
      "/checkout": "Checkout",
      "/orders": "Orders",
      "/wishlist": "Wishlist",
      "/wallet": "Wallet",
      "/account": "Account",
      "/rewards": "Rewards",
      "/notifications": "Notifications",
      "/messages": "Messages",
      "/terms": "Terms",
      "/privacy": "Privacy",
      "/about": "About Us",
      "/blog": "Blog",
      "/careers": "Careers",
      "/become-seller": "Sell on Mini Amazon",
      "/affiliate": "Become an Affiliate",
      "/contact": "Contact Us",
      "/faq": "FAQ",
      "/shipping-policy": "Shipping Policy",
      "/return-policy": "Return Policy",
      "/cookie-policy": "Cookie Policy",
      "/merchant": "Merchant Dashboard",
      "/merchant/products": "Merchant Products",
      "/merchant/orders": "Merchant Orders",
      "/merchant/earnings": "Merchant Earnings",
      "/merchant/reviews": "Merchant Reviews",
      "/merchant/messages": "Merchant Messages",
      "/merchant/settings": "Merchant Settings",
      "/admin": "Admin Dashboard",
      "/admin/users": "User Management",
      "/admin/customers": "Customer Management",
      "/admin/merchants": "Merchant Management",
      "/admin/products": "Product Management",
      "/admin/categories": "Category Management",
      "/admin/brands": "Brand Management",
      "/admin/reviews": "Review Management",
      "/admin/orders": "Order Management",
      "/admin/shipping": "Shipping Configuration",
      "/admin/finance": "Finance",
      "/admin/refunds": "Refunds",
      "/admin/marketing": "Marketing",
      "/admin/affiliates": "Affiliates",
      "/admin/rewards": "Rewards Management",
      "/admin/wholesale": "Wholesale",
      "/admin/pos": "POS",
      "/admin/chat": "Chat Management",
      "/admin/content": "Content Management",
      "/admin/media": "Media Library",
      "/admin/storefront": "Storefront",
      "/admin/reports": "Reports",
      "/admin/staff": "Staff Management",
      "/admin/settings": "Settings",
      "/admin/system": "System",
      "/admin/theme": "Theme Customization",
    };

    let pageTitle = staticTitles[pathname];

    if (!pageTitle) {
      if (/^\/products\/.+/.test(pathname) || /^\/product\/.+/.test(pathname)) {
        pageTitle = "Product Details";
      } else if (/^\/orders\/.+/.test(pathname)) {
        pageTitle = "Order Details";
      } else if (/^\/store\/.+/.test(pathname)) {
        pageTitle = "Store";
      } else if (/^\/category\/.+/.test(pathname) || pathname === "/search") {
        pageTitle = "Products";
      } else if (/^\/merchant\/products\/(new|.+\/edit)$/.test(pathname)) {
        pageTitle = "Product Form";
      } else if (/^\/admin\/reports\/.+/.test(pathname)) {
        pageTitle = "Reports";
      } else if (pathname === "/auth/social/callback") {
        pageTitle = "Signing In";
      } else {
        pageTitle = "Page";
      }
    }

    document.title = `${pageTitle} | ${appName}`;
  }, [location.pathname, publicSettings?.site_name]);

  React.useEffect(() => {
    if (!token) {
      setAppReady(true);
      return;
    }

    if (user) {
      setAppReady(true);
      fetchUser().catch(() => {});
      return;
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        setAppReady(true);
      }
    }, 4000);

    fetchUser()
      .catch(() => {})
      .finally(() => {
        settled = true;
        clearTimeout(timeoutId);
        setAppReady(true);
      });

    return () => clearTimeout(timeoutId);
  }, [token, user, fetchUser]);

  if (!appReady) return <PageLoader />;

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/auth/social/callback"
            element={<SocialAuthCallbackPage />}
          />

          {/* Auth Routes */}
          <Route
            element={
              <RedirectIfAuth>
                <AuthLayout />
              </RedirectIfAuth>
            }
          >
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route element={<AuthLayout />}>
            <Route path="/merchant/register" element={<MerchantRegisterPage />} />
          </Route>

          {/* Customer / Public Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/categories" element={<CustomerCategoriesPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/category/:slug" element={<ProductListPage />} />
            <Route path="/store/:slug" element={<MerchantStorePage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/become-seller" element={<BecomeSellerPage />} />
            <Route path="/affiliate" element={<AffiliatePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
            <Route path="/return-policy" element={<ReturnPolicyPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route
              path="/deals"
              element={<Navigate to="/products?deals=true" replace />}
            />
            <Route
              path="/flash-deals"
              element={<Navigate to="/products?deals=true" replace />}
            />
            <Route path="/search" element={<ProductListPage />} />
            <Route
              path="/compare"
              element={<Navigate to="/products" replace />}
            />

            {/* Protected Customer Routes */}
            <Route
              path="/checkout"
              element={
                <RequireAuth
                  allowedRoles={["customer", "wholesale", "merchant", "admin"]}
                >
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route
              path="/orders"
              element={
                <RequireAuth
                  allowedRoles={["customer", "wholesale", "merchant", "admin"]}
                >
                  <OrdersPage />
                </RequireAuth>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <RequireAuth
                  allowedRoles={["customer", "wholesale", "merchant", "admin"]}
                >
                  <OrderDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/wishlist"
              element={
                <RequireAuth
                  allowedRoles={["customer", "wholesale", "merchant", "admin"]}
                >
                  <WishlistPage />
                </RequireAuth>
              }
            />
            <Route
              path="/wallet"
              element={
                <RequireAuth
                  allowedRoles={["customer", "wholesale", "merchant", "admin"]}
                >
                  <WalletPage />
                </RequireAuth>
              }
            />
            <Route
              path="/account"
              element={
                <RequireAuth
                  allowedRoles={["customer", "wholesale", "merchant", "admin"]}
                >
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/rewards"
              element={
                <RequireAuth
                  allowedRoles={["customer", "wholesale", "merchant", "admin"]}
                >
                  <RewardsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/notifications"
              element={
                <RequireAuth
                  allowedRoles={["customer", "wholesale", "merchant", "admin"]}
                >
                  <NotificationsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/messages"
              element={
                <RequireAuth allowedRoles={["customer", "wholesale"]}>
                  <CustomerMessagesPage />
                </RequireAuth>
              }
            />
          </Route>

          {/* Merchant Dashboard Routes */}
          <Route
            path="/merchant"
            element={
              <RequireAuth allowedRoles={["merchant"]}>
                <MerchantLayout />
              </RequireAuth>
            }
          >
            <Route index element={<MerchantDashboard />} />
            <Route path="products" element={<MerchantProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="orders" element={<MerchantOrdersPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="reviews" element={<MerchantReviewsPage />} />
            <Route path="messages" element={<MerchantMessagesPage />} />
            <Route path="settings" element={<MerchantSettingsPage />} />
          </Route>

          {/* Admin Dashboard Routes */}
          <Route
            path="/admin"
            element={
              <RequireAuth allowedRoles={["admin", "staff"]}>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagePage />} />
            <Route
              path="customers"
              element={<UsersManagePage initialRoleFilter="customer" />}
            />
            <Route path="merchants" element={<MerchantsManagePage />} />
            <Route
              path="merchants/applications"
              element={<MerchantsManagePage initialStatusFilter="pending" />}
            />
            <Route
              path="merchants/payouts"
              element={<MerchantsManagePage initialStatusFilter="approved" />}
            />
            <Route path="products" element={<ProductsManagePage />} />
            <Route path="products/my" element={<AdminMyProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="attributes" element={<ProductsManagePage />} />
            <Route path="reviews" element={<ReviewsManagePage />} />
            <Route path="orders" element={<OrdersManageAdminPage />} />
            <Route path="orders/my" element={<AdminMyOrdersPage />} />
            <Route path="pickup-hub" element={<OrdersManageAdminPage />} />
            <Route path="shipping" element={<ShippingConfigPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="wallets" element={<FinancePage />} />
            <Route path="transactions" element={<FinancePage />} />
            <Route path="refunds" element={<RefundsPage />} />
            <Route path="marketing" element={<MarketingPage />} />
            <Route
              path="campaigns"
              element={<MarketingPage initialTab="campaigns" />}
            />
            <Route
              path="coupons"
              element={<MarketingPage initialTab="coupons" />}
            />
            <Route
              path="flash-deals"
              element={<MarketingPage initialTab="flash-deals" />}
            />
            <Route
              path="subscribers"
              element={<MarketingPage initialTab="newsletter" />}
            />
            <Route
              path="bulk-sms"
              element={<MarketingPage initialTab="bulk-sms" />}
            />
            <Route path="affiliates" element={<AffiliatesPage />} />
            <Route path="rewards" element={<RewardsManagePage />} />
            <Route path="wholesale" element={<WholesalePage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="chat" element={<ChatManagePage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="blog" element={<ContentPage initialTab="blog" />} />
            <Route path="pages" element={<ContentPage initialTab="pages" />} />
            <Route path="media" element={<MediaLibraryPage />} />
            <Route path="storefront" element={<StoreFrontPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route
              path="reports/sales"
              element={<ReportsPage initialTab="sales" />}
            />
            <Route
              path="reports/inventory"
              element={<ReportsPage initialTab="inventory" />}
            />
            <Route
              path="reports/customers"
              element={<ReportsPage initialTab="customers" />}
            />
            <Route
              path="reports/financial"
              element={<ReportsPage initialTab="financial" />}
            />
            <Route path="staff" element={<StaffPage />} />
            <Route path="roles" element={<StaffPage initialTab="roles" />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="theme" element={<ThemeCustomizationPage />} />
          </Route>

          {/* 404 Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
