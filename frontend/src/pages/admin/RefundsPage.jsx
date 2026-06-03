import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminRefunds,
  useAdminApproveRefund,
  useAdminRejectRefund,
} from "@/hooks/useApi";
import {
  Search,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebounce";
import toast from "react-hot-toast";
import { usePermission } from "@/hooks/usePermission";

const statusColors = {
  pending: "warning",
  requested: "warning",
  approved: "success",
  rejected: "danger",
};

export default function RefundsPage({ initialView = "requests" }) {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canProcess = hasPerm("process-refunds");
  const canExport = hasPerm("export-refunds");
  const tf = (key, fallback, params) => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewRefund, setViewRefund] = useState(null);
  const [decisionModal, setDecisionModal] = useState(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const debouncedSearch = useDebouncedValue(search, 300);

  const params = {
    page: currentPage,
    per_page: perPage,
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isLoading } = useAdminRefunds(params);
  const approveMutation = useAdminApproveRefund();
  const rejectMutation = useAdminRejectRefund();
  const isSettingsView = initialView === "settings";

  const raw = data ?? {};
  const meta = raw?.meta ?? {};
  const refunds = raw?.data ?? [];
  const totalPages = meta?.last_page ?? raw?.last_page ?? 1;
  const totalCount = meta?.total ?? raw?.total ?? refunds.length;
  const pendingCount =
    meta?.pending_count ??
    refunds.filter((r) => ["pending", "requested"].includes(r.status)).length;
  const approvedCount =
    meta?.approved_count ??
    refunds.filter((r) => r.status === "approved").length;
  const rejectedCount =
    meta?.rejected_count ??
    refunds.filter((r) => r.status === "rejected").length;
  const statusLabel = {
    all: tf("common.all", "All"),
    pending: tf("admin.statusPending", "Pending"),
    requested: tf("admin.statusPending", "Pending"),
    approved: tf("admin.statusApproved", "Approved"),
    rejected: tf("admin.statusRejected", "Rejected"),
  };

  const handleApprove = async (id, note) => {
    if (!String(note || "").trim()) {
      toast.error(
        tf("admin.refundDecisionReasonRequired", "Reason is required"),
      );
      return;
    }

    try {
      await approveMutation.mutateAsync({
        id,
        data: { admin_notes: note.trim() },
      });
      toast.success(t("admin.refundApproved"));
      setDecisionModal(null);
      setDecisionReason("");
      setViewRefund(null);
    } catch {
      toast.error(t("admin.failedApproveRefund"));
    }
  };

  const handleReject = async (id, note) => {
    if (!String(note || "").trim()) {
      toast.error(
        tf("admin.refundDecisionReasonRequired", "Reason is required"),
      );
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        id,
        data: { admin_notes: note.trim() },
      });
      toast.success(t("admin.refundRejected"));
      setDecisionModal(null);
      setDecisionReason("");
      setViewRefund(null);
    } catch {
      toast.error(t("admin.failedRejectRefund"));
    }
  };

  const openDecisionModal = (refund, action) => {
    setDecisionModal({ refund, action });
    setDecisionReason("");
  };

  const confirmDecision = async () => {
    if (!decisionModal?.refund?.id || !decisionModal?.action) return;

    if (decisionModal.action === "approve") {
      await handleApprove(decisionModal.refund.id, decisionReason);
      return;
    }

    await handleReject(decisionModal.refund.id, decisionReason);
  };

  const exportRefunds = () => {
    if (!refunds.length) {
      toast.error(t("admin.noRefundsToExport"));
      return;
    }

    const rows = [
      [
        "Refund ID",
        "Order ID",
        "Customer",
        "Amount",
        "Reason Type",
        "Reason Details",
        "Status",
        "Requested At",
      ],
      ...refunds.map((refund) => [
        refund.id,
        refund.order?.order_number || "",
        `"${(refund.user?.name || "").replace(/"/g, '""')}"`,
        refund.amount ?? 0,
        `"${(refund.reason || "").replace(/"/g, '""')}"`,
        `"${(refund.reason_description || "").replace(/"/g, '""')}"`,
        refund.status || "",
        refund.created_at || "",
      ]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `refunds-${new Date().toISOString().slice(0, 10)}.csv`,
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

  if (isSettingsView) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {tf("admin.refundsSettings", "Refunds Settings")}
          </h1>
          <p className="text-sm text-text-secondary">
            {tf(
              "admin.refundsSettingsHint",
              "Manage refund policy and workflow from the admin settings.",
            )}
          </p>
        </div>
        <div className="bg-white border border-border/50 rounded-xl p-6 space-y-3">
          <p className="text-sm text-text-secondary">
            {tf(
              "admin.refundsSettingsRedirectNote",
              "Use Global Settings to configure refund options.",
            )}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/admin/refunds")}>
              {tf("admin.backToRefundRequests", "Back to Refund Requests")}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/settings")}
            >
              {tf("admin.openGlobalSettings", "Open Global Settings")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {tf("admin.refunds", "Refunds")}
          </h1>
          <p className="text-sm text-text-secondary">
            {tf("admin.refundRequestsCount", `${totalCount} refund requests`, {
              count: totalCount,
            })}
          </p>
        </div>
        {canExport && (
          <Button variant="outline" icon={Download} onClick={exportRefunds}>
            {tf("common.export", "Export")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: tf("admin.statusPending", "Pending"),
            value: pendingCount,
            icon: Clock,
            color: "text-yellow-500 bg-yellow-100",
          },
          {
            label: tf("admin.statusApproved", "Approved"),
            value: approvedCount,
            icon: CheckCircle,
            color: "text-success bg-green-100",
          },
          {
            label: tf("admin.statusRejected", "Rejected"),
            value: rejectedCount,
            icon: XCircle,
            color: "text-danger bg-red-100",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white p-4 rounded-xl border border-border/50 flex flex-wrap items-center text-center justify-around gap-3"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-text">{s.value}</p>
              <p className="text-xs text-text-secondary">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 flex-wrap grow-1">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-sm rounded-lg border capitalize transition ${statusFilter === s ? "bg-primary text-white border-primary" : "border-border text-text-secondary bg-white"}`}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            placeholder={tf("admin.searchRefunds", "Search refunds")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="ps-9 pe-4 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 width-18rem"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("admin.refundId", "Refund ID")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("admin.orderId", "Order ID")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("admin.customer", "Customer")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("admin.refundAmount", "Refund Amount")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("admin.reason", "Reason")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {tf("admin.refundStatus", "Refund Status")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                  {tf("common.actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {refunds.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm font-medium text-accent">
                    #{r.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-accent">
                    {r.order?.order_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text">
                    {r.user?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text">
                    {formatCurrency(r.refund_amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 rounded capitalize mb-0.5">
                      {r.reason}
                    </span>
                    {r.reason_description && (
                      <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
                        {r.reason_description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={statusColors[r.status]}
                      size="sm"
                      className="capitalize"
                    >
                      {statusLabel[r.status] || r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 width-max-content">
                      <button
                        className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                        onClick={() => {
                          setViewRefund(r);
                        }}
                        aria-label={t("admin.view")}
                      >
                        <Eye className="h-4 w-4 text-text-secondary" />
                      </button>
                      {canProcess &&
                        ["pending", "requested"].includes(r.status) && (
                          <>
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              disabled={approveMutation.isPending}
                              onClick={() => openDecisionModal(r, "approve")}
                              aria-label={t("admin.approveRefund")}
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </button>
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              disabled={rejectMutation.isPending}
                              onClick={() => openDecisionModal(r, "reject")}
                              aria-label={t("admin.rejectRefund")}
                            >
                              <XCircle className="h-4 w-4 text-danger" />
                            </button>
                          </>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-text-secondary"
                  >
                    {tf(
                      "admin.noRefundRequestsFound",
                      "No refund requests found",
                    )}
                  </td>
                </tr>
              )}
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

      <Modal
        isOpen={!!viewRefund}
        onClose={() => {
          setViewRefund(null);
        }}
        title={tf(
          "admin.refundDetailsTitle",
          `Refund #${viewRefund?.id ?? ""}`,
          { id: viewRefund?.id ?? "" },
        )}
      >
        {viewRefund && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {tf("admin.orderId", "Order ID")}
                </p>
                <p className="text-sm font-medium text-accent">
                  {viewRefund.order?.order_number ?? "—"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {tf("admin.customer", "Customer")}
                </p>
                <p className="text-sm font-medium">
                  {viewRefund.user?.name ?? "—"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {tf("common.amount", "Amount")}
                </p>
                <p className="text-sm font-medium">
                  {formatCurrency(viewRefund.refund_amount)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {tf("admin.requested", "Requested")}
                </p>
                <p className="text-sm font-medium">
                  {formatDate(viewRefund.created_at)}
                </p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary mb-1">
                {tf("admin.reasonType", "Reason Type")}
              </p>
              <p className="text-sm capitalize">{viewRefund.reason}</p>
            </div>
            {viewRefund.reason_description && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary mb-1">
                  {tf("admin.reasonDescription", "Reason Details")}
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {viewRefund.reason_description}
                </p>
              </div>
            )}
            {viewRefund.admin_notes ? (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary mb-1">
                  {tf("admin.refundAdminNote", "Admin Note")}
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {viewRefund.admin_notes}
                </p>
              </div>
            ) : null}

            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setViewRefund(null);
                }}
              >
                {tf("common.close", "Close")}
              </Button>
              {canProcess &&
                ["pending", "requested"].includes(viewRefund.status) && (
                  <>
                    <Button
                      fullWidth
                      variant="outline"
                      onClick={() => openDecisionModal(viewRefund, "reject")}
                      disabled={
                        approveMutation.isPending || rejectMutation.isPending
                      }
                    >
                      {tf("admin.rejectRefund", "Reject")}
                    </Button>
                    <Button
                      fullWidth
                      onClick={() => openDecisionModal(viewRefund, "approve")}
                      disabled={
                        approveMutation.isPending || rejectMutation.isPending
                      }
                    >
                      {tf("admin.approveRefund", "Approve")}
                    </Button>
                  </>
                )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!decisionModal}
        onClose={() => {
          setDecisionModal(null);
          setDecisionReason("");
        }}
        title={
          decisionModal?.action === "approve"
            ? tf("admin.confirmApproveRefundTitle", "Confirm Approval")
            : tf("admin.confirmRejectRefundTitle", "Confirm Rejection")
        }
        size="sm"
      >
        <div className="space-y-4">
          <div
            className={`rounded-lg border p-3 ${decisionModal?.action === "approve" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
          >
            <p className="text-sm font-medium text-text">
              {decisionModal?.action === "approve"
                ? tf(
                    "admin.confirmApproveRefundMessage",
                    "You are about to approve this refund. This action is final and cannot be changed later.",
                  )
                : tf(
                    "admin.confirmRejectRefundMessage",
                    "You are about to reject this refund. This action is final and cannot be changed later.",
                  )}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {tf("admin.refundId", "Refund ID")}: #{decisionModal?.refund?.id}
            </p>
          </div>

          <Textarea
            label={tf("admin.refundDecisionReason", "Decision Reason")}
            placeholder={tf(
              "admin.refundDecisionReasonRequiredHint",
              "Type the reason (required)",
            )}
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
            rows={4}
            required
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setDecisionModal(null);
                setDecisionReason("");
              }}
            >
              {tf("common.cancel", "Cancel")}
            </Button>
            <Button
              fullWidth
              onClick={confirmDecision}
              loading={approveMutation.isPending || rejectMutation.isPending}
              disabled={!decisionReason.trim()}
            >
              {decisionModal?.action === "approve"
                ? tf("admin.approveRefund", "Approve")
                : tf("admin.rejectRefund", "Reject")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
