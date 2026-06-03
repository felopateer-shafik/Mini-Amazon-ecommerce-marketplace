import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowLeft,
  Tag,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useCartStore } from "@/store/cartStore";
import { useValidateCoupon, usePublicSettings } from "@/hooks/useApi";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";

function isEnabled(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    coupon,
    setCoupon,
    removeCoupon,
    getSubtotal,
    getDiscount,
    getTotal,
  } = useCartStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const validateCoupon = useValidateCoupon();
  const { data: settingsData, isLoading: settingsLoading } =
    usePublicSettings();
  const [couponCode, setCouponCode] = useState("");
  const [shippingUiReady, setShippingUiReady] = useState(false);
  const shippingReady = !settingsLoading && shippingUiReady;
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  );
  const subtotal = getSubtotal();
  const discount = getDiscount();
  const subtotalAfterDiscount = getTotal();
  const getCartItemKey = (item) =>
    item.variant_id ? `${item.id}_${item.variant_id}` : String(item.id);

  const groupedItems = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      const merchant = item.merchant || "Unknown Store";
      if (!groups.has(merchant)) {
        groups.set(merchant, []);
      }
      groups.get(merchant).push(item);
    });
    return Array.from(groups.entries());
  }, [items]);

  const shippingCost = useMemo(() => {
    if (!shippingReady) return 0;
    const settings = settingsData?.data ?? settingsData ?? {};
    const defaultMethod = Array.isArray(settings.shipping_methods)
      ? settings.shipping_methods.find((method) => method?.enabled !== false)
      : null;
    const fee = Number(defaultMethod?.cost ?? settings.shipping_fee ?? 0);
    const thresholdEnabled = isEnabled(
      settings.free_shipping_threshold_enabled,
      true,
    );
    const threshold = Number(settings.free_shipping_threshold ?? 0);

    if (
      fee === 0 ||
      (thresholdEnabled && threshold > 0 && subtotal >= threshold)
    ) {
      return 0;
    }

    return fee;
  }, [shippingReady, settingsData, subtotal]);

  const taxAmount = useMemo(() => {
    const settings = settingsData?.data ?? settingsData ?? {};
    const taxRate = Number(settings.tax_rate ?? 0);
    if (taxRate <= 0) return 0;

    return Math.max(0, (subtotalAfterDiscount * taxRate) / 100);
  }, [settingsData, subtotalAfterDiscount]);

  const cartTotal = subtotalAfterDiscount + shippingCost + taxAmount;

  useEffect(() => {
    setShippingUiReady(false);
    if (settingsLoading) return;

    const timer = setTimeout(() => {
      setShippingUiReady(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [settingsLoading, settingsData]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    try {
      const res = await validateCoupon.mutateAsync({
        code: couponCode.trim(),
        subtotal,
      });
      const payload = res?.data || res;
      const couponData = payload?.data || payload;
      setCoupon({
        code: couponCode.trim(),
        discount: couponData?.discount ?? couponData?.value ?? 0,
        type: couponData?.type || "percentage",
        value: couponData?.value ?? 0,
      });
      toast.success(t("cart.couponApplied"));
      setCouponCode("");
    } catch (err) {
      const msg = err?.response?.data?.message;
      toast.error(msg || "Invalid coupon code");
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-20 w-20 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl sm:text-2xl font-bold text-text mb-2">
          {t("cart.emptyCart")}
        </h1>
        <p className="text-text-secondary mb-6">
          {t("cart.emptyCartDescription")}
        </p>
        <Link to="/products">
          <Button icon={ArrowLeft}>{t("cart.continueShopping")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("cart.shoppingCart") },
        ]}
      />
      <h1 className="text-xl sm:text-2xl font-bold text-text mt-4 mb-6">
        {t("cart.subtotalItems", { count: itemCount })}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Group by merchant */}
          {groupedItems.map(([merchant, merchantItems]) => (
            <div
              key={merchant}
              className="bg-white rounded-lg border border-border/50 overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-border/50">
                <span className="text-sm font-medium text-text">
                  {merchant}
                </span>
              </div>
              <div className="divide-y divide-border/50">
                {merchantItems.map((item) => (
                  <div key={getCartItemKey(item)} className="p-4 flex gap-4">
                    <Link
                      to={`/product/${item.slug || item.id}`}
                      className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0"
                    >
                      <img
                        src={
                          item.image ||
                          "https://placehold.co/80x80/f0f0f0/333?text=Item"
                        }
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${item.slug || item.id}`}
                        className="text-sm font-medium text-text hover:text-accent line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      {item.variants &&
                        Object.entries(item.variants).map(([k, v]) => (
                          <span key={k} className="text-xs text-text-secondary">
                            {k}: {v}{" "}
                          </span>
                        ))}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-border rounded-lg">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                Math.max(1, item.quantity - 1),
                                item.variant_id || null,
                              )
                            }
                            className="p-1.5 hover:bg-gray-50"
                            aria-label="Decrease"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.quantity + 1,
                                item.variant_id || null,
                              )
                            }
                            className="p-1.5 hover:bg-gray-50"
                            aria-label="Add"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        removeItem(item.id, item.variant_id || null);
                      }}
                      className="text-text-secondary hover:text-danger self-start"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <Link
              to="/products"
              className="text-sm text-accent hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> {t("cart.continueShopping")}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearCart();
                toast.success(t("cart.cartCleared"));
              }}
            >
              {t("cart.clearCart")}
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6 sticky top-24">
            <h2 className="text-lg font-bold text-text mb-4">
              {t("cart.orderSummary")}
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {t("cart.subtotalItems", { count: itemCount })}
                </span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {t("common.shipping")}
                </span>
                <span className="font-medium">
                  {!shippingReady ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin inline" />
                  ) : (
                    (() => {
                      const settings = settingsData?.data ?? settingsData ?? {};
                      const defaultMethod = Array.isArray(
                        settings.shipping_methods,
                      )
                        ? settings.shipping_methods.find(
                            (method) => method?.enabled !== false,
                          )
                        : null;
                      const fee = Number(
                        defaultMethod?.cost ?? settings.shipping_fee ?? 0,
                      );
                      const thresholdEnabled = isEnabled(
                        settings.free_shipping_threshold_enabled,
                        true,
                      );
                      const threshold = Number(
                        settings.free_shipping_threshold ?? 0,
                      );
                      if (
                        fee === 0 ||
                        (thresholdEnabled &&
                          threshold > 0 &&
                          subtotal >= threshold)
                      ) {
                        return (
                          <span className="text-success">
                            {t("common.free")}
                          </span>
                        );
                      }
                      return (
                        <span className="text-text-secondary">
                          {formatCurrency(fee)}
                        </span>
                      );
                    })()
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("common.tax")}</span>
                <span className="font-medium">
                  {taxAmount > 0 ? formatCurrency(taxAmount) : t("common.free")}
                </span>
              </div>
              {coupon && (
                <div className="flex justify-between text-success">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    {coupon.code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>-{formatCurrency(discount)}</span>
                    <button
                      onClick={() => {
                        removeCoupon();
                        toast.success(t("cart.couponRemoved"));
                      }}
                      className="text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              <hr className="border-border" />
              <div className="flex justify-between text-lg font-bold">
                <span>{t("common.total")}</span>
                <span className="text-primary">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            {!coupon && (
              <form onSubmit={handleApplyCoupon} className="mt-4 flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder={t("cart.couponCode")}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  loading={validateCoupon.isPending}
                >
                  {t("common.apply")}
                </Button>
              </form>
            )}

            <Button
              fullWidth
              className="mt-4"
              onClick={() => {
                if (!shippingReady) return;
                navigate("/checkout");
              }}
              loading={!shippingReady}
              disabled={!shippingReady}
            >
              {t("cart.proceedToCheckout")}
            </Button>

            <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>{t("cart.secureCheckout")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
