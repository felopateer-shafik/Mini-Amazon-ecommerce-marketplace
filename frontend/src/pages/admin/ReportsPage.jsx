import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  Users,
  Package,
  Download,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";
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
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useAdminAnalytics, useAdminSettings } from "@/hooks/useApi";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function normalizeReportsTab(tab) {
  const allowed = ["sales", "inventory", "customers", "financial"];
  return allowed.includes(tab) ? tab : "sales";
}

export default function ReportsPage({ initialTab = "sales" }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(normalizeReportsTab(initialTab));
  const [dateRange, setDateRange] = useState("30days");
  const {
    data: analytics,
    isLoading,
    error,
  } = useAdminAnalytics({ range: dateRange });
  const { data: settingsRes } = useAdminSettings();

  const settings = settingsRes?.data ?? settingsRes ?? {};
  const commissionRate = useMemo(() => {
    const raw = Number(settings.commission_rate);
    if (!Number.isFinite(raw) || raw <= 0) return 0.15;
    return raw > 1 ? raw / 100 : raw;
  }, [settings]);

  useEffect(() => {
    setActiveTab(normalizeReportsTab(initialTab));
  }, [initialTab]);

  // Derive data from API response
  const raw = analytics?.data ?? analytics ?? {};
  const apiStats = raw.stats ?? {};

  const totalRevenue =
    Number(apiStats.range_revenue ?? apiStats.total_revenue) || 0;
  const totalOrders =
    Number(apiStats.range_orders ?? apiStats.total_orders) || 0;
  const totalUsers = Number(apiStats.total_users) || 0;
  const totalProducts =
    Number(apiStats.active_products ?? apiStats.total_products) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Monthly sales from revenue_by_month
  const salesData = useMemo(() => {
    const byMonth = raw.revenue_by_month ?? [];
    return byMonth.map((item) => ({
      month: MONTH_NAMES[(item.month - 1) % 12] || `M${item.month}`,
      sales: Number(item.revenue) || 0,
    }));
  }, [raw.revenue_by_month]);

  // Top products from API
  const topProducts = useMemo(() => {
    const products = raw.top_products ?? [];
    return products.map((p) => ({
      name: p.name,
      sold: p.order_items_count ?? 0,
      revenue:
        Number(p.order_items_revenue) ||
        (p.order_items_count ?? 0) * (Number(p.price) || 0),
    }));
  }, [raw.top_products]);

  const userGrowth = useMemo(() => {
    const byMonth = raw.user_growth_by_month ?? [];
    return byMonth.map((item) => ({
      month: MONTH_NAMES[(item.month - 1) % 12] || `M${item.month}`,
      users: Number(item.users) || 0,
    }));
  }, [raw.user_growth_by_month]);

  const lowStockProducts = useMemo(() => {
    const products = raw.low_stock_products ?? [];
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: Number(p.stock_quantity) || 0,
      threshold: Number(p.min_stock_level) || 0,
    }));
  }, [raw.low_stock_products]);

  // Inventory breakdown from available API totals + low-stock list
  const inventoryData = useMemo(() => {
    if (!totalProducts) return [];
    const lowStock = lowStockProducts.length;
    const inStock = Math.max(0, totalProducts - lowStock);
    return [
      { name: t("common.inStock"), value: inStock, color: "#10B981" },
      { name: t("admin.lowStock"), value: lowStock, color: "#F59E0B" },
    ];
  }, [totalProducts, lowStockProducts, t]);

  const tabs = [
    { id: "sales", label: t("admin.sales"), icon: DollarSign },
    { id: "inventory", label: t("admin.inventory"), icon: Package },
    { id: "customers", label: t("admin.customers"), icon: Users },
    { id: "financial", label: t("admin.financial"), icon: TrendingUp },
  ];

  const downloadCsv = (filename, rows) => {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "").replace(/"/g, '""');
            return `"${value}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (activeTab === "sales") {
      const rows = [[t("admin.month"), t("admin.revenue")]];
      salesData.forEach((item) => rows.push([item.month, item.sales]));
      downloadCsv(`sales-report-${dateRange}.csv`, rows);
      return;
    }

    if (activeTab === "inventory") {
      const rows = [
        [t("admin.product"), "SKU", t("admin.stock"), t("admin.minStock")],
      ];
      lowStockProducts.forEach((item) =>
        rows.push([item.name, item.sku, item.stock, item.threshold]),
      );
      downloadCsv(`inventory-report-${dateRange}.csv`, rows);
      return;
    }

    if (activeTab === "customers") {
      const rows = [[t("admin.month"), t("admin.users")]];
      userGrowth.forEach((item) => rows.push([item.month, item.users]));
      downloadCsv(`customers-report-${dateRange}.csv`, rows);
      return;
    }

    const rows = [
      [t("admin.metric"), t("admin.value")],
      [t("admin.totalRevenue"), totalRevenue],
      [t("admin.totalOrders"), totalOrders],
      [t("admin.avgOrderValue"), avgOrderValue],
      [t("admin.commissionRate"), commissionRate],
      [t("admin.totalCommission"), totalRevenue * commissionRate],
      [t("admin.vendorPayouts"), totalRevenue * (1 - commissionRate)],
    ];
    downloadCsv(`financial-report-${dateRange}.csv`, rows);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-text-secondary">
          {t("admin.loadingReports")}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <AlertCircle className="h-6 w-6 mr-2" />
        {t("admin.failedLoadReportData")}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex-wrap">
            {t("admin.reports")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.analyticsInsights")}
          </p>
        </div>
        <div className="flex gap-2 grow-1 justify-end">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            aria-label={t("common.filter")}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="7days">{t("admin.last7Days")}</option>
            <option value="30days">{t("admin.last30Days")}</option>
            <option value="90days">{t("admin.last90Days")}</option>
            <option value="year">{t("admin.thisYear")}</option>
          </select>
          <Button variant="outline" icon={Download} onClick={handleExport}>
            {t("common.export")}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border/50 flex-wrap justify-around">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-2 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-text-secondary"}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sales" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: t("admin.totalSales"),
                value: formatCurrency(totalRevenue),
              },
              {
                label: t("common.orders"),
                value: totalOrders.toLocaleString(),
              },
              {
                label: t("admin.avgOrderValue"),
                value: formatCurrency(avgOrderValue),
              },
              {
                label: t("common.products"),
                value: totalProducts.toLocaleString(),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white p-4 rounded-xl border border-border/50"
              >
                <p className="text-xs text-text-secondary">{s.label}</p>
                <p className="text-xl font-bold text-text mt-1">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h3 className="font-semibold text-text mb-4">
              {t("admin.salesTrend")}
            </h3>
            {salesData.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-12">
                {t("admin.noSalesDataAvailableYet")}
              </p>
            ) : (
              <div role="img" aria-label={t("admin.salesTrend")}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="sales" fill="#FF9900" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h3 className="font-semibold text-text mb-4">
              {t("admin.topSellingProducts")}
            </h3>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">
                  {t("admin.noProductDataAvailableYet")}
                </p>
              ) : (
                topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-text-secondary w-6">
                      #{i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">{p.name}</p>
                      <p className="text-xs text-text-secondary">
                        {t("admin.unitsSold", { count: p.sold })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-text">
                      {formatCurrency(p.revenue)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-border/50">
              <h3 className="font-semibold text-text mb-4">
                {t("admin.stockOverview")}
              </h3>
              <div role="img" aria-label={t("admin.stockOverview")}>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={inventoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {inventoryData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {inventoryData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-sm text-text">{d.name}</span>
                    </div>
                    <span className="text-sm font-medium text-text">
                      {d.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-border/50">
              <h3 className="font-semibold text-text mb-4">
                {t("admin.lowStockAlerts")}
              </h3>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">
                  {t("admin.noLowStockProductsRightNow")}
                </p>
              ) : (
                <div className="space-y-2">
                  {lowStockProducts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border border-border/50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-text">
                          {item.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {item.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-danger">
                          {t("admin.stockLeft", { count: item.stock })}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {t("admin.minStockValue", { count: item.threshold })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "customers" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: t("admin.totalCustomers"),
                value: totalUsers.toLocaleString(),
              },
              {
                label: t("admin.totalOrders"),
                value: totalOrders.toLocaleString(),
              },
              {
                label: t("admin.totalProducts"),
                value: totalProducts.toLocaleString(),
              },
              {
                label: t("admin.avgOrderValue"),
                value: formatCurrency(avgOrderValue),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white p-4 rounded-xl border border-border/50"
              >
                <p className="text-xs text-text-secondary">{s.label}</p>
                <p className="text-xl font-bold text-text mt-1">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h3 className="font-semibold text-text mb-4">
              {t("admin.userAcquisition")}
            </h3>
            {userGrowth.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-12">
                {t("admin.noUserAcquisitionDataYet")}
              </p>
            ) : (
              <div role="img" aria-label={t("admin.userAcquisition")}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="users" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "financial" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: t("admin.grossRevenue"),
                value: formatCurrency(totalRevenue),
              },
              {
                label: t("admin.totalCommission"),
                value: formatCurrency(
                  Math.round(totalRevenue * commissionRate),
                ),
              },
              {
                label: t("admin.vendorPayouts"),
                value: formatCurrency(
                  totalRevenue - Math.round(totalRevenue * commissionRate),
                ),
              },
              {
                label: t("admin.totalOrders"),
                value: totalOrders.toLocaleString(),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white p-4 rounded-xl border border-border/50"
              >
                <p className="text-xs text-text-secondary">{s.label}</p>
                <p className="text-xl font-bold text-text mt-1">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h3 className="font-semibold text-text mb-4">
              {t("admin.monthlyFinancialSummary")}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.month")}
                    </th>
                    <th className="text-right text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.revenue")}
                    </th>
                    <th className="text-right text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.commission")}
                    </th>
                    <th className="text-right text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.payouts")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {salesData.map((d) => (
                    <tr key={d.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-text">
                        {d.month}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-text">
                        {formatCurrency(d.sales)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-success">
                        {formatCurrency(d.sales * commissionRate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-text-secondary">
                        {formatCurrency(d.sales * (1 - commissionRate))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
