import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Package,
  Truck,
  CalendarDays,
  MapPin,
  CreditCard,
  MessageCircle,
  RotateCcw,
  Download,
  ArrowLeft,
  Copy,
  Phone,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { formatCurrency, formatDate } from "@/lib/utils";
import { resolveOrderShippingMeta } from "@/lib/orderShippingMeta";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrder, useRequestRefund, useCancelOrder } from "@/hooks/useApi";

const getStatusConfig = (t) => ({
  pending: { variant: "warning", icon: Clock, label: t("orders.pending") },
  confirmed: {
    variant: "info",
    icon: CheckCircle,
    label: t("orders.confirmed"),
  },
  processing: { variant: "info", icon: Package, label: t("orders.processing") },
  shipped: { variant: "info", icon: Truck, label: t("orders.shipped") },
  delivered: {
    variant: "success",
    icon: CheckCircle,
    label: t("orders.delivered"),
  },
  cancelled: { variant: "danger", icon: XCircle, label: t("orders.cancelled") },
  refunded: {
    variant: "secondary",
    icon: RotateCcw,
    label: t("orders.refunded"),
  },
});

const getTrackingSteps = (t) => [
  { key: "pending", label: t("orderDetail.orderPlaced") },
  { key: "confirmed", label: t("orders.confirmed") },
  { key: "processing", label: t("orders.processing") },
  { key: "shipped", label: t("orders.shipped") },
  { key: "delivered", label: t("orders.delivered") },
];

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { id: orderId } = useParams();
  const { data: orderData, isLoading, error } = useOrder(orderId);
  const requestRefund = useRequestRefund();
  const cancelOrder = useCancelOrder();
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const order = orderData?.data || orderData;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-danger mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text mb-2">
          {t("orderDetail.orderNotFound")}
        </h2>
        <p className="text-text-secondary mb-4">
          {error?.response?.data?.message || t("orderDetail.couldNotLoad")}
        </p>
        <Link to="/orders">
          <Button variant="outline" icon={ArrowLeft}>
            {t("orderDetail.backToOrders")}
          </Button>
        </Link>
      </div>
    );
  }

  const orderNumber = order.order_number || order.id;
  const items = order.items || order.order_items || [];
  const shipments = order.shipments || [];
  const address = order.address || order.shipping_address || {};
  const status = order.status || "pending";
  const statusConfig = getStatusConfig(t);
  const trackingSteps = getTrackingSteps(t);
  const statusInfo = statusConfig[status] || statusConfig.pending;

  const subtotal = parseFloat(order.subtotal) || 0;
  const tax = parseFloat(order.tax_amount) || 0;
  const shipping =
    parseFloat(order.shipping_amount || order.shipping_cost) || 0;
  const discount = parseFloat(order.discount_amount || order.discount) || 0;
  const total = parseFloat(order.total) || subtotal + shipping - discount;

  const paymentMethod =
    order.payment_method ||
    order.payment?.payment_method ||
    order.payment?.method ||
    "COD";
  const shippingMeta = resolveOrderShippingMeta(order);

  // Determine tracking step index
  const statusOrder = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ];
  const currentStepIdx = statusOrder.indexOf(status);

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) {
      toast.error(t("orderDetail.provideReason"));
      return;
    }
    try {
      await requestRefund.mutateAsync({
        orderId: order.id,
        data: { reason: refundReason },
      });
      toast.success(t("orderDetail.refundSubmitted"));
      setShowRefundModal(false);
      setRefundReason("");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("orderDetail.refundFailed"),
      );
    }
  };

  const handleCancelOrder = async () => {
    try {
      await cancelOrder.mutateAsync(order.id);
      toast.success(t("orderDetail.orderCancelled"));
      setShowCancelModal(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("orderDetail.cancelFailed"),
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("orders.myOrders"), href: "/orders" },
          { label: `#${orderNumber}` },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            {t("orderDetail.order", { id: `#${orderNumber}` })}
            <button
              onClick={() => {
                navigator.clipboard.writeText(String(orderNumber));
                toast.success(t("orderDetail.orderIdCopied"));
              }}
              aria-label="Copy"
            >
              <Copy className="h-4 w-4 text-text-secondary hover:text-accent" />
            </button>
          </h1>
          <p className="text-sm text-text-secondary">
            {t("orderDetail.placedOn", {
              date: formatDate(order.created_at || order.date),
            })}
          </p>
        </div>
        <Badge
          variant={statusInfo.variant}
          className="flex items-center gap-1 text-sm"
        >
          <statusInfo.icon className="h-4 w-4" /> {statusInfo.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Tracking Timeline */}
          {!["cancelled", "refunded"].includes(status) && (
            <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6">
              <h2 className="font-semibold text-text mb-4">
                {t("orderDetail.deliveryInfo") || "Order Tracking"}
              </h2>
              <div className="flex items-start justify-between relative mb-6">
                {/* Connector lines behind the circles */}
                <div className="absolute top-4 left-0 right-0 flex">
                  {trackingSteps.slice(0, -1).map((_, idx) => (
                    <div key={idx} className="flex-1 flex items-center">
                      <div
                        className={`h-0.5 w-full mx-4 ${
                          idx < currentStepIdx ? "bg-primary" : "bg-gray-200"
                        }`}
                      />
                    </div>
                  ))}
                </div>
                {trackingSteps.map((step, idx) => (
                  <div
                    key={step.key}
                    className="flex-1 flex flex-col items-center relative z-10"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx <= currentStepIdx
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-text-secondary"
                      }`}
                    >
                      {idx <= currentStepIdx ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <p
                      className={`text-xs mt-1 text-center ${
                        idx <= currentStepIdx
                          ? "text-primary font-medium"
                          : "text-text-secondary"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                ))}
              </div>
              {order.estimated_delivery && (
                <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary">
                      {t("orderDetail.estimatedArrival")}
                    </p>
                    <p className="text-sm font-semibold text-text">
                      {formatDate(order.estimated_delivery)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shipments (multi-merchant) */}
          {shipments.length > 0 && (
            <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6">
              <h2 className="font-semibold text-text mb-4">
                {t("orderDetail.shipments")}
              </h2>
              <div className="space-y-4">
                {shipments.map((shipment, idx) => (
                  <div
                    key={shipment.id || idx}
                    className="p-4 bg-gray-50 rounded-lg border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-text">
                        {t("orderDetail.shipmentNumber", { number: idx + 1 })}
                        {shipment.carrier && ` — ${shipment.carrier}`}
                      </p>
                      <Badge
                        variant={
                          statusConfig[shipment.status]?.variant || "info"
                        }
                      >
                        {shipment.status}
                      </Badge>
                    </div>
                    {shipment.tracking_number && (
                      <p className="text-xs text-text-secondary">
                        {t("orderDetail.tracking")}: {shipment.tracking_number}
                      </p>
                    )}
                    {shipment.items?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {shipment.items.map((si) => (
                          <p
                            key={si.id}
                            className="text-xs text-text-secondary"
                          >
                            • {si.product?.name || si.name} × {si.quantity}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6">
            <h2 className="font-semibold text-text mb-4">
              {t("orderDetail.orderItems")}
            </h2>
            <div className="divide-y divide-border/50">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center gap-3 sm:gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <img
                    src={
                      item.image ||
                      item.product?.images?.[0] ||
                      item.product?.image ||
                      "https://placehold.co/64x64/f0f0f0/333?text=Item"
                    }
                    alt={item.product_name || item.name || item.product?.name}
                    loading="lazy"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {item.product_name || item.name || item.product?.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {t("common.qty")} {item.quantity} ×{" "}
                      {formatCurrency(item.unit_price || item.price)}
                    </p>
                    {(item.merchant || item.vendor || item.product?.vendor) && (
                      <p className="text-xs text-text-secondary">
                        {t("orderDetail.soldBy")}{" "}
                        {item.merchant ||
                          item.vendor?.business_name ||
                          item.product?.vendor?.business_name}
                      </p>
                    )}
                  </div>
                  <span className="font-medium text-text text-sm sm:text-base whitespace-nowrap">
                    {formatCurrency(
                      item.total_price ||
                        (item.unit_price || item.price) * (item.quantity || 1),
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Shipping Address */}
          <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6">
            <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />{" "}
              {t("orderDetail.shippingAddress")}
            </h3>
            {(() => {
              // Handle string address (legacy orders)
              if (typeof address === "string") {
                return (
                  <p className="text-sm text-text-secondary">
                    {address || "N/A"}
                  </p>
                );
              }
              // Handle object with only full_address key
              if (
                address.full_address &&
                !address.address_line_1 &&
                !address.city
              ) {
                return (
                  <p className="text-sm text-text-secondary">
                    {address.full_address}
                  </p>
                );
              }
              // Handle structured address object
              const hasContent =
                address.name ||
                address.label ||
                address.address_line_1 ||
                address.line ||
                address.address ||
                address.city;
              if (!hasContent) {
                return <p className="text-sm text-text-secondary">N/A</p>;
              }
              return (
                <>
                  {(address.name || address.label) && (
                    <p className="text-sm text-text">
                      {address.name || address.label}
                    </p>
                  )}
                  {address.phone && (
                    <p className="text-sm text-text-secondary">
                      {address.phone}
                    </p>
                  )}
                  {(address.address_line_1 ||
                    address.line ||
                    address.address) && (
                    <p className="text-sm text-text-secondary">
                      {address.address_line_1 ||
                        address.line ||
                        address.address}
                      {address.address_line_2
                        ? `, ${address.address_line_2}`
                        : ""}
                    </p>
                  )}
                  {(address.city ||
                    address.state ||
                    address.postal_code ||
                    address.zip) && (
                    <p className="text-sm text-text-secondary">
                      {address.city}
                      {address.state ? `, ${address.state}` : ""}{" "}
                      {address.postal_code || address.zip}
                    </p>
                  )}
                  {address.country && (
                    <p className="text-sm text-text-secondary">
                      {address.country}
                    </p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6">
            <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />{" "}
              {t("orderDetail.payment")}
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              {paymentMethod === "cod" || paymentMethod === "COD"
                ? t("orderDetail.cashOnDelivery")
                : paymentMethod === "wallet"
                  ? t("orderDetail.wallet")
                  : paymentMethod}
            </p>
            {(shippingMeta.shippingMethod ||
              shippingMeta.shippingZone ||
              shippingMeta.shippingEta) && (
              <div className="space-y-1 text-sm mb-3">
                {shippingMeta.shippingMethod && (
                  <p className="text-text-secondary">
                    {t("orderDetail.method")}:{" "}
                    <span className="text-text">
                      {shippingMeta.shippingMethod}
                    </span>
                  </p>
                )}
                {shippingMeta.shippingZone && (
                  <p className="text-text-secondary">
                    {t("orderDetail.zone")}:{" "}
                    <span className="text-text">
                      {shippingMeta.shippingZone}
                    </span>
                  </p>
                )}
                {shippingMeta.shippingEta && (
                  <p className="text-text-secondary">
                    {t("orderDetail.eta")}:{" "}
                    <span className="text-text">
                      {shippingMeta.shippingEta}
                    </span>
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2 text-sm border-t border-border/50 pt-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {t("common.subtotal")}
                </span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {t("common.shipping")}
                </span>
                <span>
                  {shipping === 0 ? t("common.free") : formatCurrency(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("common.tax")}</span>
                <span>{tax > 0 ? formatCurrency(tax) : t("common.free")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>{t("common.discount")}</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <hr className="border-border" />
              <div className="flex justify-between font-bold text-lg">
                <span>{t("common.total")}</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
              {(() => {
                const notes = order.payment?.notes || "";
                const walletMatch = notes.match(/Wallet:\s*([\d,.]+)/);
                const codMatch = notes.match(/COD:\s*([\d,.]+)/);
                if (walletMatch) {
                  const walletAmt = parseFloat(
                    walletMatch[1].replace(/,/g, ""),
                  );
                  const codAmt = codMatch
                    ? parseFloat(codMatch[1].replace(/,/g, ""))
                    : null;
                  return (
                    <>
                      <div className="flex justify-between text-success">
                        <span>
                          {t("payment.walletDeduction", "Wallet Deduction")}
                        </span>
                        <span>-{formatCurrency(walletAmt)}</span>
                      </div>
                      {codAmt != null && codAmt > 0 && (
                        <div className="flex justify-between font-semibold">
                          <span>
                            {t("payment.remainingCOD", "Remaining (COD)")}
                          </span>
                          <span>{formatCurrency(codAmt)}</span>
                        </div>
                      )}
                    </>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {order.notes && (
            <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6">
              <h3 className="font-semibold text-text mb-3">
                {t("orderDetail.orderNotes")}
              </h3>
              <p className="text-sm text-text-secondary whitespace-pre-line">
                {order.notes}
              </p>
            </div>
          )}

          {/* Actions — only render if there are actions to show */}
          {(status === "pending" ||
            ["delivered", "shipped"].includes(status)) && (
            <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6 space-y-2">
              {status === "pending" && (
                <Button
                  fullWidth
                  variant="outline"
                  icon={XCircle}
                  className="!text-danger !border-danger hover:!bg-danger/5"
                  onClick={() => setShowCancelModal(true)}
                  loading={cancelOrder.isPending}
                >
                  {t("orderDetail.cancelOrder")}
                </Button>
              )}
              {["delivered", "shipped"].includes(status) && (
                <Button
                  fullWidth
                  variant="outline"
                  icon={RotateCcw}
                  className="!text-danger !border-danger hover:!bg-danger/5"
                  onClick={() => setShowRefundModal(true)}
                >
                  {t("orderDetail.requestRefund")}
                </Button>
              )}
            </div>
          )}

          <Link
            to="/orders"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> {t("orderDetail.backToOrders")}
          </Link>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-text mb-4">
              {t("orderDetail.requestRefund")}
            </h3>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder={t("orderDetail.refundReasonPlaceholder")}
              rows={4}
              className="w-full border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundReason("");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleRefundRequest}
                loading={requestRefund.isPending}
                className="!bg-danger hover:!bg-danger/90"
              >
                {t("orderDetail.submitRequest")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={t("orderDetail.cancelOrder")}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
            <p className="text-sm text-text">
              {t("orderDetail.confirmCancel")}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowCancelModal(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              className="!bg-danger hover:!bg-danger/90"
              onClick={handleCancelOrder}
              loading={cancelOrder.isPending}
            >
              {t("orderDetail.cancelOrder")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
