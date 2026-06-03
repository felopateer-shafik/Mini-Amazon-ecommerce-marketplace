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
import { usePermission } from "@/hooks/usePermission";

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
const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
  refunded: DollarSign,
};

export default function OrdersManageAdminPage() {
  const { t } = useTranslation();
  const { hasPerm } = usePermission();
  const canUpdate = hasPerm("update-orders");
  const canExport = hasPerm("export-orders");
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

  const exportOrders = () => {
    if (!orders.length) {
      toast.error(t("admin.noOrdersToExport"));
      return;
    }

    const rows = [
      [
        "Order Number",
        "Customer",
        "Date",
        "Items",
        "Total",
        "Payment",
        "Status",
        "Shipping Method",
        "Shipping Zone",
        "Shipping ETA",
      ],
      ...orders.map((order) => {
        const shippingMeta = resolveOrderShippingMeta(order);
        return [
          order.order_number ?? `#${order.id}`,
          `"${(order.user?.name || "").replace(/"/g, '""')}"`,
          order.created_at || "",
          resolveItemsCount(order),
          order.total ?? 0,
          order.payment_method ?? "",
          order.status ?? "",
          shippingMeta.shippingMethod || "",
          shippingMeta.shippingZone || "",
          shippingMeta.shippingEta || "",
        ];
      }),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `admin-orders-${new Date().toISOString().slice(0, 10)}.csv`,
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
            {t("admin.manageOrders")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("admin.totalOrdersCount", { count: totalOrders })}
          </p>
        </div>
        {canExport && (
          <Button variant="outline" icon={Download} onClick={exportOrders}>
            {t("common.export")}
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        {allStatuses.map((s) => {
          const Icon = statusIcons[s];
          return (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s === statusFilter ? "all" : s);
                setCurrentPage(1);
              }}
              className={`p-3 rounded-xl border text-center transition ${statusFilter === s ? "border-primary bg-primary/5" : "border-border/50 bg-white hover:bg-gray-50"}`}
            >
              <Icon
                className={`h-5 w-5 mx-auto mb-1 ${statusFilter === s ? "text-primary" : "text-text-secondary"}`}
              />
              <p className="text-xs text-text-secondary">{statusLabels[s]}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white p-4 rounded-xl border border-border/50">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchOrders")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
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
                      {t("admin.orderId")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.customer")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("merchant.items")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.total")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("merchant.payment")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.status")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                      {t("admin.orderDate")}
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="flex px-4 py-3 text-sm font-medium text-accent width-max-content">
                        {order.order_number ?? `#${order.id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-text">
                        <div>{order.user?.name ?? "—"}</div>
                        <div className="text-xs text-text-secondary">
                          {order.user?.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {resolveItemsCount(order)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-text">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            paymentColors[order.payment?.status] ?? "warning"
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {order.payment?.status ?? "pending"}
                        </Badge>
                        {order.payment_method && (
                          <span className="block text-xs text-text-secondary mt-0.5 capitalize">
                            {order.payment_method}
                          </span>
                        )}
                        {order.payment?.notes && (
                          <span className="block text-xs text-success mt-0.5">
                            {order.payment.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusColors[order.status]}
                          size="sm"
                          className="capitalize"
                        >
                          {statusLabels[order.status] ?? order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary width-8rem">
                        {formatDate(order.created_at)}
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
                          {canUpdate && (
                            <button
                              className="p-2 sm:p-1.5 hover:bg-gray-100 rounded touch-manipulation"
                              onClick={() => {
                                setUpdateModal(order);
                                setNewStatus(order.status);
                                setNewPaymentStatus(
                                  order.payment?.status || "pending",
                                );
                              }}
                              aria-label={t("admin.updateOrderStatus")}
                            >
                              <Package className="h-4 w-4 text-text-secondary" />
                            </button>
                          )}
                        </div>
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
          </>
        )}
      </div>

      <Modal
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={t("admin.orderDetailsTitle", {
          order: viewOrder?.order_number ?? `#${viewOrder?.id}`,
        })}
      >
        {detailedViewOrder && (
          <div className="space-y-4">
            {isLoadingViewOrder && (
              <div className="text-sm text-text-secondary">
                {t("common.loading")}
              </div>
            )}
            {(() => {
              const shippingMeta = resolveOrderShippingMeta(detailedViewOrder);
              const hasShippingMeta =
                !!shippingMeta.shippingMethod ||
                !!shippingMeta.shippingZone ||
                !!shippingMeta.shippingEta;

              return (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-text-secondary">
                        {t("admin.customer")}
                      </p>
                      <p className="text-sm font-medium">
                        {detailedViewOrder.user?.name ?? "—"}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {detailedViewOrder.user?.email}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-text-secondary">
                        {t("merchant.items")}
                      </p>
                      <p className="text-sm font-medium">
                        {resolveItemsCount(detailedViewOrder)}
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
                        {t("admin.orderDate")}
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(detailedViewOrder.created_at)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-text-secondary">
                        {t("admin.status")}
                      </p>
                      <Badge
                        variant={statusColors[detailedViewOrder.status]}
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

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-text-secondary mb-2">
                      {t("merchant.items")}
                    </p>
                    {Array.isArray(detailedViewOrder.items) &&
                    detailedViewOrder.items.length > 0 ? (
                      <div className="space-y-2">
                        {detailedViewOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-text truncate">
                                {item.product_name || item.product?.name || "—"}
                              </p>
                              <p className="text-xs text-text-secondary">
                                {item.product_sku || "—"}
                                {item.variant_name
                                  ? ` • ${item.variant_name}`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-text-secondary">
                                x{item.quantity ?? 0}
                              </p>
                              <p className="font-medium text-text">
                                {formatCurrency(item.total_price ?? 0)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary">—</p>
                    )}
                  </div>

                  {hasShippingMeta && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-text-secondary">
                        {t("merchant.shippingDetails")}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-sm">
                        <div>
                          <span className="text-text-secondary">
                            {t("merchant.method")}:
                          </span>
                          <p className="text-text font-medium">
                            {shippingMeta.shippingMethod || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-text-secondary">
                            {t("merchant.zone")}:
                          </span>
                          <p className="text-text font-medium">
                            {shippingMeta.shippingZone || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-text-secondary">
                            {t("merchant.eta")}:
                          </span>
                          <p className="text-text font-medium">
                            {shippingMeta.shippingEta || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {shippingMeta.remainingNotes && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-text-secondary">
                        {t("merchant.orderNotes")}
                      </p>
                      <p className="text-sm text-text mt-1 whitespace-pre-line">
                        {shippingMeta.remainingNotes}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </Modal>

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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t("admin.orderStatus")}
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm"
            >
              {allStatuses.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t("admin.paymentStatus")}
            </label>
            <select
              value={newPaymentStatus}
              onChange={(e) => setNewPaymentStatus(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm capitalize"
            >
              {allPaymentStatuses.map((status) => (
                <option key={status} value={status} className="capitalize">
                  {status}
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
              loading={updateOrderMutation.isPending}
            >
              {t("common.update")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
