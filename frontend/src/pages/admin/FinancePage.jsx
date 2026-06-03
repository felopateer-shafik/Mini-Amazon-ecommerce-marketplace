import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Download,
  Wallet,
  CreditCard,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebounce";
import {
  useAdminAnalytics,
  useAdminOrders,
  useAdminSettings,
  useAdminWallets,
  useAdminWalletTransactions,
  useAdminWalletTopUp,
} from "@/hooks/useApi";
import toast from "react-hot-toast";
import { usePermission } from "@/hooks/usePermission";

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

const orderStatusColors = {
  pending: "warning",
  processing: "info",
  shipped: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
  refunded: "danger",
};

export default function FinancePage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canViewFinance = hasPerm("view-finance");
  const canViewDashboard = hasPerm("view-dashboard");
  const canViewOrders = hasPerm("view-orders");
  const canManageWallets = hasPerm("manage-wallets");
  const canExport = hasPerm("export-finance");
  const tf = (key, fallback, params) => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const location = useLocation();
  const [period, setPeriod] = useState("monthly");
  const [currentPage, setCurrentPage] = useState(1);
  const [walletSearch, setWalletSearch] = useState("");
  const [walletTransactionsSearch, setWalletTransactionsSearch] = useState("");
  const perPage = 8;
  const debouncedWalletSearch = useDebouncedValue(walletSearch, 400);
  const debouncedWalletTransactionsSearch = useDebouncedValue(
    walletTransactionsSearch,
    400,
  );

  const range = useMemo(() => {
    if (period === "weekly") return "7days";
    if (period === "yearly") return "year";
    return "30days";
  }, [period]);

  const isWalletRoute = location.pathname.includes("/admin/wallets");
  const isTransactionsRoute = location.pathname.includes("/admin/transactions");

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useAdminAnalytics(
    { range },
    { enabled: canViewFinance && canViewDashboard },
  );
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
  } = useAdminOrders(
    { per_page: 50 },
    { enabled: canViewFinance && canViewOrders },
  );
  const { data: settingsRes } = useAdminSettings();
  const {
    data: walletsRes,
    isLoading: walletsLoading,
    error: walletsError,
  } = useAdminWallets(
    {
      per_page: 50,
      search: debouncedWalletSearch || undefined,
    },
    { enabled: canViewFinance },
  );
  const {
    data: walletTransactionsRes,
    isLoading: walletTransactionsLoading,
    error: walletTransactionsError,
  } = useAdminWalletTransactions(
    {
      per_page: 50,
      search: debouncedWalletTransactionsSearch || undefined,
    },
    { enabled: canViewFinance },
  );
  const walletTopUpMutation = useAdminWalletTopUp();

  const settings = settingsRes?.data ?? settingsRes ?? {};
  const commissionRate = useMemo(() => {
    const raw = Number(settings.commission_rate);
    if (!Number.isFinite(raw) || raw <= 0) return 0.15;
    return raw > 1 ? raw / 100 : raw;
  }, [settings]);

  const isLoading =
    analyticsLoading ||
    ordersLoading ||
    (isWalletRoute && walletsLoading) ||
    (isTransactionsRoute && walletTransactionsLoading);
  const error =
    analyticsError ||
    ordersError ||
    (isWalletRoute ? walletsError : null) ||
    (isTransactionsRoute ? walletTransactionsError : null);
  const orderStatusLabel = {
    pending: t("admin.statusPending"),
    processing: t("admin.statusProcessing"),
    shipped: t("admin.statusShipped"),
    delivered: t("admin.statusDelivered"),
    completed: t("admin.statusCompleted"),
    cancelled: t("admin.statusCancelled"),
    refunded: t("admin.statusRefunded"),
  };

  // Derive revenue chart data from API revenue_by_month
  const revenueData = useMemo(() => {
    const raw =
      analytics?.data?.revenue_by_month ?? analytics?.revenue_by_month ?? [];
    return raw.map((item) => {
      const rev = Number(item.revenue) || 0;
      const commission = Math.round(rev * commissionRate);
      return {
        month: MONTH_NAMES[(item.month - 1) % 12] || `M${item.month}`,
        revenue: rev,
        commission,
        payouts: rev - commission,
      };
    });
  }, [analytics, commissionRate]);

  // Derive summary stats from API
  const stats = analytics?.data?.stats ?? analytics?.stats ?? {};
  const totalRevenue = Number(stats.total_revenue) || 0;
  const totalCommissions = Math.round(totalRevenue * commissionRate);
  const totalPayouts = totalRevenue - totalCommissions;
  const totalOrders = Number(stats.total_orders) || ordersData?.total || 0;

  const wallets = useMemo(() => walletsRes?.data ?? [], [walletsRes]);
  const walletTransactions = useMemo(
    () => walletTransactionsRes?.data ?? [],
    [walletTransactionsRes],
  );
  const totalWalletBalance = useMemo(
    () =>
      wallets.reduce((sum, wallet) => sum + (Number(wallet.balance) || 0), 0),
    [wallets],
  );
  const totalWalletBalanceValue =
    Number(stats.total_wallet_balance) || totalWalletBalance;
  const walletAccountsCount =
    Number(stats.wallet_accounts_count) || wallets.length;

  // Use real orders for the table
  const orders = useMemo(() => {
    const raw = ordersData?.data ?? ordersData ?? [];
    return (Array.isArray(raw) ? raw : (raw?.data ?? [])).map((o) => ({
      id: o.id,
      merchant: o.user?.name ?? o.vendor?.name ?? `Order #${o.id}`,
      amount: Number(o.total) || 0,
      method:
        o.payment?.method ??
        o.payment_method ??
        tf("common.notAvailable", "N/A"),
      requestedAt: o.created_at,
      status: o.status ?? "pending",
    }));
  }, [ordersData, tf]);

  const paginated = orders.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );
  const totalPages = Math.ceil(orders.length / perPage);

  const exportFinancialReport = () => {
    const rows = [
      [t("admin.metric"), t("admin.value")],
      [t("admin.totalRevenue"), totalRevenue],
      [t("admin.totalCommissions"), totalCommissions],
      [t("admin.totalPayouts"), totalPayouts],
      [t("admin.totalOrders"), totalOrders],
      [],
      [
        t("admin.month"),
        t("admin.revenue"),
        t("admin.commissions"),
        t("admin.payouts"),
      ],
      ...revenueData.map((d) => [d.month, d.revenue, d.commission, d.payouts]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `financial-report-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTopUp = async (walletUser) => {
    const amountRaw = window.prompt(
      t("admin.enterTopUpAmount") || "Enter top-up amount",
      "0",
    );
    if (!amountRaw) return;

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("admin.invalidAmount") || "Invalid amount");
      return;
    }

    const note =
      window.prompt(
        t("admin.optionalTopUpNote") || "Optional note",
        t("admin.walletTopUpByAdmin") || "Admin wallet top-up",
      ) || "";

    try {
      await walletTopUpMutation.mutateAsync({
        user_id: walletUser.user_id,
        amount,
        description: note,
      });
      toast.success(
        t("admin.walletTopUpSuccess") || "Wallet topped up successfully",
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("admin.walletTopUpFailed") ||
          "Failed to top up wallet",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-text-secondary">
          {t("admin.loadingFinanceData")}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <AlertCircle className="h-6 w-6 mr-2" />
        {tf("admin.failedLoadFinanceData", "Failed to load finance data")}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {tf("admin.finance", "Finance")}
          </h1>
          <p className="text-sm text-text-secondary">
            {tf(
              "admin.revenueOverviewMerchantPayouts",
              "Revenue overview and merchant payouts",
            )}
          </p>
        </div>
        {canExport && (
          <Button
            variant="outline"
            icon={Download}
            onClick={exportFinancialReport}
          >
            {tf("admin.financialReport", "Financial Report")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: tf("admin.totalSales", "Total Sales"),
            value: formatCurrency(totalRevenue),
            icon: DollarSign,
            change: tf("admin.ordersCount", `${totalOrders} orders`, {
              count: totalOrders,
            }),
            color: "text-primary bg-primary/10",
          },
          {
            label: tf("admin.commissions", "Commissions"),
            value: formatCurrency(totalCommissions),
            icon: TrendingUp,
            change: tf(
              "admin.ratePercent",
              `${(commissionRate * 100).toFixed(0)}% rate`,
              {
                count: (commissionRate * 100).toFixed(0),
              },
            ),
            color: "text-success bg-green-100",
          },
          {
            label: tf("admin.payouts", "Payouts"),
            value: formatCurrency(totalPayouts),
            icon: CreditCard,
            change: isWalletRoute
              ? tf("admin.walletBalance", "Wallet balance")
              : tf("admin.transactionsCount", `${orders.length} transactions`, {
                  count: orders.length,
                }),
            color: "text-accent bg-blue-100",
          },
          {
            label: isWalletRoute
              ? tf("admin.totalWalletBalance", "Total Wallet Balance")
              : tf("admin.refundsAmount", "Refunds Amount"),
            value: isWalletRoute
              ? formatCurrency(totalWalletBalanceValue)
              : formatCurrency(
                  orders
                    .filter((o) => o.status === "refunded")
                    .reduce((s, o) => s + o.amount, 0),
                ),
            icon: Wallet,
            change: isWalletRoute
              ? tf(
                  "admin.walletAccountsCount",
                  `${walletAccountsCount} accounts`,
                  { count: walletAccountsCount },
                )
              : tf(
                  "admin.refundedCount",
                  `${orders.filter((o) => o.status === "refunded").length} refunded`,
                  {
                    count: orders.filter((o) => o.status === "refunded").length,
                  },
                ),
            color: "text-yellow-600 bg-yellow-100",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white p-4 rounded-xl border border-border/50 flex flex-column align-center"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-xs text-text-secondary width-max-content">
              {s.label}
            </p>
            <p className="text-xl font-bold text-text mt-0.5">{s.value}</p>
            <p className="text-xs text-success flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="h-3 w-3" />
              {s.change}
            </p>
          </div>
        ))}
      </div>

      {isWalletRoute && (
        <div className="bg-white rounded-xl border border-border/50">
          <div className="p-4 border-b border-border/50 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-text">
              {tf("admin.walletAccounts", "Wallet Accounts")}
            </h2>
            <input
              value={walletSearch}
              onChange={(e) => setWalletSearch(e.target.value)}
              placeholder={tf("admin.searchUsers", "Search users")}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border/50">
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {tf("common.user", "User")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {tf("common.role", "Role")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {tf("admin.balance", "Balance")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {tf("admin.totalEarned", "Total Earned")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {tf("common.actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {wallets.map((wallet) => (
                  <tr key={wallet.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-text">
                      <div className="font-medium">{wallet.name}</div>
                      <div className="text-xs text-text-secondary">
                        {wallet.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary capitalize">
                      {wallet.role || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {formatCurrency(wallet.balance)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatCurrency(wallet.total_earned)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {canManageWallets && (
                        <Button
                          size="sm"
                          onClick={() => handleTopUp(wallet)}
                          loading={walletTopUpMutation.isPending}
                        >
                          {tf("admin.addFunds", "Add Funds")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {wallets.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-text-secondary"
                    >
                      {tf("admin.noWalletAccounts", "No wallet accounts found")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isTransactionsRoute && (
        <div className="bg-white rounded-xl border border-border/50">
          <div className="p-4 border-b border-border/50 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-text">
              {tf("admin.walletTransactions", "Wallet Transactions")}
            </h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                value={walletTransactionsSearch}
                onChange={(e) => setWalletTransactionsSearch(e.target.value)}
                placeholder={tf("admin.searchUsers", "Search users")}
                className="w-full ps-9 pe-3 py-2 text-sm border border-border rounded-lg bg-white"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-border/50">
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {tf("common.user", "User")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {tf("common.type", "Type")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {tf("common.amount", "Amount")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                    {tf("admin.balance", "Balance")}
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 width-8rem">
                    {tf("common.date", "Date")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {walletTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-text">
                      {tx.user_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {tx.type}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatCurrency(tx.balance_after)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatDate(tx.created_at)}
                    </td>
                  </tr>
                ))}
                {walletTransactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-text-secondary"
                    >
                      {tf("admin.noTransactionsFound", "No transactions found")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-border/50">
        <div className="flex items-center justify-between mb-4 flex-wrap">
          <h2 className="font-semibold text-text">
            {tf("admin.revenueCommissions", "Revenue & Commissions")}
          </h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {["weekly", "monthly", "yearly"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`px-3 py-1.5 text-xs rounded-md capitalize transition ${period === p ? "bg-white text-text shadow-sm" : "text-text-secondary"}`}
              >
                {tf(`admin.${p}`, p)}
              </button>
            ))}
          </div>
        </div>
        <div
          role="img"
          aria-label={tf("admin.revenueCommissions", "Revenue & Commissions")}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar
                dataKey="revenue"
                fill="#FF9900"
                radius={[4, 4, 0, 0]}
                name={tf("admin.revenue", "Revenue")}
              />
              <Bar
                dataKey="commission"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                name={tf("admin.commission", "Commission")}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="font-semibold text-text">
            {tf("admin.recentOrders", "Recent Orders")}
          </h2>
          <span className="text-xs text-text-secondary">
            {tf("admin.totalCount", `${orders.length} total`, {
              count: orders.length,
            })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("admin.merchant", "Merchant")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("common.amount", "Amount")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("common.type", "Type")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("common.date", "Date")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("common.status", "Status")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("common.actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-text">
                    {p.merchant}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {p.method}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {formatDate(p.requestedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={orderStatusColors[p.status] ?? "info"}
                      size="sm"
                      className="capitalize"
                    >
                      {orderStatusLabel[p.status] || p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    #{p.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
