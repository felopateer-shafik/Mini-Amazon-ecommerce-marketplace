import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  Search,
  Calendar,
  ChevronRight,
  Eye,
  RotateCcw,
  Star,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrders, useCancelOrder } from "@/hooks/useApi";
import toast from "react-hot-toast";

const statusConfig = {
  pending: { labelKey: "orders.pending", color: "warning", icon: Clock },
  confirmed: { labelKey: "orders.confirmed", color: "info", icon: CheckCircle },
  processing: { labelKey: "orders.processing", color: "info", icon: Package },
  shipped: { labelKey: "orders.shipped", color: "info", icon: Truck },
  delivered: {
    labelKey: "orders.delivered",
    color: "success",
    icon: CheckCircle,
  },
  cancelled: { labelKey: "orders.cancelled", color: "danger", icon: XCircle },
  refunded: { labelKey: "orders.refunded", color: "warning", icon: RotateCcw },
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingCancelOrderId, setPendingCancelOrderId] = useState(null);
  const perPage = 5;

  const cancelOrderMutation = useCancelOrder();

  const handleCancelOrder = async () => {
    if (!pendingCancelOrderId) return;
    try {
      await cancelOrderMutation.mutateAsync(pendingCancelOrderId);
      toast.success(t("orders.cancelledSuccess"));
      setPendingCancelOrderId(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("orders.cancelFailed"));
    }
  };

  const handleRateOrder = (order) => {
    const firstRateableItem = Array.isArray(order?.items)
      ? order.items.find((item) => item.productSlug)
      : null;

    if (firstRateableItem?.productSlug) {
      navigate(
        `/product/${firstRateableItem.productSlug}?tab=reviews&writeReview=1`,
      );
      return;
    }

    toast.error(t("orders.cannotRateHere"));
    navigate(`/orders/${order.realId || order.id}`);
  };

  // Fetch orders from API
  const { data: ordersResponse, isLoading } = useOrders({
    status: filter !== "all" ? filter : undefined,
    search: search || undefined,
    page: currentPage,
    per_page: perPage,
  });

  const apiOrders = (() => {
    const d = ordersResponse?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  })();
  const orders = apiOrders.map((o) => ({
    id: o.order_number || `ORD-${o.id}`,
    realId: o.id,
    date: o.created_at,
    status: o.status,
    total: parseFloat(o.total),
    items:
      o.items?.map((item) => ({
        id: item.id,
        name:
          item.product_name ||
          item.product?.name ||
          `Product ${item.product_id}`,
        image:
          item.product?.images?.[0] ||
          item.product?.thumbnail ||
          item.product?.image ||
          `https://placehold.co/60x60/f0f0f0/333?text=P`,
        quantity: item.quantity,
        price: parseFloat(item.unit_price || item.total_price),
        productSlug: item.product?.slug || null,
      })) || [],
    merchant: o.vendor?.store_name || o.vendor?.business_name || "Store",
  }));

  const totalPages =
    ordersResponse?.last_page || ordersResponse?.meta?.last_page || 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("account.myAccount"), href: "/account" },
          { label: t("orders.myOrders") },
        ]}
      />
      <h1 className="text-xl sm:text-2xl font-bold text-text mt-4 mb-6">
        {t("orders.myOrders")}
      </h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("orders.searchByOrderId")}
            className="w-full ps-9 pe-4 py-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            "all",
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "refunded",
            "cancelled",
          ].map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilter(s);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-sm rounded-lg border transition ${filter === s ? "bg-primary text-white border-primary" : "border-border text-text-secondary hover:border-primary"}`}
            >
              {s === "all" ? t("common.all") : t(`orders.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-3" />
          <p className="text-text-secondary">{t("orders.noOrdersFound")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const sc = statusConfig[order.status];
            const StatusIcon = sc.icon;
            return (
              <div
                key={order.id}
                className="bg-white rounded-lg border border-border/50 overflow-hidden"
              >
                <div className="p-3 sm:p-4 bg-gray-50 flex flex-wrap items-center justify-between gap-2 border-b border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                    <span className="font-semibold text-text">{order.id}</span>
                    <span className="text-text-secondary flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(order.date)}
                    </span>
                  </div>
                  <Badge variant={sc.color} className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {t(`orders.${order.status}`)}
                  </Badge>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex -space-x-2 shrink-0">
                        {order.items.slice(0, 3).map((item) => (
                          <img
                            key={item.id}
                            src={item.image}
                            alt=""
                            loading="lazy"
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-white object-cover"
                          />
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-text-secondary">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {order.items.map((i) => i.name).join(", ")}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {t("orders.itemsFrom", {
                            count: order.items.reduce(
                              (s, i) => s + i.quantity,
                              0,
                            ),
                            merchant: order.merchant,
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-primary whitespace-nowrap">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-3 bg-gray-50 border-t border-border/50 flex flex-wrap justify-end gap-2">
                  {order.status === "delivered" && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Star}
                      onClick={() => handleRateOrder(order)}
                    >
                      {t("orders.rate")}
                    </Button>
                  )}
                  {["pending", "confirmed"].includes(order.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      onClick={() => handleCancelOrder(order.realId)}
                      loading={cancelOrderMutation.isPending}
                    >
                      {t("orders.cancelOrder")}
                    </Button>
                  )}
                  <Link to={`/orders/${order.realId || order.id}`}>
                    <Button variant="outline" size="sm" icon={Eye}>
                      {t("orders.viewDetails")}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <Modal
        isOpen={!!pendingCancelOrderId}
        onClose={() => setPendingCancelOrderId(null)}
        title={t("orders.cancelOrder")}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
            <p className="text-sm text-text">{t("orders.confirmCancel")}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setPendingCancelOrderId(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              className="!bg-danger hover:!bg-danger/90"
              onClick={handleCancelOrder}
              loading={cancelOrderMutation.isPending}
            >
              {t("orders.cancelOrder")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
