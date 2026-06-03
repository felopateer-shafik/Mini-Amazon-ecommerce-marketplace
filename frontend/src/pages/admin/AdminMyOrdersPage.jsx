import { useState } from "react";
import {
  Search,
  Eye,
  Download,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { resolveOrderShippingMeta } from "@/lib/orderShippingMeta";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminOrder,
  useAdminOrders,
  useAdminUpdateOrder,
} from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";

const statusColors = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "warning",
};
const paymentColors = {
  completed: "success",
  processing: "info",
  pending: "warning",
  failed: "danger",
  cancelled: "danger",
  refunded: "danger",
};

export default function AdminMyOrdersPage() {
  const { t } = useTranslation();
  const statusLabels = {
    pending: t("admin.statusPending"),
    confirmed: t("admin.statusConfirmed"),
    processing: t("admin.statusProcessing"),
    shipped: t("admin.statusShipped"),
    delivered: t("admin.statusDelivered"),
    cancelled: t("admin.statusCancelled"),
    refunded: t("admin.statusRefunded"),
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewOrder, setViewOrder] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const perPage = 10;

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = {
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    system_only: true,
    page: currentPage,
    per_page: perPage,
  };

  const { data: ordersData, isLoading } = useAdminOrders(queryParams);
  const { data: viewOrderData, isLoading: isLoadingViewOrder } = useAdminOrder(
    viewOrder?.id,
  );
  const updateOrderMutation = useAdminUpdateOrder();

  const orders = ordersData?.data ?? [];
  const totalPages = ordersData?.meta?.last_page ?? ordersData?.last_page ?? 1;
  const totalOrders =
    ordersData?.meta?.total ?? ordersData?.total ?? orders.length;
  const detailedViewOrder = viewOrderData?.data ?? viewOrder;

  const resolveItemsCount = (order) => {
    if (!order) return "—";
    if (typeof order.items_count === "number") return order.items_count;
    if (Array.isArray(order.items)) return order.items.length;
    return "—";
  };

  const allStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];

  const allPaymentStatuses = [
    "pending",
    "processing",
    "completed",
    "failed",
    "cancelled",
    "refunded",
  ];

  const updateStatus = async () => {
    if (!updateModal || !newStatus || !newPaymentStatus) return;
    try {
      await updateOrderMutation.mutateAsync({
        id: updateModal.id,
        data: { status: newStatus, payment_status: newPaymentStatus },
      });
      toast.success(t("admin.orderStatusUpdated"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("admin.failedUpdateOrderStatus"),
      );
    } finally {
      setUpdateModal(null);
      setNewStatus("");
      setNewPaymentStatus("");
    }
  };

  const exportOrders = () => {
    if (!orders.length) {
      toast.error(t("admin.noOrdersToExport"));
      return;
    }
    const rows = [
      ["Order Number", "Customer", "Date", "Items", "Total", "Status"],
      ...orders.map((order) => [
        order.order_number ?? `#${order.id}`,
        `"${(order.user?.name || "").replace(/"/g, '""')}"`,
        order.created_at || "",
        resolveItemsCount(order),
        order.total ?? 0,
        order.status ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `my-orders-${new Date().toISOString().slice(0, 10)}.csv`,
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
            {t("admin.myOrders")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.myOrdersDesc", { count: totalOrders }) ||
              `Orders containing your products — ${totalOrders} total`}
          </p>
        </div>
        <Button variant="outline" icon={Download} onClick={exportOrders}>
          {t("common.export")}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("admin.searchOrders")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", ...allStatuses.slice(0, 5)].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-sm rounded-lg border capitalize transition ${statusFilter === s ? "bg-primary text-white border-primary" : "border-border text-text-secondary"}`}
            >
              {s === "all" ? t("common.all") : (statusLabels[s] ?? s)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            {t("admin.noOrdersFound")}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border/50">
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.orderNumber")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.customer")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.date")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.items")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.total")}
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
                  {orders.map((order) => {
                    const StatusIcon =
                      {
                        pending: Clock,
                        confirmed: CheckCircle,
                        processing: Package,
                        shipped: Truck,
                        delivered: CheckCircle,
                        cancelled: XCircle,
                        refunded: DollarSign,
                      }[order.status] || Clock;
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 width-max-content">
                            <StatusIcon className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm font-medium text-text">
                              {order.order_number ?? `#${order.id}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {order.user?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary width-8rem">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {resolveItemsCount(order)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-text">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={statusColors[order.status] || "warning"}
                            size="sm"
                            className="capitalize"
                          >
                            {statusLabels[order.status] ?? order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 width-max-content">
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() => setViewOrder(order)}
                              aria-label={t("merchant.view")}
                            >
                              <Eye className="h-4 w-4 text-text-secondary" />
                            </button>
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() => {
                                setUpdateModal(order);
                                setNewStatus(order.status);
                                setNewPaymentStatus(
                                  order.payment_status || "pending",
                                );
                              }}
                              aria-label={t("common.edit")}
                            >
                              <Truck className="h-4 w-4 text-text-secondary" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          </>
        )}
      </div>

      {/* View Order Modal */}
      <Modal
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={`Order ${detailedViewOrder?.order_number ?? ""}`}
      >
        {detailedViewOrder && (
          <div className="space-y-4">
            {isLoadingViewOrder && (
              <div className="text-sm text-text-secondary">
                {t("common.loading")}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.customer")}
                </p>
                <p className="text-sm font-medium">
                  {detailedViewOrder.user?.name ?? "—"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.total")}
                </p>
                <p className="text-sm font-medium">
                  {formatCurrency(detailedViewOrder.total)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("admin.status")}
                </p>
                <Badge
                  variant={statusColors[detailedViewOrder.status] || "warning"}
                  size="sm"
                  className="capitalize mt-1"
                >
                  {statusLabels[detailedViewOrder.status] ??
                    detailedViewOrder.status}
                </Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary">
                  {t("merchant.payment")}
                </p>
                <Badge
                  variant={
                    paymentColors[detailedViewOrder.payment?.status] ??
                    "warning"
                  }
                  size="sm"
                  className="capitalize mt-1"
                >
                  {detailedViewOrder.payment?.status ?? "pending"}
                </Badge>
                {detailedViewOrder.payment_method && (
                  <span className="block text-xs text-text-secondary mt-0.5 capitalize">
                    {detailedViewOrder.payment_method}
                  </span>
                )}
                {detailedViewOrder.payment?.notes && (
                  <span className="block text-xs text-success mt-1">
                    {detailedViewOrder.payment.notes}
                  </span>
                )}
              </div>
            </div>

            {/* Items */}
            {Array.isArray(detailedViewOrder.items) &&
              detailedViewOrder.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-text">
                    {t("admin.items")} ({detailedViewOrder.items.length})
                  </h4>
                  {detailedViewOrder.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium text-text">
                          {item.product_name || item.product?.name || "Product"}
                        </span>
                        {(item.variant_name || item.variant?.name) && (
                          <span className="text-text-secondary ml-1">
                            ({item.variant_name || item.variant?.name})
                          </span>
                        )}
                      </div>
                      <div className="text-text-secondary">
                        ×{item.quantity} —{" "}
                        {formatCurrency(
                          item.total_price ?? item.price * item.quantity,
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={!!updateModal}
        onClose={() => {
          setUpdateModal(null);
          setNewStatus("");
          setNewPaymentStatus("");
        }}
        title={t("admin.updateOrderStatus")}
        size="sm"
      >
        {updateModal && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                {t("admin.orderStatus")}
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              >
                {allStatuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                {t("admin.paymentStatus")}
              </label>
              <select
                value={newPaymentStatus}
                onChange={(e) => setNewPaymentStatus(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              >
                {allPaymentStatuses.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setUpdateModal(null);
                  setNewStatus("");
                  setNewPaymentStatus("");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                fullWidth
                onClick={updateStatus}
                disabled={updateOrderMutation.isPending}
              >
                {updateOrderMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  t("admin.updateStatus")
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
