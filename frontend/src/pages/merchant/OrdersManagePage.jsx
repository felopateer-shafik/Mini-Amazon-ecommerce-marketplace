import { useMemo, useState } from "react";
import {
  Search,
  Eye,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import { resolveOrderShippingMeta } from "@/lib/orderShippingMeta";
import { useTranslation } from "@/hooks/useTranslation";
import { useMerchantOrders, useMerchantUpdateOrderStatus } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebounce";
import toast from "react-hot-toast";

export default function OrdersManagePage() {
  const { t } = useTranslation();
  const statusConfig = useMemo(
    () => ({
      pending: { label: t("orders.pending"), color: "warning", icon: Clock },
      confirmed: {
        label: t("orders.confirmed"),
        color: "info",
        icon: CheckCircle,
      },
      processing: {
        label: t("orders.processing"),
        color: "info",
        icon: Package,
      },
      shipped: { label: t("orders.shipped"), color: "info", icon: Truck },
      delivered: {
        label: t("orders.delivered"),
        color: "success",
        icon: CheckCircle,
      },
      cancelled: {
        label: t("orders.cancelled"),
        color: "danger",
        icon: XCircle,
      },
    }),
    [t],
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingStatus, setPendingStatus] = useState("");
  const updateOrderStatusMutation = useMerchantUpdateOrderStatus();
  const [exportFormat, setExportFormat] = useState("csv");
  const perPage = 10;

  const debouncedSearch = useDebouncedValue(search, 300);

  const apiParams = {
    page: currentPage,
    per_page: perPage,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  };

  const { data: ordersData, isLoading, isError } = useMerchantOrders(apiParams);

  const orders = ordersData?.data ?? [];
  const meta = ordersData?.meta ?? {};
  const totalPages = meta?.last_page ?? ordersData?.last_page ?? 1;
  const totalCount = meta?.total ?? ordersData?.total ?? orders.length;

  const exportOrders = () => {
    if (!orders.length) {
      toast.error(t("merchant.noOrdersToExport"));
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
          order.order_number || order.id,
          `"${(order.user?.name || order.shipping_address?.name || "").replace(/"/g, '""')}"`,
          order.created_at || "",
          Array.isArray(order.items) ? order.items.length : order.items || 0,
          order.total ?? 0,
          order.payment?.method || "",
          order.status || "",
          shippingMeta.shippingMethod || "",
          shippingMeta.shippingZone || "",
          shippingMeta.shippingEta || "",
        ];
      }),
    ];

    const delimiter = exportFormat === "tsv" ? "\t" : ",";
    const mimeType =
      exportFormat === "tsv"
        ? "text/tab-separated-values;charset=utf-8;"
        : "text/csv;charset=utf-8;";
    const output = rows.map((row) => row.join(delimiter)).join("\n");
    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `merchant-orders-${new Date().toISOString().slice(0, 10)}.${exportFormat}`,
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
        <p className="text-danger">{t("merchant.failedLoadOrders")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">
            {t("merchant.manageOrders")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("merchant.totalOrdersCount", { count: totalCount })}
          </p>
        </div>
        <div className="flex items-center gap-2 grow-1 justify-end">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-white"
            aria-label={t("merchant.exportFormat")}
          >
            <option value="csv">{t("common.csv")}</option>
            <option value="tsv">{t("common.tsv")}</option>
          </select>
          <Button variant="outline" icon={Download} onClick={exportOrders}>
            {t("merchant.export")}
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 width-8rem">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("merchant.searchOrders")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            ["all", t("merchant.allStatuses")],
            ...Object.keys(statusConfig).map((s) => [s, statusConfig[s].label]),
          ].map(([s, label]) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-xs rounded-lg border capitalize transition ${statusFilter === s ? "bg-primary text-white border-primary" : "border-border text-text-secondary"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border/50">
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.orderId")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.customer")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.date")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("merchant.items")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.total")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 text-center">
                  {t("merchant.payment")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.status")}
                </th>
                <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {orders.map((order) => {
                const orderItems = order.items ?? [];
                const itemCount = Array.isArray(orderItems)
                  ? orderItems.length
                  : orderItems;
                const customerName =
                  order.user?.name ?? order.shipping_address?.name ?? "—";
                const customerEmail =
                  order.customer_email ?? order.user?.email ?? "";
                const paymentMethod =
                  order.payment?.payment_method ?? order.payment_method ?? "—";
                const paymentStatus =
                  order.payment?.status ?? order.payment_status ?? "pending";
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-accent">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-text">{customerName}</p>
                      <p className="text-xs text-text-secondary">
                        {customerEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary width-8rem">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {itemCount}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 align-center">
                        <Badge
                          variant="info"
                          size="sm"
                          className="capitalize w-fit"
                        >
                          {paymentMethod}
                        </Badge>
                        <Badge
                          variant={
                            paymentStatus === "completed"
                              ? "success"
                              : paymentStatus === "failed"
                                ? "danger"
                                : "warning"
                          }
                          size="sm"
                          className="capitalize w-fit"
                        >
                          {paymentStatus}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={statusConfig[order.status]?.color}
                        size="sm"
                      >
                        {statusConfig[order.status]?.label ?? order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedOrder(order); setPendingStatus(""); }}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          aria-label="View"
                        >
                          <Eye className="h-4 w-4 text-text-secondary" />
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
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={t("merchant.orderDetailsTitle", {
          order: selectedOrder?.order_number || "",
        })}
      >
        {selectedOrder && (
          <div className="space-y-4">
            {(() => {
              const shippingMeta = resolveOrderShippingMeta(selectedOrder);
              const hasShippingMeta =
                !!shippingMeta.shippingMethod ||
                !!shippingMeta.shippingZone ||
                !!shippingMeta.shippingEta;

              return (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary">
                        {t("merchant.customer")}:
                      </span>
                      <p className="font-medium text-text">
                        {selectedOrder.user?.name ??
                          selectedOrder.shipping_address?.name ??
                          "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-secondary">
                        {t("merchant.date")}:
                      </span>
                      <p className="font-medium text-text">
                        {formatDate(selectedOrder.created_at)}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-secondary">
                        {t("common.total")}:
                      </span>
                      <p className="font-medium text-text">
                        {formatCurrency(selectedOrder.total)}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-secondary">
                        {t("common.status")}:
                      </span>
                      <p>
                        <Badge
                          variant={statusConfig[selectedOrder.status]?.color}
                        >
                          {statusConfig[selectedOrder.status]?.label}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <span className="text-text-secondary">
                        {t("merchant.payment")}:
                      </span>
                      <p className="font-medium text-text capitalize">
                        {selectedOrder.payment?.status ??
                          selectedOrder.payment_status ??
                          "pending"}
                      </p>
                    </div>
                  </div>

                  {hasShippingMeta && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-text-secondary text-xs">
                        {t("merchant.shippingDetails")}
                      </span>
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
                      <span className="text-text-secondary text-xs">
                        {t("merchant.orderNotes")}
                      </span>
                      <p className="text-sm text-text mt-1 whitespace-pre-line">
                        {shippingMeta.remainingNotes}
                      </p>
                    </div>
                  )}

                  {/* ─── Status Update ─── */}
                  {(() => {
                    const allowedTransitions = {
                      pending: ["confirmed", "processing", "cancelled"],
                      confirmed: ["processing", "cancelled"],
                      processing: ["cancelled"],
                    };
                    const nextStatuses = allowedTransitions[selectedOrder.status] ?? [];
                    if (!nextStatuses.length) return null;
                    return (
                      <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                        <span className="text-text-secondary text-xs font-medium">
                          {t("merchant.updateStatus")}
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          <select
                            className="flex-1 min-w-[140px] border border-border rounded-lg px-3 py-2 text-sm bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={pendingStatus}
                            onChange={(e) => setPendingStatus(e.target.value)}
                          >
                            <option value="">{t("merchant.selectNewStatus")}</option>
                            {nextStatuses.map((s) => (
                              <option key={s} value={s}>
                                {statusConfig[s]?.label ?? s}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={!pendingStatus || updateOrderStatusMutation.isPending}
                            isLoading={updateOrderStatusMutation.isPending}
                            onClick={async () => {
                              try {
                                await updateOrderStatusMutation.mutateAsync({
                                  orderId: selectedOrder.id,
                                  status: pendingStatus,
                                });
                                toast.success(t("merchant.statusUpdated"));
                                setPendingStatus("");
                                setSelectedOrder(null);
                              } catch {
                                toast.error(t("merchant.statusUpdateFailed"));
                              }
                            }}
                          >
                            {t("merchant.updateStatus")}
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
