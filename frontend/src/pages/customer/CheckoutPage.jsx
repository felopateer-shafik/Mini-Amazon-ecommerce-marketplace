import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "@/hooks/useTranslation";
import {
  MapPin,
  CreditCard,
  Check,
  ChevronRight,
  Lock,
  Plus,
  Loader2,
  Tag,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useCartStore } from "@/store/cartStore";

const MapAddressPicker = lazy(() => import("@/components/ui/MapAddressPicker"));
import {
  useAddresses,
  useCreateAddress,
  useValidateCoupon,
} from "@/hooks/useApi";
import { useCreateOrder, useWallet, usePublicSettings } from "@/hooks/useApi";
import { formatCurrency } from "@/lib/utils";
import { trackFacebookEvent } from "@/lib/facebookPixel";
import toast from "react-hot-toast";

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

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [useWalletPartial, setUseWalletPartial] = useState(false);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [shippingUiReady, setShippingUiReady] = useState(false);
  const [shippingSettings, setShippingSettings] = useState({
    shipping_fee: 0,
    free_shipping_threshold_enabled: true,
    free_shipping_threshold: 0,
    shipping_min_days: 3,
    shipping_max_days: 7,
    shipping_methods: [],
    shipping_zones: [],
  });
  const { items, getDiscount, coupon, clearCart, setCoupon, removeCoupon } =
    useCartStore();

  const directCheckoutItems = useMemo(() => {
    const incoming = location.state?.buyNowItems;
    if (!Array.isArray(incoming)) return [];

    return incoming
      .map((item) => ({
        ...item,
        id: Number(item?.id),
        variant_id: item?.variant_id || null,
        quantity: Math.max(1, Number(item?.quantity || 1)),
        price: Number(item?.price || 0),
      }))
      .filter((item) => Number.isFinite(item.id) && item.id > 0);
  }, [location.state]);

  const isDirectCheckout = directCheckoutItems.length > 0;
  const checkoutItems = isDirectCheckout ? directCheckoutItems : items;

  // Real API hooks
  const { data: addressData, isLoading: addressLoading } = useAddresses();
  const { data: walletData } = useWallet();
  const { data: publicSettingsData, isLoading: settingsLoading } =
    usePublicSettings();
  const createAddress = useCreateAddress();
  const createOrder = useCreateOrder();
  const validateCoupon = useValidateCoupon();

  const addresses = addressData?.data || addressData || [];
  const walletBalance = walletData?.data?.balance || walletData?.balance || 0;
  const publicSettings = publicSettingsData?.data ?? publicSettingsData ?? {};
  const activeCurrency = String(
    publicSettings?.currency || "EGP",
  ).toUpperCase();

  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      const def = addresses.find((a) => a.is_default) || addresses[0];
      if (def) setSelectedAddress(def.id);
    }
  }, [addresses, selectedAddress]);

  useEffect(() => {
    if (!publicSettingsData) return;
    const data = publicSettingsData?.data ?? publicSettingsData ?? {};
    const methods = Array.isArray(data.shipping_methods)
      ? data.shipping_methods.filter((method) => method?.enabled !== false)
      : [];

    setShippingSettings({
      shipping_fee: Number(data.shipping_fee ?? 0),
      free_shipping_threshold_enabled: isEnabled(
        data.free_shipping_threshold_enabled,
        true,
      ),
      free_shipping_threshold: Number(data.free_shipping_threshold ?? 0),
      shipping_min_days: Number(data.shipping_min_days ?? 3),
      shipping_max_days: Number(data.shipping_max_days ?? 7),
      shipping_methods: methods,
      shipping_zones: Array.isArray(data.shipping_zones)
        ? data.shipping_zones
        : [],
    });

    if (methods.length > 0 && !selectedShippingMethod) {
      const defaultMethod =
        methods.find((method) => method?.name) || methods[0];
      if (defaultMethod?.name) {
        setSelectedShippingMethod(defaultMethod.name);
      }
    }
  }, [publicSettingsData]);

  useEffect(() => {
    setShippingUiReady(false);
    if (settingsLoading) return;

    const timer = setTimeout(() => {
      setShippingUiReady(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [settingsLoading, publicSettingsData]);

  const selectedAddressObject =
    addresses.find((address) => address.id === selectedAddress) || null;

  const normalizeCountry = (value) =>
    String(value || "")
      .trim()
      .toUpperCase();

  const shippingZoneName = (() => {
    const addressCountry = normalizeCountry(selectedAddressObject?.country);
    if (!addressCountry || !Array.isArray(shippingSettings.shipping_zones))
      return "";

    const zone = shippingSettings.shipping_zones.find((item) =>
      Array.isArray(item?.countries)
        ? item.countries.some(
            (country) => normalizeCountry(country) === addressCountry,
          )
        : false,
    );

    return zone?.name || "";
  })();

  const effectiveShippingMethod =
    (shippingSettings.shipping_methods || []).find(
      (method) => method?.name === selectedShippingMethod,
    ) || null;
  const subtotalBeforeDiscount = checkoutItems.reduce((total, item) => {
    return total + Number(item?.price || 0) * Number(item?.quantity || 0);
  }, 0);
  const shippingFreeByThreshold =
    shippingSettings.free_shipping_threshold_enabled &&
    shippingSettings.free_shipping_threshold > 0 &&
    subtotalBeforeDiscount >= shippingSettings.free_shipping_threshold;
  const shippingMethodReady =
    shippingFreeByThreshold ||
    (shippingSettings.shipping_methods || []).length === 0 ||
    !!effectiveShippingMethod?.name;
  const shippingReady =
    !settingsLoading && shippingUiReady && shippingMethodReady;

  const shippingDeliveryMinDays = Number(
    effectiveShippingMethod?.minDays ?? shippingSettings.shipping_min_days ?? 3,
  );
  const shippingDeliveryMaxDays = Number(
    effectiveShippingMethod?.maxDays ?? shippingSettings.shipping_max_days ?? 7,
  );

  const discountValue = isDirectCheckout ? 0 : getDiscount();
  const subtotalAfterDiscount = Math.max(
    0,
    subtotalBeforeDiscount - discountValue,
  );
  const taxRate = Number(publicSettings?.tax_rate ?? 0);
  const taxAmount =
    taxRate > 0 ? Math.max(0, (subtotalBeforeDiscount * taxRate) / 100) : 0;
  const baseShippingCost = Number(
    effectiveShippingMethod?.cost ?? shippingSettings.shipping_fee ?? 0,
  );
  const shippingCost = shippingFreeByThreshold
    ? 0
    : Math.max(0, baseShippingCost);
  const orderTotal = subtotalAfterDiscount + shippingCost + taxAmount;

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (isDirectCheckout || !couponCode.trim()) return;

    try {
      const res = await validateCoupon.mutateAsync({
        code: couponCode.trim(),
        subtotal: subtotalBeforeDiscount,
      });
      const payload = res?.data || res;
      const couponData = payload?.data || payload;

      setCoupon({
        code: couponCode.trim(),
        discount: couponData?.discount ?? couponData?.value ?? 0,
        type: couponData?.type || "percentage",
        value: couponData?.value ?? 0,
      });
      setCouponCode("");
      toast.success(t("cart.couponApplied") || "Coupon applied");
    } catch (err) {
      toast.error(err?.response?.data?.message || t("checkout.invalidCoupon"));
    }
  };

  const walletHasBalance = walletBalance > 0;
  const walletCoversTotal = walletBalance >= orderTotal;

  const paymentMethods = [
    { id: "cod", label: t("checkout.cashOnDelivery"), icon: "💵" },
    {
      id: "wallet",
      label: `${t("checkout.walletBalance", { amount: formatCurrency(walletBalance) })}`,
      icon: "👛",
      disabled: !walletCoversTotal,
      subtitle:
        !walletCoversTotal && walletHasBalance
          ? t(
              "checkout.walletInsufficient",
              "Not enough to cover full order. Use partial payment below.",
            )
          : !walletHasBalance
            ? t("checkout.insufficientBalance")
            : undefined,
    },
  ];

  // When wallet is selected and covers the full order, no partial needed
  // When COD is selected, allow user to optionally use wallet balance for partial
  const walletDeduction =
    selectedPayment === "wallet"
      ? orderTotal
      : useWalletPartial && walletHasBalance
        ? Math.min(walletBalance, orderTotal)
        : 0;
  const remainingAfterWallet = Math.max(0, orderTotal - walletDeduction);

  const steps = [
    { number: 1, label: t("checkout.address"), icon: MapPin },
    { number: 2, label: t("checkout.payment"), icon: CreditCard },
    { number: 3, label: t("checkout.review"), icon: Check },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();

  const onSaveNewAddress = async (formData) => {
    try {
      const nameParts = (formData.newName || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || firstName;
      const res = await createAddress.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        phone: formData.newPhone,
        address_line_1: formData.newAddress,
        city: formData.newCity,
        state: formData.newState,
        postal_code: formData.newZip,
        country: "EG",
        is_default: addresses.length === 0,
      });
      const newAddr = res?.data || res;
      if (newAddr?.id) setSelectedAddress(newAddr.id);
      setShowNewAddress(false);
      reset();
      toast.success(t("checkout.addressSaved") || "Address saved");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("checkout.failedSaveAddress"),
      );
    }
  };

  const placeOrder = async () => {
    if (!shippingReady) return;

    if (!selectedAddress) {
      toast.error(t("checkout.selectAddress") || "Please select an address");
      setStep(1);
      return;
    }
    try {
      // Format shipping address string from selected address
      const addr = addresses.find((a) => a.id === selectedAddress);
      const shippingAddress = addr
        ? [
            [addr.first_name, addr.last_name].filter(Boolean).join(" ") ||
              addr.name ||
              addr.label,
            addr.address_line_1,
            addr.address_line_2,
            addr.city,
            addr.state,
            addr.postal_code,
            addr.country,
          ]
            .filter(Boolean)
            .join(", ")
        : "";

      const orderData = {
        address_id: selectedAddress,
        shipping_address: shippingAddress,
        payment_method:
          selectedPayment === "wallet"
            ? "wallet"
            : useWalletPartial && walletDeduction > 0
              ? "wallet+cod"
              : selectedPayment,
        wallet_amount:
          selectedPayment === "wallet"
            ? orderTotal
            : useWalletPartial && walletDeduction > 0
              ? walletDeduction
              : undefined,
        shipping_method: effectiveShippingMethod?.name || "Standard",
        shipping_zone: shippingZoneName || null,
        shipping_min_days: Number(shippingDeliveryMinDays || 0),
        shipping_max_days: Number(shippingDeliveryMaxDays || 0),
        tax_amount: Number(taxAmount.toFixed(2)),
        items: checkoutItems.map((item) => ({
          product_id: item.id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          unit_price: parseFloat(item.price) || 0,
        })),
        coupon_code: isDirectCheckout ? null : coupon?.code || null,
        notes: "",
      };
      const res = await createOrder.mutateAsync(orderData);
      const order = res?.data || res;

      trackFacebookEvent("Purchase", {
        value: Number(orderTotal),
        currency: activeCurrency,
        content_type: "product",
        content_ids: checkoutItems.map((item) => String(item.id)),
        num_items: checkoutItems.reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0,
        ),
      });

      if (!isDirectCheckout) {
        clearCart();
      }
      toast.success(t("checkout.orderPlaced"));
      navigate(`/orders/${order?.id || order?.order_number || ""}`);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("checkout.orderFailed") ||
          "Order failed",
      );
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-text-secondary text-lg mb-4">
          {t("cart.empty") || "Your cart is empty"}
        </p>
        <Button onClick={() => navigate("/products")}>
          {t("cart.continueShopping") || "Continue Shopping"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl sm:text-2xl font-bold text-text mb-4 sm:mb-6">
        {t("checkout.title")}
      </h1>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-4 sm:mb-8">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <button
              onClick={() => s.number < step && setStep(s.number)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${step >= s.number ? "bg-primary text-white" : "bg-gray-100 text-text-secondary"}`}
            >
              {step > s.number ? (
                <Check className="h-4 w-4" />
              ) : (
                <s.icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <ChevronRight className="h-5 w-5 text-gray-300 mx-2" />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          {/* Step 1: Address */}
          {step === 1 && (
            <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-text mb-4">
                {t("checkout.shippingAddress")}
              </h2>
              {addressLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : addresses.length === 0 && !showNewAddress ? (
                <div className="text-center py-6">
                  <p className="text-text-secondary mb-3">
                    {t("checkout.noSavedAddresses")}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewAddress(true)}
                    icon={Plus}
                  >
                    {t("checkout.addNewAddress")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${selectedAddress === addr.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddress === addr.id}
                          onChange={() => {
                            setSelectedAddress(addr.id);
                            setShowNewAddress(false);
                          }}
                          className="mt-1 text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="font-medium text-text">
                            {addr.name || addr.label}{" "}
                            {addr.is_default && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded ml-2">
                                {t("common.default")}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {addr.phone}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {addr.address_line_1}
                            {addr.address_line_2
                              ? `, ${addr.address_line_2}`
                              : ""}
                            , {addr.city}
                            {addr.state ? `, ${addr.state}` : ""}{" "}
                            {addr.postal_code}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowNewAddress(!showNewAddress)}
                    className="mt-3 flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    <Plus className="h-4 w-4" /> {t("checkout.addNewAddress")}
                  </button>
                </>
              )}
              {showNewAddress && (
                <form
                  onSubmit={handleSubmit(onSaveNewAddress)}
                  className="mt-4 p-4 border border-border rounded-lg space-y-3"
                >
                  {/* Map Address Picker */}
                  <div className="mb-2">
                    <p className="text-sm font-medium text-text mb-2 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      {t("checkout.pickOnMap") || "Pick address on map"}
                    </p>
                    <Suspense
                      fallback={
                        <div className="h-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      }
                    >
                      <MapAddressPicker
                        height="250px"
                        onAddressSelect={(mapData) => {
                          if (mapData.address)
                            setValue("newAddress", mapData.address, {
                              shouldDirty: true,
                            });
                          if (mapData.city)
                            setValue("newCity", mapData.city, {
                              shouldDirty: true,
                            });
                          if (mapData.state)
                            setValue("newState", mapData.state, {
                              shouldDirty: true,
                            });
                          if (mapData.postal_code)
                            setValue("newZip", mapData.postal_code, {
                              shouldDirty: true,
                            });
                        }}
                      />
                    </Suspense>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label={t("checkout.fullName")}
                      {...register("newName", { required: "Required" })}
                      error={errors.newName?.message}
                    />
                    <Input
                      label={t("common.phone")}
                      type="tel"
                      {...register("newPhone", { required: "Required" })}
                      error={errors.newPhone?.message}
                    />
                  </div>
                  <Input
                    label={t("common.address")}
                    {...register("newAddress", { required: "Required" })}
                    error={errors.newAddress?.message}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label={t("common.city")}
                      {...register("newCity", { required: "Required" })}
                      error={errors.newCity?.message}
                    />
                    <Input
                      label={t("common.state")}
                      {...register("newState")}
                    />
                    <Input
                      label={t("common.zipCode")}
                      {...register("newZip")}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewAddress(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" loading={createAddress.isPending}>
                      {t("common.save")}
                    </Button>
                  </div>
                </form>
              )}
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => navigate("/cart")}>
                  <ArrowLeft className="h-4 w-4" />
                  {t("checkout.backToCart")}
                </Button>
                <Button
                  onClick={() => {
                    if (!shippingReady) return;
                    if (!selectedAddress) {
                      toast.error(
                        t("checkout.selectAddress") ||
                          "Please select an address",
                      );
                      return;
                    }
                    setStep(2);
                  }}
                  loading={!shippingReady}
                  disabled={!shippingReady}
                >
                  {t("checkout.continueToPayment")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-text mb-4">
                {t("checkout.paymentMethod")}
              </h2>
              <div className="space-y-3 mb-6">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${method.disabled ? "opacity-50 cursor-not-allowed" : ""} ${selectedPayment === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={selectedPayment === method.id}
                      onChange={() =>
                        !method.disabled && setSelectedPayment(method.id)
                      }
                      disabled={method.disabled}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-xl">{method.icon}</span>
                    <div>
                      <span className="font-medium text-text">
                        {method.label}
                      </span>
                      {method.subtitle && (
                        <p className="text-xs text-amber-600">
                          {method.subtitle}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Partial wallet payment option */}
              {selectedPayment === "cod" && walletHasBalance && (
                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWalletPartial}
                      onChange={(e) => setUseWalletPartial(e.target.checked)}
                      className="mt-0.5 text-primary focus:ring-primary rounded"
                    />
                    <div>
                      <span className="font-medium text-text text-sm">
                        {t("checkout.useWalletBalance", "Use wallet balance")}
                      </span>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {t("checkout.walletPartialDesc", {
                          wallet: formatCurrency(walletBalance),
                          deduct: formatCurrency(
                            Math.min(walletBalance, orderTotal),
                          ),
                          remaining: formatCurrency(
                            Math.max(
                              0,
                              orderTotal - Math.min(walletBalance, orderTotal),
                            ),
                          ),
                        }) ||
                          `Pay ${formatCurrency(Math.min(walletBalance, orderTotal))} from wallet, remaining ${formatCurrency(Math.max(0, orderTotal - Math.min(walletBalance, orderTotal)))} via Cash on Delivery`}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {!shippingFreeByThreshold &&
                (shippingSettings.shipping_methods || []).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-text mb-2">
                      {t("checkout.shippingMethod") || "Shipping method"}
                    </h3>
                    <div className="space-y-2">
                      {(shippingSettings.shipping_methods || []).map(
                        (method) => {
                          const methodName = method?.name || "Standard";
                          const methodCost = Number(
                            method?.cost ?? shippingSettings.shipping_fee ?? 0,
                          );
                          const minDays = Number(
                            method?.minDays ??
                              shippingSettings.shipping_min_days ??
                              3,
                          );
                          const maxDays = Number(
                            method?.maxDays ??
                              shippingSettings.shipping_max_days ??
                              7,
                          );
                          const isSelected =
                            selectedShippingMethod === methodName;

                          return (
                            <label
                              key={methodName}
                              className={`flex items-center justify-between gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="shippingMethod"
                                  checked={isSelected}
                                  onChange={() =>
                                    setSelectedShippingMethod(methodName)
                                  }
                                  className="text-primary focus:ring-primary"
                                />
                                <div>
                                  <p className="text-sm font-medium text-text">
                                    {methodName}
                                  </p>
                                  <p className="text-xs text-text-secondary">
                                    {t("checkout.deliveryDays", {
                                      min: minDays,
                                      max: maxDays,
                                    }) || `${minDays}-${maxDays} days`}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm font-medium text-text">
                                {formatCurrency(methodCost)}
                              </p>
                            </label>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

              <div className="mt-6 flex justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    {t("common.back")}
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    if (!shippingReady) return;
                    setStep(3);
                  }}
                  loading={!shippingReady}
                  disabled={!shippingReady}
                >
                  {t("checkout.reviewOrder")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-text mb-4">
                {t("checkout.orderReview")}
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-text mb-1">
                    {t("checkout.shippingTo")}
                  </p>
                  {(() => {
                    const addr = addresses.find(
                      (a) => a.id === selectedAddress,
                    );
                    if (!addr)
                      return (
                        <p className="text-sm text-text-secondary">
                          No address selected
                        </p>
                      );
                    return (
                      <p className="text-sm text-text-secondary">
                        {addr.name || addr.label}, {addr.address_line_1},{" "}
                        {addr.city}
                        {addr.state ? `, ${addr.state}` : ""} {addr.postal_code}
                      </p>
                    );
                  })()}
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-text mb-1">
                    {t("checkout.paymentLabel")}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {
                      paymentMethods.find((m) => m.id === selectedPayment)
                        ?.label
                    }
                  </p>
                  {walletDeduction > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm text-success">
                        <span>
                          👛 {t("checkout.walletDeduction", "Wallet deduction")}
                        </span>
                        <span>-{formatCurrency(walletDeduction)}</span>
                      </div>
                      {remainingAfterWallet > 0 && (
                        <div className="flex justify-between text-sm font-semibold">
                          <span>
                            {t("checkout.remainingCOD", "Due on delivery")}
                          </span>
                          <span>{formatCurrency(remainingAfterWallet)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-text mb-1">
                    {t("checkout.shippingMethod") || "Shipping method"}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {shippingFreeByThreshold
                      ? t("common.free") || "Free"
                      : effectiveShippingMethod?.name || "Standard"}
                    {shippingZoneName ? ` • ${shippingZoneName}` : ""}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {t("checkout.estimatedDeliveryDays", {
                      min: shippingDeliveryMinDays,
                      max: shippingDeliveryMaxDays,
                    }) ||
                      `Estimated delivery: ${shippingDeliveryMinDays}-${shippingDeliveryMaxDays} days`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text mb-2">
                    {t("checkout.orderItems")}
                  </p>
                  <div className="divide-y divide-border/50">
                    {checkoutItems.map((item) => (
                      <div
                        key={`${item.id}_${item.variant_id || "base"}`}
                        className="flex items-center gap-3 py-3"
                      >
                        <img
                          src={
                            item.image ||
                            "https://placehold.co/60x60/f0f0f0/333?text=Item"
                          }
                          alt={item.name}
                          loading="lazy"
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {t("common.qty")}: {item.quantity}
                          </p>
                        </div>
                        <span className="font-medium text-text">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    {t("common.back")}
                  </Button>
                </div>
                <Button
                  onClick={placeOrder}
                  loading={createOrder.isPending || !shippingReady}
                  disabled={createOrder.isPending || !shippingReady}
                  icon={Lock}
                >
                  {t("checkout.placeOrder", {
                    total: formatCurrency(
                      walletDeduction > 0 ? remainingAfterWallet : orderTotal,
                    ),
                  })}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-border/50 p-4 sm:p-6 sticky top-24">
            <h3 className="font-semibold text-text mb-4">
              {t("checkout.orderSummary")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {t("common.subtotal")}
                </span>
                <span>{formatCurrency(subtotalBeforeDiscount)}</span>
              </div>
              {!isDirectCheckout && coupon && (
                <div className="flex justify-between text-success">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    {coupon.code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>-{formatCurrency(discountValue)}</span>
                    <button
                      onClick={() => {
                        removeCoupon();
                        toast.success(
                          t("cart.couponRemoved") || "Coupon removed",
                        );
                      }}
                      className="text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {t("common.shipping")}
                </span>
                <span>
                  {!shippingReady ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin inline" />
                  ) : shippingCost === 0 ? (
                    t("common.free")
                  ) : (
                    formatCurrency(shippingCost)
                  )}
                </span>
              </div>
              {!shippingFreeByThreshold && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">
                    {t("checkout.shippingMethod") || "Method"}
                  </span>
                  <span>{effectiveShippingMethod?.name || "Standard"}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("common.tax")}</span>
                <span>
                  {taxAmount > 0 ? formatCurrency(taxAmount) : t("common.free")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  {t("checkout.estimatedArrival")}
                </span>
                <span>
                  {shippingDeliveryMinDays}-{shippingDeliveryMaxDays}d
                </span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-lg font-bold">
                <span>{t("common.total")}</span>
                <span className="text-primary">
                  {formatCurrency(orderTotal)}
                </span>
              </div>
              {walletDeduction > 0 && (
                <>
                  <div className="flex justify-between text-sm text-success">
                    <span>👛 {t("checkout.walletPayment", "Wallet")}</span>
                    <span>-{formatCurrency(walletDeduction)}</span>
                  </div>
                  {remainingAfterWallet > 0 && (
                    <div className="flex justify-between text-sm font-semibold">
                      <span>
                        {t("checkout.remainingCOD", "Due on delivery")}
                      </span>
                      <span>{formatCurrency(remainingAfterWallet)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {!isDirectCheckout && !coupon && (
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

            <div className="mt-4 text-xs text-text-secondary">
              <p className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> {t("checkout.paymentsSecure")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
