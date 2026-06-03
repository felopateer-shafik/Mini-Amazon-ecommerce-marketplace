import {
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Store,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import Badge from "@/components/ui/Badge";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useAdminAnalytics } from "@/hooks/useApi";

const PIE_COLORS = ["#FF9900", "#3B82F6", "#10B981", "#8B5CF6", "#6B7280"];

const statusColors = {
  pending: "warning",
  processing: "info",
  shipped: "info",
  delivered: "success",
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: analytics, isLoading, isError } = useAdminAnalytics();
  const statusLabels = {
    pending: t("admin.statusPending"),
    processing: t("admin.statusProcessing"),
    shipped: t("admin.statusShipped"),
    delivered: t("admin.statusDelivered"),
    cancelled: t("admin.statusCancelled"),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-danger">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm font-medium">{t("admin.failedLoadDashboard")}</p>
      </div>
    );
  }

  const data = analytics?.data ?? analytics ?? {};
  const statsData = data?.stats ?? data;

  const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const normalizedRevenueData = Array.isArray(data.sales_chart)
    ? data.sales_chart
    : Array.isArray(data.revenue_by_month)
      ? data.revenue_by_month.map((entry) => {
          const monthNumber = toNumber(entry.month);
          const monthLabel =
            monthNumber >= 1 && monthNumber <= 12
              ? new Date(2000, monthNumber - 1, 1).toLocaleString("en-US", {
                  month: "short",
                })
              : String(entry.month ?? "");

          return {
            month: monthLabel,
            revenue: toNumber(entry.revenue),
          };
        })
      : [];

  const recentOrdersRaw = Array.isArray(data.recent_orders)
    ? data.recent_orders
    : [];

  const derivedOrderStatus = recentOrdersRaw.reduce((acc, order) => {
    const key = String(order?.status || "pending").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const derivedStatusTotal = Object.values(derivedOrderStatus).reduce(
    (sum, value) => sum + toNumber(value),
    0,
  );

  const normalizedOrderStatusData = Array.isArray(data.order_status)
    ? data.order_status
    : Object.entries(derivedOrderStatus).map(([name, count]) => ({
        name,
        value: derivedStatusTotal
          ? Math.round((toNumber(count) / derivedStatusTotal) * 100)
          : 0,
      }));

  const computedConversionRate =
    statsData.conversion_rate ??
    (toNumber(statsData.total_users) > 0
      ? (
          (toNumber(statsData.total_orders) / toNumber(statsData.total_users)) *
          100
        ).toFixed(1)
      : 0);

  const stats = [
    {
      title: t("admin.totalRevenue"),
      value: formatCurrency(toNumber(statsData.total_revenue)),
      change: statsData.revenue_change
        ? `${statsData.revenue_change > 0 ? "+" : ""}${statsData.revenue_change}%`
        : "—",
      up: (statsData.revenue_change ?? 0) >= 0,
      icon: DollarSign,
      color: "bg-primary/10 text-primary",
    },
    {
      title: t("admin.totalOrders"),
      value: toNumber(statsData.total_orders).toLocaleString(),
      change: statsData.orders_change
        ? `${statsData.orders_change > 0 ? "+" : ""}${statsData.orders_change}%`
        : "—",
      up: (statsData.orders_change ?? 0) >= 0,
      icon: ShoppingCart,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: t("admin.totalUsers"),
      value: toNumber(statsData.total_users).toLocaleString(),
      change: statsData.users_change
        ? `${statsData.users_change > 0 ? "+" : ""}${statsData.users_change}%`
        : "—",
      up: (statsData.users_change ?? 0) >= 0,
      icon: Users,
      color: "bg-green-100 text-green-600",
    },
    {
      title: t("admin.activeMerchants"),
      value: toNumber(
        statsData.active_merchants ?? statsData.active_vendors,
      ).toLocaleString(),
      change: statsData.merchants_change
        ? `${statsData.merchants_change > 0 ? "+" : ""}${statsData.merchants_change}%`
        : "—",
      up: (statsData.merchants_change ?? 0) >= 0,
      icon: Store,
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: t("merchant.totalProducts"),
      value: toNumber(
        statsData.active_products ?? statsData.total_products,
      ).toLocaleString(),
      change: statsData.products_change
        ? `${statsData.products_change > 0 ? "+" : ""}${statsData.products_change}%`
        : "—",
      up: (statsData.products_change ?? 0) >= 0,
      icon: Package,
      color: "bg-pink-100 text-pink-600",
    },
    {
      title: t("admin.conversionRate"),
      value: `${computedConversionRate}%`,
      change: statsData.conversion_change
        ? `${statsData.conversion_change > 0 ? "+" : ""}${statsData.conversion_change}%`
        : "—",
      up: (statsData.conversion_change ?? 0) >= 0,
      icon: TrendingUp,
      color: "bg-yellow-100 text-yellow-600",
    },
  ];

  const revenueData = normalizedRevenueData;
  const categoryData = normalizedOrderStatusData.map((d, i) => ({
    ...d,
    name: statusLabels[d.name] || d.name,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const recentOrders = recentOrdersRaw.map((order) => ({
    ...order,
    customer:
      order.customer ??
      order.customer_name ??
      order.user?.name ??
      order.shipping_address?.name ??
      "—",
    merchant:
      order.merchant ??
      order.merchant_name ??
      order.items?.[0]?.product?.vendor?.store_name ??
      order.items?.[0]?.product?.vendor?.business_name ??
      "—",
    amount: toNumber(order.amount ?? order.total),
  }));

  const alerts =
    Array.isArray(data.alerts) && data.alerts.length > 0 ? data.alerts : [];
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {t("admin.dashboard")}
        </h1>
        <p className="text-sm text-text-secondary">
          {t("admin.platformOverview")}
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 rounded-lg border ${alert.type === "danger" ? "bg-red-50 border-red-200" : alert.type === "warning" ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200"}`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-4 w-4 ${alert.type === "danger" ? "text-danger" : alert.type === "warning" ? "text-yellow-600" : "text-accent"}`}
                />
                <span className="text-sm text-text">{alert.message}</span>
              </div>
              <Link
                to={alert.actionLink || "/admin/orders"}
                className="text-sm text-accent hover:underline font-medium"
              >
                {alert.action || t("admin.viewDetails")}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="flex flex-column justify-center text-center align-center bg-white p-4 rounded-xl border border-border/50"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-xs text-text-secondary">{stat.title}</p>
            <p className="text-lg sm:text-xl font-bold text-text mt-0.5">
              {stat.value}
            </p>
            <div className="flex items-center gap-0.5 mt-1 text-xs">
              {stat.up ? (
                <ArrowUpRight className="h-3 w-3 text-success" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-danger" />
              )}
              <span className={stat.up ? "text-success" : "text-danger"}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-xl border border-border/50">
          <h2 className="font-semibold text-text mb-4">
            {t("admin.revenueTrend")}
          </h2>
          {revenueData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-text-secondary">
              {t("admin.noDataYet")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF9900" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF9900" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF9900"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white p-3 sm:p-6 rounded-xl border border-border/50">
          <h2 className="font-semibold text-text mb-4">
            {t("admin.salesByCategory")}
          </h2>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-text-secondary">
              {t("admin.noDataYet")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {categoryData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          {categoryData.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {categoryData.map((d) => (
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
                  <span className="font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-border/50">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="font-semibold text-text">
            {t("merchant.recentOrders")}
          </h2>
          <Link
            to="/admin/orders"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.orderId")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.customer")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.merchant")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.amount")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-text-secondary"
                  >
                    {t("admin.noRecentOrders")}
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-accent">
                      {order.id ?? order.order_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      {order.customer ?? order.customer_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {order.merchant ?? order.merchant_name}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {formatCurrency(order.amount ?? order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[order.status]} size="sm">
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
