import DashboardLayout from "./DashboardLayout";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  Truck,
  CreditCard,
  RotateCcw,
  Tag,
  Megaphone,
  Users2,
  Gift,
  BarChart3,
  Settings,
  Shield,
  Image,
  FileText,
  Palette,
  MessageSquare,
  Globe,
  Layers,
  Percent,
  Monitor,
  BookOpen,
  Droplets,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { canAccessAdminPath } from "@/lib/adminAccess";

export default function AdminLayout() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const adminMenuItems = [
    { label: t("admin.menuDashboard"), icon: LayoutDashboard, path: "/admin" },
    {
      label: t("admin.menuUsers"),
      icon: Users,
      children: [
        { label: t("admin.menuAllCustomers"), path: "/admin/customers" },
        { label: t("admin.menuWholesale"), path: "/admin/wholesale" },
      ],
    },
    {
      label: t("admin.menuMerchants"),
      icon: Store,
      children: [
        { label: t("admin.menuAllMerchants"), path: "/admin/merchants" },
        {
          label: t("admin.menuApplications"),
          path: "/admin/merchants/applications",
        },
        { label: t("admin.menuPayouts"), path: "/admin/merchants/payouts" },
      ],
    },
    {
      label: t("admin.menuProducts"),
      icon: Package,
      children: [
        { label: t("admin.menuAllProducts"), path: "/admin/products" },
        { label: t("merchant.myProducts"), path: "/admin/products/my" },
        { label: t("admin.menuCategories"), path: "/admin/categories" },
        { label: t("admin.menuBrands"), path: "/admin/brands" },
        { label: t("admin.menuReviews"), path: "/admin/reviews" },
      ],
    },
    {
      label: t("admin.menuOrders"),
      icon: ShoppingCart,
      children: [
        { label: t("admin.menuAllOrders"), path: "/admin/orders" },
        { label: "My Orders", path: "/admin/orders/my" },
      ],
    },
    { label: t("admin.menuShipping"), icon: Truck, path: "/admin/shipping" },
    {
      label: t("admin.menuFinance"),
      icon: CreditCard,
      children: [
        { label: t("admin.menuWallets"), path: "/admin/wallets" },
        { label: t("admin.menuTransactions"), path: "/admin/transactions" },
      ],
    },
    {
      label: t("admin.menuRefunds"),
      icon: RotateCcw,
      path: "/admin/refunds",
    },
    {
      label: t("admin.menuMarketing"),
      icon: Megaphone,
      children: [
        { label: t("admin.menuCampaigns"), path: "/admin/campaigns" },
        { label: t("admin.menuCoupons"), path: "/admin/coupons" },
        { label: t("admin.menuFlashDeals"), path: "/admin/flash-deals" },
        { label: t("admin.menuSubscribers"), path: "/admin/subscribers" },
        { label: t("admin.menuBulkSms"), path: "/admin/bulk-sms" },
      ],
    },
    {
      label: t("admin.menuAffiliates"),
      icon: Users2,
      path: "/admin/affiliates",
    },
    { label: t("admin.menuRewards"), icon: Gift, path: "/admin/rewards" },
    { label: t("admin.menuPos"), icon: Monitor, path: "/admin/pos" },
    { label: t("admin.menuChat"), icon: MessageSquare, path: "/admin/chat" },
    {
      label: t("admin.menuContent"),
      icon: FileText,
      children: [
        { label: t("admin.menuBlog"), path: "/admin/blog" },
        { label: t("admin.menuPages"), path: "/admin/pages" },
      ],
    },
    { label: t("admin.menuMediaLibrary"), icon: Image, path: "/admin/media" },
    {
      label: t("admin.menuStoreFront"),
      icon: Palette,
      path: "/admin/storefront",
    },
    { label: t("admin.menuTheme"), icon: Droplets, path: "/admin/theme" },
    {
      label: t("admin.menuReports"),
      icon: BarChart3,
      children: [
        { label: t("admin.menuSales"), path: "/admin/reports/sales" },
        { label: t("admin.menuInventory"), path: "/admin/reports/inventory" },
        { label: t("admin.menuCustomers"), path: "/admin/reports/customers" },
        { label: t("admin.menuFinancial"), path: "/admin/reports/financial" },
      ],
    },
    {
      label: t("admin.menuStaff"),
      icon: Shield,
      children: [
        { label: t("admin.menuStaffAccounts"), path: "/admin/staff" },
        { label: t("admin.menuRoles"), path: "/admin/roles" },
      ],
    },
    { label: t("admin.menuSettings"), icon: Settings, path: "/admin/settings" },
    { label: t("admin.menuSystem"), icon: Globe, path: "/admin/system" },
  ];

  const filteredMenuItems = useMemo(() => {
    const filterItem = (item) => {
      if (Array.isArray(item.children) && item.children.length > 0) {
        const allowedChildren = item.children.filter((child) =>
          canAccessAdminPath(user, child.path),
        );

        return allowedChildren.length > 0
          ? { ...item, children: allowedChildren }
          : null;
      }

      if (item.path) {
        return canAccessAdminPath(user, item.path) ? item : null;
      }

      return null;
    };

    return adminMenuItems.map(filterItem).filter(Boolean);
  }, [adminMenuItems, user]);

  return (
    <DashboardLayout
      menuItems={filteredMenuItems}
      title={t("admin.adminPanelTitle")}
    />
  );
}
