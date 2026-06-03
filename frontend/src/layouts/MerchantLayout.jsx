import DashboardLayout from "./DashboardLayout";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Star,
  MessageSquare,
  Settings,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function MerchantLayout() {
  const { t } = useTranslation();

  const merchantMenuItems = [
    {
      label: t("merchant.dashboard"),
      icon: LayoutDashboard,
      path: "/merchant",
    },
    {
      label: t("common.products"),
      icon: Package,
      children: [
        { label: t("merchant.myProducts"), path: "/merchant/products" },
        { label: t("merchant.addProduct"), path: "/merchant/products/new" },
      ],
    },
    {
      label: t("common.orders"),
      icon: ShoppingCart,
      path: "/merchant/orders",
    },
    {
      label: t("merchant.earnings"),
      icon: DollarSign,
      path: "/merchant/earnings",
    },
    { label: t("merchant.reviews"), icon: Star, path: "/merchant/reviews" },
    {
      label: t("merchant.messages"),
      icon: MessageSquare,
      path: "/merchant/messages",
    },
    {
      label: t("dashboard.settings"),
      icon: Settings,
      path: "/merchant/settings",
    },
  ];

  return (
    <DashboardLayout
      menuItems={merchantMenuItems}
      title={t("header.sellerDashboard")}
    />
  );
}
