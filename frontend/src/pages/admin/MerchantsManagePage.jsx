import { useEffect, useState } from "react";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  Trash2,
  Store,
  Download,
  Star,
  Package,
  DollarSign,
  Clock,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminVendors,
  useAdminApproveVendor,
  useAdminRejectVendor,
  useAdminSuspendVendor,
  useAdminDeleteVendor,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

const statusColors = {
  approved: "success",
  active: "success",
  pending: "warning",
  suspended: "danger",
  rejected: "danger",
};

export default function MerchantsManagePage({ initialStatusFilter = "all" }) {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canApprove = hasPerm("approve-merchants");
  const canSuspend = hasPerm("suspend-merchants");
  const canDelete = hasPerm("delete-merchants");
  const canExport = hasPerm("export-merchants");
  const statusLabels = {
    all: t("common.all"),
    active: t("admin.statusActive"),
    approved: t("admin.statusApproved"),
    pending: t("admin.statusPending"),
    suspended: t("admin.statusSuspended"),
    rejected: t("admin.statusRejected"),
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMerchant, setViewMerchant] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const perPage = 10;

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
    setCurrentPage(1);
  }, [initialStatusFilter]);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: vendorsData, isLoading } = useAdminVendors({
    search: debouncedSearch || undefined,
    status:
      statusFilter !== "all"
        ? statusFilter === "approved"
          ? "active"
          : statusFilter
        : undefined,
    page: currentPage,
    per_page: perPage,
  });

  const approveVendor = useAdminApproveVendor();
  const rejectVendor = useAdminRejectVendor();
  const suspendVendor = useAdminSuspendVendor();
  const deleteVendor = useAdminDeleteVendor();

  const merchants = (vendorsData?.data ?? []).map((v) => ({
    id: v.id,
    userId: v.user?.id,
    name: v.business_name ?? "Unnamed Store",
    owner: v.user?.name ?? "—",
    email: v.user?.email ?? "—",
    status: v.status === "approved" ? "active" : v.status,
    rating: Number(v.rating ?? 0),
    products: v.products_count ?? 0,
    revenue: Number(v.total_revenue ?? v.revenue ?? 0),
    orders: Number(v.orders_count ?? v.orders ?? 0),
    joinDate: v.created_at,
    commission: Number(v.commission_rate ?? 0),
    logo:
      v.logo ??
      `https://placehold.co/40x40/FF9900/fff?text=${(v.business_name ?? "S")[0]}`,
  }));

  const meta = vendorsData?.meta ?? {};
  const totalPages = meta?.last_page ?? vendorsData?.last_page ?? 1;
  const totalCount = meta?.total ?? vendorsData?.total ?? merchants.length;

  const handleApprove = async (id) => {
    try {
      await approveVendor.mutateAsync(id);
      toast.success(t("admin.merchantApproved"));
    } catch {
      toast.error(t("admin.failedApproveMerchant"));
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt(t("admin.enterRejectionReason"));
    if (reason === null) return; // cancelled
    try {
      await rejectVendor.mutateAsync({
        id,
        reason: reason.trim() || undefined,
      });
      toast.success(t("admin.merchantRejected"));
    } catch {
      toast.error(t("admin.failedRejectMerchant"));
    }
  };

  const handleSuspend = async (id) => {
    try {
      await suspendVendor.mutateAsync(id);
      toast.success(t("admin.merchantSuspended"));
    } catch {
      toast.error(t("admin.failedSuspendMerchant"));
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteVendor.mutateAsync(deleteModal.id);
      setDeleteModal(null);
      toast.success(t("admin.merchantDeleted"));
    } catch {
      toast.error(t("admin.failedDeleteMerchant"));
    }
  };

  const exportMerchants = () => {
    if (!merchants.length) {
      toast.error(t("admin.noMerchantsToExport"));
      return;
    }
    const rows = [
      [
        "ID",
        "Store Name",
        "Owner",
        "Email",
        "Status",
        "Rating",
        "Products",
        "Revenue",
      ],
      ...merchants.map((m) => [
        m.id,
        `"${(m.name || "").replace(/"/g, '""')}"`,
        `"${(m.owner || "").replace(/"/g, '""')}"`,
        m.email,
        m.status,
        m.rating,
        m.products,
        m.revenue,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `merchants-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("admin.manageMerchants")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.totalMerchantsCount", { count: totalCount })}
          </p>
        </div>
        {canExport && (
          <Button variant="outline" icon={Download} onClick={exportMerchants}>
            {t("common.export")}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: t("common.total"),
            value: totalCount,
            icon: Store,
            color: "text-primary",
          },
          {
            label: t("admin.statusPending"),
            value:
              vendorsData?.pending_count ??
              merchants.filter((m) => m.status === "pending").length,
            icon: Clock,
            color: "text-yellow-500",
          },
          {
            label: t("admin.statusApproved"),
            value:
              vendorsData?.approved_count ??
              merchants.filter((m) => m.status === "active").length,
            icon: CheckCircle,
            color: "text-success",
          },
          {
            label: t("admin.statusSuspended"),
            value:
              vendorsData?.suspended_count ??
              merchants.filter((m) => m.status === "suspended").length,
            icon: Ban,
            color: "text-danger",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white p-4 rounded-xl border border-border/50 flex items-center gap-3"
          >
            <s.icon className={`h-8 w-8 ${s.color}`} />
            <div>
              <p className="text-xl sm:text-2xl font-bold text-text">
                {s.value}
              </p>
              <p className="text-xs text-text-secondary">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchMerchants")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {["all", "approved", "pending", "suspended", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-sm rounded-lg border capitalize transition ${statusFilter === s ? "bg-primary text-white border-primary" : "border-border text-text-secondary"}`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.merchant")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                  {t("common.rating")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.products")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.revenue")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.commission")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("admin.status")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-text-secondary mt-2">
                      {t("admin.loadingMerchants")}
                    </p>
                  </td>
                </tr>
              ) : merchants.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-text-secondary"
                  >
                    {t("admin.noMerchantsFound")}
                  </td>
                </tr>
              ) : (
                merchants.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.logo}
                          alt=""
                          loading="lazy"
                          className="w-9 h-9 rounded-lg"
                        />
                        <div className="width-max-content">
                          <p className="text-sm font-medium text-text">
                            {m.name}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {m.owner} • {m.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm flex items-center gap-1 width-max-content justify-center">
                        <Star className="h-3.5 w-3.5 text-primary" />
                        {m.rating}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {m.products}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {formatCurrency(m.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {m.commission}%
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={statusColors[m.status]}
                        size="sm"
                        className="capitalize"
                      >
                        {statusLabels[m.status] ?? m.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 width-max-content">
                        <button
                          className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                          onClick={() => setViewMerchant(m)}
                          aria-label={t("merchant.view")}
                        >
                          <Eye className="h-4 w-4 text-text-secondary" />
                        </button>
                        {canApprove && m.status === "pending" && (
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 touch-manipulation"
                            disabled={approveVendor.isPending}
                            onClick={() => handleApprove(m.id)}
                            aria-label={t("admin.approve")}
                          >
                            <CheckCircle className="h-4 w-4 text-success" />
                          </button>
                        )}
                        {canSuspend && m.status === "active" && (
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 touch-manipulation"
                            disabled={suspendVendor.isPending}
                            onClick={() => handleSuspend(m.id)}
                            aria-label={t("admin.suspend")}
                          >
                            <Ban className="h-4 w-4 text-text-secondary hover:text-danger" />
                          </button>
                        )}
                        {canApprove &&
                          (m.status === "suspended" ||
                            m.status === "rejected") && (
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 touch-manipulation"
                              disabled={approveVendor.isPending}
                              onClick={() => handleApprove(m.id)}
                              aria-label={t("admin.approve")}
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </button>
                          )}
                        {canApprove && m.status !== "rejected" && (
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 touch-manipulation"
                            disabled={rejectVendor.isPending}
                            onClick={() => handleReject(m.id)}
                            aria-label={t("admin.reject")}
                          >
                            <XCircle className="h-4 w-4 text-danger" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="p-2 sm:p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 touch-manipulation"
                            disabled={deleteVendor.isPending}
                            onClick={() => setDeleteModal(m)}
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
        isOpen={!!viewMerchant}
        onClose={() => setViewMerchant(null)}
        title={viewMerchant?.name}
      >
        {viewMerchant && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.owner")}
                </p>
                <p className="text-sm font-medium">{viewMerchant.owner}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("common.email")}
                </p>
                <p className="text-sm font-medium">{viewMerchant.email}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("common.products")}
                </p>
                <p className="text-sm font-medium">{viewMerchant.products}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("common.revenue")}
                </p>
                <p className="text-sm font-medium">
                  {formatCurrency(viewMerchant.revenue)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("common.orders")}
                </p>
                <p className="text-sm font-medium">{viewMerchant.orders}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.commission")}
                </p>
                <p className="text-sm font-medium">
                  {viewMerchant.commission}%
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title={t("admin.deleteMerchant")}
        size="sm"
      >
        <p className="text-sm text-text-secondary mb-4">
          {t("admin.confirmDeleteMerchant", { name: deleteModal?.name ?? "" })}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={() => setDeleteModal(null)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            fullWidth
            className="!bg-danger hover:!bg-red-700"
            onClick={handleDelete}
            loading={deleteVendor.isPending}
          >
            {t("common.delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
