import { useState } from "react";
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CreditCard,
  Gift,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useWallet,
  useWalletTransactions,
  useTopUpWallet,
} from "@/hooks/useApi";
import toast from "react-hot-toast";

export default function WalletPage() {
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();
  const perPage = 8;

  // Fetch wallet & transactions from API
  const { data: walletResponse, isLoading: walletLoading } = useWallet();
  const { data: txResponse, isLoading: txLoading } = useWalletTransactions();
  const topUpMutation = useTopUpWallet();

  const walletData = walletResponse?.data ?? walletResponse;
  const topUpEnabled = walletResponse?.settings?.wallet_topup_enabled === true;
  const balance = walletData?.balance ? parseFloat(walletData.balance) : 0;
  const pendingBalance = walletData?.pending_balance
    ? parseFloat(walletData.pending_balance)
    : 0;
  const cashbackEarned = walletData?.cashback_earned
    ? parseFloat(walletData.cashback_earned)
    : 0;

  const transactions = (txResponse?.data ?? txResponse ?? []).map((txn) => ({
    id: txn.id,
    type: txn.type,
    amount: parseFloat(txn.amount),
    description: txn.description ?? "",
    date: txn.created_at ?? txn.date,
    status: txn.status ?? "completed",
    reference: txn.reference ?? `TXN-${txn.id}`,
    balance_after:
      txn.balance_after != null ? parseFloat(txn.balance_after) : null,
  }));

  const isExpenseTransaction = (txn) => {
    const type = String(txn?.type || "").toLowerCase();
    if ((txn?.amount ?? 0) < 0) return true;
    return (
      type.includes("debit") ||
      type.includes("purchase") ||
      type.includes("withdraw") ||
      type.includes("spend") ||
      type.includes("refund_reversal")
    );
  };

  const paginated = transactions.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );
  const totalPages = Math.ceil(transactions.length / perPage);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!topUpEnabled) {
      toast.error(t("walletPage.topUpDisabled"));
      return;
    }
    if (!topUpAmount || amount <= 0)
      return toast.error(t("walletPage.enterValidAmount"));
    try {
      await topUpMutation.mutateAsync({ amount });
      toast.success(
        t("walletPage.amountAdded", {
          amount: formatCurrency(amount),
        }),
      );
      setShowTopUp(false);
      setTopUpAmount("");
    } catch {
      toast.error(
        t("walletPage.topUpFailed") || "Top-up failed. Please try again.",
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("account.myAccount"), href: "/account" },
          { label: t("walletPage.myWallet") },
        ]}
      />
      <h1 className="text-xl sm:text-2xl font-bold text-text mt-4 mb-6">
        {t("walletPage.myWallet")}
      </h1>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-primary to-amber-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <Wallet className="h-8 w-8 opacity-80" />
            <Badge variant="success" className="!bg-white/20 !text-white">
              {t("walletPage.active")}
            </Badge>
          </div>
          <p className="text-sm opacity-80">
            {t("walletPage.availableBalance")}
          </p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(balance)}</p>
          <Button
            onClick={() => setShowTopUp(true)}
            className="mt-4 !bg-white !text-primary hover:!bg-gray-100"
            size="sm"
            icon={Plus}
            disabled={!topUpEnabled}
          >
            {t("walletPage.topUp")}
          </Button>
          {!topUpEnabled && (
            <p className="text-[11px] mt-2 opacity-90">
              {t("walletPage.topUpDisabledNote")}
            </p>
          )}
        </div>
        <div className="bg-white p-6 rounded-xl border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">
                {t("walletPage.pending")}
              </p>
              <p className="text-xl font-bold text-text">
                {formatCurrency(pendingBalance)}
              </p>
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            {t("walletPage.fromRefunds")}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Gift className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">
                {t("walletPage.cashbackEarned")}
              </p>
              <p className="text-xl font-bold text-text">
                {formatCurrency(cashbackEarned)}
              </p>
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            {t("walletPage.totalCashback")}
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-border/50">
        <div className="p-4 border-b border-border/50 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-text">
            {t("walletPage.transactionHistory")}
          </h2>
        </div>
        <div className="divide-y divide-border/50">
          {walletLoading || txLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-text-secondary text-sm">
              {t("walletPage.noTransactions") || "No transactions found."}
            </div>
          ) : (
            paginated.map((txn) => (
              <div
                key={txn.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                {(() => {
                  const isExpense = isExpenseTransaction(txn);
                  const absAmount = Math.abs(Number(txn.amount || 0));
                  const description =
                    txn.description?.trim() ||
                    (isExpense
                      ? t("walletPage.purchase") || "Order purchase"
                      : t("walletPage.refund") || "Refund");

                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${isExpense ? "bg-red-100" : "bg-green-100"}`}
                        >
                          {isExpense ? (
                            <ArrowUpRight className="h-5 w-5 text-red-600" />
                          ) : (
                            <ArrowDownLeft className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text">
                            {description}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {formatDate(txn.date)} • {txn.reference}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${isExpense ? "text-danger" : "text-success"}`}
                        >
                          {isExpense ? "-" : "+"}
                          {formatCurrency(absAmount)}
                        </p>
                        {txn.balance_after != null && (
                          <p className="text-xs text-text-secondary">
                            {t("walletPage.balanceAfter") || "Bal:"}{" "}
                            {formatCurrency(txn.balance_after)}
                          </p>
                        )}
                        <Badge
                          variant={
                            txn.status === "completed" ? "success" : "warning"
                          }
                          size="sm"
                        >
                          {txn.status}
                        </Badge>
                      </div>
                    </>
                  );
                })()}
              </div>
            ))
          )}
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

      {/* Top Up Modal */}
      <Modal
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
        title={t("walletPage.topUpWallet")}
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[10, 25, 50, 100, 200, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setTopUpAmount(String(amt))}
                className={`py-2 rounded-lg border text-sm font-medium transition ${topUpAmount === String(amt) ? "border-primary bg-primary/10 text-primary" : "border-border text-text hover:border-primary"}`}
              >
                {formatCurrency(amt)}
              </button>
            ))}
          </div>
          <Input
            label={t("walletPage.enterCustomAmount")}
            type="number"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            placeholder="0.00"
            icon={CreditCard}
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowTopUp(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={handleTopUp}
              disabled={topUpMutation.isPending}
            >
              {topUpMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("walletPage.addAmount", {
                  amount: topUpAmount
                    ? formatCurrency(parseFloat(topUpAmount) || 0)
                    : formatCurrency(0),
                })
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
