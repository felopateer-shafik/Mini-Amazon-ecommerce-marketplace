import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Download,
  Calendar,
  CreditCard,
  Wallet,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useMerchantEarnings, useMerchantRequestPayout } from "@/hooks/useApi";

import toast from "react-hot-toast";

export default function EarningsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("monthly");
  const [currentPage, setCurrentPage] = useState(1);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const requestPayoutMutation = useMerchantRequestPayout();

  const {
    data: earningsResponse,
    isLoading,
    isError,
  } = useMerchantEarnings({ period });

  const payload =
    earningsResponse?.data?.data ??
    earningsResponse?.data ??
    earningsResponse ??
    {};
  const totalEarnings = payload?.total_earnings ?? 0;
  const pendingEarnings = payload?.pending_earnings ?? 0;
  const paidEarnings = payload?.paid_earnings ?? 0;
  const platformCommission = payload?.platform_commission ?? 0;
  const netEarnings =
    payload?.net_earnings ?? totalEarnings - platformCommission;
  const chartDataRaw = payload?.chart_data ?? payload?.chartData ?? [];
  const chartData = Array.isArray(chartDataRaw)
    ? chartDataRaw.map((entry, index) => ({
        label:
          entry?.month ??
          entry?.label ??
          entry?.period ??
          entry?.name ??
          `P${index + 1}`,
        revenue: Number(entry?.revenue ?? entry?.total ?? entry?.earnings ?? 0),
        net: Number(entry?.net ?? entry?.net_earnings ?? entry?.profit ?? 0),
      }))
    : [];
  const payouts = payload?.payouts ?? [];
  const changePercent = payload?.change_percent ?? "";

  const exportEarnings = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Earnings", totalEarnings],
      ["Pending Earnings", pendingEarnings],
      ["Paid Earnings", paidEarnings],
      ["Net Earnings", netEarnings],
    ];

    if (Array.isArray(payouts) && payouts.length > 0) {
      rows.push([]);
      rows.push([
        "Payout ID",
        "Date",
        "Amount",
        "Method",
        "Status",
        "Reference",
      ]);
      payouts.forEach((payout) => {
        rows.push([
          payout.id || "",
          payout.date || "",
          payout.amount || 0,
          payout.method || "",
          payout.status || "",
          payout.reference || "",
        ]);
      });
    }

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `merchant-earnings-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-danger">{t("merchant.failedLoadEarnings")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("merchant.earnings")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("merchant.trackRevenueAndPayouts")}
          </p>
        </div>
        <div className="flex gap-2 grow-1 justify-end">
          <Button variant="outline" icon={Download} onClick={exportEarnings}>
            {t("merchant.export")}
          </Button>
          <Button icon={CreditCard} onClick={() => { setPayoutAmount(""); setPayoutNotes(""); setShowPayoutModal(true); }}>
            {t("merchant.requestPayout")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: t("merchant.totalRevenue"),
            value: formatCurrency(totalEarnings),
            icon: DollarSign,
            change: changePercent,
            color: "text-primary",
          },
          {
            title: t("merchant.netEarnings"),
            value: formatCurrency(netEarnings),
            icon: TrendingUp,
            change: "",
            color: "text-success",
          },
          {
            title: t("merchant.pendingPayout"),
            value: formatCurrency(pendingEarnings),
            icon: Clock,
            change: "",
            color: "text-yellow-500",
          },
          {
            title: t("merchant.paidOut"),
            value: formatCurrency(paidEarnings),
            icon: CheckCircle,
            change: "",
            color: "text-accent",
          },
        ].map((stat) => (
          <div
            key={stat.title}
            className="bg-white p-5 rounded-xl border border-border/50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-secondary">{stat.title}</span>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-text">
              {stat.value}
            </p>
            {stat.change && (
              <p className="text-xs text-success mt-1 flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" />
                {t("merchant.valueVsLastMonth", { value: stat.change })}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text">
            {t("merchant.revenueOverview")}
          </h2>
          <div className="flex gap-2 flex-wrap justify-center">
            {[
              ["weekly", t("common.weekly")],
              ["monthly", t("common.monthly")],
              ["yearly", t("common.yearly")],
            ].map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                aria-label={label}
                className={`px-3 py-1.5 text-xs rounded-lg border capitalize ${period === p ? "bg-primary text-white border-primary" : "border-border text-text-secondary"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {Array.isArray(chartData) && chartData.length > 0 ? (
          <div role="img" aria-label={t("merchant.revenueOverview")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar
                  dataKey="revenue"
                  fill="#FF9900"
                  radius={[4, 4, 0, 0]}
                  name={t("merchant.revenue")}
                />
                <Bar
                  dataKey="net"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  name={t("merchant.netEarnings")}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-sm text-text-secondary">
            {t("merchant.noRevenueData")}
          </div>
        )}
      </div>

      {/* Payouts */}
      <div className="bg-white rounded-xl border border-border/50">
        <div className="p-4 border-b border-border/50">
          <h2 className="font-semibold text-text">
            {t("merchant.payoutHistory")}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  ID
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.date")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.amount")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.method")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.status")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.reference")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-text">
                    {p.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {formatDate(p.date)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-primary">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {p.method}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={p.status === "completed" ? "success" : "warning"}
                      size="sm"
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {p.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Request Payout Modal ─── */}
      <Modal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title={t("merchant.requestPayoutTitle")}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {t("merchant.minimumPayoutNote")}
          </p>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              {t("merchant.amount")} ($)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              {t("merchant.payoutNotes")} ({t("common.optional")})
            </label>
            <textarea
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={payoutNotes}
              onChange={(e) => setPayoutNotes(e.target.value)}
              placeholder={t("merchant.payoutNotesPlaceholder")}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPayoutModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!payoutAmount || Number(payoutAmount) <= 0 || requestPayoutMutation.isPending}
              isLoading={requestPayoutMutation.isPending}
              onClick={async () => {
                try {
                  await requestPayoutMutation.mutateAsync({
                    amount: Number(payoutAmount),
                    notes: payoutNotes || undefined,
                  });
                  toast.success(t("merchant.payoutRequested"));
                  setShowPayoutModal(false);
                } catch (err) {
                  const msg = err?.response?.data?.message ?? t("merchant.payoutFailed");
                  toast.error(msg);
                }
              }}
            >
              {t("merchant.requestPayoutConfirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
