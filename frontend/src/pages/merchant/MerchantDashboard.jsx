import { Link } from "react-router-dom";
import {
  BarChart3,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Clock,
  Loader2,
  Plus,
  ClipboardList,
  Wallet,
  MessageSquare,
  Settings,
  Image,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useMerchantDashboard } from "@/hooks/useApi";
import Button from "@/components/ui/Button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

const statusColors = {
  pending: "warning",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
};

export default function MerchantDashboard() {
  const { t } = useTranslation();
  const { data: dashData, isLoading, isError } = useMerchantDashboard();
  const dash = dashData?.data || dashData || {};
  const statusLabels = {
    pending: t("merchant.statusPending"),
    processing: t("merchant.statusProcessing"),
    shipped: t("merchant.statusShipped"),
    delivered: t("merchant.statusDelivered"),
    cancelled: t("merchant.statusCancelled"),
  };

  const totalSales = dash.total_sales ?? dash.totalSales ?? 0;
  const totalOrders = dash.total_orders ?? dash.totalOrders ?? 0;
  const totalProducts = dash.total_products ?? dash.totalProducts ?? 0;
  const avgRating = dash.average_rating ?? dash.avgRating ?? 0;
  const recentOrders = dash.recent_orders ?? dash.recentOrders ?? [];
  const topProducts = dash.top_products ?? dash.topProducts ?? [];
  const salesChart = dash.sales_chart ?? dash.salesData ?? [];
  const orderStatusBreakdown = dash.order_status ?? dash.orderStatus ?? {};

  const stats = [
    {
      title: t("merchant.totalRevenue"),
      value: formatCurrency(totalSales),
      icon: DollarSign,
      color: "text-primary",
    },
    {
      title: t("merchant.totalOrders"),
      value: String(totalOrders),
      icon: ShoppingCart,
      color: "text-accent",
    },
    {
      title: t("merchant.totalProducts"),
      value: String(totalProducts),
      icon: Package,
      color: "text-success",
    },
    {
      title: t("merchant.avgRating"),
      value: Number(avgRating).toFixed(1),
      icon: Star,
      color: "text-yellow-500",
    },
  ];

  const orderStatusData = Object.entries(orderStatusBreakdown).map(
    ([name, value]) => ({
      name: statusLabels[name] || name,
      value: Number(value),
      color:
        name === "pending"
          ? "#FFA500"
          : name === "processing"
            ? "#3B82F6"
            : name === "shipped"
              ? "#8B5CF6"
              : name === "delivered"
                ? "#10B981"
                : "#EF4444",
    }),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-danger text-sm">
          {t("merchant.failedLoadDashboard")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("merchant.dashboard")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("merchant.welcomeBackOverview")}
          </p>
        </div>
        <Link to="/merchant/products/new">
          <Button icon={Plus} size="sm">
            {t("merchant.addProduct")}
          </Button>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/merchant/products/new"
          className="flex items-center gap-3 bg-white p-4 rounded-xl border border-border/50 hover:border-primary hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-text">
            {t("merchant.addProduct")}
          </span>
        </Link>
        <Link
          to="/merchant/orders"
          className="flex items-center gap-3 bg-white p-4 rounded-xl border border-border/50 hover:border-primary hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-accent" />
          </div>
          <span className="text-sm font-medium text-text">
            {t("merchant.viewOrders")}
          </span>
        </Link>
        <Link
          to="/merchant/products"
          className="flex items-center gap-3 bg-white p-4 rounded-xl border border-border/50 hover:border-primary hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-success" />
          </div>
          <span className="text-sm font-medium text-text">
            {t("merchant.myProducts")}
          </span>
        </Link>
        <Link
          to="/merchant/earnings"
          className="flex items-center gap-3 bg-white p-4 rounded-xl border border-border/50 hover:border-primary hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-yellow-500" />
          </div>
          <span className="text-sm font-medium text-text">
            {t("merchant.earnings")}
          </span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white p-3 sm:p-5 rounded-xl border border-border/50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-secondary">{stat.title}</span>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-text">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-xl border border-border/50">
          <h2 className="font-semibold text-text mb-4">
            {t("merchant.salesOverview")}
          </h2>
          {salesChart.length > 0 ? (
            <div role="img" aria-label={t("merchant.salesOverview")}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="sales" fill="#FF9900" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-text-secondary text-sm py-12 text-center">
              {t("merchant.noSalesData")}
            </p>
          )}
        </div>
        {orderStatusData.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h2 className="font-semibold text-text mb-4">
              {t("merchant.orderStatusSummary")}
            </h2>
            <div role="img" aria-label={t("merchant.orderStatusSummary")}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {orderStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {orderStatusData.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    {d.name}
                  </div>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-border/50">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h2 className="font-semibold text-text">
              {t("merchant.recentOrders")}
            </h2>
            <Link
              to="/merchant/orders"
              className="text-sm text-accent hover:underline"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentOrders.length === 0 && (
              <p className="p-4 text-sm text-text-secondary">
                {t("merchant.noOrdersYet")}
              </p>
            )}
            {recentOrders.map((order) => (
              <div
                key={order.id || order.order_number}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-text">
                    {order.order_number || order.id}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {order.customer?.name || order.customer} •{" "}
                    {t("merchant.itemsCount", {
                      count: order.items_count || order.items || 0,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text">
                    {formatCurrency(order.total || order.amount)}
                  </p>
                  <Badge
                    variant={statusColors[order.status] || "info"}
                    size="sm"
                  >
                    {statusLabels[order.status] || order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border/50">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h2 className="font-semibold text-text">
              {t("merchant.topProducts")}
            </h2>
            <Link
              to="/merchant/products"
              className="text-sm text-accent hover:underline"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {topProducts.length === 0 && (
              <p className="p-4 text-sm text-text-secondary">
                {t("merchant.noProductsYet")}
              </p>
            )}
            {topProducts.map((product) => (
              <div key={product.id} className="p-4 flex items-center gap-3">
                {product.image || (product.images && product.images[0]) ? (
                  <img
                    src={product.image || (product.images && product.images[0])}
                    alt=""
                    loading="lazy"
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg bg-gray-100 text-text-secondary flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <Image className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("merchant.soldCount", {
                      count: product.sold || product.total_sold || 0,
                    })}{" "}
                    • {t("merchant.stockLabel", { count: product.stock ?? 0 })}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(
                    product.revenue || product.total_revenue || 0,
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
